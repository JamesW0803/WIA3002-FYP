import React from "react";
import CourseList from "./CourseList";
import CourseInput from "./CourseInput";

const SemesterCard = ({
  planId,
  year,
  semester,
  plans,
  setPlans,
  allCourses,
  previousSemesters = [], // Default empty array
  isViewMode = false,
}) => {
  const MAX_CREDITS = 22;

  // Safely get completed courses
  const completedCourses = (previousSemesters || [])
    .filter((s) => s?.completed)
    .flatMap((s) => s?.courses?.map((c) => c?.code) || [])
    .filter(Boolean);

  // Calculate current semester credits
  const currentCredits =
    semester?.courses?.reduce(
      (sum, course) => sum + (course?.credit || 0),
      0
    ) || 0;

  const addCourse = (courseCode) => {
    const courseToAdd = allCourses.find((c) => c.code === courseCode);
    if (!courseToAdd) return;

    // Check if course belongs to this year/semester
    if (
      courseToAdd.year !== year ||
      courseToAdd.semester !== semester.name.split(" ")[3]
    ) {
      alert(
        `This course belongs to Year ${courseToAdd.year} Semester ${courseToAdd.semester}`
      );
      return;
    }

    // Check prerequisites
    const missingPrerequisites =
      courseToAdd.prerequisites?.filter(
        (prereq) => !completedCourses.includes(prereq)
      ) || [];

    if (missingPrerequisites.length > 0) {
      alert(
        `Cannot add ${courseCode}. Missing prerequisites: ${missingPrerequisites.join(
          ", "
        )}`
      );
      return;
    }

    // Check credit limit
    if (currentCredits + (courseToAdd.credit || 0) > MAX_CREDITS) {
      alert(`Cannot add course. Maximum ${MAX_CREDITS} credits per semester.`);
      return;
    }

    const updatedPlans = plans.map((plan) =>
      plan.id === planId
        ? {
            ...plan,
            years: plan.years?.map((y) =>
              y.year === year
                ? {
                    ...y,
                    semesters: y.semesters?.map((sem) =>
                      sem.id === semester.id
                        ? {
                            ...sem,
                            courses: [...(sem.courses || []), courseToAdd],
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

  const removeCourse = (index) => {
    const updatedPlans = plans.map((plan) =>
      plan.id === planId
        ? {
            ...plan,
            years: plan.years?.map((y) =>
              y.year === year
                ? {
                    ...y,
                    semesters: y.semesters?.map((sem) =>
                      sem.id === semester.id
                        ? {
                            ...sem,
                            courses: (sem.courses || []).filter(
                              (_, i) => i !== index
                            ),
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
    <div className="border p-4 rounded-md bg-white">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-gray-800">
          {semester?.name || "Semester"}
        </h4>
        <span className="text-sm font-medium text-gray-600">
          Credits: {currentCredits}/{MAX_CREDITS}
        </span>
      </div>
      <div className="space-y-3 mb-4">
        <CourseList
          courses={semester?.courses || []}
          removeCourse={removeCourse}
          isViewMode={isViewMode}
        />
      </div>
      {!isViewMode && ( // Only show CourseInput if not in view mode
        <CourseInput
          onAdd={addCourse}
          allCourses={allCourses}
          completedCourses={completedCourses}
        />
      )}
    </div>
  );
};

export default SemesterCard;
