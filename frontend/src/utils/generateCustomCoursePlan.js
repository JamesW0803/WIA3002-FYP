import semesterMapping from "../constants/semesterMapping";
import { findLastCompletedSemester } from "../components/Students/AcademicPlanner/utils/planHelpers";

const generateCustomCoursePlan = ({
  completedEntries,
  allCourses,
  gapYears = [],
  gapSemesters = [],
  outboundSemesters = [],
  startPoint,
  strategy = "regular",
}) => {
  // Constants - using let instead of const for variables that need to be modified
  const MAX_CREDITS = {
    regular: 20,
    lighter: 16,
    gapYear: 22,
    gapSem: 22,
    outbound: 22,
  };
  let MAX_YEAR = 4;
  const MAX_SEMESTER = 2;

  // Helper functions
  const findCourse = (code) => allCourses.find((c) => c.course_code === code);
  const isGapSemester = (year, sem) =>
    gapSemesters.some((gs) => gs.year === year && gs.sem === sem);
  const isOutboundSemester = (year, sem) =>
    outboundSemesters.some((os) => os.year === year && os.sem === sem);

  // Track course status - improved to track latest status only
  const courseStatus = new Map();
  completedEntries.forEach((entry) => {
    const code = entry.course.course_code;
    const existing = courseStatus.get(code);

    // Only keep the latest attempt
    if (
      !existing ||
      entry.year > existing.year ||
      (entry.year === existing.year && entry.semester > existing.semester)
    ) {
      courseStatus.set(code, {
        status: entry.status,
        year: entry.year,
        semester: entry.semester,
      });
    }
  });

  // Get passed and failed courses based on latest attempt only
  const passedCourses = new Set();
  const failedCourses = new Set();

  courseStatus.forEach((status, code) => {
    if (status.status === "Passed") {
      passedCourses.add(code);
    } else if (status.status === "Failed") {
      failedCourses.add(code);
    }
  });

  // Check if on track with default plan
  const isOnTrack = checkIfOnTrack(completedEntries, semesterMapping);

  // If on track and regular strategy, return remaining default plan
  if (isOnTrack && strategy === "regular") {
    return getRemainingDefaultPlan(startPoint, allCourses);
  }

  // Improved course filtering logic
  let remainingCourses = allCourses.filter((course) => {
    const code = course.course_code;
    const status = courseStatus.get(code);
    return (!status || status.status === "Failed") && code !== "GLT1049";
  });

  // Special handling for project courses
  const projectCourses = {
    WIA3001: {
      type: "industrial_training",
      standalone: true,
      credit_hours: 12, // Industrial training is typically full-time
    },
    WIA3002: {
      type: "academic_project_1",
      followUp: "WIA3003",
      credit_hours: 3,
    },
    WIA3003: {
      type: "academic_project_2",
      requires: "WIA3002",
      credit_hours: 3,
    },
  };

  ["WIA3001", "WIA3002", "WIA3003"].forEach((code) => {
    const alreadyIncluded = remainingCourses.some(
      (c) => c.course_code === code
    );
    const alreadyPassed = passedCourses.has(code);
    const courseObj = allCourses.find((c) => c.course_code === code);

    if (!alreadyIncluded && !alreadyPassed && courseObj) {
      remainingCourses.push(courseObj);
    }
  });

  const takeKIAR = passedCourses.has("SHE4444") ? true : false;

  remainingCourses = remainingCourses.filter((c) => {
    if (c.course_code === "SHE4444") {
      return !takeKIAR;
    }
    if (c.course_code === "GQX0056") {
      return takeKIAR;
    }
    return true;
  });

  // Generate adaptive plan
  const plan = [];
  let currentYear = startPoint.year;
  let currentSem = startPoint.sem;
  let maxAttempts = 8; // Prevent infinite loops

  while (remainingCourses.length > 0 && maxAttempts-- > 0) {
    let creditsThisSemester = 0;
    const selectedCourses = [];
    const maxCredits = MAX_CREDITS[strategy] || 20;

    // Check if we need to move to next semester/year
    if (currentSem > MAX_SEMESTER) {
      currentYear++;
      currentSem = 1;
      if (currentYear > MAX_YEAR) {
        MAX_YEAR = currentYear; // Update MAX_YEAR if we're extending beyond 4 years
      }
    }

    // Skip gap years
    if (gapYears.includes(currentYear)) {
      plan.push({
        year: currentYear,
        sem: currentSem,
        courses: [],
        note: "Gap Year",
      });
      currentYear++;
      currentSem = 1;
      continue;
    }

    // Handle gap/outbound semesters
    if (isGapSemester(currentYear, currentSem)) {
      plan.push({
        year: currentYear,
        sem: currentSem,
        courses: [],
        note: "Gap Semester",
      });
      currentSem++;
      continue;
    }

    if (isOutboundSemester(currentYear, currentSem)) {
      const outboundCourses = getOutboundCourses(remainingCourses);
      plan.push({
        year: currentYear,
        sem: currentSem,
        courses: outboundCourses,
        note: "Outbound Programme",
      });
      remainingCourses = remainingCourses.filter(
        (c) => !outboundCourses.some((oc) => oc.course_code === c.course_code)
      );
      currentSem++;
      continue;
    }

    // Get available courses for this semester
    const availableCourses = remainingCourses.filter((course) => {
      // Check prerequisites
      const prereqsMet =
        !course.prerequisites ||
        course.prerequisites.every((p) => passedCourses.has(p));

      // Check if offered this semester
      const offeredThisSem =
        !course.offered_semester ||
        course.offered_semester.includes(`Semester ${currentSem}`);

      // Special handling for project courses
      if (projectCourses[course.course_code]) {
        const pc = projectCourses[course.course_code];

        // Industrial Training should be standalone
        if (pc.standalone) {
          return prereqsMet && offeredThisSem;
        }

        // Academic Project II requires Project I in previous semester
        if (pc.requires) {
          const project1Taken = plan.some(
            (sem) =>
              sem.courses.some((c) => c.course_code === pc.requires) &&
              (sem.year < currentYear ||
                (sem.year === currentYear && sem.sem < currentSem))
          );
          return prereqsMet && offeredThisSem && project1Taken;
        }
      }

      return prereqsMet && offeredThisSem;
    });

    // Prioritize failed courses first
    const retakeCourses = availableCourses.filter((c) =>
      failedCourses.has(c.course_code)
    );
    const newCourses = availableCourses.filter(
      (c) => !failedCourses.has(c.course_code)
    );

    // Sort courses with better distribution
    const sortedCourses = [
      ...retakeCourses.sort(sortByPriority),
      ...newCourses.sort(sortByPriority),
    ];

    // Select courses for this semester
    for (const course of sortedCourses) {
      // Skip if this is Industrial Training and we already have courses
      if (
        projectCourses[course.course_code]?.standalone &&
        selectedCourses.length > 0
      ) {
        continue;
      }

      // Skip if this would exceed max credits
      if (creditsThisSemester + course.credit_hours > maxCredits) {
        continue;
      }

      // Special handling for project courses
      if (projectCourses[course.course_code]?.followUp) {
        // Ensure we have space in next semester for follow-up project
        const nextSemCredits = estimateNextSemesterCredits(
          remainingCourses.filter((c) => c !== course),
          currentYear,
          currentSem,
          maxCredits
        );

        if (nextSemCredits + course.credit_hours > maxCredits * 1.2) {
          continue; // Don't take if next semester would be overloaded
        }
      }

      selectedCourses.push(course);
      creditsThisSemester += course.credit_hours;
    }

    // Add to plan if we have courses
    if (selectedCourses.length > 0) {
      plan.push({
        year: currentYear,
        sem: currentSem,
        courses: selectedCourses,
        totalCredits: creditsThisSemester,
      });

      // Remove from remaining courses
      remainingCourses = remainingCourses.filter(
        (c) => !selectedCourses.some((sc) => sc.course_code === c.course_code)
      );
    }

    // Move to next semester
    currentSem++;
  }

  return plan;
};

// Helper function to sort courses by priority
function sortByPriority(a, b) {
  // Core courses first
  if (a.type === "programme_core" && b.type !== "programme_core") return -1;
  if (b.type === "programme_core" && a.type !== "programme_core") return 1;

  // Then by credit hours (higher first)
  return b.credit_hours - a.credit_hours;
}

// Helper function to estimate next semester credits
function estimateNextSemesterCredits(courses, year, sem, maxCredits) {
  // Simple estimation - can be enhanced
  const nextSem = sem === 1 ? 2 : 1;
  const nextYear = sem === 2 ? year + 1 : year;

  const available = courses
    .filter(
      (c) =>
        !c.offered_semester ||
        c.offered_semester.includes(`Semester ${nextSem}`)
    )
    .sort(sortByPriority);

  let credits = 0;
  for (const course of available) {
    if (credits + course.credit_hours <= maxCredits) {
      credits += course.credit_hours;
    }
  }
  return credits;
}

function checkIfOnTrack(completedEntries, semesterMapping) {
  // Flatten the semester mapping into course-semester pairs
  const defaultPlanCourses = [];

  Object.entries(semesterMapping).forEach(([year, semesters]) => {
    const yearNum = parseInt(year.split(" ")[1]);
    Object.entries(semesters).forEach(([semName, courseCodes]) => {
      const semNum = parseInt(semName.split(" ")[1]);
      courseCodes.forEach((code) => {
        if (!code.startsWith("SPECIALIZATION_")) {
          defaultPlanCourses.push({
            course_code: code,
            year: yearNum,
            semester: semNum,
          });
        }
      });
    });
  });

  // Check each completed course against the default plan
  for (const entry of completedEntries) {
    if (entry.status === "Passed") {
      const defaultTiming = defaultPlanCourses.find(
        (c) => c.course_code === entry.course.course_code
      );

      // If the course isn't in the default plan at all, student is off track
      if (!defaultTiming) return false;

      // If taken earlier than default plan, that's okay
      // If taken later than default plan, student is off track
      if (
        entry.year > defaultTiming.year ||
        (entry.year === defaultTiming.year &&
          entry.semester > defaultTiming.semester)
      ) {
        return false;
      }
    }
  }

  // Check for any default plan courses that should have been taken but weren't
  const passedCourseCodes = new Set(
    completedEntries
      .filter((e) => e.status === "Passed")
      .map((e) => e.course.course_code)
  );

  const lastCompleted = findLastCompletedSemester(completedEntries);

  for (const course of defaultPlanCourses) {
    // Only check courses that should have been completed by now
    if (
      course.year < lastCompleted.year ||
      (course.year === lastCompleted.year &&
        course.semester <= lastCompleted.semester)
    ) {
      if (!passedCourseCodes.has(course.course_code)) {
        return false;
      }
    }
  }

  return true;
}

function getRemainingDefaultPlan(startPoint, allCourses) {
  const remainingPlan = [];
  let foundStart = false;

  Object.entries(semesterMapping).forEach(([year, semesters]) => {
    const yearNum = parseInt(year.split(" ")[1]);

    // Skip years before the start point
    if (yearNum < startPoint.year) return;

    const remainingSemesters = {};

    Object.entries(semesters).forEach(([semName, courseCodes]) => {
      const semNum = parseInt(semName.split(" ")[1]);

      // For the start year, skip semesters before the start semester
      if (yearNum === startPoint.year && semNum < startPoint.sem) return;

      // Only start adding after we find the exact start point
      if (yearNum === startPoint.year && semNum === startPoint.sem) {
        foundStart = true;
      }

      if (foundStart) {
        const courses = courseCodes
          .map((code) => {
            if (code.startsWith("SPECIALIZATION_")) {
              return {
                course_name: `Specialization Elective`,
                course_code: "SPECIALIZATION",
                credit_hours: 3,
                type: "programme_elective",
              };
            }
            const course = allCourses.find((c) => c.course_code === code);
            return course
              ? {
                  course_name: course.course_name,
                  course_code: course.course_code,
                  credit_hours: course.credit_hours,
                  type: course.type,
                }
              : null;
          })
          .filter(Boolean);

        remainingSemesters[semName] = {
          name: semName,
          courses,
          totalCredits: courses.reduce((sum, c) => sum + c.credit_hours, 0),
        };
      }
    });

    if (foundStart && Object.keys(remainingSemesters).length > 0) {
      remainingPlan.push({
        year,
        semesters: Object.values(remainingSemesters),
      });
    }
  });

  return remainingPlan;
}

function getOutboundCourses(remainingCourses) {
  // Select appropriate courses for outbound semester
  return remainingCourses
    .filter((c) =>
      ["university_other", "university_cocurriculum"].includes(c.type)
    )
    .slice(0, 3); // Limit to 3 courses
}

export default generateCustomCoursePlan;
