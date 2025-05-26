export const generateNewPlan = (existingPlansCount) => {
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
        return courseTotal + (course?.credits || 0);
      }, 0);
      return semTotal + semesterCredits;
    }, total);
  }, 0);
};

export const findCourseByCode = (code, coursesDatabase) => {
  return coursesDatabase.find((course) => course.code === code) || null;
};

export const validateCourseAddition = (course, semester, allCourses) => {
  if (!course) {
    return { isValid: false, message: "Course not found" };
  }

  if (semester.courses.some((c) => c.code === course.code)) {
    return {
      isValid: false,
      message: "Course already exists in this semester",
    };
  }

  const prereqs =
    allCourses.find((c) => c.code === course.code)?.prerequisites || [];
  const completedCourses = semester.completed
    ? semester.courses.map((c) => c.code)
    : [];

  const missingPrereqs = prereqs.filter(
    (prereq) => !completedCourses.includes(prereq)
  );

  if (missingPrereqs.length > 0) {
    return {
      isValid: false,
      message: `Missing prerequisites: ${missingPrereqs.join(", ")}`,
    };
  }

  return { isValid: true, message: "" };
};

export const generateSuggestedPlan = (
  programRequirements,
  completedCourses = []
) => {
  // Implementation would depend on your specific program requirements structure
  // This is a placeholder for the logic
  return {
    id: "suggested-" + Date.now(),
    name: "Suggested Plan",
    years: programRequirements.years.map((year) => ({
      ...year,
      semesters: year.semesters.map((semester) => ({
        ...semester,
        courses: semester.courses.filter(
          (course) => !completedCourses.includes(course.code)
        ),
      })),
    })),
  };
};
