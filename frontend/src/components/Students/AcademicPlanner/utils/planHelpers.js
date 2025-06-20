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
  if (!course) {
    return { isValid: false, message: "Course not found" };
  }

  // Check if course is already in this semester
  if (semester.courses.some((c) => c.code === course.code)) {
    return {
      isValid: false,
      message: "Course already exists in this semester",
    };
  }

  // Check if course is already completed (in any semester)
  if (completedCourses.includes(course.code)) {
    return {
      isValid: false,
      message: "Course has already been completed",
    };
  }

  // Check prerequisites
  const prereqs = course.prerequisites || [];
  const missingPrereqs = prereqs.filter(
    (prereq) => !completedCourses.includes(prereq)
  );

  if (missingPrereqs.length > 0) {
    return {
      isValid: false,
      message: `Missing prerequisites: ${missingPrereqs.join(", ")}`,
    };
  }

  // Check if course is offered in this semester
  const semesterNum = semester.name.split(" ")[3];
  const isOfferedThisSemester = course.offered_semester?.some((sem) =>
    sem.includes(semesterNum)
  );

  if (!isOfferedThisSemester) {
    return {
      isValid: false,
      message: `Course is not offered in ${semester.name}`,
    };
  }

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

// Add to planHelpers.js
export const generateNewPlanFromStartingPoint = (index, startPoint) => {
  const years = [];
  const totalYears = 4; // Assuming 4-year program

  // Start from the determined starting point
  for (let year = startPoint.year; year <= totalYears; year++) {
    const semesters = [];

    // For the starting year, only include semesters after the starting semester
    const startSemester = year === startPoint.year ? startPoint.semester : 1;

    for (let sem = startSemester; sem <= 2; sem++) {
      semesters.push({
        id: Date.now() + year * 10 + sem,
        name: `Year ${year} - Semester ${sem}`,
        courses: [],
        completed: false,
      });
    }

    years.push({
      year,
      semesters,
    });
  }

  return {
    id: Date.now(), // ADD THIS
    name: `Plan ${String.fromCharCode(65 + index)}`,
    created: new Date().toISOString().split("T")[0],
    semesters: years.reduce((total, year) => total + year.semesters.length, 0),
    credits: 0,
    notes: "",
    years,
  };
};

export const findLastCompletedSemester = (entries) => {
  if (!entries || entries.length === 0) {
    console.log("No entries found, defaulting to Year 1 Semester 1");
    return { year: 1, semester: 1 };
  }

  // Find the highest year and semester with completed courses
  let maxYear = 1;
  let maxSemester = 1;

  entries.forEach((entry) => {
    if (
      entry.year > maxYear ||
      (entry.year === maxYear && entry.semester > maxSemester)
    ) {
      maxYear = entry.year;
      maxSemester = entry.semester;
    }
  });

  // Return the next semester to plan
  const nextSemester =
    maxSemester === 2
      ? { year: maxYear + 1, semester: 1 }
      : { year: maxYear, semester: maxSemester + 1 };
  return nextSemester;
};
