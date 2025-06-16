import axiosClient from "../api/axiosClient";
import semesterMapping from "../constants/semesterMapping";

async function generateCustomPlan(userId, token, preferences = {}) {
  try {
    // Fetch all courses and student's academic profile
    const [coursesResponse, profileResponse] = await Promise.all([
      axiosClient.get("/courses", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axiosClient.get(`/academic-profile/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const allCourses = coursesResponse.data;
    const profile = profileResponse.data;

    // Initialize data structures
    let waitingCourses = [];
    let failedCourses = [];
    let passedCourses = new Set();
    let takenSemesters = {};
    let gapSemesters = profile.gapSemesters || [];
    let gapYears = profile.gapYears || [];
    let lightweight = preferences.lightweight || false;
    let maxCredits = lightweight ? 16 : 21;
    let absoluteMaxCredits = 22;

    // Process academic profile entries
    profile.entries.forEach((entry) => {
      const courseCode = entry.course.course_code;
      const yearSem = `Y${entry.year}S${entry.semester}`;

      if (!takenSemesters[yearSem]) {
        takenSemesters[yearSem] = [];
      }
      takenSemesters[yearSem].push(courseCode);

      if (entry.status === "Passed") {
        passedCourses.add(courseCode);
      } else if (!entry.isRetake) {
        failedCourses.push(courseCode);
      }
    });

    // Build prerequisite map and course info
    const courseInfo = {};
    const prerequisites = {};

    allCourses.forEach((course) => {
      courseInfo[course.course_code] = {
        creditHours: course.credit_hours,
        offeredSemester: course.offered_semester,
        type: course.type,
      };

      if (course.prerequisites && course.prerequisites.length > 0) {
        prerequisites[course.course_code] = course.prerequisites.map(
          (p) => p.course_code
        );
      }
    });

    // Process each year and semester in order
    const customPlan = {};
    let currentYear = 1;
    let extendedYears = 0;

    // Helper function to check prerequisites
    function checkPrerequisites(courseCode) {
      if (!prerequisites[courseCode]) return true;
      return prerequisites[courseCode].every((req) => passedCourses.has(req));
    }

    // Helper to get next available semester for a course
    function getNextAvailableSemester(
      courseCode,
      currentYear,
      currentSemester
    ) {
      const offering = courseInfo[courseCode]?.offeredSemester || [
        "Semester 1",
        "Semester 2",
      ];

      // Try to place in next available offering
      for (let year = currentYear; year <= currentYear + 2; year++) {
        for (let sem = 1; sem <= 2; sem++) {
          // Skip if we're before current semester in current year
          if (year === currentYear && sem <= currentSemester) continue;

          const semName = `Semester ${sem}`;
          if (offering.includes(semName)) {
            return { year, semester: sem };
          }
        }
      }

      // Default to next semester if no offering pattern matches
      return currentSemester === 1
        ? { year: currentYear, semester: 2 }
        : { year: currentYear + 1, semester: 1 };
    }

    // Process each semester in chronological order
    for (let year = 1; year <= 4 + extendedYears; year++) {
      const yearKey = `Year ${year}`;
      customPlan[yearKey] = {};

      // Skip gap years
      if (gapYears.includes(year)) {
        customPlan[yearKey] = { "Semester 1": ["GAP YEAR"], "Semester 2": [] };
        extendedYears++;
        continue;
      }

      for (let semester = 1; semester <= 2; semester++) {
        const semKey = `Semester ${semester}`;
        const fullSemKey = `Y${year}S${semester}`;

        // Skip gap semesters
        if (gapSemesters.includes(fullSemKey)) {
          customPlan[yearKey][semKey] = ["GAP SEMESTER"];
          continue;
        }

        // Get expected courses for this semester from default mapping
        const mappingYear = year - extendedYears;
        const defaultCourses =
          semesterMapping[`Year ${mappingYear}`]?.[semKey] || [];

        // Get actually taken courses for this semester
        const takenCourses = takenSemesters[fullSemKey] || [];

        // Check for missing or different courses
        const missingCourses = defaultCourses.filter(
          (c) => !takenCourses.includes(c)
        );
        const extraCourses = takenCourses.filter(
          (c) => !defaultCourses.includes(c)
        );

        // Add missing courses to waiting list if not passed
        missingCourses.forEach((courseCode) => {
          if (!passedCourses.has(courseCode)) {
            waitingCourses.push(courseCode);
          }
        });

        // Process extra courses (may have been taken as replacements)
        extraCourses.forEach((courseCode) => {
          if (!passedCourses.has(courseCode)) {
            failedCourses.push(courseCode);
          }
        });

        // Initialize current semester courses
        const currentSemesterCourses = [...takenCourses];
        let currentCredits = calculateSemesterCredits(
          currentSemesterCourses,
          courseInfo
        );

        // Try to add waiting courses that can fit this semester
        const addedCourses = [];
        for (const courseCode of [...waitingCourses]) {
          // Check prerequisites
          if (!checkPrerequisites(courseCode)) continue;

          // Check if course is offered this semester
          const semName = `Semester ${semester}`;
          const isOffered =
            courseInfo[courseCode]?.offeredSemester?.includes(semName) ?? true;
          if (!isOffered) continue;

          // Special handling for WIA3002 (must be in Semester 2)
          if (courseCode === "WIA3002" && semester !== 2) continue;

          // Special handling for WIA3003 (must be after WIA3002)
          if (
            courseCode === "WIA3003" &&
            (!passedCourses.has("WIA3002") ||
              (year === 3 + extendedYears && semester === 2))
          )
            continue;

          // Check credit limits
          const courseCredits = courseInfo[courseCode]?.creditHours || 3;
          if (currentCredits + courseCredits > absoluteMaxCredits) continue;
          if (currentCredits + courseCredits > maxCredits && !lightweight)
            continue;

          // Add to current semester if possible
          currentSemesterCourses.push(courseCode);
          currentCredits += courseCredits;
          addedCourses.push(courseCode);

          // Remove from waiting list
          waitingCourses.splice(waitingCourses.indexOf(courseCode), 1);
        }

        // Handle WIA3001 special case (must be alone)
        if (
          currentSemesterCourses.includes("WIA3001") &&
          currentSemesterCourses.length > 1
        ) {
          // Remove all other courses from this semester and add to waiting
          const otherCourses = currentSemesterCourses.filter(
            (c) => c !== "WIA3001"
          );
          currentSemesterCourses = ["WIA3001"];
          waitingCourses.push(...otherCourses);
        }

        // Finalize semester courses
        customPlan[yearKey][semKey] = currentSemesterCourses.sort();
      }
    }

    // Handle any remaining waiting courses by extending the plan
    while (waitingCourses.length > 0) {
      extendedYears++;
      const extendedYear = 4 + extendedYears;
      const yearKey = `Year ${extendedYear}`;
      customPlan[yearKey] = {};

      for (let semester = 1; semester <= 2; semester++) {
        const semKey = `Semester ${semester}`;
        customPlan[yearKey][semKey] = [];
        let currentCredits = 0;

        // Try to add waiting courses
        const addedCourses = [];
        for (const courseCode of [...waitingCourses]) {
          // Check prerequisites
          if (!checkPrerequisites(courseCode)) continue;

          // Special handling for WIA3002 and WIA3003
          if (courseCode === "WIA3002" && semester !== 2) continue;
          if (courseCode === "WIA3003" && semester !== 1) continue;

          // Check if course is offered this semester
          const semName = `Semester ${semester}`;
          const isOffered =
            courseInfo[courseCode]?.offeredSemester?.includes(semName) ?? true;
          if (!isOffered) continue;

          // Check credit limits
          const courseCredits = courseInfo[courseCode]?.creditHours || 3;
          if (currentCredits + courseCredits > absoluteMaxCredits) continue;
          if (currentCredits + courseCredits > maxCredits && !lightweight)
            continue;

          // Add to current semester
          customPlan[yearKey][semKey].push(courseCode);
          currentCredits += courseCredits;
          addedCourses.push(courseCode);
        }

        // Remove added courses from waiting list
        waitingCourses = waitingCourses.filter(
          (c) => !addedCourses.includes(c)
        );

        // Sort courses
        customPlan[yearKey][semKey].sort();
      }
    }

    return {
      success: true,
      plan: customPlan,
      warnings:
        failedCourses.length > 0
          ? [
              `Some failed courses need to be retaken: ${failedCourses.join(
                ", "
              )}`,
            ]
          : [],
    };
  } catch (error) {
    console.error("Error generating custom plan:", error);
    return {
      success: false,
      message: "Failed to generate study plan",
      error: error.message,
    };
  }
}

// Helper function to calculate semester credits
function calculateSemesterCredits(courses, courseInfo) {
  return courses.reduce((total, courseCode) => {
    return total + (courseInfo[courseCode]?.creditHours || 3);
  }, 0);
}

export default generateCustomPlan;
