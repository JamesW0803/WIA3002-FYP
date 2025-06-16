import React, { useMemo } from "react";
import CourseList from "./CourseList";
import CourseInput from "./CourseInput";

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

  // Create a Set of all passed course codes from completedCoursesByYear
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
    const courseToAdd = allCourses.find((c) => c.code === courseCode);
    if (!courseToAdd) {
      alert(`Course ${courseCode} not found in course catalog`);
      return;
    }

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

          // Check prerequisites
          // Step 1: Get prerequisite course codes from _id list
          const prerequisiteCodes = (courseToAdd.prerequisites || [])
            .map((prereqId) => {
              const course = allCourses.find((c) => c._id === prereqId);
              return course?.code;
            })
            .filter(Boolean); // Removes any undefined/null

          // Step 2: Check if code is already passed
          const isCodePassed = (code) => {
            for (const year of Object.values(completedCoursesByYear)) {
              for (const semester of Object.values(year)) {
                for (const course of semester) {
                  if (course.code === code && course.status === "Passed")
                    return true;
                }
              }
            }
            return false;
          };

          // Step 3: Check if code already exists in previous semesters in the same plan
          const isCodeInPlan = (code) => {
            const priorSemesters = allSemesters.filter(
              (s) => s.index < targetSemesterIndex
            );
            return priorSemesters.some((sem) =>
              sem.courses.some((c) => c.code === code)
            );
          };

          console.log("WIA3001 prerequisites (by code):", prerequisiteCodes);
          console.log("Passed courses:", Array.from(passedCourses));
          console.log(
            "Courses in earlier plan semesters:",
            allSemesters
              .filter((s) => s.index < targetSemesterIndex)
              .flatMap((s) => s.courses.map((c) => c.code))
          );

          // Step 4: Check all prerequisite codes
          const unmetPrereqs = prerequisiteCodes.filter(
            (code) => !isCodePassed(code) && !isCodeInPlan(code)
          );

          console.log("Unmet prerequisites:", unmetPrereqs);

          // Step 5: Alert if unmet
          if (unmetPrereqs.length > 0) {
            alert(
              `Cannot add ${
                courseToAdd.code
              }. Missing prerequisites:\n${unmetPrereqs.join(", ")}`
            );
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
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-visible relative z-0">
      <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
        <h4 className="font-medium text-gray-800 text-sm uppercase tracking-wide">
          {actualSemester?.name || "Semester"}
        </h4>
        <span className="text-sm font-medium text-gray-600 bg-white px-2 py-1 rounded-full border">
          {currentCredits}/{MAX_CREDITS} credits
        </span>
      </div>

      <div className="p-4 relative z-0 overflow-visible">
        <div className="space-y-3 mb-4">
          <CourseList
            courses={actualSemester?.courses || []}
            removeCourse={removeCourse}
            isViewMode={isViewMode}
            passedCourses={passedCourses}
          />
        </div>
        {!isViewMode && (
          <CourseInput
            onAdd={addCourse}
            allCourses={allCourses}
            passedCourses={passedCourses}
            ongoingCourses={ongoingCourses}
          />
        )}
      </div>
    </div>
  );
};

export default SemesterCard;
