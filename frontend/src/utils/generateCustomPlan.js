import axiosClient from "../api/axiosClient";
import semesterMapping from "../constants/semesterMapping";

const SHE4_CODE = "SHE4444";
const KIAR_CODE = "GQX0056";

/** ===== Utilities ===== **/

const SEM_NAMES = ["Semester 1", "Semester 2"];
const MAX_YEARS_HARD_CAP = 10; // protect from runaway while-loop

// Turn ["Semester 1","Semester 2"] -> bitmask (bit0=S1, bit1=S2)
function offeringsToMask(offeredSemester) {
  if (!offeredSemester || offeredSemester.length === 0) return 0b11; // both
  let mask = 0;
  for (const s of offeredSemester) {
    if (s === "Semester 1") mask |= 0b01;
    if (s === "Semester 2") mask |= 0b10;
  }
  return mask || 0b11;
}

// Map (year, sem) => "Y1S1" etc.
function keyYS(year, sem) {
  return `Y${year}S${sem}`;
}

// Map default plan to “expected timeline” for prioritization
function buildDefaultWhenMap(defaultMap) {
  // { CODE -> {year, sem, idxFromStart} }
  const pos = {};
  let idx = 0;
  const years = Object.keys(defaultMap)
    .map((y) => +y.replace("Year ", ""))
    .sort((a, b) => a - b);

  for (const y of years) {
    for (let s = 1; s <= 2; s++) {
      const semKey = `Semester ${s}`;
      const list = defaultMap[`Year ${y}`]?.[semKey] || [];
      for (const code of list) {
        pos[code] = { year: y, sem: s, idxFromStart: idx++ };
      }
    }
  }
  return pos;
}

// Normalize default course codes (convert SPECIALIZATION placeholders to stable pseudo-codes)
function flattenDefaultMap(defaultMap) {
  const flat = [];
  const years = Object.keys(defaultMap)
    .map((y) => +y.replace("Year ", ""))
    .sort((a, b) => a - b);
  for (const y of years) {
    for (let s = 1; s <= 2; s++) {
      const semKey = `Semester ${s}`;
      for (const code of defaultMap[`Year ${y}`]?.[semKey] || []) {
        flat.push({ code, year: y, sem: s });
      }
    }
  }
  return flat;
}

// From profile entries, get sets and taken map
function analyzeProfile(profile) {
  const passed = new Set();
  const failed = new Set();
  const takenByYS = {}; // YxSy -> [codes]
  const everTaken = new Set();
  let lastYear = 0;
  let lastSem = 0;

  for (const e of profile.entries || []) {
    const code = e.course?.course_code;
    const y = e.year;
    const s = e.semester;
    if (!code || !y || !s) continue;

    const k = keyYS(y, s);
    if (!takenByYS[k]) takenByYS[k] = [];
    takenByYS[k].push(code);
    everTaken.add(code);

    if (e.status === "Passed") passed.add(code);
    else if (!e.isRetake) failed.add(code);

    // track last completed semester
    if (y > lastYear || (y === lastYear && s > lastSem)) {
      lastYear = y;
      lastSem = s;
    }
  }

  return { passed, failed, takenByYS, lastYear, lastSem, everTaken };
}

// Gap controls
function toGapSets(profile, preferences) {
  // support both persisted and user-specified quick modes
  const gapYears = new Set([
    ...(profile.gapYears || []),
    ...(preferences.gapYears || []),
  ]);
  const gapSemKeys = new Set([
    ...(profile.gapSemesters || []),
    ...(preferences.gapSemesters || []).map((t) =>
      typeof t === "string" ? t : `Y${t.year}S${t.sem}`
    ),
  ]);
  const outboundSemKeys = new Set([
    ...(profile.outboundSemesters || []),
    ...(preferences.outboundSemesters || []).map((t) =>
      typeof t === "string" ? t : `Y${t.year}S${t.sem}`
    ),
  ]);
  return { gapYears, gapSemKeys, outboundSemKeys };
}

/** ===== Core planner ===== **/

export default async function generateCustomPlan(
  userId,
  token,
  preferences = {}
) {
  try {
    const [coursesRes, profileRes] = await Promise.all([
      axiosClient.get("/courses", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axiosClient.get(`/academic-profile/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const allCourses = coursesRes.data || [];
    const profile = profileRes.data || {};
    const { passed, takenByYS, lastYear, lastSem, everTaken } =
      analyzeProfile(profile);
    const { gapYears, gapSemKeys, outboundSemKeys } = toGapSets(
      profile,
      preferences
    );

    // How many full gap years occur within the first 4 academic years?
    const gapYearsInFirst4 = Array.from(gapYears).filter(
      (y) => y >= 1 && y <= 4
    ).length;
    // Try to "finish by" Year 4, but account for any full gap years (e.g., Year 4 gap -> finish by Year 5)
    const FINISH_BY_YEAR = Math.min(4 + gapYearsInFirst4, MAX_YEARS_HARD_CAP);

    const preferLight = !!preferences.lightweight; // soft preference
    const maxPerSem = 21; // hard operational cap
    const absoluteCap = 22; // absolute hard cap
    const softCap = preferLight ? 16 : maxPerSem;

    // Build catalog (fast lookups)
    const catalog = new Map(); // code -> { code, name, credits, mask, prereqCodes[], type }
    const prereqGraph = new Map(); // code -> Set(its prerequisites)
    const dependents = new Map(); // code -> Set(courses that depend on it), to compute "fanout"

    for (const c of allCourses) {
      const code = c.course_code;
      const mask = offeringsToMask(c.offered_semester);
      const prereqCodes = (c.prerequisites || [])
        .map((p) => (typeof p === "string" ? p : p?.course_code))
        .filter(Boolean);

      catalog.set(code, {
        code,
        name: c.course_name,
        credits: c.credit_hours || 3,
        mask,
        prereqCodes,
        type: c.type,
      });

      prereqGraph.set(code, new Set(prereqCodes));
      for (const p of prereqCodes) {
        if (!dependents.has(p)) dependents.set(p, new Set());
        dependents.get(p).add(code);
      }
    }

    // Core list for WIA3001 gating: all faculty/programme cores except the WIA300x trio
    const CORE_TYPES = ["faculty_core", "programme_core"];
    const coreCodesAll = Array.from(catalog.values())
      .filter((c) => CORE_TYPES.includes(c.type))
      .map((c) => c.code);
    const wia3001CoreMustBeTaken = new Set(
      coreCodesAll.filter(
        (code) => !["WIA3001", "WIA3002", "WIA3003"].includes(code)
      )
    );

    // SPECIAL CASES: Ensure key capstone courses appear even if not in “remaining”
    const ensureCodes = ["WIA3001", "WIA3002", "WIA3003"].filter((x) =>
      catalog.has(x)
    );

    const { missingCodes, normalizedDefaultMap } =
      validateSemesterMappingCourses(allCourses, semesterMapping);
    const warnings = [];
    const defaultWhen = buildDefaultWhenMap(normalizedDefaultMap);
    const defaultFlat = flattenDefaultMap(normalizedDefaultMap);

    if (missingCodes.length) {
      warnings.push(
        "These course codes appear in the faculty default plan but are not in the database: " +
          missingCodes.join(", ")
      );
    }

    if (outboundSemKeys.size > 0) {
      warnings.push(
        "You selected an Outbound Programme semester. Please consult your Academic Advisor regarding credit transfer/recognition."
      );
    }

    const plan = {};

    // Determine REQUIRED set:
    // 1) Start from “all courses in default plan”
    // 2) Drop already passed
    // 3) Add special ensureCodes if not passed
    const required = new Set(
      defaultFlat
        .map((x) => x.code)
        .concat(ensureCodes)
        .filter((code) => code && !passed.has(code))
    );

    const she4Already = passed.has(SHE4_CODE);
    const kiarAlready = passed.has(KIAR_CODE);

    // If either was already completed, remove both from remaining "required"
    if (she4Already || kiarAlready) {
      required.delete(SHE4_CODE);
      required.delete(KIAR_CODE);
    } else {
      // Neither passed yet: keep whichever appears earlier in the faculty default
      if (required.has(SHE4_CODE) && required.has(KIAR_CODE)) {
        const idxShe = defaultWhen[SHE4_CODE]?.idxFromStart ?? Infinity;
        const idxKiar = defaultWhen[KIAR_CODE]?.idxFromStart ?? Infinity;
        if (idxShe <= idxKiar) {
          required.delete(KIAR_CODE);
        } else {
          required.delete(SHE4_CODE);
        }
      }
    }

    // Also include any extra courses user already started/failed that belong to catalog but not in default
    for (const ys of Object.values(takenByYS)) {
      for (const code of ys) {
        if (catalog.has(code) && !passed.has(code)) required.add(code);
      }
    }

    // Resolve SPECIALIZATION placeholders: allow planner to fill with any programme_elective (3 credits)
    // Strategy: For each SPECIALIZATION_x in default, reserve a slot "SPECIALIZATION" and later fill
    const specializationSlots = defaultFlat.filter((x) =>
      String(x.code).startsWith("SPECIALIZATION_")
    ).length;
    const electivesPool = allCourses
      .filter(
        (c) => c.type === "programme_elective" && !passed.has(c.course_code)
      )
      .map((c) => c.course_code);

    // Replace placeholders in "required" with a synthetic marker "SPECIALIZATION" repeated N times
    let specializationNeeded = specializationSlots;
    // If profile already took some electives that count toward specialization, reduce slots
    const takenElectives = new Set();
    for (const ys of Object.values(takenByYS)) {
      for (const code of ys) {
        if (!passed.has(code)) continue;
        const info = catalog.get(code);
        if (info?.type === "programme_elective") takenElectives.add(code);
      }
    }
    // Assume 10 specialization slots (from your mapping) – adjust by passed electives
    specializationNeeded = Math.max(
      0,
      specializationSlots - takenElectives.size
    );

    // Remove placeholder codes from required set
    for (const r of Array.from(required)) {
      if (String(r).startsWith("SPECIALIZATION_")) required.delete(r);
    }

    // Planner timeline starts at CURRENT + 1 semester
    let startYear = lastYear || 1;
    let startSem = lastSem || 0;
    if (startSem === 2) {
      startYear += 1;
      startSem = 1;
    } else {
      startSem = 1 + (startSem % 2);
    }

    const defaultChrono = listDefaultSemesters(normalizedDefaultMap);

    // Helpers
    const isAvailableThisSem = (code, _unusedMask, semIdx) => {
      // semIdx: 1 or 2
      if (!catalog.has(code)) return true; // unknown -> assume ok
      const m = catalog.get(code).mask;
      return (m & (semIdx === 1 ? 0b01 : 0b10)) !== 0;
    };

    // Accept either: historical pass OR scheduled in an EARLIER semester of this plan.
    const prereqsSatisfiedBefore = (code, curY, curS) => {
      const reqs = prereqGraph.get(code);
      if (!reqs || reqs.size === 0) return true;
      for (const r of reqs) {
        if (!isPassedBefore(r, curY, curS, scheduledAt, virtPassed)) {
          return false;
        }
      }
      return true;
    };

    // Explain *why* prereqs aren’t satisfied, with timing detail.
    const describePrereqStatus = (r, y, s) => {
      if (!virtPassed.has(r)) {
        const at = scheduledAt.get(r);
        if (!at) return `${r}: NOT PASSED`;
        if (at.y === y && at.s === s)
          return `${r}: scheduled SAME semester (does not count)`;
        if (isBefore(at.y, at.s, y, s))
          return `${r}: scheduled EARLIER at Y${at.y}S${at.s}`;
        return `${r}: scheduled LATER at Y${at.y}S${at.s}`;
      }
      const at = scheduledAt.get(r);
      if (!at) return `${r}: passed HISTORICALLY`;
      if (isBefore(at.y, at.s, y, s))
        return `${r}: passed earlier at Y${at.y}S${at.s}`;
      return `${r}: passed but timing ambiguous`;
    };

    const listMissingPrereqs = (code, y, s) => {
      const out = [];
      const reqs = prereqGraph.get(code);
      if (!reqs) return out;
      for (const r of reqs) {
        if (!isPassedBefore(r, y, s, scheduledAt, virtPassed)) {
          out.push(describePrereqStatus(r, y, s));
        }
      }
      return out;
    };

    // Priority scoring:
    // - Default plan closeness (earlier idxFromStart -> higher priority)
    // - High fanout (more dependents) -> higher priority
    // - Prereq depth (lower depth -> earlier), approximated via topological rank
    const topoLevel = computeTopoLevels(prereqGraph); // code -> level (0 for no prereqs)
    function score(code, ctx = {}) {
      const urgentPrereqs = ctx.urgentPrereqs;
      const when = defaultWhen[code];
      const base = when ? -when.idxFromStart : 0; // sooner in default -> larger score
      const fanout = (dependents.get(code)?.size || 0) * 5;
      const level = -(topoLevel.get(code) || 0); // lower level earlier -> larger score
      const urgentBoost = urgentPrereqs?.has?.(code) ? 1000 : 0;
      return base + fanout + level + urgentBoost;
    }

    // Seed "virtually passed" with what student already passed (don’t double-take)
    const virtPassed = new Set(passed);
    // Track everything the student has already taken (attempted), regardless of pass:
    const virtTaken = new Set(everTaken);

    // Track electives placed
    const electiveQueue = [...electivesPool];

    let remain = new Set(required);
    const scheduledAt = new Map();

    // Track WIA3002/WIA3003 “immediate-next” rule
    let mustPlaceWIA3003At = null;

    // If WIA3002 was passed in the last completed semester, try to put WIA3003
    // in the very next planned semester (if possible).
    const lastKey = keyYS(lastYear || 0, lastSem || 0);
    if (passed.has("WIA3002") && !passed.has("WIA3003")) {
      const lastCodes = takenByYS[lastKey] || [];
      if (lastCodes.includes("WIA3002")) {
        mustPlaceWIA3003At = { y: startYear, s: startSem };
      }
    }

    // ---- Phase 1: try to finish by Year 4 ----
    let planningDone = false;
    for (let y = startYear; y <= Math.max(FINISH_BY_YEAR, startYear); y++) {
      const yearKey = `Year ${y}`;
      if (!plan[yearKey]) plan[yearKey] = {};

      // Gap whole year?
      if (gapYears.has(y)) {
        plan[yearKey]["Semester 1"] = ["GAP YEAR"];
        plan[yearKey]["Semester 2"] = ["GAP YEAR"];
        continue;
      }

      for (let s = 1; s <= 2; s++) {
        const forceWIA3003Here =
          mustPlaceWIA3003At &&
          mustPlaceWIA3003At.y === y &&
          mustPlaceWIA3003At.s === s;

        if (y === startYear && s < startSem) {
          plan[yearKey][`Semester ${s}`] = [];
          continue;
        }

        const semKey = `Semester ${s}`;
        const ysKey = keyYS(y, s);

        const isClosedThisSem =
          gapSemKeys.has(ysKey) || outboundSemKeys.has(ysKey);
        if (forceWIA3003Here && isClosedThisSem) {
          warnings.push(
            `Could not schedule WIA3003 immediately after WIA3002 at Y${y}S${s} because this semester is ${
              gapSemKeys.has(ysKey) ? "a Gap Semester" : "Outbound"
            }. It will be scheduled as soon as possible.`
          );
          mustPlaceWIA3003At = null; // relax so it can be placed ASAP
        }

        if (gapSemKeys.has(ysKey)) {
          plan[yearKey][semKey] = ["GAP SEMESTER"];
          continue;
        }
        if (outboundSemKeys.has(ysKey)) {
          plan[yearKey][semKey] = ["OUTBOUND"];
          continue;
        }

        // base = courses already taken this YS but not passed
        const base = [];
        for (const c of takenByYS[ysKey] || []) {
          if (!virtPassed.has(c)) base.push(c);
        }

        let credits = sumCredits(base, catalog);

        const perSemCap = Math.min(absoluteCap, maxPerSem);
        const remainingCreditsEstimate = estimateRemainingCredits(
          remain,
          new Set(base),
          catalog,
          specializationNeeded
        );

        const openToFinishBy = countOpenSemestersFrom(
          y,
          s,
          gapYears,
          gapSemKeys,
          outboundSemKeys,
          FINISH_BY_YEAR
        );
        const avgToFinishBy = Math.ceil(
          remainingCreditsEstimate / Math.max(1, openToFinishBy)
        );

        if (avgToFinishBy > perSemCap) {
          warnings.push(
            `Even at a regular load, finishing by Year ${FINISH_BY_YEAR} ` +
              `(accounting for gap years) is unlikely due to prerequisites/offerings; the plan may extend further.`
          );
        }

        // Base target: prefer softCap when still compatible with finishing by FINISH_BY_YEAR
        let targetCr = Math.max(
          preferLight ? softCap : avgToFinishBy,
          avgToFinishBy
        );

        const minAim = preferLight ? 12 : 15;
        targetCr = clamp(targetCr, minAim, perSemCap);
        targetCr = Math.max(targetCr, credits); // never below what’s already in base

        // If even a regular load can’t hit Year 4 (avgToY4 > perSemCap), we’ll warn later

        // Look-ahead: prioritize missing prereqs for current + next default semester
        const URGENT_WINDOW = 2; // current + next default semester
        const urgentPrereqs = computeUrgentPrereqsForUpcoming(
          defaultChrono, // make sure you defined this once before the loops (see step 3)
          y,
          s,
          URGENT_WINDOW,
          prereqGraph,
          remain,
          catalog,
          scheduledAt,
          virtPassed
        );

        // READY set using real prereqs & offerings; special-case only WIA3001 TAKEN-before rule
        const ready = [];
        const skipped = []; // [{code, reason}]
        for (const code of remain) {
          if (!catalog.has(code)) {
            ready.push(code);
            continue;
          }

          // WIA3001: must have TAKEN all cores (except 3002/3003) BEFORE this semester,
          // and it must be alone in its semester (no other courses).
          if (code === "WIA3001") {
            if (!isAvailableThisSem(code, catalog.get(code).mask, s)) continue;
            let ok = true;
            const missing = [];
            for (const c of wia3001CoreMustBeTaken) {
              if (!isTakenBefore(c, y, s, scheduledAt, virtTaken)) {
                ok = false;
                missing.push(c);
              }
            }
            if (!ok) {
              skipped.push({
                code,
                reason: `WIA3001 blocked: need TAKEN-before cores: ${missing.join(
                  ", "
                )}`,
              });
              continue;
            }
            // passes TAKEN-before rule
            ready.push(code);
            continue;
          }

          // WIA3003 must be taken immediately AFTER WIA3002 is completed (passed)
          if (code === "WIA3003") {
            // If we already have a target Y/S for WIA3003, only allow exactly there
            if (mustPlaceWIA3003At && !forceWIA3003Here) {
              skipped.push({
                code,
                reason: `Must be scheduled immediately after WIA3002 at Y${mustPlaceWIA3003At.y}S${mustPlaceWIA3003At.s}`,
              });
              continue;
            }
            // Otherwise only if WIA3002 is already completed before this sem
            if (!virtPassed.has("WIA3002")) {
              skipped.push({
                code,
                reason:
                  "Requires WIA3002 to be completed in the previous semester.",
              });
              continue;
            }
            if (!prereqsSatisfiedBefore(code, y, s)) {
              skipped.push({
                code,
                reason:
                  "Prereqs not satisfied: " +
                  listMissingPrereqs(code, y, s).join("; "),
              });
              continue;
            }
            if (!isAvailableThisSem(code, catalog.get(code).mask, s)) {
              skipped.push({ code, reason: "Not offered this semester" });
              continue;
            }
            ready.push(code);
            continue;
          }

          // WIA3002/WIA3003: treat as normal — rely on real prereqs + offerings.
          if (!prereqsSatisfiedBefore(code, y, s)) {
            skipped.push({
              code,
              reason:
                "Prereqs not satisfied: " +
                listMissingPrereqs(code, y, s).join("; "),
            });
            continue;
          }
          if (!isAvailableThisSem(code, catalog.get(code).mask, s)) {
            skipped.push({ code, reason: "Not offered this semester" });
            continue;
          }
          ready.push(code);
        }

        // If we were supposed to place WIA3003 here but it wasn't ready, relax with a warning
        if (forceWIA3003Here && !ready.includes("WIA3003")) {
          warnings.push(
            `Could not place WIA3003 immediately after WIA3002 at Y${y}S${s} due to offerings or prerequisites; it will be scheduled as soon as possible.`
          );
          mustPlaceWIA3003At = null;
        }

        const defaultCodesThisSem = (
          normalizedDefaultMap[`Year ${y}`]?.[`Semester ${s}`] || []
        ).filter((code) => remain.has(code));

        const setDefault = new Set(defaultCodesThisSem);
        const readyDefaultFirst = ready.filter((c) => setDefault.has(c));
        const readyOthers = ready.filter((c) => !setDefault.has(c));

        // Keep your existing scoring for ties / the non-default fill
        readyOthers.sort(
          (a, b) => score(b, { urgentPrereqs }) - score(a, { urgentPrereqs })
        );
        readyDefaultFirst.sort(
          (a, b) => score(b, { urgentPrereqs }) - score(a, { urgentPrereqs })
        );

        // Use this new order for choosing
        const prioritized = [...readyDefaultFirst, ...readyOthers];

        // Demote WIA3001 so it naturally drifts later; we will place it ALONE.
        const onlyWIA3001Remains = remain.size === 1 && remain.has("WIA3001");
        if (!onlyWIA3001Remains) {
          const idxW1 = prioritized.indexOf("WIA3001");
          if (idxW1 !== -1) {
            prioritized.splice(idxW1, 1);
          }
        }
        // If WIA3003 must be here, make sure it is first
        if (forceWIA3003Here) {
          const idx3 = prioritized.indexOf("WIA3003");
          if (idx3 !== -1) {
            prioritized.splice(idx3, 1);
            prioritized.unshift("WIA3003");
          }
        }

        const chosen = [...base];
        const chosenSet = new Set(base);
        for (const c of prioritized) {
          if (chosenSet.has(c)) continue;
          const addCr = catalog.get(c)?.credits ?? 3;
          if (c === "WIA3001") {
            // Must be alone in this semester
            chosen.length = 0;
            chosenSet.clear();
            chosen.push(c);
            credits = addCr;
            break;
          }
          if (credits + addCr > absoluteCap) continue;
          if (credits + addCr > maxPerSem) continue;
          // Keep loads balanced: don't exceed the target unless WIA3003 is forced here
          if (
            credits + addCr > targetCr &&
            !(forceWIA3003Here && c === "WIA3003")
          ) {
            continue;
          }

          chosen.push(c);
          chosenSet.add(c);
          credits += addCr;
        }

        const defaultHasElectiveHere = (
          normalizedDefaultMap[`Year ${y}`]?.[`Semester ${s}`] || []
        ).some((code) => String(code).startsWith("SPECIALIZATION_"));

        // Drop SPECIALIZATION electives if there’s headroom
        if (defaultHasElectiveHere && !chosen.includes("WIA3001")) {
          while (
            specializationNeeded > 0 &&
            credits + 3 <= Math.min(perSemCap, targetCr)
          ) {
            let elect = null;
            for (let i = 0; i < electiveQueue.length; i++) {
              const ecode = electiveQueue[i];
              if (!catalog.has(ecode)) continue;
              if (!prereqsSatisfiedBefore(ecode, y, s)) continue;
              if (!isAvailableThisSem(ecode, catalog.get(ecode).mask, s))
                continue;
              elect = ecode;
              electiveQueue.splice(i, 1);
              break;
            }
            if (!elect) break;
            chosen.push(elect);
            credits += catalog.get(elect).credits || 3;
            specializationNeeded--;
            remain.delete(elect);
            virtPassed.add(elect);
            scheduledAt.set(elect, { y, s });
          }
        }

        if (
          specializationNeeded > 0 &&
          !(remain.size === 1 && remain.has("WIA3001")) &&
          !chosen.includes("WIA3001")
        ) {
          // Only add as many programme electives as still required to reach 10 total
          while (
            specializationNeeded > 0 &&
            credits + 3 <= Math.min(perSemCap, targetCr)
          ) {
            let elect = null;
            for (let i = 0; i < electiveQueue.length; i++) {
              const ecode = electiveQueue[i];
              if (!catalog.has(ecode)) continue;
              if (!prereqsSatisfiedBefore(ecode, y, s)) continue;
              if (!isAvailableThisSem(ecode, catalog.get(ecode).mask, s))
                continue;
              elect = ecode;
              electiveQueue.splice(i, 1);
              break;
            }
            if (!elect) break;
            chosen.push(elect);
            credits += catalog.get(elect).credits || 3;
            virtPassed.add(elect);
            scheduledAt.set(elect, { y, s });
            specializationNeeded--;
          }
        }

        plan[yearKey][semKey] = chosen.slice().sort();

        for (const c of chosen) {
          virtPassed.add(c);
          virtTaken.add(c);
          remain.delete(c);
          scheduledAt.set(c, { y, s });

          if (c === SHE4_CODE) remain.delete(KIAR_CODE);
          if (c === KIAR_CODE) remain.delete(SHE4_CODE);

          if (c === "WIA3002" && !passed.has("WIA3003")) {
            mustPlaceWIA3003At = nextSemester(y, s);
          }
          if (c === "WIA3003" && forceWIA3003Here) {
            mustPlaceWIA3003At = null;
          }
        }

        if (remain.size === 0 && specializationNeeded === 0) {
          planningDone = true;
          break;
        }
      }
      if (planningDone) break;
    }

    if (!planningDone && (remain.size > 0 || specializationNeeded > 0)) {
      // ---- Phase 2: allow Year 5 only if needed ----
      const startYearPhase2 = FINISH_BY_YEAR + 1;
      for (
        let y5 = startYearPhase2;
        y5 <= MAX_YEARS_HARD_CAP &&
        (remain.size > 0 || specializationNeeded > 0);
        y5++
      ) {
        const yearKey = `Year ${y5}`;
        if (!plan[yearKey]) plan[yearKey] = {};

        for (let s = 1; s <= 2; s++) {
          const forceWIA3003Here =
            mustPlaceWIA3003At &&
            mustPlaceWIA3003At.y === y5 &&
            mustPlaceWIA3003At.s === s;

          const semKey = `Semester ${s}`;
          const ysKey = keyYS(y5, s);

          // Respect gap/outbound semesters
          if (gapSemKeys.has(ysKey) || outboundSemKeys.has(ysKey)) {
            if (forceWIA3003Here) {
              warnings.push(
                `Could not schedule WIA3003 immediately after WIA3002 at Y${y5}S${s} because this semester is ${
                  gapSemKeys.has(ysKey) ? "a Gap Semester" : "Outbound"
                }. It will be scheduled as soon as possible.`
              );
              mustPlaceWIA3003At = null;
            }
            plan[yearKey][semKey] = gapSemKeys.has(ysKey)
              ? ["GAP SEMESTER"]
              : ["OUTBOUND"];
            continue;
          }

          const base = [];
          let credits = sumCredits(base, catalog);

          const perSemCap = Math.min(absoluteCap, maxPerSem);
          const openSemesters = countOpenSemestersFrom(
            y5,
            s,
            gapYears,
            gapSemKeys,
            outboundSemKeys,
            /*untilYear*/ MAX_YEARS_HARD_CAP
          );
          const remainingCreditsEstimate = estimateRemainingCredits(
            remain,
            new Set(base),
            catalog,
            specializationNeeded
          );
          const minAim = preferLight ? 12 : 15;
          let targetCr = Math.round(remainingCreditsEstimate / openSemesters);
          targetCr = clamp(targetCr, minAim, perSemCap);
          targetCr = Math.max(targetCr, credits);

          const ready = [];
          for (const code of remain) {
            if (!catalog.has(code)) {
              ready.push(code);
              continue;
            }

            if (code === "WIA3001") {
              if (!isAvailableThisSem(code, catalog.get(code).mask, s))
                continue;
              let ok = true;
              for (const core of wia3001CoreMustBeTaken) {
                if (!isTakenBefore(core, y5, s, scheduledAt, virtTaken)) {
                  ok = false;
                  break;
                }
              }
              if (!ok) continue;
              ready.push(code);
              continue;
            }

            if (code === "WIA3003") {
              if (mustPlaceWIA3003At && !forceWIA3003Here) continue;
              if (!virtPassed.has("WIA3002")) continue;
              if (!prereqsSatisfiedBefore(code, y5, s)) continue;
              if (!isAvailableThisSem(code, catalog.get(code).mask, s))
                continue;
              ready.push(code);
              continue;
            }

            if (!prereqsSatisfiedBefore(code, y5, s)) continue;
            if (!isAvailableThisSem(code, catalog.get(code).mask, s)) continue;
            ready.push(code);
          }

          const defaultCodesThisSem2 = (
            normalizedDefaultMap[`Year ${y5}`]?.[`Semester ${s}`] || []
          ).filter((code) => remain.has(code));

          const setDefault2 = new Set(defaultCodesThisSem2);
          const readyDefaultFirst2 = ready.filter((c) => setDefault2.has(c));
          const readyOthers2 = ready.filter((c) => !setDefault2.has(c));
          readyOthers2.sort((a, b) => score(b, {}) - score(a, {}));
          readyDefaultFirst2.sort((a, b) => score(b, {}) - score(a, {}));
          const prioritized2 = [...readyDefaultFirst2, ...readyOthers2];

          // Keep WIA3001 alone unless it’s the only thing left
          const onlyWIA3001Remains2 =
            remain.size === 1 && remain.has("WIA3001");
          if (!onlyWIA3001Remains2) {
            const idxW1b = prioritized2.indexOf("WIA3001");
            if (idxW1b !== -1) prioritized2.splice(idxW1b, 1);
          }
          if (forceWIA3003Here) {
            const idx3b = prioritized2.indexOf("WIA3003");
            if (idx3b !== -1) {
              prioritized2.splice(idx3b, 1);
              prioritized2.unshift("WIA3003");
            }
          }

          const chosen = [];
          for (const c of prioritized2) {
            const addCr = catalog.get(c)?.credits ?? 3;
            if (c === "WIA3001") {
              chosen.length = 0;
              chosen.push("WIA3001");
              credits = addCr;
              break;
            }
            if (credits + addCr > absoluteCap) continue;
            if (credits + addCr > maxPerSem) continue;
            if (
              credits + addCr > targetCr &&
              !(forceWIA3003Here && c === "WIA3003")
            )
              continue;
            chosen.push(c);
            credits += addCr;
          }

          if (!chosen.includes("WIA3001")) {
            // Place SPECIALIZATION electives first
            while (
              specializationNeeded > 0 &&
              credits + 3 <= Math.min(perSemCap, targetCr)
            ) {
              let elect = null;
              for (let i = 0; i < electiveQueue.length; i++) {
                const ecode = electiveQueue[i];
                if (!catalog.has(ecode)) continue;
                if (!prereqsSatisfiedBefore(ecode, y5, s)) continue;
                if (!isAvailableThisSem(ecode, catalog.get(ecode).mask, s))
                  continue;
                elect = ecode;
                electiveQueue.splice(i, 1);
                break;
              }
              if (!elect) break;
              chosen.push(elect);
              credits += catalog.get(elect).credits || 3;
              specializationNeeded--;
              remain.delete(elect);
              virtPassed.add(elect);
              scheduledAt.set(elect, { y: y5, s });
            }
            // (Intentionally no additional elective “fillers” beyond the required 10)
          }

          plan[yearKey][semKey] = chosen.slice().sort();
          for (const c of chosen) {
            virtPassed.add(c);
            virtTaken.add(c);
            remain.delete(c);
            scheduledAt.set(c, { y: y5, s });

            if (c === SHE4_CODE) remain.delete(KIAR_CODE);
            if (c === KIAR_CODE) remain.delete(SHE4_CODE);

            if (c === "WIA3002" && !passed.has("WIA3003")) {
              mustPlaceWIA3003At = nextSemester(y5, s);
            }
            if (c === "WIA3003" && forceWIA3003Here) {
              mustPlaceWIA3003At = null;
            }
          }

          if (remain.size === 0 && specializationNeeded === 0) break;
        }

        if (remain.size === 0 && specializationNeeded === 0) break;
      }
    }

    const planYears = Object.keys(plan).map((k) =>
      parseInt(k.replace("Year ", ""), 10)
    );
    const maxYearUsed = planYears.length ? Math.max(...planYears) : 4;
    if (maxYearUsed > 4) {
      warnings.push(
        `Plan extended to Year ${maxYearUsed} to satisfy offerings/prerequisites/credit caps.`
      );
    }

    // If anything remains unscheduled, warn
    if (remain.size > 0 || specializationNeeded > 0) {
      const extras =
        specializationNeeded > 0
          ? [`SPECIALIZATION x${specializationNeeded}`]
          : [];

      const others = [...remain].concat(extras);
      if (others.length) {
        warnings.push(
          "Some courses could not be placed due to offerings, prerequisites, or credit caps: " +
            others.join(", ")
        );
      }
    }

    // Turn any empty years into {}
    for (const y of Object.keys(plan)) {
      for (const s of SEM_NAMES) {
        if (!plan[y][s]) plan[y][s] = [];
      }
    }

    compactPlannerTailOneStep(
      plan,
      catalog,
      prereqGraph,
      scheduledAt,
      virtPassed,
      gapYears,
      gapSemKeys,
      outboundSemKeys
    );
    const compacted = pruneEmptyYears(plan, gapYears);
    if (mustPlaceWIA3003At && !scheduledAt.get("WIA3003")) {
      warnings.push(
        "WIA3003 could not be scheduled immediately after WIA3002; it will be placed as early as offerings/prerequisites allow."
      );
    }
    return { success: true, plan: compacted, warnings };
  } catch (err) {
    console.error("Fast planner error:", err);
    return {
      success: false,
      message: "Failed to generate study plan",
      error: String(err?.message || err),
    };
  }
}

/** ===== Helpers (credits, topo levels) ===== **/

function sumCredits(codes, catalog) {
  let t = 0;
  for (const c of codes) t += catalog.get(c)?.credits ?? 3;
  return t;
}

// Compute a simple topological “level” (distance from sources) for prioritization
function computeTopoLevels(graph) {
  // graph: code -> Set(prereqs)
  const indeg = new Map();
  const children = new Map();
  for (const [v, reqs] of graph.entries()) {
    indeg.set(v, reqs.size);
    for (const r of reqs) {
      if (!children.has(r)) children.set(r, new Set());
      children.get(r).add(v);
    }
  }
  const q = [];
  const level = new Map();
  for (const [v, d] of indeg.entries()) {
    if (d === 0) {
      q.push(v);
      level.set(v, 0);
    }
  }

  while (q.length) {
    const u = q.shift();
    for (const v of children.get(u) || []) {
      indeg.set(v, indeg.get(v) - 1);
      if (indeg.get(v) === 0) {
        level.set(v, Math.max(level.get(v) || 0, (level.get(u) || 0) + 1));
        q.push(v);
      }
    }
  }
  return level;
}

function pruneEmptyYears(plan, gapYears) {
  const yearKeys = Object.keys(plan).sort(
    (a, b) =>
      parseInt(a.replace("Year ", "")) - parseInt(b.replace("Year ", ""))
  );
  const newPlan = {};
  for (const yk of yearKeys) {
    const y = parseInt(yk.replace("Year ", ""));
    const s1 = plan[yk]["Semester 1"] || [];
    const s2 = plan[yk]["Semester 2"] || [];
    const bothEmpty = s1.length === 0 && s2.length === 0;
    if (bothEmpty && !gapYears.has(y)) continue; // drop empty non-gap years
    newPlan[yk] = plan[yk]; // keep real labels
  }
  return newPlan;
}

// Compare (y1,s1) < (y2,s2)
function isBefore(y1, s1, y2, s2) {
  return y1 < y2 || (y1 === y2 && s1 < s2);
}

function isTakenBefore(code, y, s, scheduledAt, virtTaken) {
  if (virtTaken.has(code)) return true; // taken historically
  const at = scheduledAt.get(code);
  return !!(at && isBefore(at.y, at.s, y, s));
}

function isPassedBefore(code, y, s, scheduledAt, virtPassed) {
  // virtPassed includes historical passes AND anything we've scheduled,
  // but a same-semester placement should NOT satisfy a "before" constraint.
  if (!virtPassed.has(code)) return false;
  const at = scheduledAt.get(code);
  if (!at) return true; // historical pass
  return isBefore(at.y, at.s, y, s);
}

function nextSemester(y, s) {
  return s === 1 ? { y, s: 2 } : { y: y + 1, s: 1 };
}

// Validate that all course codes in semesterMapping exist in the catalog.
// Returns { missingCodes: string[], normalizedDefaultMap: object }
function validateSemesterMappingCourses(allCourses, defaultMap) {
  const codesInCatalog = new Set(allCourses.map((c) => c.course_code));
  const missing = new Set();
  const normalized = {};

  const years = Object.keys(defaultMap)
    .map((y) => +y.replace("Year ", ""))
    .sort((a, b) => a - b);

  for (const y of years) {
    const yearKey = `Year ${y}`;
    normalized[yearKey] = {};
    for (let s = 1; s <= 2; s++) {
      const semKey = `Semester ${s}`;
      const list = defaultMap[yearKey]?.[semKey] || [];
      const normalizedList = [];
      for (const code of list) {
        if (String(code).startsWith("SPECIALIZATION_")) {
          // keep placeholder (planner fills with programme_elective later)
          normalizedList.push(code);
          continue;
        }
        if (!codesInCatalog.has(code)) {
          missing.add(code);
          // still keep it so UI shows intended plan; planner treats unknowns as 3-credit cores
          normalizedList.push(code);
        } else {
          normalizedList.push(code);
        }
      }
      normalized[yearKey][semKey] = normalizedList;
    }
  }

  return {
    missingCodes: Array.from(missing),
    normalizedDefaultMap: normalized,
  };
}

// Build a simple chronological list of [ {year, sem, codes[]} ] from a default map
function listDefaultSemesters(defaultMap) {
  const out = [];
  const years = Object.keys(defaultMap)
    .map((y) => +y.replace("Year ", ""))
    .sort((a, b) => a - b);
  for (const y of years) {
    for (let s = 1; s <= 2; s++) {
      const semKey = `Semester ${s}`;
      out.push({ y, s, codes: defaultMap[`Year ${y}`]?.[semKey] || [] });
    }
  }
  return out;
}

// Return the default semesters array index for (y,s)
function indexOfYS(defaultList, y, s) {
  return defaultList.findIndex((row) => row.y === y && row.s === s);
}

// Given upcoming default semesters, collect prereqs we should try to pull earlier
function computeUrgentPrereqsForUpcoming(
  defaultList,
  curY,
  curS,
  windowLen,
  prereqGraph,
  remain,
  _unusedCatalog,
  scheduledAt,
  virtPassed
) {
  const urgent = new Set();
  const startIdx = indexOfYS(defaultList, curY, curS);
  if (startIdx < 0) return urgent;

  const endIdx = Math.min(defaultList.length - 1, startIdx + windowLen - 1);
  for (let i = startIdx; i <= endIdx; i++) {
    const { y, s, codes } = defaultList[i];
    for (const code of codes) {
      if (!remain.has(code)) continue; // already placed or not required
      // This course is desired in default YS. If it's blocked by prereqs, pull them earlier.
      const reqs = prereqGraph.get(code);
      if (!reqs || reqs.size === 0) continue;

      // prereqs satisfied strictly before that default semester?
      let ok = true;
      for (const r of reqs) {
        if (!isPassedBefore(r, y, s, scheduledAt, virtPassed)) {
          ok = false;
          break;
        }
      }
      if (!ok) {
        for (const r of reqs) {
          if (!isPassedBefore(r, y, s, scheduledAt, virtPassed)) {
            urgent.add(r);
          }
        }
      }
    }
  }
  return urgent;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function estimateRemainingCredits(
  remain,
  excludeSet,
  catalog,
  specializationNeeded
) {
  let sum = 0;
  for (const code of remain) {
    if (excludeSet && excludeSet.has(code)) continue;
    sum += catalog.get(code)?.credits ?? 3;
  }
  sum += (specializationNeeded || 0) * 3;
  return sum;
}

// Count future open semesters from (curY, curS) up to the configured hard cap (skips gap/outbound)
function countOpenSemestersFrom(
  curY,
  curS,
  gapYears,
  gapSemKeys,
  outboundSemKeys,
  untilYear = MAX_YEARS_HARD_CAP
) {
  let n = 0;
  for (let y = curY; y <= untilYear; y++) {
    if (gapYears.has(y)) continue; // whole year closed
    for (let s = y === curY ? curS : 1; s <= 2; s++) {
      const key = keyYS(y, s);
      if (gapSemKeys.has(key) || outboundSemKeys.has(key)) continue;
      n++;
    }
  }
  return Math.max(1, n); // never 0 to avoid divide-by-zero
}

// Move the final non-empty Y+1 S1 bucket into the previous year's Semester 2
// if that target slot is empty, not a gap/outbound, offerings allow it, and prereqs are satisfied.
// Won't move if WIA3001 is involved.
function compactPlannerTailOneStep(
  plan,
  catalog,
  prereqGraph,
  scheduledAt,
  virtPassed,
  gapYears,
  gapSemKeys,
  outboundSemKeys
) {
  // Find last non-empty (ignoring GAP/OUTBOUND labels)
  const years = Object.keys(plan)
    .map((k) => parseInt(k.replace("Year ", ""), 10))
    .sort((a, b) => a - b);
  let endY = null,
    endS = null;

  for (let i = years.length - 1; i >= 0; i--) {
    const yk = `Year ${years[i]}`;
    for (let s = 2; s >= 1; s--) {
      const list = plan[yk]?.[`Semester ${s}`] || [];
      const meaningful = list.filter(
        (c) => !["GAP YEAR", "GAP SEMESTER", "OUTBOUND"].includes(c)
      );
      if (meaningful.length > 0) {
        endY = years[i];
        endS = s;
        break;
      }
    }
    if (endY !== null) break;
  }
  if (endY === null || endS !== 1) return; // only compact when final slot is an S1

  const prevY = endY - 1,
    prevS = 2;
  if (prevY < 1) return;
  if (gapYears.has(prevY)) return;

  const prevKey = `Y${prevY}S${prevS}`;
  if (gapSemKeys.has(prevKey) || outboundSemKeys.has(prevKey)) return;

  const endKey = `Year ${endY}`;
  const endList = (plan[endKey]?.["Semester 1"] || []).slice();
  const containsWIA3001 = endList.includes("WIA3001");
  if (containsWIA3001) return;

  // Target prev slot must be empty
  const prevYearKey = `Year ${prevY}`;
  const prevList = plan[prevYearKey]?.["Semester 2"] || [];
  const prevMeaningful = prevList.filter(
    (c) => !["GAP YEAR", "GAP SEMESTER", "OUTBOUND"].includes(c)
  );
  if (prevMeaningful.length > 0) return;

  // Offerings + prereqs check
  const isAvailableThisSem = (code, s) => {
    const info = catalog.get(code);
    if (!info) return true;
    return (info.mask & (s === 1 ? 0b01 : 0b10)) !== 0;
  };
  const isBefore = (y1, s1, y2, s2) => y1 < y2 || (y1 === y2 && s1 < s2);
  const isPassedBefore = (code, y, s) => {
    if (!virtPassed.has(code)) return false;
    const at = scheduledAt.get(code);
    if (!at) return true;
    return isBefore(at.y, at.s, y, s);
  };

  for (const code of endList) {
    if (["GAP YEAR", "GAP SEMESTER", "OUTBOUND"].includes(code)) return;
    if (!isAvailableThisSem(code, 2)) return;

    const reqs = prereqGraph.get(code) || new Set();
    for (const r of reqs) {
      if (!isPassedBefore(r, prevY, 2)) return;
    }
  }

  // All clear -> move
  if (!plan[prevYearKey]) plan[prevYearKey] = {};
  plan[prevYearKey]["Semester 2"] = endList;
  plan[endKey]["Semester 1"] = [];

  // Update scheduledAt positions
  for (const code of endList) {
    scheduledAt.set(code, { y: prevY, s: 2 });
  }
}
