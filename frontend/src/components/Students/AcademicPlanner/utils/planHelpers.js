export const generateNewPlan = (existingPlansCount, completedCourses = []) => {
  return {
    id: Date.now(),
    name: `Plan ${String.fromCharCode(65 + existingPlansCount)}`,
    created: new Date().toISOString().split("T")[0],
    semesters: 8,
    credits: 0,
    notes: "",
    years: [
      {
        year: 1,
        semesters: [
          {
            id: Date.now(),
            name: "Year 1 - Semester 1",
            courses: [],
            completed: false,
          },
          {
            id: Date.now() + 1,
            name: "Year 1 - Semester 2",
            courses: [],
            completed: false,
          },
        ],
      },
    ],
    completedCourses: [...completedCourses], // Track completed courses for this plan
  };
};

export const canAddNewPlan = (plans, tempPlans, maxPlans = 3) => {
  const activePlans = plans.filter((plan) => !tempPlans.includes(plan.id));
  return activePlans.length < maxPlans;
};

export const calculatePlanCredits = (plan) => {
  if (!plan?.years) return 0;

  return plan.years.reduce((total, year) => {
    return year.semesters.reduce((semTotal, semester) => {
      const semesterCredits = semester.courses.reduce((courseTotal, course) => {
        return courseTotal + (course?.credit || 0); // Changed from credits to credit
      }, 0);
      return semTotal + semesterCredits;
    }, total);
  }, 0);
};

export const findCourseByCode = (code, coursesDatabase) => {
  return coursesDatabase.find((course) => course.code === code) || null;
};

export const validateCourseAddition = (
  course,
  semester,
  allCourses,
  completedCourses = []
) => {
  console.log("--- Validating Course Addition ---");
  console.log("Course:", course.code);
  console.log("Prerequisites:", course.prerequisites);
  console.log("Completed Courses:", completedCourses);
  if (!course) {
    console.log("Validation failed: Course not found");
    return { isValid: false, message: "Course not found" };
  }

  if (!semester || !semester.courses) {
    return { isValid: false, message: "Semester information missing" };
  }

  if (!course.code) {
    return { isValid: false, message: "Invalid course code" };
  }

  // Check if course is already in this semester
  if (semester.courses.some((c) => c.code === course.code)) {
    console.log("Validation failed: Course already in semester");
    return {
      isValid: false,
      message: "Course already exists in this semester",
    };
  }

  // Check prerequisites
  const prereqs = course.prerequisites || [];
  console.log("Prerequisites to check:", prereqs);
  const missingPrereqs = prereqs.filter(
    (prereq) => !completedCourses.includes(prereq)
  );
  console.log("Missing prerequisites:", missingPrereqs);

  if (missingPrereqs.length > 0) {
    console.log("Validation failed: Missing prerequisites");
    // Get course names for better error message
    const missingNames = missingPrereqs.map((code) => {
      const c = allCourses.find((c) => c.code === code);
      return c ? `${code} - ${c.name}` : code;
    });

    return {
      isValid: false,
      message: `Missing prerequisites: ${missingNames.join(", ")}`,
    };
  }

  // Check if course is offered in this semester
  const parts = String(semester.name || "")
    .trim()
    .split(" ");
  const semesterNum = Number(parts[parts.length - 1]);
  const offeredList = Array.isArray(course.offered_semester)
    ? course.offered_semester
    : [];

  const norm = offeredList.map((s) => String(s).toLowerCase());

  const isOfferedThisSemester = norm.some(
    (val) =>
      val.includes(`semester ${semesterNum}`) || // "Semester 1"
      val === String(semesterNum) || // "1" or 1
      val.includes("both") ||
      val.includes("all") ||
      val.includes("any")
  );

  console.log("Offered this semester?", isOfferedThisSemester);

  if (!isOfferedThisSemester) {
    console.log("Validation failed: Not offered this semester");
    return {
      isValid: false,
      message: `Course is not offered in ${semester.name}`,
    };
  }

  console.log("Validation passed!");
  return { isValid: true, message: "" };
};

export const generateSuggestedPlan = (
  programRequirements,
  completedCourses = [],
  allCourses = []
) => {
  // Filter out completed courses and organize by year/semester
  const suggestedYears = programRequirements.years.map((year) => {
    return {
      ...year,
      semesters: year.semesters.map((semester) => {
        const suggestedCourses = semester.courses
          .filter((courseCode) => !completedCourses.includes(courseCode))
          .map((courseCode) => allCourses.find((c) => c.code === courseCode))
          .filter(Boolean); // Remove undefined if course not found

        return {
          ...semester,
          courses: suggestedCourses,
          completed: false,
        };
      }),
    };
  });

  return {
    id: "suggested-" + Date.now(),
    name: "Suggested Plan",
    created: new Date().toISOString().split("T")[0],
    semesters: suggestedYears.reduce(
      (total, year) => total + year.semesters.length,
      0
    ),
    credits: calculatePlanCredits({ years: suggestedYears }),
    notes: "Automatically generated based on your completed courses",
    years: suggestedYears,
    isSuggested: true, // Flag to identify suggested plans
  };
};

// New helper function to get all completed courses from a plan
export const getCompletedCoursesFromPlan = (plan) => {
  if (!plan?.years) return [];

  return plan.years.flatMap((year) =>
    year.semesters
      .filter((semester) => semester.completed)
      .flatMap((semester) => semester.courses.map((course) => course.code))
  );
};

// New helper function to check if a course can be added to a semester
export const canAddCourseToSemester = (
  courseCode,
  semester,
  plan,
  allCourses,
  completedCourses
) => {
  const course = allCourses.find((c) => c.code === courseCode);
  if (!course) return false;

  const validation = validateCourseAddition(
    course,
    semester,
    allCourses,
    completedCourses
  );
  return validation.isValid;
};

export const generateNewPlanFromStartingPoint = (index, startPoint) => {
  const years = [];
  const baseProgramYears = 4;

  // endYear must be at least startPoint.year so that Year 5 plans still work
  const endYear = Math.max(baseProgramYears, startPoint.year);
  let semesterCount = 0;

  for (let year = startPoint.year; year <= endYear; year++) {
    const semesters = [];
    const startSemester = year === startPoint.year ? startPoint.semester : 1;

    for (let sem = startSemester; sem <= 2; sem++) {
      semesters.push({
        id: Date.now() + year * 10 + sem,
        name: `Year ${year} - Semester ${sem}`,
        courses: [],
        completed: false,
        isGap: false,
      });
      semesterCount++;
    }

    years.push({
      year,
      semesters,
      isGapYear: false,
    });
  }

  return {
    id: Date.now(),
    name: `Plan ${String.fromCharCode(65 + index)}`,
    created: new Date().toISOString().split("T")[0],
    semesters: semesterCount,
    credits: 0,
    notes: "",
    years,
  };
};

// Strict: returns the last semester that has any entries (attempts)
// NOW also includes gap semesters/years
export const findLastCompletedSemester = (entries = [], gaps = []) => {
  if ((!entries || entries.length === 0) && (!gaps || gaps.length === 0)) {
    return null;
  }

  let maxIdx = -1;

  // from entries
  for (const entry of entries || []) {
    if (!entry.year || !entry.semester) continue;
    const idx = semesterIndex(entry.year, entry.semester);
    if (idx > maxIdx) maxIdx = idx;
  }

  // from gaps
  for (const gap of gaps || []) {
    if (!gap || !gap.year) continue;
    if (gap.semester == null) {
      // gap year => both semesters
      for (let s = 1; s <= 2; s++) {
        const idx = semesterIndex(gap.year, s);
        if (idx > maxIdx) maxIdx = idx;
      }
    } else {
      const idx = semesterIndex(gap.year, gap.semester);
      if (idx > maxIdx) maxIdx = idx;
    }
  }

  if (maxIdx < 0) return null;
  return indexToYearSemester(maxIdx);
};

// Friendly: returns the next semester to plan after the last completed/attempted/gapped one
export const findNextSemesterToPlan = (entries = [], gaps = []) => {
  const last = findLastCompletedSemester(entries, gaps);
  if (!last) return { year: 1, semester: 1 };

  return last.semester === 2
    ? { year: last.year + 1, semester: 1 }
    : { year: last.year, semester: last.semester + 1 };
};

const semesterIndex = (year, semester) =>
  (Number(year) - 1) * 2 + (Number(semester) - 1);

const indexToYearSemester = (index) => ({
  year: Math.floor(index / 2) + 1,
  semester: (index % 2) + 1,
});

// Determine if a course can be retaken based on the academic profile
export const canRetakeCourse = (courseCode, completedCoursesByYear = {}) => {
  if (!courseCode) {
    return {
      hasTaken: false,
      canRetake: false,
      reason: "Invalid course code.",
    };
  }

  const attempts = [];

  Object.values(completedCoursesByYear).forEach((yearData) => {
    if (!yearData) return;
    Object.values(yearData).forEach((semesterCourses) => {
      (semesterCourses || []).forEach((entry) => {
        if (entry.code === courseCode) {
          attempts.push(entry);
        }
      });
    });
  });

  // Never taken before → not a "retake"
  if (attempts.length === 0) {
    return {
      hasTaken: false,
      canRetake: false,
      reason: "Course has not been taken before.",
    };
  }

  // If ANY attempt is Passed with A or A+, it is not retakable
  const hasAorAplus = attempts.some(
    (a) => a.status === "Passed" && (a.grade === "A" || a.grade === "A+")
  );

  if (hasAorAplus) {
    return {
      hasTaken: true,
      canRetake: false,
      reason:
        "You already passed this course with grade A or A+, so it cannot be retaken.",
    };
  }

  // Taken before, but never with A/A+ → retake is allowed
  return {
    hasTaken: true,
    canRetake: true,
    reason: "",
  };
};
