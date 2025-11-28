export const SPECIALIZATION_PREFIX = "SPECIALIZATION_";
export const SHE4_CODE = "SHE4444";
export const KIAR_CODE = "GQX0056";

export const isOfferedInSemester = (course, semNum) => {
  const arr = course?.offered_semester;
  if (!Array.isArray(arr) || arr.length === 0) return true;
  return arr.includes(`Semester ${semNum}`);
};

export const getPassedCodes = (entries) => {
  const s = new Set();
  for (const e of entries || []) {
    if (e.status === "Passed" && e.course?.course_code) {
      s.add(e.course.course_code);
    }
  }
  return s;
};

export const countSpecializationSlots = (mapping) =>
  Object.values(mapping).reduce(
    (acc, sems) =>
      acc +
      Object.values(sems)
        .flat()
        .filter((c) => String(c).startsWith(SPECIALIZATION_PREFIX)).length,
    0
  );

export const flattenDefaultToYS = (mapping) => {
  const out = {};
  Object.entries(mapping || {}).forEach(([year, sems]) => {
    const y = +year.replace("Year ", "");
    Object.entries(sems).forEach(([semName, codes]) => {
      const s = +semName.replace("Semester ", "");
      out[`Y${y}S${s}`] = codes.slice();
    });
  });
  return out;
};

export const isFollowingDefaultSoFar = (entries, allCourses, mapping) => {
  if (!entries?.length) return true;
  if (!mapping || !Object.keys(mapping).length) return true;

  const defaultYS = flattenDefaultToYS(mapping);
  const takenByYS = {};
  const typeByCode = new Map(allCourses.map((c) => [c.course_code, c.type]));

  for (const e of entries) {
    const code = e.course?.course_code;
    if (!code || !e.year || !e.semester) continue;
    const k = `Y${e.year}S${e.semester}`;
    if (!takenByYS[k]) takenByYS[k] = [];
    takenByYS[k].push(code);
  }

  for (const [ys, takenList] of Object.entries(takenByYS)) {
    const expected = (defaultYS[ys] || []).slice();
    const expectedSet = new Set(
      expected.filter((c) => !String(c).startsWith(SPECIALIZATION_PREFIX))
    );
    const specCount = expected.filter((c) =>
      String(c).startsWith(SPECIALIZATION_PREFIX)
    ).length;

    let studentElectives = 0;
    for (const code of takenList) {
      if (typeByCode.get(code) === "programme_elective") studentElectives++;
    }

    const takenSet = new Set(
      takenList.filter((c) => typeByCode.get(c) !== "programme_elective")
    );

    for (const need of expectedSet) {
      if (!takenSet.has(need)) return false;
    }
    if (studentElectives < specCount) return false;
    for (const code of takenSet) {
      if (!expectedSet.has(code)) return false;
    }
  }
  return true;
};

export const kiarSheLabel = (code, passedSet) => {
  const tookSHE4 = passedSet.has(SHE4_CODE);
  const tookKIAR = passedSet.has(KIAR_CODE);
  const isKIAR = code === KIAR_CODE;
  const isSHE4 = code === SHE4_CODE;
  if ((isKIAR || isSHE4) && !(tookSHE4 || tookKIAR)) {
    return `${isKIAR ? "GQX0056 (KIAR)" : "SHE4444 (SHE Cluster 4)"} OR ${
      isKIAR ? "SHE4444 (SHE Cluster 4)" : "GQX0056 (KIAR)"
    }`;
  }
  return null;
};

export const getCourseDepartment = (course) => {
  const rawDept = course?.department || null;

  // 1) If we already have a concrete department, trust it.
  if (
    rawDept &&
    rawDept !== "Unknown" &&
    rawDept !== "N/A" &&
    rawDept !== "NA"
  ) {
    return rawDept;
  }

  // 2) Department is missing / 'Unknown' → try to infer from `typesByProgramme`.
  const cfgs = Array.isArray(course?.typesByProgramme)
    ? course.typesByProgramme
    : [];

  if (cfgs.length > 0) {
    for (const cfg of cfgs) {
      const prog = cfg?.programme;
      if (prog && typeof prog === "object") {
        // Try common department keys on the programme object
        const inferredDept =
          prog.department ||
          prog.department_name ||
          prog.dept ||
          prog.deptName ||
          null;

        if (inferredDept) {
          return inferredDept;
        }
      }
    }
  }

  // 3) Still nothing → treat as no department (shared / truly global).
  return null;
};

// ---- Tail compaction, WIA3003/WIA3001 arrangements ----

export function compactTailOneStep(planArray, allCourses, passedSet) {
  if (!Array.isArray(planArray) || planArray.length === 0) return planArray;

  const byYS = new Map();
  const pos = new Map();
  for (const e of planArray) {
    const key = `Y${e.year}S${e.sem}`;
    byYS.set(key, e);
    for (const c of e.courses || []) {
      pos.set(c.course_code, { y: +e.year, s: e.sem === "-" ? 0 : +e.sem });
    }
  }

  const last = planArray[planArray.length - 1];
  const yL = +last.year;
  const sL = last.sem === "-" ? 0 : +last.sem;
  if (sL !== 1 || (last.courses || []).length === 0) return planArray;

  const prevY = yL - 1;
  const prevS = 2;
  if (prevY < 1) return planArray;

  const hasGapYearRow = planArray.some(
    (e) =>
      e.year === String(prevY) &&
      e.sem === "-" &&
      (e.courses || []).some((c) => c.course_code === "GAP_YEAR")
  );
  if (hasGapYearRow) return planArray;
  if (byYS.has(`Y${prevY}S${prevS}`)) return planArray;

  const hasWIA3001 = last.courses.some((c) => c.course_code === "WIA3001");
  const hasInfoPlaceholder = last.courses.some((c) =>
    ["GAP_YEAR", "GAP_SEMESTER", "OUTBOUND"].includes(c.course_code)
  );
  if (hasWIA3001 || hasInfoPlaceholder) return planArray;

  const courseByCode = new Map(allCourses.map((c) => [c.course_code, c]));

  const prereqsSatisfiedBefore = (code, y, s) => {
    const course = courseByCode.get(code);
    const reqs = (course?.prerequisites || [])
      .map((p) => (typeof p === "string" ? p : p?.course_code))
      .filter(Boolean);
    if (reqs.length === 0) return true;
    for (const r of reqs) {
      if (passedSet.has(r)) continue;
      const at = pos.get(r);
      if (!at) return false;
      if (at.y > y || (at.y === y && at.s >= s)) return false;
    }
    return true;
  };

  for (const c of last.courses) {
    const full = courseByCode.get(c.course_code);
    if (!full) return planArray;
    if (!isOfferedInSemester(full, 2)) return planArray;
    if (!prereqsSatisfiedBefore(c.course_code, prevY, prevS)) return planArray;
  }

  const moved = {
    year: String(prevY),
    sem: String(prevS),
    courses: last.courses.slice(),
  };
  const newArr = planArray.slice(0, -1);
  newArr.push(moved);

  newArr.sort(
    (a, b) =>
      a.year - b.year ||
      (a.sem === "-" ? 0 : +a.sem) - (b.sem === "-" ? 0 : +b.sem)
  );
  return newArr;
}

export function preferWIA3003S1_thenWIA3001S2(
  planArray,
  allCourses,
  passedSet,
  { gapSemesters = [], outboundSemesters = [] } = {}
) {
  if (!Array.isArray(planArray) || planArray.length === 0) return planArray;

  const courseByCode = new Map(allCourses.map((c) => [c.course_code, c]));
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

  const byYS = new Map();
  let posW1 = null;
  let posW3 = null;

  for (const e of planArray) {
    const y = +e.year;
    const s = e.sem === "-" ? 0 : +e.sem;
    byYS.set(key(y, s), e);
    for (const c of e.courses || []) {
      if (c.course_code === "WIA3001") posW1 = { y, s };
      if (c.course_code === "WIA3003") posW3 = { y, s };
    }
  }

  if (!posW1 || !posW3) return planArray;
  if (posW1.s !== 1 || posW3.s !== 1 || posW3.y !== posW1.y + 1)
    return planArray;

  const N = posW1.y;
  const y1s1 = byYS.get(key(N, 1));
  const yNext1 = byYS.get(key(N + 1, 1));
  if (!y1s1 || !yNext1) return planArray;

  const y1s2Key = key(N, 2);
  if (gapSemSet.has(y1s2Key) || outboundSemSet.has(y1s2Key)) return planArray;
  const y1s2 = byYS.get(y1s2Key);
  if (y1s2 && (y1s2.courses || []).length > 0) return planArray;

  const w1 = courseByCode.get("WIA3001") || { offered_semester: [] };
  const w3 = courseByCode.get("WIA3003") || {
    offered_semester: ["Semester 1"],
  };
  if (!isOfferedInSemester(w3, 1)) return planArray;
  if (!isOfferedInSemester(w1, 2)) return planArray;

  if (!passedSet.has("WIA3002")) {
    let before = false;
    for (const e of planArray) {
      if ((e.courses || []).some((c) => c.course_code === "WIA3002")) {
        const y = +e.year;
        const s = e.sem === "-" ? 0 : +e.sem;
        if (y < N || (y === N && s < 1)) {
          before = true;
          break;
        }
      }
    }
    if (!before) return planArray;
  }

  y1s1.courses = y1s1.courses.filter((c) => c.course_code !== "WIA3001");
  const w3Obj =
    (yNext1.courses || []).find((c) => c.course_code === "WIA3003") || w3;
  y1s1.courses.push(w3Obj);

  yNext1.courses = (yNext1.courses || []).filter(
    (c) => c.course_code !== "WIA3003"
  );
  if (yNext1.courses.length === 0) {
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

  planArray.sort(
    (a, b) =>
      +a.year - +b.year ||
      (a.sem === "-" ? 0 : +a.sem) - (b.sem === "-" ? 0 : +b.sem)
  );
  return planArray;
}

// ---- Main plan builders ----

export const buildDefaultFollowingPlanWithGaps = (
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
  } = {},
  semesterMapping
) => {
  if (!semesterMapping || !Object.keys(semesterMapping).length) return [];

  const courseByCode = new Map(allCourses.map((c) => [c.course_code, c]));

  const electiveQueue = allCourses
    .filter(
      (c) => c.type === "programme_elective" && !passedSet.has(c.course_code)
    )
    .map((c) => c.course_code);

  let electivePtr = 0;
  let pickedEither = passedSet.has(SHE4_CODE) || passedSet.has(KIAR_CODE);
  let electivesLeft = Number.isFinite(maxElectivesToPlace)
    ? maxElectivesToPlace
    : Infinity;

  const pickElectiveForSem = (semNum) => {
    for (let i = electivePtr; i < electiveQueue.length; i++) {
      const code = electiveQueue[i];
      const c = courseByCode.get(code);
      if (c && isOfferedInSemester(c, semNum)) {
        electiveQueue.splice(i, 1);
        return code;
      }
    }
    return null;
  };

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

  let startIdx = defList.findIndex(
    (row) => row.y > startY || (row.y === startY && row.s >= startS)
  );
  if (startIdx === -1) startIdx = defList.length;

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

  const gapYearSet = new Set(gapYears);
  const toKey = (t) => (typeof t === "string" ? t : `Y${t.year}S${t.sem}`);
  const gapSemSet = new Set((gapSemesters || []).map(toKey));
  const outboundSemSet = new Set((outboundSemesters || []).map(toKey));

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

  const pushInfoRow = (code, name) => {
    out.push({
      year: String(calY),
      sem: code === "GAP_YEAR" ? "-" : String(calS),
      courses: [
        {
          course_code: code,
          course_name: name,
          credit_hours: 0,
          type: "info",
          placeholder: true,
        },
      ],
    });
  };

  let pending = [];

  while (startIdx < defList.length || pending.length > 0) {
    if (gapYearSet.has(calY)) {
      pushInfoRow("GAP_YEAR", "Gap Year (no courses)");
      calY += 1;
      calS = 1;
      continue;
    }

    const key = `Y${calY}S${calS}`;
    if (gapSemSet.has(key)) {
      pushInfoRow("GAP_SEMESTER", "Gap Semester (no courses)");
      advanceCal();
      continue;
    }
    if (outboundSemSet.has(key)) {
      pushInfoRow("OUTBOUND", "Outbound Programme");
      advanceCal();
      continue;
    }

    const nextDefaultCodes =
      startIdx < defList.length ? defList[startIdx++].codes.slice() : [];
    const toProcess = [...pending, ...nextDefaultCodes];
    const carry = [];
    const courses = [];

    for (const code of toProcess) {
      if (code === SHE4_CODE || code === KIAR_CODE) {
        if (pickedEither) continue;
        const c = courseByCode.get(code);
        if (c && !passedSet.has(code)) {
          if (isOfferedInSemester(c, calS)) {
            courses.push(c);
            pickedEither = true;
          } else {
            carry.push(code);
          }
        }
        continue;
      }

      if (String(code).startsWith(SPECIALIZATION_PREFIX)) {
        if (electivesLeft > 0) {
          const chosen = pickElectiveForSem(calS);
          if (chosen) {
            const c = courseByCode.get(chosen);
            if (c) {
              courses.push(c);
              electivesLeft -= 1;
            }
          }
        }
        continue;
      }

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

      if (isOfferedInSemester(c, calS)) {
        const normalized =
          c.type === "programme_elective"
            ? { ...c, type: "programme_core" }
            : c;
        courses.push(normalized);
      } else {
        carry.push(code);
      }
    }

    if (courses.length > 0) {
      out.push({ year: String(calY), sem: String(calS), courses });
    }

    pending = carry;
    advanceCal();
  }

  let plan = compactTailOneStep(out, allCourses, passedSet);
  plan = preferWIA3003S1_thenWIA3001S2(plan, allCourses, passedSet, {
    gapSemesters,
    outboundSemesters,
  });

  return plan;
};

export const enforceWIA3003AfterGapYear = (
  planArray,
  allCourses,
  passedSet,
  gapYearNum
) => {
  if (passedSet.has("WIA3003")) return { plan: planArray, warnings: [] };

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
    .filter((e) => e.courses.length > 0 || e.sem === "-");

  const targetYear = String(Number(gapYearNum) + 1);
  const targetSem = "1";

  const courseObj = removedCourse ||
    allCourses.find((x) => x.course_code === "WIA3003") || {
      course_code: "WIA3003",
      course_name: "WIA3003",
      credit_hours: 3,
      type: "programme_core",
      placeholder: true,
    };

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

  const findPos = (code) => {
    for (const e of cleaned) {
      if ((e.courses || []).some((c) => c.course_code === code)) {
        return { y: Number(e.year), s: e.sem === "-" ? 0 : Number(e.sem) };
      }
    }
    return null;
  };
  const cmpBefore = (a, b) => a.y < b.y || (a.y === b.y && a.s < b.s);

  const warnings = [];
  if (!passedSet.has("WIA3002")) {
    const pos2 = findPos("WIA3002");
    const target = { y: Number(targetYear), s: 1 };
    if (!pos2 || !cmpBefore(pos2, target)) {
      warnings.push(
        `WIA3003 has been placed at Year ${targetYear} Semester 1 per the Gap Year rule, but WIA3002 is not clearly completed beforehand. Please verify prerequisites with your advisor.`
      );
    }
  }

  return { plan: cleaned, warnings };
};

export const ensureWIA3001AfterGapYear = (
  planArray,
  allCourses,
  passedSet,
  gapYearNum
) => {
  if (passedSet.has("WIA3001")) return { plan: planArray, warnings: [] };

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

  let y = Number(gapYearNum) + 1;
  let s = 2;

  const used = new Set(planArray.map((e) => `Y${e.year}S${e.sem}`));
  while (used.has(`Y${y}S${s}`)) {
    if (s === 2) {
      y += 1;
      s = 1;
    } else {
      s = 2;
    }
  }

  planArray.push({ year: String(y), sem: String(s), courses: [courseObj] });
  return { plan: planArray, warnings: [] };
};

export const buildGapYearPlan = (
  startY,
  startS,
  allCourses,
  passedSet,
  { gapYear, maxElectivesToPlace = Infinity },
  semesterMapping
) => {
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
    },
    semesterMapping
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

export const buildGapSemesterOrOutboundPlan = (
  startY,
  startS,
  allCourses,
  passedSet,
  { year, sem, type, maxElectivesToPlace },
  semesterMapping
) => {
  const opts =
    type === "gapSem"
      ? { gapYears: [], gapSemesters: [{ year, sem }], outboundSemesters: [] }
      : { gapYears: [], gapSemesters: [], outboundSemesters: [{ year, sem }] };

  return buildDefaultFollowingPlanWithGaps(
    startY,
    startS,
    allCourses,
    passedSet,
    {
      ...opts,
      backshiftToEarliestIncomplete: true,
      maxElectivesToPlace,
    },
    semesterMapping
  );
};

export const convertPlannerMapToUI = (plannerMap, allCourses) => {
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
      continue;
    }

    for (let s = 1; s <= 2; s++) {
      const list = plannerMap[yKey]?.[`Semester ${s}`] || [];
      if (!list || list.length === 0) continue;

      const courses = list.map((code) => {
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

export const getEffectiveTypeForProgrammeClient = (
  course,
  programmeCode,
  programmeId,
  studentDepartment
) => {
  if (!course) return null;

  const rawType = course.type;
  const dept = course.department || null;
  const configs = Array.isArray(course.typesByProgramme)
    ? course.typesByProgramme
    : [];

  const isKnownDepartment =
    dept && dept !== "Unknown" && dept !== "N/A" && dept !== "NA";

  const programmeIdStr = programmeId ? String(programmeId) : null;

  const matchesStudentProgramme = (cfg) => {
    if (!cfg || !cfg.programme) return false;
    const p = cfg.programme;

    // CASE 1: programme is an ObjectId or already a string
    if (typeof p === "string" || typeof p === "number") {
      if (programmeIdStr && String(p) === programmeIdStr) return true;
    }

    // CASE 2: programme is a populated object { _id, programme_code, ... }
    if (typeof p === "object") {
      if (programmeIdStr && p._id && String(p._id) === programmeIdStr) {
        return true;
      }
      if (programmeCode && p.programme_code === programmeCode) {
        return true;
      }
    }

    return false;
  };

  const cfgForStudent = configs.find(matchesStudentProgramme) || null;

  // -------- PROGRAMME ELECTIVES ONLY (your rules) --------
  if (rawType === "programme_elective") {
    // CASE A: department known → only that department can see it as an elective
    if (isKnownDepartment) {
      if (studentDepartment && studentDepartment === dept) {
        return "programme_elective";
      }
      return "non_elective_for_this_programme";
    }

    // CASE B: department unknown → only listed programmes see it as elective
    if (!cfgForStudent || cfgForStudent.type !== "programme_elective") {
      return "non_elective_for_this_programme";
    }
    return "programme_elective";
  }

  // -------- Other course types (core, uni, etc.) --------
  if (cfgForStudent && cfgForStudent.type && cfgForStudent.type !== rawType) {
    return cfgForStudent.type;
  }

  return rawType;
};
