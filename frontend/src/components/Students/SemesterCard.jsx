import React, { useMemo } from "react";
import CourseList from "./CourseList";
import CourseInput from "./CourseInput";
import {
  validateCourseAddition,
  canRetakeCourse,
} from "./AcademicPlanner/utils/planHelpers";

const SemesterCard = ({
  planId,
  year,
  semester,
  plans,
  setPlans,
  allCourses,
  isViewMode = false,
  completedCoursesByYear = {},
  onConfirmDraft,
  onCancelDraft,
}) => {
  const MAX_CREDITS = 22;

  const actualSemester =
    plans
      .find((plan) => plan.id === planId)
      ?.years.find((y) => y.year === year)
      ?.semesters.find((s) => s.name === semester.name) || semester;

  const isGapSemester = !!actualSemester?.isGap;

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
    if (isGapSemester) {
      alert(
        "This semester is marked as a gap semester. Undo the gap flag if you want to add courses."
      );
      return;
    }

    console.log("Attempting to add course:", courseCode);
    const courseToAdd = allCourses.find((c) => c.code === courseCode);
    if (!courseToAdd) {
      alert(`Course ${courseCode} not found in course catalog`);
      return;
    }

    console.log("All passed courses:", passedCourses);

    // NEW: check retake rules using completedCoursesByYear (grades + status)
    const { hasTaken, canRetake, reason } = canRetakeCourse(
      courseCode,
      completedCoursesByYear
    );

    // If the student has taken it and it's not retakable (A/A+ case), block
    if (hasTaken && !canRetake) {
      alert(`Cannot retake ${courseCode}. ${reason}`);
      return;
    }

    // Keep blocking if course is currently ongoing (you already had this)
    if (ongoingCourses.has(courseCode)) {
      alert(
        `Course ${courseCode} is currently ongoing and cannot be taken again`
      );
      return;
    }

    // Build the list of "completed" courses used for prerequisite checking.
    // For retakes we want prerequisites to still count, but we must NOT
    // let validateCourseAddition think the target course itself is blocking.
    const completedForPrereqs = Array.from(passedCourses);

    if (hasTaken && canRetake) {
      const idx = completedForPrereqs.indexOf(courseCode);
      if (idx !== -1) {
        completedForPrereqs.splice(idx, 1); // remove target course itself
      }
    }

    const { isValid, message } = validateCourseAddition(
      courseToAdd,
      actualSemester,
      allCourses,
      completedForPrereqs
    );
    console.log("Validation result:", { isValid, message });
    if (!isValid) {
      alert(`Cannot add ${courseCode}. ${message}`);
      return;
    }

    // Flatten all semesters and track order (kept as in your original)
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

    // Update plan with the new course
    const updatedPlans = plans.map((plan) => {
      if (plan.id !== planId) return plan;

      const updatedYears = plan.years.map((y) => {
        if (y.year !== year) return y;

        const updatedSemesters = y.semesters.map((sem) => {
          const isMatch = sem.name === semester.name;

          if (!isMatch) return sem;

          // Still keep protection: cannot add twice in same semester
          const alreadyAdded = sem.courses.some((c) => c.code === courseCode);
          if (alreadyAdded) {
            alert(`Course ${courseCode} already exists in this semester`);
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

  const toggleGapSemester = () => {
    if (isViewMode) return;
    const updatedPlans = plans.map((p) => {
      if (p.id !== planId) return p;
      return {
        ...p,
        years: p.years.map((y) => {
          if (y.year !== year) return y;
          return {
            ...y,
            semesters: y.semesters.map((s) => {
              if (s.name !== actualSemester.name) return s;
              const makeGap = !s.isGap;
              return {
                ...s,
                isGap: makeGap,
                courses: makeGap ? [] : s.courses, // wipe courses when turning into gap
              };
            }),
          };
        }),
      };
    });
    setPlans(updatedPlans);
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden relative z-0">
      <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <h4 className="font-medium text-gray-800 text-sm sm:text-base uppercase tracking-wide truncate">
            {actualSemester?.name || "Semester"}
          </h4>
          {isGapSemester && (
            <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
              Gap Semester
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-medium text-gray-600 bg-white px-2 py-1 rounded-full border">
            {currentCredits}/{MAX_CREDITS} credits
          </span>
          {!isViewMode && (
            <button
              type="button"
              onClick={toggleGapSemester}
              className="text-[10px] sm:text-xs px-2 py-1 rounded-md border border-yellow-300 text-yellow-800 bg-yellow-50 hover:bg-yellow-100"
            >
              {isGapSemester ? "Undo Gap" : "Set Gap"}
            </button>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4 relative z-0 overflow-visible">
        <div className="space-y-3 mb-4 min-w-0 overflow-x-auto">
          {!isGapSemester ? (
            <CourseList
              courses={actualSemester?.courses || []}
              removeCourse={removeCourse}
              isViewMode={isViewMode}
              completedCourses={Array.from(passedCourses)}
            />
          ) : (
            <p className="text-sm text-gray-600 italic">
              No courses planned for this gap semester.
            </p>
          )}
        </div>

        {/* Draft controls */}
        {!isViewMode && actualSemester?._isDraft && !isGapSemester && (
          <div className="flex items-center gap-2 mb-3">
            <button
              className="text-sm px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-50"
              onClick={onCancelDraft}
              type="button"
            >
              Cancel Semester
            </button>
            <button
              className="text-sm px-3 py-1 rounded-md bg-[#1E3A8A] text-white hover:opacity-90"
              onClick={() => {
                if ((actualSemester?.courses?.length || 0) === 0) {
                  alert(
                    "Please add at least one course before saving this semester."
                  );
                  return;
                }
                onConfirmDraft();
              }}
              type="button"
            >
              Save Semester
            </button>
          </div>
        )}

        {/* Course input disabled for view mode, enabled otherwise */}
        {!isViewMode && !isGapSemester && (
          <CourseInput
            onAdd={addCourse}
            allCourses={allCourses}
            passedCourses={Array.from(passedCourses)}
            ongoingCourses={ongoingCourses}
            semester={actualSemester}
            completedCoursesByYear={completedCoursesByYear}
          />
        )}
      </div>
    </div>
  );
};

export default SemesterCard;
