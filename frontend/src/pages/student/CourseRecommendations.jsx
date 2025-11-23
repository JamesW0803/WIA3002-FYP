import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import generateCustomPlan from "../../utils/generateCustomPlan";
import getRemainingCourses from "../../utils/getRemainingCourses";
import { findNextSemesterToPlan } from "../../components/Students/AcademicPlanner/utils/planHelpers";
import { resolveDefaultPlanCourses } from "../../utils/defaultPlanResolver";

// -------------------- PURE HELPERS / CONSTANTS --------------------

const SPECIALIZATION_PREFIX = "SPECIALIZATION_";
const SHE4_CODE = "SHE4444";
const KIAR_CODE = "GQX0056";

const isOfferedInSemester = (course, semNum) => {
  const arr = course?.offered_semester;
  if (!Array.isArray(arr) || arr.length === 0) return true;
  return arr.includes(`Semester ${semNum}`);
};

const getPassedCodes = (entries) => {
  const s = new Set();
  for (const e of entries || []) {
    if (e.status === "Passed" && e.course?.course_code) {
      s.add(e.course.course_code);
    }
  }
  return s;
};

const countSpecializationSlots = (mapping) =>
  Object.values(mapping).reduce(
    (acc, sems) =>
      acc +
      Object.values(sems)
        .flat()
        .filter((c) => String(c).startsWith(SPECIALIZATION_PREFIX)).length,
    0
  );

const flattenDefaultToYS = (mapping) => {
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

const isFollowingDefaultSoFar = (entries, allCourses, mapping) => {
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

const kiarSheLabel = (code, passedSet) => {
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

// ---- Tail compaction, WIA3003/WIA3001 arrangements ----

function compactTailOneStep(planArray, allCourses, passedSet) {
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

function preferWIA3003S1_thenWIA3001S2(
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

const enforceWIA3003AfterGapYear = (
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

const ensureWIA3001AfterGapYear = (
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

const buildGapYearPlan = (
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

const buildGapSemesterOrOutboundPlan = (
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

// -------------------- MAIN COMPONENT --------------------

const PLAN_MODES = [
  { value: "regular", label: "Regular" },
  { value: "lighter", label: "Lighter" },
  { value: "gapYear", label: "Gap Year" },
  { value: "gapSem", label: "Gap Semester" },
  { value: "outbound", label: "Outbound Programme" },
];

const CourseRecommendations = () => {
  const [generatedPlan, setGeneratedPlan] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [defaultPlan, setDefaultPlan] = useState([]);
  const [expandedYears, setExpandedYears] = useState({});

  const [semesterMappingFromServer, setSemesterMappingFromServer] =
    useState(null);
  const [planMode, setPlanMode] = useState("regular");
  const [selection, setSelection] = useState({ type: null, year: 1, sem: 1 });

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

  const [semesterMapping, setSemesterMapping] = useState({});

  const resetGaps = useCallback(() => {
    setGapYears([]);
    setGapSemesters([]);
    setOutboundSemesters([]);
  }, []);

  const clearPlanningState = useCallback(() => {
    setGeneratedPlan([]);
    setPlanWarnings([]);
    setSelectedCourse(null);
    setCourseModalOpen(false);
  }, []);

  const passedSet = useMemo(
    () => getPassedCodes(completedEntries),
    [completedEntries]
  );

  const specializationSlotsNeeded = useMemo(() => {
    if (!semesterMapping || !Object.keys(semesterMapping).length) return 0;

    const totalSlots = countSpecializationSlots(semesterMapping);
    const typeByCode = new Map(allCourses.map((c) => [c.course_code, c.type]));
    let passedElectives = 0;
    for (const code of passedSet) {
      if (typeByCode.get(code) === "programme_elective") passedElectives++;
    }
    return Math.max(0, totalSlots - passedElectives);
  }, [allCourses, passedSet, semesterMapping]);

  useEffect(() => {
    setFollowsDefault(
      isFollowingDefaultSoFar(completedEntries, allCourses, semesterMapping)
    );
  }, [completedEntries, allCourses, semesterMapping]);

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

        // ---- NEW: fetch programme plan mapping for this intake ----
        const profile = profileRes.data;
        const programmeIntakeCode =
          profile.programme_intake_code ||
          profile.programmeIntake?.programme_intake_code;

        let mappingFromBackend = {};

        if (programmeIntakeCode) {
          try {
            // adjust the URL to match how you mounted programmeIntakeRoutes
            const planRes = await axiosClient.get(
              `/programme-intakes/programme-intakes/${programmeIntakeCode}/programme-plan`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            mappingFromBackend = planRes.data?.semesterMapping || {};
          } catch (e) {
            console.error(
              "Failed to fetch programme plan mapping, got no semesterMapping:",
              e
            );
          }
        }

        setSemesterMapping(mappingFromBackend);

        const { years, missingCodes } = resolveDefaultPlanCourses(
          mappingFromBackend,
          coursesRes.data,
          { electiveCreditHours: 3, electiveLabel: "Specialization Elective" }
        );
        setDefaultPlan(years);

        // initialize expandedYears for the loaded mapping
        setExpandedYears((prev) => {
          const next = { ...prev };
          years.forEach((y) => {
            if (!(y.year in next)) next[y.year] = true;
          });
          return next;
        });

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

  const fetchPrerequisiteDetails = (prereqs) => {
    try {
      const details = prereqs
        .map((pr) => {
          if (typeof pr === "object" && pr.course_code) {
            return {
              code: pr.course_code,
              name: pr.course_name,
              credits: pr.credit_hours,
            };
          }
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

  const handleCourseClick = (course) => {
    setSelectedCourse(course);
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

  const handleGeneratePlan = useCallback(
    async (overrides = {}) => {
      setGeneratedPlan([]);
      setPlanWarnings([]);

      const gy = overrides.gapYears ?? gapYears;
      const gs = overrides.gapSemesters ?? gapSemesters;
      const ob = overrides.outboundSemesters ?? outboundSemesters;
      const mode = overrides.planMode ?? planMode;

      try {
        const { year: y, semester: s } =
          findNextSemesterToPlan(completedEntries);

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
            },
            semesterMapping
          );
          if (extra?.length) setPlanWarnings(extra);
          setGeneratedPlan(plan);
          return;
        }

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
            {
              year: chosen.year,
              sem: chosen.sem,
              type: mode,
              maxElectivesToPlace: specializationSlotsNeeded,
            },
            semesterMapping
          );
          if (mode === "outbound") {
            setPlanWarnings([
              "You selected an Outbound Programme semester. Please consult your Academic Advisor regarding credit transfer/recognition.",
            ]);
          }
          setGeneratedPlan(cont);
          return;
        }

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
            },
            semesterMapping
          );
          if ((ob?.length || 0) > 0) {
            setPlanWarnings([
              "You selected an Outbound Programme semester. Please consult your Academic Advisor regarding credit transfer/recognition.",
            ]);
          }
          setGeneratedPlan(cont);
          return;
        }

        // fallback/custom (lighter or non-default history)
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
            },
            semesterMapping
          );
          setPlanWarnings([
            "Custom planner failed — showing default-follow continuation.",
          ]);
          setGeneratedPlan(cont);
        }
      } catch (err) {
        console.error("Error generating plan:", err);
      }
    },
    [
      gapYears,
      gapSemesters,
      outboundSemesters,
      planMode,
      completedEntries,
      allCourses,
      passedSet,
      specializationSlotsNeeded,
      followsDefault,
      semesterMapping,
    ]
  );

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

  const adaptivePlanByYear = useMemo(() => {
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

  const electiveOptions = useMemo(() => {
    const passed = getPassedCodes(completedEntries);
    return allCourses
      .filter(
        (c) => c.type === "programme_elective" && !passed.has(c.course_code)
      )
      .map((c) => ({ code: c.course_code, name: c.course_name }));
  }, [allCourses, completedEntries]);

  const isProgrammeElective = (course) =>
    course?.type === "programme_elective" ||
    String(course?.course_code || "").startsWith(SPECIALIZATION_PREFIX);

  const CourseTitleText = ({ course }) => {
    const or = kiarSheLabel(course.course_code, passedSet);
    if (or) return <>{or}</>;

    if (course.course_code === "GAP_YEAR") return <>Gap Year (no courses)</>;
    if (course.course_code === "GAP_SEMESTER")
      return <>Gap Semester (no courses)</>;
    if (course.course_code === "OUTBOUND") return <>Outbound Programme</>;
    if (String(course.course_code).startsWith(SPECIALIZATION_PREFIX))
      return <>Programme Elective</>;

    return (
      <>
        {course.course_code}: {course.course_name}
      </>
    );
  };

  const ElectiveChooser = ({ course }) => {
    if (!isProgrammeElective(course)) return null;
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
                                  <h4 className="font-semibold text-[#1E3A8A]">
                                    <CourseTitleText course={course} />
                                  </h4>
                                  <ElectiveChooser course={course} />
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
                {PLAN_MODES.map((opt) => (
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
                        .map(({ year, sem }) => `Y${year}S${sem}`)
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

      {/* Gap selection modal */}
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

      {/* Course modal */}
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
