import axiosClient from "../api/axiosClient";

const MAX_CREDITS_PER_SEM = 22; // Aggressive packing
const WIA3001_CODE = "WIA3001";
const WIA3002_CODE = "WIA3002";
const WIA3003_CODE = "WIA3003";

const CORE_TYPES = new Set(["faculty_core", "programme_core"]);

// Helper: Convert "Year 1", "Semester 1" to a linear index (1, 2, 3...)
// Assuming standard 2 semesters per year for indexing
const getSemIndex = (y, s) => (y - 1) * 2 + (s - 1);

// Helper: Check if a course is offered in a specific semester (1 or 2)
const isOfferedInSem = (course, sem) => {
  const offerings = course.offered_semester || [];
  if (!offerings.length) return true; // Empty means offered in both
  return offerings.includes(`Semester ${sem}`);
};

export default async function generateCustomPlan(
  userId,
  token,
  preferences = {},
  semesterMappingOverride = null
) {
  try {
    // 1. Fetch Data (unchanged)
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

    // 2. Fetch or Use Default Plan (unchanged)
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

    // 3. Pre-process Data
    // A. Build Course Map
    const courseMap = new Map();
    allCourses.forEach((c) => courseMap.set(c.course_code, c));

    // B. Identify all Faculty Core + Programme Core course codes
    const allCoreCodes = new Set(
      allCourses.filter((c) => CORE_TYPES.has(c.type)).map((c) => c.course_code)
    );

    // C. Identify Passed Courses & Last Active Semester
    const passedSet = new Set();
    const takenSet = new Set(); // For WIA3001 prerequisite check (must have TAKEN cores)
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

        // Track latest semester to start planning from NEXT one
        if (e.year > maxYear || (e.year === maxYear && e.semester > maxSem)) {
          maxYear = e.year;
          maxSem = e.semester;
        }
      }
    });

    // Start planning from next semester
    let startYear = maxYear;
    let startSem = maxSem;
    if (startYear === 0) {
      startYear = 1;
      startSem = 1;
    } else {
      // Advance 1 semester
      if (startSem === 2) {
        startYear++;
        startSem = 1;
      } else {
        startSem = 2;
      }
    }

    // C. Flatten Default Plan to identify "Ideal Semester Index" for every course
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
              // store the earliest ideal index only
              if (!courseIdealIndex.has(code)) {
                courseIdealIndex.set(code, index);
              }
              allPlanCourses.add(code);
            }
          });
        });
      });
    }

    // D. Identify Remaining Courses
    const remainingCodes = new Set();

    // Add all from default plan not passed
    allPlanCourses.forEach((code) => {
      if (!passedSet.has(code)) remainingCodes.add(code);
    });

    // Plus any attempted-but-not-passed courses that exist in catalog
    entries.forEach((e) => {
      const c = e.course?.course_code;
      if (c && !passedSet.has(c) && courseMap.has(c)) {
        remainingCodes.add(c);
      }
    });

    // 4. The Dense Packing Simulation (optimized)
    const finalPlan = {}; // { "Year 1": { "Semester 1": [codes] } }
    let currentYear = startYear;
    let currentSem = startSem;
    let safetyLoop = 0;

    // Simulated state as we move forward in time
    const simPassed = new Set(passedSet);
    const simTaken = new Set(takenSet);

    let wia3002SemIndex = lastPassedWIA3002SemIndex;

    // Rule 1 is handled by arePrereqsMet (uses simPassed, which only updates
    // after a semester is completed), so no co-requisites are possible.
    const arePrereqsMet = (code) => {
      const course = courseMap.get(code);
      if (!course || !course.prerequisites || !course.prerequisites.length)
        return true;

      // Must be PASSED before this semester
      return course.prerequisites.every((pr) => {
        const prCode = typeof pr === "string" ? pr : pr.course_code;
        return simPassed.has(prCode);
      });
    };

    // Rule 2: WIA3001 gating (all other Faculty Core + Programme Core must be TAKEN)
    const canScheduleWIA3001 = () => {
      for (const coreCode of allCoreCodes) {
        if (coreCode === WIA3001_CODE) continue;
        if (!simTaken.has(coreCode)) return false;
      }
      return true;
    };

    // Rule 3: WIA3002 gating (all other Faculty Core + Programme Core must be PASSED)
    const canScheduleWIA3002 = () => {
      for (const coreCode of allCoreCodes) {
        if (coreCode === WIA3002_CODE) continue;
        if (!simPassed.has(coreCode)) return false;
      }
      return true;
    };

    // Rule 4: WIA3003 continuity (semester immediately after WIA3002)
    const canScheduleWIA3003 = (currentSemIndex) => {
      if (wia3002SemIndex == null) return false;
      // Must be exactly the next semester
      return currentSemIndex === wia3002SemIndex + 1;
    };

    // Pre-compute gap/outbound lookups
    const gapYears = preferences.gapYears || [];
    const gapSemesters = preferences.gapSemesters || [];
    const outboundSemesters = preferences.outboundSemesters || [];

    const gapSemKey = new Set(gapSemesters.map((g) => `Y${g.year}S${g.sem}`));
    const outboundSemKey = new Set(
      outboundSemesters.map((g) => `Y${g.year}S${g.sem}`)
    );

    const isGapYear = (y) => gapYears.includes(y);
    const isGapSemester = (y, s) => gapSemKey.has(`Y${y}S${s}`);
    const isOutboundSemester = (y, s) => outboundSemKey.has(`Y${y}S${s}`);

    while (remainingCodes.size > 0 && safetyLoop < 20) {
      safetyLoop++;

      const yKey = `Year ${currentYear}`;
      const sKey = `Semester ${currentSem}`;
      if (!finalPlan[yKey]) finalPlan[yKey] = {};

      // GAP / OUTBOUND handling (same as before but cheap lookups)
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
      const currentSemIndex = getSemIndex(currentYear, currentSem);

      // ===== NEW: 1-pass bucketing instead of full sort =====
      const overdue = [];
      const current = [];
      const future = [];
      let wia3003Candidate = null;

      for (const code of remainingCodes) {
        const course = courseMap.get(code);
        if (!course) continue;

        // Prereqs + offering (Rule 1: no co-requisites via simPassed)
        if (!isOfferedInSem(course, currentSem)) continue;
        if (!arePrereqsMet(code)) continue;

        // Rule 2: WIA3001 gating
        if (code === WIA3001_CODE && !canScheduleWIA3001()) {
          continue;
        }

        // Rule 3: WIA3002 gating
        if (code === WIA3002_CODE && !canScheduleWIA3002()) {
          continue;
        }

        // Rule 4: WIA3003 continuity – keep as special candidate only
        if (code === WIA3003_CODE) {
          if (canScheduleWIA3003(currentSemIndex)) {
            wia3003Candidate = code;
          }
          // either way, don't bucket it again (handled separately)
          continue;
        }

        const idealIdx = courseIdealIndex.has(code)
          ? courseIdealIndex.get(code)
          : 999; // far future if unknown

        if (idealIdx < currentSemIndex) {
          overdue.push(code);
        } else if (idealIdx === currentSemIndex) {
          current.push(code);
        } else {
          future.push(code);
        }
      }

      // helper to try to take a course if credits allow (and WIA3001 rules)
      const tryAddCourse = (code) => {
        const c = courseMap.get(code);
        if (!c) return false;
        const cr = c.credit_hours || 3;

        // WIA3001 must be alone
        if (code === WIA3001_CODE) {
          if (semesterCourses.length > 0) return false;
          if (cr > MAX_CREDITS_PER_SEM) return false;
          semesterCourses.push(code);
          currentCredits += cr;
          return true;
        }

        if (semesterCourses.includes(WIA3001_CODE)) {
          return false;
        }

        if (currentCredits + cr > MAX_CREDITS_PER_SEM) return false;
        semesterCourses.push(code);
        currentCredits += cr;
        return true;
      };

      let madeProgress = false;

      // 1) If WIA3003 is eligible, force it first
      if (wia3003Candidate) {
        if (tryAddCourse(wia3003Candidate)) {
          madeProgress = true;
        }
      }

      // choose bucket order: overdue -> current -> future
      const buckets = [overdue, current, future];

      for (const bucket of buckets) {
        for (const code of bucket) {
          if (currentCredits >= MAX_CREDITS_PER_SEM) break;
          if (!remainingCodes.has(code)) continue; // might have been removed
          if (tryAddCourse(code)) {
            madeProgress = true;
          }
        }
        if (currentCredits >= MAX_CREDITS_PER_SEM) break;
      }

      finalPlan[yKey][sKey] = semesterCourses;

      // Update simulated state
      if (semesterCourses.length > 0) {
        semesterCourses.forEach((code) => {
          remainingCodes.delete(code);
          simPassed.add(code);
          simTaken.add(code);

          if (code === WIA3002_CODE) {
            wia3002SemIndex = currentSemIndex;
          }
        });
      }

      // ===== IMPORTANT: break if we cannot place anything =====
      // This prevents spinning 20 times doing nothing when
      // nothing can be scheduled due to prereqs / offerings constraints.
      if (!madeProgress) {
        console.warn(
          "[generateCustomPlan] No schedulable courses in this semester; stopping early to avoid long loop."
        );
        break;
      }

      // Advance time
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
