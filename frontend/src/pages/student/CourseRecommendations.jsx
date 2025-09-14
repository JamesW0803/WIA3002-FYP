import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  BookOpenCheck,
  Calendar,
  Check,
  GraduationCap,
  Info,
  Lightbulb,
  NotebookPen,
} from "lucide-react";
import axiosClient from "../../api/axiosClient";
import semesterMapping from "../../constants/semesterMapping";
import generateCustomPlan from "../../utils/generateCustomPlan";
import getRemainingCourses from "../../utils/getRemainingCourses";
import { findNextSemesterToPlan } from "../../components/Students/AcademicPlanner/utils/planHelpers";
import { resolveDefaultPlanCourses } from "../../utils/defaultPlanResolver";

const CourseRecommendations = () => {
  const [generatedPlan, setGeneratedPlan] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [defaultPlan, setDefaultPlan] = useState([]);
  const [expandedYears, setExpandedYears] = useState(() => {
    const initialState = {};
    Object.keys(semesterMapping).forEach((year) => {
      initialState[year] = true;
    });
    return initialState;
  });
  const [planMode, setPlanMode] = useState("regular");
  const [selection, setSelection] = useState({
    type: null,
    year: 1,
    sem: 1,
  });
  const [completedEntries, setCompletedEntries] = useState([]);
  const [remainingCourses, setRemainingCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [prerequisiteDetails, setPrerequisiteDetails] = useState([]);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [gapModalOpen, setGapModalOpen] = useState(false);
  const [gapYears, setGapYears] = useState([]);
  const [gapSemesters, setGapSemesters] = useState([]);
  const [outboundSemesters, setOutboundSemesters] = useState([]);
  const [followsDefault, setFollowsDefault] = useState(true);
  const [planWarnings, setPlanWarnings] = useState([]);

  const resetGaps = React.useCallback(() => {
    setGapYears([]);
    setGapSemesters([]);
    setOutboundSemesters([]);
  }, []);

  // --- helpers for default-first logic ---
  const SPECIALIZATION_PREFIX = "SPECIALIZATION_";

  const countSpecializationSlots = (mapping) =>
    Object.values(mapping).reduce(
      (acc, sems) =>
        acc +
        Object.values(sems)
          .flat()
          .filter((c) => String(c).startsWith(SPECIALIZATION_PREFIX)).length,
      0
    );

  // Build a quick lookup of passed courses
  const getPassedCodes = (entries) => {
    const s = new Set();
    for (const e of entries || [])
      if (e.status === "Passed" && e.course?.course_code)
        s.add(e.course.course_code);
    return s;
  };

  const passedSet = React.useMemo(
    () => getPassedCodes(completedEntries),
    [completedEntries]
  );

  const specializationSlotsNeeded = React.useMemo(() => {
    const totalSlots = countSpecializationSlots(semesterMapping);
    const typeByCode = new Map(allCourses.map((c) => [c.course_code, c.type]));
    let passedElectives = 0;
    for (const code of passedSet) {
      if (typeByCode.get(code) === "programme_elective") passedElectives++;
    }
    return Math.max(0, totalSlots - passedElectives);
  }, [allCourses, passedSet]);

  // Map default plan (semesterMapping) -> { "Y1S1":[codes], ... }
  const flattenDefaultToYS = () => {
    const out = {};
    Object.entries(semesterMapping).forEach(([year, sems]) => {
      const y = +year.replace("Year ", "");
      Object.entries(sems).forEach(([semName, codes]) => {
        const s = +semName.replace("Semester ", "");
        out[`Y${y}S${s}`] = codes.slice();
      });
    });
    return out;
  };

  // Was the student following the default mapping so far?
  // Rule: for each completed semester, the taken set must match the default set,
  // with leniency for SPECIALIZATION placeholders: any programme_elective taken in that semester may “satisfy” a placeholder.
  const isFollowingDefaultSoFar = (entries, allCourses) => {
    if (!entries?.length) return true;

    const defaultYS = flattenDefaultToYS();

    // Group student's taken (passed or failed) by YS
    const takenByYS = {};
    for (const e of entries) {
      const code = e.course?.course_code;
      if (!code || !e.year || !e.semester) continue;
      const k = `Y${e.year}S${e.semester}`;
      if (!takenByYS[k]) takenByYS[k] = [];
      takenByYS[k].push(code);
    }

    // quick type lookup
    const typeByCode = new Map(allCourses.map((c) => [c.course_code, c.type]));

    for (const [ys, takenList] of Object.entries(takenByYS)) {
      const expected = (defaultYS[ys] || []).slice();
      const expectedSet = new Set(
        expected.filter((c) => !String(c).startsWith(SPECIALIZATION_PREFIX))
      );
      let specCount = expected.filter((c) =>
        String(c).startsWith(SPECIALIZATION_PREFIX)
      ).length;

      // Count student programme_electives in this semester (to satisfy SPECIALIZATION)
      let studentElectives = 0;
      for (const code of takenList) {
        const t = typeByCode.get(code);
        if (t === "programme_elective") studentElectives++;
      }

      // All non-specialization codes must match exactly (ignoring order)
      const takenSet = new Set(
        takenList.filter((c) => typeByCode.get(c) !== "programme_elective")
      );
      for (const need of expectedSet) {
        if (!takenSet.has(need)) return false;
      }
      // And all SPECIALIZATION slots must be satisfied by the count of electives taken that semester
      if (studentElectives < specCount) return false;

      // Finally, ensure the student didn’t take surplus non-default cores in that semester
      for (const code of takenSet) {
        if (!expectedSet.has(code)) return false;
      }
    }
    return true;
  };

  // --- gap-aware default-follow continuation ---
  const buildDefaultFollowingPlanWithGaps = (
    startY,
    startS,
    allCourses,
    passedSet,
    {
      gapYears = [],
      gapSemesters = [],
      outboundSemesters = [],
      backshiftToEarliestIncomplete = true,
      maxElectivesToPlace = Infinity,
    } = {}
  ) => {
    const SHE4_CODE = "SHE4444";
    const KIAR_CODE = "GQX0056";

    const offeredThisSem = (course, semNum) => {
      const arr = course?.offered_semester;
      if (!Array.isArray(arr) || arr.length === 0) return true; // treat empty as both sems
      return arr.includes(`Semester ${semNum}`);
    };
    const pickElectiveForSem = (semNum) => {
      // pick the first programme elective in the queue that is offered this semester
      for (let i = electivePtr; i < electiveQueue.length; i++) {
        const code = electiveQueue[i];
        const c = courseByCode.get(code);
        if (c && offeredThisSem(c, semNum)) {
          // remove from queue and return
          electiveQueue.splice(i, 1);
          return code;
        }
      }
      return null;
    };

    // flags/queues for special handling
    let pickedEither = passedSet.has(SHE4_CODE) || passedSet.has(KIAR_CODE);
    const electiveQueue = allCourses
      .filter(
        (c) => c.type === "programme_elective" && !passedSet.has(c.course_code)
      )
      .map((c) => c.course_code);
    let electivePtr = 0;

    let electivesLeft = Number.isFinite(maxElectivesToPlace)
      ? maxElectivesToPlace
      : Infinity;

    // fast lookup
    const courseByCode = new Map(allCourses.map((c) => [c.course_code, c]));

    // flatten default mapping as an ordered list of semesters from the *default* plan
    const defList = [];
    const years = Object.keys(semesterMapping)
      .map((y) => +y.replace("Year ", ""))
      .sort((a, b) => a - b);

    for (const y of years) {
      for (let s = 1; s <= 2; s++) {
        const codes = semesterMapping[`Year ${y}`]?.[`Semester ${s}`] || [];
        defList.push({ y, s, codes: codes.slice() });
      }
    }

    // start consuming the *default* semesters from the student's next sem
    let startIdx = defList.findIndex(
      (row) => row.y > startY || (row.y === startY && row.s >= startS)
    );
    if (startIdx === -1) startIdx = defList.length; // nothing left

    const firstNeededIdx = backshiftToEarliestIncomplete
      ? defList.findIndex(({ codes }) =>
          codes.some((code) => {
            if (!String(code).startsWith(SPECIALIZATION_PREFIX)) {
              return !passedSet.has(code);
            }
            return false;
          })
        )
      : -1;

    if (
      backshiftToEarliestIncomplete &&
      firstNeededIdx !== -1 &&
      firstNeededIdx < startIdx
    ) {
      startIdx = firstNeededIdx;
    }

    // sets for gap/outbound selection
    const gapYearSet = new Set(gapYears);
    const gapSemSet = new Set(
      (gapSemesters || []).map((t) =>
        typeof t === "string" ? t : `Y${t.year}S${t.sem}`
      )
    );
    const outboundSemSet = new Set(
      (outboundSemesters || []).map((t) =>
        typeof t === "string" ? t : `Y${t.year}S${t.sem}`
      )
    );

    // calendar cursor where we will *place* semesters (can go beyond Year 4)
    let calY = startY;
    let calS = startS;

    const advanceCal = () => {
      if (calS === 2) {
        calS = 1;
        calY += 1;
      } else {
        calS = 2;
      }
    };

    const out = [];

    // helper to push placeholders
    const pushGapYearRow = () => {
      out.push({
        year: String(calY),
        sem: "-",
        courses: [
          {
            course_code: "GAP_YEAR",
            course_name: "Gap Year (no courses)",
            credit_hours: 0,
            type: "info",
            placeholder: true,
          },
        ],
      });
    };
    const pushGapSemRow = () => {
      out.push({
        year: String(calY),
        sem: String(calS),
        courses: [
          {
            course_code: "GAP_SEMESTER",
            course_name: "Gap Semester (no courses)",
            credit_hours: 0,
            type: "info",
            placeholder: true,
          },
        ],
      });
    };
    const pushOutboundRow = () => {
      out.push({
        year: String(calY),
        sem: String(calS),
        courses: [
          {
            course_code: "OUTBOUND",
            course_name: "Outbound Programme",
            credit_hours: 0,
            type: "info",
            placeholder: true,
          },
        ],
      });
    };

    // We'll consume default semesters AND any pending carry-overs (not offered yet in a prior slot)
    let pending = [];
    while (startIdx < defList.length || pending.length > 0) {
      // whole gap year? (consumes a calendar year, not a default semester)
      if (gapYearSet.has(calY)) {
        pushGapYearRow();
        calY += 1; // jump a whole year; semesters reset to 1 on next loop
        calS = 1;
        continue;
      }

      const key = `Y${calY}S${calS}`;
      if (gapSemSet.has(key)) {
        pushGapSemRow();
        advanceCal();
        continue;
      }
      if (outboundSemSet.has(key)) {
        pushOutboundRow();
        advanceCal();
        continue;
      }

      // Place pending carry-overs first, then the next default semester (if any)
      const nextDefaultCodes =
        startIdx < defList.length ? defList[startIdx++].codes.slice() : [];
      const toProcess = [...pending, ...nextDefaultCodes];
      const carry = [];
      const courses = [];

      for (const code of toProcess) {
        // special OR between SHE4444 and GQX0056: only keep one overall
        if (code === SHE4_CODE || code === KIAR_CODE) {
          if (pickedEither) continue;
          const c = courseByCode.get(code);
          if (c && !passedSet.has(code)) {
            if (offeredThisSem(c, calS)) {
              courses.push(c);
              pickedEither = true;
            } else {
              // try again next calendar slot
              carry.push(code);
            }
          }
          continue;
        }

        // SPECIALIZATION placeholders -> choose next elective not yet passed
        if (String(code).startsWith("SPECIALIZATION_")) {
          // Respect global cap, avoid placeholders, and honor offerings
          if (electivesLeft > 0) {
            const chosen = pickElectiveForSem(calS);
            if (chosen) {
              const c = courseByCode.get(chosen);
              if (c) {
                courses.push(c);
                electivesLeft -= 1;
              }
            }
            // if nothing suitable this semester, we just skip it;
            // the slot will be attempted again in a later semester
          }
          continue;
        }

        // normal course lookup; skip passed
        const c = courseByCode.get(code);
        if (!c) {
          courses.push({
            course_code: code,
            course_name: "Unknown Course",
            credit_hours: 3,
            type: "programme_core",
            placeholder: true,
          });
          continue;
        }
        if (passedSet.has(code)) continue;
        if (offeredThisSem(c, calS)) {
          const normalized =
            c.type === "programme_elective"
              ? { ...c, type: "programme_core" }
              : c;
          courses.push(normalized);
        } else {
          // not offered in this shifted semester—carry to next one
          carry.push(code);
        }
      }

      if (courses.length > 0) {
        out.push({ year: String(calY), sem: String(calS), courses });
      }
      // keep any unplaced items for the next calendar slot
      pending = carry;
      advanceCal();
    }

    let plan = compactTailOneStep(out, allCourses, passedSet);

    // NEW: prefer WIA3003 in S1 and slide WIA3001 to S2 if the pattern fits
    plan = preferWIA3003S1_thenWIA3001S2(plan, allCourses, passedSet, {
      gapSemesters,
      outboundSemesters,
    });

    return plan;
  };

  // === Tail compaction: if the final placed semester is Y+1 S1
  // and Y S2 exists (calendar-wise) but we didn't place anything there,
  // try to pull those courses back into Y S2 if offerings/prereqs allow.
  function compactTailOneStep(planArray, allCourses, passedSet) {
    if (!Array.isArray(planArray) || planArray.length === 0) return planArray;

    // Build quick lookups
    const byYS = new Map(); // "Y{y}S{sem}" -> entry
    const pos = new Map(); // course_code -> {y,s}
    for (const e of planArray) {
      const key = `Y${e.year}S${e.sem}`;
      byYS.set(key, e);
      for (const c of e.courses || [])
        pos.set(c.course_code, { y: +e.year, s: +e.sem });
    }

    const last = planArray[planArray.length - 1];
    const yL = +last.year,
      sL = last.sem === "-" ? 0 : +last.sem;
    if (sL !== 1) return planArray; // only compact when last is S1
    if ((last.courses || []).length === 0) return planArray;

    const prevY = yL - 1,
      prevS = 2;
    if (prevY < 1) return planArray;

    const hasGapYearRow = planArray.some(
      (e) =>
        e.year === String(prevY) &&
        e.sem === "-" &&
        (e.courses || []).some((c) => c.course_code === "GAP_YEAR")
    );
    if (hasGapYearRow) return planArray;

    // If there is already a Y(prev)S2 entry, skip (we won't merge).
    if (byYS.has(`Y${prevY}S${prevS}`)) return planArray;

    // Don’t move placeholders or WIA3001
    const hasWIA3001 = last.courses.some((c) => c.course_code === "WIA3001");
    const hasInfoPlaceholder = last.courses.some(
      (c) =>
        c.course_code === "GAP_YEAR" ||
        c.course_code === "GAP_SEMESTER" ||
        c.course_code === "OUTBOUND"
    );
    if (hasWIA3001 || hasInfoPlaceholder) return planArray;

    // Helpers
    const courseByCode = new Map(allCourses.map((c) => [c.course_code, c]));
    const offeredThisSem = (course, semNum) => {
      const arr = course?.offered_semester;
      if (!Array.isArray(arr) || arr.length === 0) return true;
      return arr.includes(`Semester ${semNum}`);
    };
    const prereqsSatisfiedBefore = (code, y, s) => {
      const course = courseByCode.get(code);
      const reqs = (course?.prerequisites || [])
        .map((p) => (typeof p === "string" ? p : p?.course_code))
        .filter(Boolean);
      if (reqs.length === 0) return true;
      for (const r of reqs) {
        if (passedSet.has(r)) continue; // historically passed
        const at = pos.get(r);
        if (!at) return false; // not in earlier plan and not passed
        if (at.y > y || (at.y === y && at.s >= s)) return false; // not strictly before target
      }
      return true;
    };

    // All last courses must be offered in Semester 2 and have prereqs satisfied by Y(prev)S2
    for (const c of last.courses) {
      const full = courseByCode.get(c.course_code);
      if (!full) return planArray; // unknown -> be conservative
      if (!offeredThisSem(full, 2)) return planArray;
      if (!prereqsSatisfiedBefore(c.course_code, prevY, prevS))
        return planArray;
    }

    // Move them
    const moved = {
      year: String(prevY),
      sem: String(prevS),
      courses: last.courses.slice(),
    };
    const newArr = planArray.slice(0, -1); // drop the last
    newArr.push(moved);

    // Re-sort by calendar order
    newArr.sort(
      (a, b) =>
        a.year - b.year ||
        (a.sem === "-" ? 0 : +a.sem) - (b.sem === "-" ? 0 : +b.sem)
    );
    return newArr;
  }

  // ===== GAP-YEAR CUSTOM OVERRIDE =====
  // Force WIA3003 into Semester 1 after the selected gap year
  const enforceWIA3003AfterGapYear = (
    planArray,
    allCourses,
    passedSet,
    gapYearNum
  ) => {
    // If already passed, nothing to do
    if (passedSet.has("WIA3003")) return { plan: planArray, warnings: [] };

    // Remove any existing WIA3003 from the generated plan first
    let removedCourse = null;
    const cleaned = planArray
      .map((semEntry) => {
        const idx = (semEntry.courses || []).findIndex(
          (c) => c.course_code === "WIA3003"
        );
        if (idx !== -1) {
          removedCourse = semEntry.courses[idx];
          const newCourses = semEntry.courses.slice();
          newCourses.splice(idx, 1);
          return { ...semEntry, courses: newCourses };
        }
        return semEntry;
      })
      // Keep Gap Year rows (sem === "-"), even if they have only the info placeholder
      .filter((e) => e.courses.length > 0 || e.sem === "-");

    // Target slot: Semester 1 immediately AFTER the gap year
    const targetYear = String(Number(gapYearNum) + 1);
    const targetSem = "1";

    // Use the removed real object if available, else pull from DB, else stub
    const courseObj = removedCourse ||
      allCourses.find((x) => x.course_code === "WIA3003") || {
        course_code: "WIA3003",
        course_name: "WIA3003",
        credit_hours: 3,
        type: "programme_core",
        placeholder: true,
      };

    // Ensure a bucket exists for Year targetYear, Sem 1, then insert WIA3003 there
    const idxTarget = cleaned.findIndex(
      (e) => e.year === targetYear && e.sem === targetSem
    );
    if (idxTarget === -1) {
      cleaned.push({ year: targetYear, sem: targetSem, courses: [courseObj] });
    } else {
      cleaned[idxTarget] = {
        ...cleaned[idxTarget],
        courses: [...cleaned[idxTarget].courses, courseObj],
      };
    }

    // Sanity / prerequisite warning if WIA3002 is not clearly scheduled before Y(target)S1
    const findPos = (code) => {
      for (const e of cleaned) {
        if ((e.courses || []).some((c) => c.course_code === code)) {
          return { y: Number(e.year), s: e.sem === "-" ? 0 : Number(e.sem) };
        }
      }
      return null;
    };
    const cmpBefore = (a, b) => a.y < b.y || (a.y === b.y && a.s < b.s); // true if a strictly before b

    const warnings = [];
    if (!passedSet.has("WIA3002")) {
      const pos2 = findPos("WIA3002");
      const target = { y: Number(targetYear), s: 1 };
      if (!pos2 || !cmpBefore(pos2, target)) {
        warnings.push(
          `WIA3003 has been placed at Year ${targetYear} Semester 1 per the Gap Year rule, ` +
            `but WIA3002 is not clearly completed beforehand. Please verify prerequisites with your advisor.`
        );
      }
    }

    return { plan: cleaned, warnings };
  };

  // Ensure WIA3001 appears after a gap year (prefer Y(gap+1) S2, alone)
  const ensureWIA3001AfterGapYear = (
    planArray,
    allCourses,
    passedSet,
    gapYearNum
  ) => {
    if (passedSet.has("WIA3001")) return { plan: planArray, warnings: [] };

    // already present?
    const already = planArray.some((e) =>
      (e.courses || []).some((c) => c.course_code === "WIA3001")
    );
    if (already) return { plan: planArray, warnings: [] };

    const courseObj = allCourses.find((x) => x.course_code === "WIA3001") || {
      course_code: "WIA3001",
      course_name: "WIA3001",
      credit_hours: 3,
      type: "programme_core",
      placeholder: true,
    };

    // Prefer the semester right after your enforced WIA3003 slot
    let y = Number(gapYearNum) + 1;
    let s = 2;

    // find a free calendar slot if Y(gap+1)S2 is taken
    const used = new Set(planArray.map((e) => `Y${e.year}S${e.sem}`));
    while (used.has(`Y${y}S${s}`)) {
      if (s === 2) {
        y += 1;
        s = 1;
      } else {
        s = 2;
      }
    }

    // Insert as a standalone semester
    planArray.push({ year: String(y), sem: String(s), courses: [courseObj] });
    return { plan: planArray, warnings: [] };
  };

  // Build plan with a GAP YEAR and the special WIA3003 rule
  const buildGapYearPlan = (
    startY,
    startS,
    allCourses,
    passedSet,
    { gapYear, maxElectivesToPlace = Infinity }
  ) => {
    // Reuse your gap-aware default follower to shift semesters
    const base = buildDefaultFollowingPlanWithGaps(
      startY,
      startS,
      allCourses,
      passedSet,
      {
        gapYears: [gapYear],
        gapSemesters: [],
        outboundSemesters: [],
        backshiftToEarliestIncomplete: false,
        maxElectivesToPlace,
      }
    );

    const { plan: withWIA3003, warnings: w1 } = enforceWIA3003AfterGapYear(
      base,
      allCourses,
      passedSet,
      gapYear
    );

    const { plan: withWIA3001, warnings: w2 } = ensureWIA3001AfterGapYear(
      withWIA3003,
      allCourses,
      passedSet,
      gapYear
    );

    const compacted = compactTailOneStep(withWIA3001, allCourses, passedSet);
    return { plan: compacted, warnings: [...(w1 || []), ...(w2 || [])] };
  };

  // Build plan with exactly ONE gap semester (or outbound) slot
  const buildGapSemesterOrOutboundPlan = (
    startY,
    startS,
    allCourses,
    passedSet,
    { year, sem, type } // type: "gapSem" | "outbound"
  ) => {
    const opts =
      type === "gapSem"
        ? { gapYears: [], gapSemesters: [{ year, sem }], outboundSemesters: [] }
        : {
            gapYears: [],
            gapSemesters: [],
            outboundSemesters: [{ year, sem }],
          };

    // This already inserts the correct labelled placeholders and shifts the remaining semesters
    return buildDefaultFollowingPlanWithGaps(
      startY,
      startS,
      allCourses,
      passedSet,
      {
        ...opts,
        backshiftToEarliestIncomplete: true,
        maxElectivesToPlace: specializationSlotsNeeded,
      }
    );
  };

  // Convert planner map { "Year 2": { "Semester 1": ["WIA2001", ...], ... }, ... }
  // into your UI array: [{ year:"2", sem:"1", courses:[ courseObjects ] }, ...]
  const convertPlannerMapToUI = (plannerMap, allCourses) => {
    if (!plannerMap) return [];
    const years = Object.keys(plannerMap)
      .map((y) => +y.replace("Year ", ""))
      .sort((a, b) => a - b);

    const out = [];
    for (const y of years) {
      const yKey = `Year ${y}`;
      const s1List = plannerMap[yKey]?.["Semester 1"] || [];
      const s2List = plannerMap[yKey]?.["Semester 2"] || [];
      const isFullGapYear =
        s1List.length === 1 &&
        s1List[0] === "GAP YEAR" &&
        s2List.length === 1 &&
        s2List[0] === "GAP YEAR";
      if (isFullGapYear) {
        // Collapse to a single row for the whole year
        out.push({
          year: String(y),
          sem: "-",
          courses: [
            {
              course_code: "GAP_YEAR",
              course_name: "Gap Year (no courses)",
              credit_hours: 0,
              type: "info",
              placeholder: true,
            },
          ],
        });
        continue; // skip semester-level rows for this year
      }
      for (let s = 1; s <= 2; s++) {
        const list = plannerMap[yKey]?.[`Semester ${s}`] || [];
        if (!list || list.length === 0) continue;

        const courses = list.map((code) => {
          // Show meaningful placeholders for planner markers
          if (code === "GAP YEAR") {
            return {
              course_code: "GAP_YEAR",
              course_name: "Gap Year (no courses)",
              credit_hours: 0,
              type: "info",
              placeholder: true,
            };
          }
          if (code === "GAP SEMESTER") {
            return {
              course_code: "GAP_SEMESTER",
              course_name: "Gap Semester (no courses)",
              credit_hours: 0,
              type: "info",
              placeholder: true,
            };
          }
          if (code === "OUTBOUND") {
            return {
              course_code: "OUTBOUND",
              course_name: "Outbound Programme",
              credit_hours: 0,
              type: "info",
              placeholder: true,
            };
          }

          // Normal courses
          const c = allCourses.find((x) => x.course_code === code);
          return (
            c || {
              course_code: code,
              course_name: "Unknown Course",
              credit_hours: 3,
              type: "programme_core",
              placeholder: true,
            }
          );
        });

        if (courses.length > 0) {
          out.push({ year: String(y), sem: String(s), courses });
        }
      }
    }
    return out;
  };

  const clearPlanningState = React.useCallback(() => {
    // wipe all plan-related UI so we always generate from a clean slate
    setGeneratedPlan([]);
    setPlanWarnings([]);
    setSelectedCourse(null);
    setCourseModalOpen(false);
  }, []);

  // Label helper for KIAR/SHE Cluster 4 "OR"
  const kiarSheLabel = (code, passedSet) => {
    const tookSHE4 = passedSet.has("SHE4444");
    const tookKIAR = passedSet.has("GQX0056");
    const isKIAR = code === "GQX0056";
    const isSHE4 = code === "SHE4444";
    if ((isKIAR || isSHE4) && !(tookSHE4 || tookKIAR)) {
      // show the OR if SHE4 not yet taken
      return `${isKIAR ? "GQX0056 (KIAR)" : "SHE4444 (SHE Cluster 4)"} OR ${
        isKIAR ? "SHE4444 (SHE Cluster 4)" : "GQX0056 (KIAR)"
      }`;
    }
    return null;
  };

  useEffect(() => {
    setFollowsDefault(isFollowingDefaultSoFar(completedEntries, allCourses));
  }, [completedEntries, allCourses]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");

        const [coursesRes, profileRes] = await Promise.all([
          axiosClient.get("/courses", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axiosClient.get(`/academic-profile/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setAllCourses(coursesRes.data);
        setCompletedEntries(profileRes.data.entries);

        const { years, missingCodes } = resolveDefaultPlanCourses(
          semesterMapping,
          coursesRes.data,
          { electiveCreditHours: 3, electiveLabel: "Specialization Elective" }
        );
        setDefaultPlan(years);
        if (missingCodes.length) {
          console.warn(
            "[DefaultPlan] Codes present in semesterMapping but not found in DB:",
            missingCodes
          );
        }

        const remaining = getRemainingCourses(
          coursesRes.data,
          profileRes.data.entries
        );
        setRemainingCourses(remaining);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };

    fetchAllData();
  }, []);

  // Add this function to fetch prerequisite details
  const fetchPrerequisiteDetails = (prereqs) => {
    try {
      const details = prereqs
        .map((pr) => {
          // If already full object, just use it
          if (typeof pr === "object" && pr.course_code) {
            return {
              code: pr.course_code,
              name: pr.course_name,
              credits: pr.credit_hours,
            };
          }

          // Otherwise, lookup by course code
          const course = allCourses.find((c) => c.course_code === pr);
          return course
            ? {
                code: course.course_code,
                name: course.course_name,
                credits: course.credit_hours,
              }
            : null;
        })
        .filter(Boolean);

      setPrerequisiteDetails(details);
    } catch (err) {
      console.error("Failed to fetch prerequisite details:", err);
      setPrerequisiteDetails([]);
    }
  };

  // Update the course card click handler
  const handleCourseClick = async (course) => {
    setSelectedCourse(course);

    // Check if prerequisites exist and are in the correct format
    if (
      course.prerequisites &&
      Array.isArray(course.prerequisites) &&
      course.prerequisites.length > 0
    ) {
      fetchPrerequisiteDetails(course.prerequisites);
    } else {
      setPrerequisiteDetails([]);
    }
    setCourseModalOpen(true);
  };

  const toggleYear = (year) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  // replace current signature
  // replace current signature
  const handleGeneratePlan = async (overrides = {}) => {
    setGeneratedPlan([]);
    setPlanWarnings([]);

    const gy = overrides.gapYears ?? gapYears;
    const gs = overrides.gapSemesters ?? gapSemesters;
    const ob = overrides.outboundSemesters ?? outboundSemesters;
    const mode = overrides.planMode ?? planMode;

    try {
      const { year: y, semester: s } = findNextSemesterToPlan(completedEntries);

      // 1) Gap Year: ALWAYS take default-follow (gap-aware) path
      if (mode === "gapYear") {
        const chosenYear = (gy && gy[0]) || 4;
        const { plan, warnings: extra } = buildGapYearPlan(
          y,
          s,
          allCourses,
          passedSet,
          {
            gapYear: chosenYear,
            maxElectivesToPlace: specializationSlotsNeeded,
          }
        );
        if (extra?.length) setPlanWarnings(extra);
        setGeneratedPlan(plan);
        return;
      }

      // 2) Gap Semester / Outbound: ALWAYS take default-follow (gap-aware) path
      if (mode === "gapSem" || mode === "outbound") {
        const chosen = (mode === "gapSem" ? gs?.[0] : ob?.[0]) || {
          year: y,
          sem: s,
        };
        const cont = buildGapSemesterOrOutboundPlan(
          y,
          s,
          allCourses,
          passedSet,
          { year: chosen.year, sem: chosen.sem, type: mode }
        );
        if (mode === "outbound") {
          setPlanWarnings([
            "You selected an Outbound Programme semester. Please consult your Academic Advisor regarding credit transfer/recognition.",
          ]);
        }
        setGeneratedPlan(cont);
        return;
      }

      // 3) Regular default-follow path (when following default & not lighter)
      if (followsDefault && mode !== "lighter") {
        const cont = buildDefaultFollowingPlanWithGaps(
          y,
          s,
          allCourses,
          passedSet,
          {
            gapYears: gy,
            gapSemesters: gs,
            outboundSemesters: ob,
            maxElectivesToPlace: specializationSlotsNeeded,
          }
        );
        if ((ob?.length || 0) > 0) {
          setPlanWarnings([
            "You selected an Outbound Programme semester. Please consult your Academic Advisor regarding credit transfer/recognition.",
          ]);
        }
        setGeneratedPlan(cont);
        return;
      }

      // 4) Fallback: custom planner
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      const preferences = {
        lightweight: mode === "lighter",
        gapYears: gy,
        gapSemesters: gs,
        outboundSemesters: ob,
      };
      const res = await generateCustomPlan(userId, token, preferences);
      if (res?.success) {
        const uiPlan = convertPlannerMapToUI(res.plan, allCourses);
        setPlanWarnings(res.warnings || []);
        setGeneratedPlan(uiPlan);
      } else {
        const cont = buildDefaultFollowingPlanWithGaps(
          y,
          s,
          allCourses,
          passedSet,
          {
            gapYears: gy,
            gapSemesters: gs,
            outboundSemesters: ob,
            maxElectivesToPlace: specializationSlotsNeeded,
          }
        );
        setPlanWarnings([
          "Custom planner failed — showing default-follow continuation.",
        ]);
        setGeneratedPlan(cont);
      }
    } catch (err) {
      console.error("Error generating plan:", err);
    }
  };

  const handlePlanModeChange = (mode) => {
    clearPlanningState();
    resetGaps();
    setPlanMode(mode);
    setSelection({
      type: ["gapYear", "gapSem", "outbound"].includes(mode) ? mode : null,
      year: 1,
      sem: 1,
    });
    if (["gapYear", "gapSem", "outbound"].includes(mode)) {
      setGapModalOpen(true);
    }
  };

  const adaptivePlanByYear = React.useMemo(() => {
    const grouped = generatedPlan.reduce((acc, semEntry) => {
      const { year } = semEntry;
      (acc[year] ||= []).push(semEntry);
      return acc;
    }, {});
    return Object.entries(grouped).map(([year, sems]) => [
      year,
      sems.sort((a, b) => {
        const A = a.sem === "-" ? 0 : Number(a.sem);
        const B = b.sem === "-" ? 0 : Number(b.sem);
        return A - B;
      }),
    ]);
  }, [generatedPlan]);

  // All programme elective options (you can filter out passed if you prefer)
  const electiveOptions = React.useMemo(() => {
    const passed = getPassedCodes(completedEntries);
    return allCourses
      .filter(
        (c) => c.type === "programme_elective" && !passed.has(c.course_code)
      )
      .map((c) => ({ code: c.course_code, name: c.course_name }));
  }, [allCourses, completedEntries]);

  const isProgrammeElective = (course) =>
    course?.course_code === "SPECIALIZATION" ||
    course?.type === "programme_elective";

  // Title renderer that also handles KIAR/SHE OR
  const CourseTitleText = ({ course }) => {
    const or = kiarSheLabel(course.course_code, passedSet);
    if (or) return <>{or}</>;

    // Nice labels for info placeholders
    if (course.course_code === "GAP_YEAR") return <>Gap Year (no courses)</>;
    if (course.course_code === "GAP_SEMESTER")
      return <>Gap Semester (no courses)</>;
    if (course.course_code === "OUTBOUND") return <>Outbound Programme</>;
    if (course.course_code === "SPECIALIZATION") return <>Programme Elective</>;

    return (
      <>
        {course.course_code}: {course.course_name}
      </>
    );
  };

  // Collapsible "OR choose one of N options" list for electives
  const ElectiveChooser = ({ course }) => {
    if (!isProgrammeElective(course)) return null;
    // (Optional) exclude the currently-chosen elective from the list:
    const list = electiveOptions.filter((o) => o.code !== course.course_code);

    return (
      <details className="mt-1">
        <summary className="text-xs text-blue-600 cursor-pointer">
          OR choose 1 of {list.length} programme electives
        </summary>
        <div className="mt-2 max-h-40 overflow-y-auto text-xs text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {list.map((opt) => (
            <div key={opt.code}>
              {opt.code}: {opt.name}
            </div>
          ))}
        </div>
        <div className="text-[11px] text-gray-500 mt-1">
          Requirement: take any 10 programme electives in total.
        </div>
      </details>
    );
  };

  function preferWIA3003S1_thenWIA3001S2(
    planArray,
    allCourses,
    passedSet,
    { gapSemesters = [], outboundSemesters = [] } = {}
  ) {
    if (!Array.isArray(planArray) || planArray.length === 0) return planArray;

    const courseByCode = new Map(allCourses.map((c) => [c.course_code, c]));
    const offeredThisSem = (course, semNum) => {
      const arr = course?.offered_semester;
      if (!Array.isArray(arr) || arr.length === 0) return true; // treat empty as both
      return arr.includes(`Semester ${semNum}`);
    };
    const key = (y, s) => `Y${y}S${s}`;
    const gapSemSet = new Set(
      (gapSemesters || []).map((t) =>
        typeof t === "string" ? t : key(t.year, t.sem)
      )
    );
    const outboundSemSet = new Set(
      (outboundSemesters || []).map((t) =>
        typeof t === "string" ? t : key(t.year, t.sem)
      )
    );

    // Index semesters and find WIA3001 / WIA3003
    const byYS = new Map();
    let posW1 = null,
      posW3 = null;
    for (const e of planArray) {
      const y = +e.year,
        s = e.sem === "-" ? 0 : +e.sem;
      byYS.set(key(y, s), e);
      for (const c of e.courses || []) {
        if (c.course_code === "WIA3001") posW1 = { y, s };
        if (c.course_code === "WIA3003") posW3 = { y, s };
      }
    }
    if (!posW1 || !posW3) return planArray;
    // Pattern: WIA3001 at Y=N S1; WIA3003 at Y=N+1 S1
    if (posW1.s !== 1 || posW3.s !== 1 || posW3.y !== posW1.y + 1)
      return planArray;

    const N = posW1.y;
    const y1s1 = byYS.get(key(N, 1));
    const yNext1 = byYS.get(key(N + 1, 1));
    if (!y1s1 || !yNext1) return planArray;

    // Y=N S2 must be free and not gap/outbound
    const y1s2Key = key(N, 2);
    if (gapSemSet.has(y1s2Key) || outboundSemSet.has(y1s2Key)) return planArray;
    const y1s2 = byYS.get(y1s2Key);
    if (y1s2 && (y1s2.courses || []).length > 0) return planArray;

    // Offerings: WIA3003 must be S1-OK; WIA3001 must be S2-OK
    const w1 = courseByCode.get("WIA3001") || { offered_semester: [] };
    const w3 = courseByCode.get("WIA3003") || {
      offered_semester: ["Semester 1"],
    };
    if (!offeredThisSem(w3, 1)) return planArray;
    if (!offeredThisSem(w1, 2)) return planArray;

    // Prereq: WIA3002 must be clearly before Y=N S1
    if (!passedSet.has("WIA3002")) {
      let before = false;
      for (const e of planArray) {
        if ((e.courses || []).some((c) => c.course_code === "WIA3002")) {
          const y = +e.year,
            s = e.sem === "-" ? 0 : +e.sem;
          if (y < N || (y === N && s < 1)) {
            before = true;
            break;
          }
        }
      }
      if (!before) return planArray;
    }

    // Perform the swap: move WIA3003 → Y=N S1; move WIA3001 → Y=N S2 (alone)
    y1s1.courses = y1s1.courses.filter((c) => c.course_code !== "WIA3001");
    const w3Obj =
      (yNext1.courses || []).find((c) => c.course_code === "WIA3003") || w3;
    y1s1.courses.push(w3Obj);

    yNext1.courses = (yNext1.courses || []).filter(
      (c) => c.course_code !== "WIA3003"
    );
    if (yNext1.courses.length === 0) {
      // drop empty Y=N+1 S1 row
      const yy = N + 1;
      planArray = planArray.filter((e) => !(+e.year === yy && +e.sem === 1));
    }

    const w1Obj = courseByCode.get("WIA3001") || {
      course_code: "WIA3001",
      course_name: "WIA3001",
      credit_hours: 3,
      type: "programme_core",
      placeholder: true,
    };
    if (y1s2) {
      y1s2.courses = [w1Obj];
    } else {
      planArray.push({ year: String(N), sem: "2", courses: [w1Obj] });
    }

    // keep chronological order
    planArray.sort(
      (a, b) =>
        +a.year - +b.year ||
        (a.sem === "-" ? 0 : +a.sem) - (b.sem === "-" ? 0 : +b.sem)
    );
    return planArray;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1E3A8A] mb-2">
            Course Recommendations
          </h2>
          <p className="text-gray-600 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            This page recommends courses for your future semesters based on your
            progress
          </p>
        </div>
      </div>

      {/* 1. Suggested Course Plan by Faculty */}
      {defaultPlan.length > 0 && (
        <div className="mt-6 w-full mb-8">
          {planWarnings.length > 0 && (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800">
              <ul className="list-disc pl-5 space-y-1">
                {planWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="bg-white border rounded-md p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <NotebookPen className="w-5 h-5 text-gray-600" />
              Suggested Course Plan by Faculty
            </h3>

            {defaultPlan.map((yearObj, yearIndex) => {
              const isExpanded = expandedYears[yearObj.year] ?? true;

              return (
                <div
                  key={yearIndex}
                  className={`pt-6 ${
                    yearIndex !== 0 ? "border-t-2 border-gray-300 mt-4" : ""
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xl font-semibold text-gray-800">
                      {yearObj.year}
                    </h4>
                    <button
                      onClick={() => toggleYear(yearObj.year)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {isExpanded ? "Hide" : "Show"}
                    </button>
                  </div>

                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4 transition-all duration-300 ${
                      isExpanded
                        ? "opacity-100 max-h-[1000px]"
                        : "opacity-0 max-h-0 overflow-hidden"
                    }`}
                  >
                    {yearObj.semesters.map((semester, semIdx) => (
                      <div key={semIdx}>
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="text-md font-medium text-gray-600">
                            {semester.name}
                          </h5>
                          <span className="text-sm text-green-600 font-medium">
                            {semester.totalCredits} credits
                          </span>
                        </div>

                        <div className="space-y-3">
                          {semester.courses.map((course, idx) => {
                            const orLabel = kiarSheLabel(
                              course.course_code,
                              passedSet
                            );
                            return (
                              <div
                                key={idx}
                                className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-100"
                              >
                                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-1">
                                  <Check className="w-3 h-3 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">
                                    <h4 className="font-semibold text-[#1E3A8A]">
                                      <CourseTitleText course={course} />
                                    </h4>
                                    <ElectiveChooser course={course} />
                                  </div>
                                  {!orLabel && (
                                    <>
                                      <div className="text-sm text-gray-600">
                                        {course.credit_hours} credits
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1 capitalize">
                                        {course.type.replace(/_/g, " ")}
                                      </div>
                                    </>
                                  )}
                                  {orLabel && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Choose either one (counts once).
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Courses Remaining to Complete */}
      {remainingCourses.length > 0 && (
        <div className="mb-8">
          <div className="bg-white border rounded-md p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BookOpenCheck className="w-5 h-5 text-gray-600" />
              Courses Remaining to Complete ({remainingCourses.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {remainingCourses.map((course, idx2) => (
                <Card
                  key={`${course.course_code}-${idx2}`}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleCourseClick(course)}
                >
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-semibold text-[#1E3A8A]">
                      <CourseTitleText course={course} />
                    </h4>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{course.credit_hours} credits</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                        {course.type.replace(/_/g, " ")}
                      </span>
                    </div>
                    {/* ✅ Fix here */}
                    {Array.isArray(course.prerequisites) &&
                      course.prerequisites.length > 0 && (
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Requires:</span> (
                          {course.prerequisites.length}) prerequisite
                          {course.prerequisites.length !== 1 ? "s" : ""}
                        </p>
                      )}

                    {Array.isArray(course.offered_semester) &&
                      course.offered_semester.length > 0 && (
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Offered:</span>{" "}
                          {course.offered_semester.join(", ")}
                        </p>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Planning Strategy */}
      <div className="mb-8">
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-800 mb-1">
                  Generate Your Personalized Course Plan
                </h4>
                <p className="text-sm text-blue-700">
                  Select a planning strategy and click "Generate Plan" to create
                  your personalized schedule based on your academic progress.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2 text-gray-700">
                <Calendar className="w-4 h-4" />
                Planning Strategy
              </h3>
              {followsDefault ? (
                <p className="text-xs text-gray-500 mt-2 mb-4">
                  You’re on track with the faculty’s default plan. Clicking{" "}
                  <span className="font-medium">Generate Course Plan</span> will
                  continue the default sequence from your next semester. Passed
                  courses are skipped, and specialization slots are filled with
                  programme electives you haven’t taken yet.
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-2 mb-4">
                  Your history differs from the original order, but I’ll still
                  follow the faculty’s default sequence from your next semester.
                  Passed courses are skipped, and specialization slots are
                  filled with programme electives you haven’t taken yet. In
                  “Lighter” mode we prefer ~16 credits / semester, but still try
                  to finish by Year 4 when feasible.
                </p>
              )}
              <div className="mt-4 space-y-2">
                {[
                  { value: "regular", label: "Regular" },
                  { value: "lighter", label: "Lighter" },
                  { value: "gapYear", label: "Gap Year" },
                  { value: "gapSem", label: "Gap Semester" },
                  { value: "outbound", label: "Outbound Programme" },
                ].map((opt) => (
                  <div key={opt.value} className="flex items-center">
                    <input
                      type="radio"
                      name="planMode"
                      value={opt.value}
                      checked={planMode === opt.value}
                      onChange={() => handlePlanModeChange(opt.value)}
                      className="h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      {opt.label}
                    </label>
                  </div>
                ))}
              </div>
              {gapYears.length +
                gapSemesters.length +
                outboundSemesters.length >
                0 && (
                <div className="mt-3 text-xs text-gray-600 space-y-1">
                  {gapYears.length > 0 && (
                    <div>
                      Gap Year: {gapYears.map((y) => `Year ${y}`).join(", ")}
                    </div>
                  )}
                  {gapSemesters.length > 0 && (
                    <div>
                      Gap Semester:{" "}
                      {gapSemesters
                        .map(({ year, sem }, i) => `Y${year}S${sem}`)
                        .join(", ")}
                    </div>
                  )}
                  {outboundSemesters.length > 0 && (
                    <div>
                      Outbound:{" "}
                      {outboundSemesters
                        .map(({ year, sem }) => `Y${year}S${sem}`)
                        .join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <Button
                className="bg-[#1E3A8A] text-white px-8 py-3"
                onClick={handleGeneratePlan}
              >
                Generate Course Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Generated Plan */}
      {generatedPlan.length > 0 && (
        <div className="mt-8">
          <div className="bg-white border rounded-md p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-gray-600" />
              Suggested Course Plan (
              {planMode === "regular"
                ? "Regular Workload"
                : planMode === "lighter"
                ? "Lighter Workload (soft preference)"
                : planMode === "gapYear"
                ? "With Gap Year"
                : planMode === "gapSem"
                ? "With Gap Semester"
                : "Outbound Programme"}
              )
            </h3>

            <div className="space-y-8">
              {adaptivePlanByYear.map(([year, semEntries]) => (
                <Card key={year} className="border border-gray-200 shadow-sm">
                  <CardContent className="p-0">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <h4 className="font-bold text-lg">Year {year}</h4>
                    </div>

                    <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                      {semEntries.map((semEntry, idx) => {
                        const { sem, courses } = semEntry;
                        const totalCredits = courses.reduce(
                          (sum, c) => sum + c.credit_hours,
                          0
                        );
                        const creditStatus =
                          totalCredits < 16
                            ? "text-amber-600"
                            : totalCredits > 20
                            ? "text-red-600"
                            : "text-green-600";

                        return (
                          <div key={idx} className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-[#1E3A8A]">
                                Semester {sem}
                              </h5>
                              <span
                                className={`text-sm bg-gray-50 px-2 py-1 rounded-full font-medium ${creditStatus}`}
                              >
                                {totalCredits} credits
                              </span>
                            </div>

                            <ul className="space-y-3">
                              {courses.map((course, idx2) => {
                                const orLabel = kiarSheLabel(
                                  course.course_code,
                                  passedSet
                                );
                                return (
                                  <li
                                    key={`${course.course_code}-${idx2}`}
                                    className="flex items-start gap-3"
                                  >
                                    <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                      <Check className="w-3 h-3 text-blue-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium">
                                        <CourseTitleText course={course} />
                                      </p>
                                      <ElectiveChooser course={course} />
                                      {!orLabel && (
                                        <div className="flex gap-4 text-sm text-gray-600">
                                          <span>
                                            {course.credit_hours} credits
                                          </span>
                                          <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded capitalize">
                                            {course.type.replace(/_/g, " ")}
                                          </span>
                                        </div>
                                      )}
                                      {orLabel && (
                                        <div className="text-xs text-gray-500">
                                          Choose either one (counts once).
                                        </div>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal for gap year/semester selection */}
      {gapModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
            <h4 className="font-semibold mb-4">
              {selection.type === "gapYear"
                ? "Select year to gap"
                : selection.type === "gapSem"
                ? "Select semester to gap"
                : "Select outbound semester"}
            </h4>

            <div className="mb-4">
              <label className="block text-sm mb-1">Year</label>
              <select
                value={selection.year}
                onChange={(e) =>
                  setSelection((s) => ({ ...s, year: +e.target.value }))
                }
                className="w-full border p-2 rounded"
              >
                {[1, 2, 3, 4].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>

            {(selection.type === "gapSem" || selection.type === "outbound") && (
              <div className="mb-4">
                <label className="block text-sm mb-1">Semester</label>
                <select
                  value={selection.sem}
                  onChange={(e) =>
                    setSelection((s) => ({ ...s, sem: +e.target.value }))
                  }
                  className="w-full border p-2 rounded"
                >
                  {[1, 2].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-600"
                onClick={() => {
                  setGapModalOpen(false);
                  setPlanMode("regular");
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => {
                  clearPlanningState();
                  let nextGY = [];
                  let nextGS = [];
                  let nextOB = [];

                  if (selection.type === "gapYear") {
                    nextGY = [selection.year];
                    setGapYears(nextGY);
                  } else if (selection.type === "gapSem") {
                    nextGS = [{ year: selection.year, sem: selection.sem }];
                    setGapSemesters(nextGS);
                  } else if (selection.type === "outbound") {
                    nextOB = [{ year: selection.year, sem: selection.sem }];
                    setOutboundSemesters(nextOB);
                  }

                  const nextMode = selection.type;
                  setPlanMode(nextMode);
                  setSelection({ type: null, year: 1, sem: 1 });
                  setGapModalOpen(false);

                  handleGeneratePlan({
                    gapYears: nextGY,
                    gapSemesters: nextGS,
                    outboundSemesters: nextOB,
                    planMode: nextMode,
                  });
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {courseModalOpen && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-[#1E3A8A]">
                  {selectedCourse.course_code}: {selectedCourse.course_name}
                </h3>
                <button
                  onClick={() => setCourseModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Credits</p>
                  <p className="text-gray-800">{selectedCourse.credit_hours}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Type</p>
                  <p className="text-gray-800 capitalize">
                    {selectedCourse.type.replace(/_/g, " ")}
                  </p>
                </div>
                {selectedCourse.offered_semester && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">
                      Offered In
                    </p>
                    <p className="text-gray-800">
                      {selectedCourse.offered_semester.join(", ")}
                    </p>
                  </div>
                )}
              </div>

              {prerequisiteDetails.length > 0 ? (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Prerequisites ({prerequisiteDetails.length})
                  </h4>
                  <div className="space-y-2">
                    {prerequisiteDetails.map((prereq, index) => (
                      <div
                        key={index}
                        className="flex items-start p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                          <Check className="w-3 h-3 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {prereq.code}: {prereq.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {prereq.credits} credits
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedCourse.prerequisites &&
                Array.isArray(selectedCourse.prerequisites) &&
                selectedCourse.prerequisites.length > 0 ? (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Prerequisites ({selectedCourse.prerequisites.length})
                  </h4>
                  <p className="text-gray-600">
                    Prerequisite details could not be loaded
                  </p>
                </div>
              ) : (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Prerequisites
                  </h4>
                  <p className="text-gray-600">No prerequisites required</p>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => setCourseModalOpen(false)}
                  className="bg-[#1E3A8A] text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseRecommendations;
