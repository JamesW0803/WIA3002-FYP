import React, { useMemo } from "react";
import CourseList from "./CourseList";
import CourseInput from "./CourseInput";
import { validateCourseAddition } from "./AcademicPlanner/utils/planHelpers";

const SemesterCard = ({
  planId,
  year,
  semester,
  plans,
  setPlans,
  allCourses,
  isViewMode = false,
  completedCoursesByYear = {},
}) => {
  const MAX_CREDITS = 22;

  const actualSemester =
    plans
      .find((plan) => plan.id === planId)
      ?.years.find((y) => y.year === year)
      ?.semesters.find((s) => s.name === semester.name) || semester;

  console.log("Actual semester courses:", actualSemester?.courses);

  const passedCourses = useMemo(() => {
    const passed = new Set();
    Object.values(completedCoursesByYear).forEach((yearData) => {
      Object.values(yearData).forEach((semesterCourses) => {
        semesterCourses.forEach((course) => {
          if (course.status === "Passed") {
            passed.add(course.code);
          }
        });
      });
    });
    return passed;
  }, [completedCoursesByYear]);

  // Create a Set of all ongoing course codes
  const ongoingCourses = useMemo(() => {
    const ongoing = new Set();
    Object.values(completedCoursesByYear).forEach((yearData) => {
      Object.values(yearData).forEach((semesterCourses) => {
        semesterCourses.forEach((course) => {
          if (course.status === "Ongoing") {
            ongoing.add(course.code);
          }
        });
      });
    });
    return ongoing;
  }, [completedCoursesByYear]);

  // Calculate current semester credits
  const currentCredits =
    actualSemester?.courses?.reduce(
      (sum, course) => sum + (course?.credit || 0),
      0
    ) || 0;

  const addCourse = (courseCode) => {
    console.log("Attempting to add course:", courseCode);
    const courseToAdd = allCourses.find((c) => c.code === courseCode);
    if (!courseToAdd) {
      alert(`Course ${courseCode} not found in course catalog`);
      return;
    }

    console.log("All passed courses:", passedCourses);

    // Check if course is already passed
    if (passedCourses.has(courseCode)) {
      alert(
        `Course ${courseCode} has already been passed and cannot be taken again`
      );
      return;
    }

    // Check if course is currently ongoing
    if (ongoingCourses.has(courseCode)) {
      alert(
        `Course ${courseCode} is currently ongoing and cannot be taken again`
      );
      return;
    }

    const { isValid, message } = validateCourseAddition(
      courseToAdd,
      actualSemester,
      allCourses,
      Array.from(passedCourses)
    );
    console.log("Validation result:", { isValid, message });
    if (!isValid) {
      alert(`Cannot add ${courseCode}. ${message}`);
      return;
    }

    // Flatten all semesters and track order
    const currentPlan = plans.find((p) => p.id === planId);
    let targetSemesterIndex = -1;
    const allSemesters = [];

    if (currentPlan) {
      currentPlan.years.forEach((y, yIndex) => {
        y.semesters.forEach((sem, sIndex) => {
          const combinedIndex = yIndex * 2 + sIndex;
          allSemesters.push({
            year: y.year,
            name: sem.name,
            index: combinedIndex,
            courses: sem.courses,
          });

          if (y.year === year && sem.name === semester.name) {
            targetSemesterIndex = combinedIndex;
          }
        });
      });
    }

    // Find the actual semester in plans by ID or name
    const updatedPlans = plans.map((plan) => {
      if (plan.id !== planId) return plan;

      const updatedYears = plan.years.map((y) => {
        if (y.year !== year) return y;

        const updatedSemesters = y.semesters.map((sem) => {
          const isMatch = sem.name === semester.name;

          if (!isMatch) return sem;

          // Check if course is already in semester
          const alreadyAdded = sem.courses.some((c) => c.code === courseCode);
          if (alreadyAdded) {
            alert(`Course ${courseCode} already exists in this semester`);
            return sem;
          }

          // Check if offered this semester
          const semesterNum = sem.name.split(" ")[3]; // "Year X - Semester Y"
          const offered = courseToAdd.offered_semester?.some((s) =>
            s.includes(semesterNum)
          );
          if (!offered) {
            alert(`Course ${courseCode} is not offered in ${sem.name}`);
            return sem;
          }

          // Check credit limit
          const currentCredits = sem.courses.reduce(
            (sum, c) => sum + (c?.credit || 0),
            0
          );
          if (currentCredits + courseToAdd.credit > MAX_CREDITS) {
            alert(
              `Adding this course would exceed the maximum credit limit of ${MAX_CREDITS} credits`
            );
            return sem;
          }

          // All checks passed — add course
          return {
            ...sem,
            courses: [...sem.courses, courseToAdd],
          };
        });

        return { ...y, semesters: updatedSemesters };
      });

      return { ...plan, years: updatedYears };
    });

    console.log("Added course:", courseToAdd.code, "to", actualSemester.name);
    setPlans(updatedPlans);
  };

  const removeCourse = (index) => {
    const updatedPlans = plans.map((plan) =>
      plan.id === planId
        ? {
            ...plan,
            years: plan.years.map((y) =>
              y.year === year
                ? {
                    ...y,
                    semesters: y.semesters.map((sem) =>
                      sem.id === actualSemester.id ||
                      sem.name === actualSemester.name
                        ? {
                            ...sem,
                            courses: sem.courses.filter((_, i) => i !== index),
                          }
                        : sem
                    ),
                  }
                : y
            ),
          }
        : plan
    );
    setPlans(updatedPlans);
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden relative z-0">
      <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 border-b">
        <h4 className="font-medium text-gray-800 text-sm sm:text-base uppercase tracking-wide truncate">
          {actualSemester?.name || "Semester"}
        </h4>
        <span className="text-xs sm:text-sm font-medium text-gray-600 bg-white px-2 py-1 rounded-full border">
          {currentCredits}/{MAX_CREDITS} credits
        </span>
      </div>

      <div className="p-3 sm:p-4 relative z-0 overflow-visible">
        <div className="space-y-3 mb-4 min-w-0 overflow-x-auto">
          <CourseList
            courses={actualSemester?.courses || []}
            removeCourse={removeCourse}
            isViewMode={isViewMode}
            passedCourses={Array.from(passedCourses)}
          />
        </div>
        {!isViewMode && (
          <CourseInput
            onAdd={addCourse}
            allCourses={allCourses}
            passedCourses={Array.from(passedCourses)}
            ongoingCourses={ongoingCourses}
            semester={actualSemester}
          />
        )}
      </div>
    </div>
  );
};

export default SemesterCard;
