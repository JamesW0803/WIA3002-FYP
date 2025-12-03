import axiosClient from "../api/axiosClient";

const HARD_CREDIT_LIMIT = 22; // Absolute max
const SOFT_CREDIT_LIMIT = 18; // Balanced max
const SPECIALIZATION_PREFIX = "SPECIALIZATION_";

const WIA3001_CODE = "WIA3001"; // Industrial Training
const WIA3002_CODE = "WIA3002"; // Academic Project I
const WIA3003_CODE = "WIA3003"; // Academic Project II

const CORE_TYPES = new Set(["faculty_core", "programme_core"]);

// Helper: Year/Sem to linear index
const getSemIndex = (y, s) => (y - 1) * 2 + (s - 1);

// Helper: Check offering
const isOfferedInSem = (course, sem) => {
  const offerings = course.offered_semester || [];
  if (!offerings.length) return true;
  return offerings.includes(`Semester ${sem}`);
};

const deriveStudentRequiredCores = (defaultPlanMap, allCourses) => {
  const requiredCores = new Set();
  const courseMap = new Map(allCourses.map((c) => [c.course_code, c]));
  if (!defaultPlanMap) return requiredCores;
  Object.values(defaultPlanMap).forEach((sems) => {
    Object.values(sems).forEach((codes) => {
      (codes || []).forEach((code) => {
        const course = courseMap.get(code);
        if (course && CORE_TYPES.has(course.type)) requiredCores.add(code);
      });
    });
  });
  return requiredCores;
};

const deriveSemesterCreditTargets = (defaultPlanMap, allCourses) => {
  const targets = new Map();
  const courseMap = new Map(allCourses.map((c) => [c.course_code, c]));
  if (!defaultPlanMap) return targets;
  Object.keys(defaultPlanMap).forEach((yKey) => {
    const y = parseInt(yKey.replace("Year ", ""), 10);
    Object.keys(defaultPlanMap[yKey] || {}).forEach((sKey) => {
      const s = parseInt(sKey.replace("Semester ", ""), 10);
      const codes = defaultPlanMap[yKey][sKey] || [];
      let semCredits = 0;
      codes.forEach((code) => {
        if (code.startsWith("SPECIALIZATION_")) semCredits += 3;
        else {
          const c = courseMap.get(code);
          if (c) semCredits += c.credit_hours || 3;
        }
      });
      targets.set(getSemIndex(y, s), semCredits);
    });
  });
  return targets;
};

export default async function generateCustomPlan(
  userId,
  token,
  preferences = {},
  semesterMappingOverride = null
) {
  try {
    // 1. Fetch Data
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
    const entries = profile.entries || [];

    // 2. Resolve Default Plan
    let defaultPlanMap = semesterMappingOverride;
    if (!defaultPlanMap || Object.keys(defaultPlanMap).length === 0) {
      const intakeCode =
        profile.programme_intake_code ||
        profile.programmeIntake?.programme_intake_code;
      if (intakeCode) {
        try {
          const planRes = await axiosClient.get(
            `/programme-intakes/programme-intakes/${intakeCode}/programme-plan`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          defaultPlanMap = planRes.data?.semesterMapping || {};
        } catch (e) {
          console.error("Failed to fetch default plan", e);
        }
      }
    }

    // 3. Pre-process
    const courseMap = new Map();
    allCourses.forEach((c) => courseMap.set(c.course_code, c));

    const studentRequiredCores = deriveStudentRequiredCores(
      defaultPlanMap,
      allCourses
    );
    const semesterCreditTargets = deriveSemesterCreditTargets(
      defaultPlanMap,
      allCourses
    );

    const passedSet = new Set();
    const takenSet = new Set();
    let maxYear = 0;
    let maxSem = 0;
    let lastPassedWIA3002SemIndex = null;

    entries.forEach((e) => {
      const code = e.course?.course_code;
      if (code) {
        takenSet.add(code);
        if (e.status === "Passed") {
          passedSet.add(code);
          if (code === WIA3002_CODE) {
            const idx = getSemIndex(e.year, e.semester);
            if (
              lastPassedWIA3002SemIndex === null ||
              idx > lastPassedWIA3002SemIndex
            ) {
              lastPassedWIA3002SemIndex = idx;
            }
          }
        }
        if (e.year > maxYear || (e.year === maxYear && e.semester > maxSem)) {
          maxYear = e.year;
          maxSem = e.semester;
        }
      }
    });

    let startYear = maxYear;
    let startSem = maxSem;
    if (startYear === 0) {
      startYear = 1;
      startSem = 1;
    } else {
      if (startSem === 2) {
        startYear++;
        startSem = 1;
      } else {
        startSem = 2;
      }
    }

    const courseIdealIndex = new Map();
    const allPlanCourses = new Set();
    if (defaultPlanMap) {
      Object.keys(defaultPlanMap).forEach((yKey) => {
        const y = parseInt(yKey.replace("Year ", ""), 10);
        Object.keys(defaultPlanMap[yKey] || {}).forEach((sKey) => {
          const s = parseInt(sKey.replace("Semester ", ""), 10);
          const codes = defaultPlanMap[yKey][sKey] || [];
          const index = getSemIndex(y, s);
          codes.forEach((code) => {
            if (!code.startsWith("SPECIALIZATION_")) {
              if (!courseIdealIndex.has(code))
                courseIdealIndex.set(code, index);
              allPlanCourses.add(code);
            }
          });
        });
      });
    }

    const remainingCodes = new Set();
    allPlanCourses.forEach((code) => {
      if (!passedSet.has(code)) remainingCodes.add(code);
    });
    entries.forEach((e) => {
      const c = e.course?.course_code;
      if (c && !passedSet.has(c) && courseMap.has(c)) remainingCodes.add(c);
    });

    // 4. Simulation Loop
    const finalPlan = {};
    let currentYear = startYear;
    let currentSem = startSem;
    let safetyLoop = 0;

    const simPassed = new Set(passedSet);
    const simTaken = new Set(takenSet);
    let wia3002SemIndex = lastPassedWIA3002SemIndex;

    const arePrereqsMet = (code) => {
      const course = courseMap.get(code);
      if (!course || !course.prerequisites || !course.prerequisites.length)
        return true;
      return course.prerequisites.every((pr) => {
        const prCode = typeof pr === "string" ? pr : pr.course_code;
        return simPassed.has(prCode);
      });
    };

    const canScheduleWIA3001 = () => {
      for (const coreCode of studentRequiredCores) {
        if (
          coreCode === WIA3001_CODE ||
          coreCode === WIA3002_CODE ||
          coreCode === WIA3003_CODE
        )
          continue;
        if (!simTaken.has(coreCode)) return false;
      }
      return true;
    };

    const canScheduleWIA3002 = () => {
      for (const coreCode of studentRequiredCores) {
        if (
          coreCode === WIA3001_CODE ||
          coreCode === WIA3002_CODE ||
          coreCode === WIA3003_CODE
        )
          continue;
        if (!simPassed.has(coreCode)) return false;
      }
      return true;
    };

    const canScheduleWIA3003 = (currentSemIndex) => {
      if (wia3002SemIndex == null) return false;
      return currentSemIndex === wia3002SemIndex + 1;
    };

    const gapYears = preferences.gapYears || [];
    const gapSemesters = preferences.gapSemesters || [];
    const outboundSemesters = preferences.outboundSemesters || [];
    const isGapYear = (y) => gapYears.includes(y);
    const isGapSemester = (y, s) =>
      gapSemesters.some((g) => g.year === y && g.sem === s);
    const isOutboundSemester = (y, s) =>
      outboundSemesters.some((g) => g.year === y && g.sem === s);

    while (remainingCodes.size > 0 && safetyLoop < 20) {
      safetyLoop++;
      const yKey = `Year ${currentYear}`;
      const sKey = `Semester ${currentSem}`;
      const currentSemIndex = getSemIndex(currentYear, currentSem);
      if (!finalPlan[yKey]) finalPlan[yKey] = {};

      if (isGapYear(currentYear)) {
        finalPlan[yKey]["Semester 1"] = ["GAP YEAR"];
        finalPlan[yKey]["Semester 2"] = ["GAP YEAR"];
        currentYear++;
        currentSem = 1;
        continue;
      }
      if (isGapSemester(currentYear, currentSem)) {
        finalPlan[yKey][sKey] = ["GAP SEMESTER"];
        if (currentSem === 2) {
          currentYear++;
          currentSem = 1;
        } else {
          currentSem = 2;
        }
        continue;
      }
      if (isOutboundSemester(currentYear, currentSem)) {
        finalPlan[yKey][sKey] = ["OUTBOUND"];
        if (currentSem === 2) {
          currentYear++;
          currentSem = 1;
        } else {
          currentSem = 2;
        }
        continue;
      }

      let currentCredits = 0;
      const semesterCourses = [];

      const facultyTarget = semesterCreditTargets.get(currentSemIndex) || 0;
      let dynamicSoftLimit = Math.max(facultyTarget, SOFT_CREDIT_LIMIT);

      // Endgame: If nearing graduation, push to hard limit
      if (currentYear >= 4) {
        dynamicSoftLimit = HARD_CREDIT_LIMIT;
      }

      // *** "CLEAR THE DECK" LOGIC ***
      // If we have Internship left, and remaining courses are few, allow packing Y4S1 to max
      // so Y4S2 is empty for internship.
      let remainingNonInternshipCredits = 0;
      for (const code of remainingCodes) {
        if (code !== WIA3001_CODE) {
          const c = courseMap.get(code);
          remainingNonInternshipCredits += c ? c.credit_hours || 3 : 3;
        }
      }
      const isEndGameClearDeck =
        remainingCodes.has(WIA3001_CODE) &&
        remainingNonInternshipCredits > 0 &&
        remainingNonInternshipCredits <= HARD_CREDIT_LIMIT;

      if (isEndGameClearDeck) {
        dynamicSoftLimit = HARD_CREDIT_LIMIT;
      }

      const overdue = [];
      const current = [];
      const future = [];
      let wia3003Candidate = null;
      let wia3002Candidate = null;
      let wia3001Candidate = null;

      for (const code of remainingCodes) {
        const course = courseMap.get(code);
        if (!course) continue;
        if (!isOfferedInSem(course, currentSem)) continue;
        if (!arePrereqsMet(code)) continue;

        if (code === WIA3003_CODE) {
          if (canScheduleWIA3003(currentSemIndex)) wia3003Candidate = code;
          continue;
        }
        if (code === WIA3002_CODE) {
          if (canScheduleWIA3002()) wia3002Candidate = code;
          continue;
        }
        if (code === WIA3001_CODE) {
          if (canScheduleWIA3001()) wia3001Candidate = code;
          continue;
        }

        // *** THE FLOATER FIX ***
        // If a course is small (< 3 credits) like COC, treat it as "Current" priority
        // regardless of its year, as long as it's offered in this semester.
        const isFloater =
          course.credit_hours < 3 || course.type === "university_cocurriculum";

        const idealIdx = courseIdealIndex.has(code)
          ? courseIdealIndex.get(code)
          : 999;

        if (idealIdx < currentSemIndex) {
          overdue.push(code);
        } else if (idealIdx === currentSemIndex || isFloater) {
          // Move floaters to 'current' immediately to fill gaps
          current.push(code);
        } else {
          future.push(code);
        }
      }

      const tryAddCourse = (code, limitType) => {
        const c = courseMap.get(code);
        if (!c) return false;
        const cr = c.credit_hours || 3;

        // WIA3001 (Internship)
        if (code === WIA3001_CODE) {
          // If clearing deck for academic courses, skip internship this sem
          if (remainingNonInternshipCredits > 0 && semesterCourses.length === 0)
            return false;
          if (semesterCourses.length > 0) return false;
          semesterCourses.push(code);
          currentCredits += cr;
          return true;
        }

        if (semesterCourses.includes(WIA3001_CODE)) return false;

        let limit = dynamicSoftLimit;
        if (limitType === "HARD") limit = HARD_CREDIT_LIMIT;

        // ** Optimization: Allow small courses to squeeze in even if near limit **
        // If adding a 2-credit course keeps us under HARD limit, allow it even if over Soft Limit
        const isSmallCourse = cr < 3;
        if (isSmallCourse && currentCredits + cr <= HARD_CREDIT_LIMIT) {
          // Allow insertion
        } else {
          if (currentCredits + cr > limit) return false;
        }

        if (currentCredits + cr > HARD_CREDIT_LIMIT) return false;

        semesterCourses.push(code);
        currentCredits += cr;
        return true;
      };

      let madeProgress = false;

      // 1. WIA3003 (Project II) - Top Priority
      if (wia3003Candidate)
        if (tryAddCourse(wia3003Candidate, "HARD")) madeProgress = true;

      // 2. WIA3002 (Project I) - Critical Chain
      if (wia3002Candidate)
        if (tryAddCourse(wia3002Candidate, "HARD")) madeProgress = true;

      // 3. Overdue
      for (const code of overdue) {
        if (currentCredits >= HARD_CREDIT_LIMIT) break;
        if (!remainingCodes.has(code)) continue;
        if (tryAddCourse(code, "HARD")) madeProgress = true;
      }

      // 4. Current (Including Floaters like COC2222)
      for (const code of current) {
        if (currentCredits >= HARD_CREDIT_LIMIT) break;
        if (!remainingCodes.has(code)) continue;
        if (tryAddCourse(code, "SOFT")) madeProgress = true;
      }

      // 5. Future
      for (const code of future) {
        if (currentCredits >= dynamicSoftLimit) break;
        if (!remainingCodes.has(code)) continue;
        if (tryAddCourse(code, "SOFT")) madeProgress = true;
      }

      // 6. Internship Last Check
      if (wia3001Candidate && semesterCourses.length === 0) {
        if (tryAddCourse(wia3001Candidate, "HARD")) madeProgress = true;
      }

      finalPlan[yKey][sKey] = semesterCourses;

      if (semesterCourses.length > 0) {
        semesterCourses.forEach((code) => {
          remainingCodes.delete(code);
          simPassed.add(code);
          simTaken.add(code);
          if (code === WIA3002_CODE) wia3002SemIndex = currentSemIndex;
        });
      }

      if (currentSem === 2) {
        currentYear++;
        currentSem = 1;
      } else {
        currentSem = 2;
      }
    }

    return { success: true, plan: finalPlan, warnings: [] };
  } catch (err) {
    console.error("Custom Plan Error:", err);
    return { success: false, plan: {}, warnings: ["Failed to generate plan."] };
  }
}
