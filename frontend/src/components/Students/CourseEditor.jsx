import React from "react";
import CourseListSelector from "./CourseListSelector";
import CourseStatusSelector from "./CourseStatusSelector";

const CourseEditor = ({
  editingEntry,
  availableCourses,
  isCourseAlreadyAdded,
  setEditingEntry,
  saveEntry,
  cancelEditing,
  gradeOptions,
  isPastSemester,
  currentYear,
  currentSemester,
}) => {
  const year = editingEntry?.year;
  const semester = editingEntry?.semester;

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4 flex items-center min-w-full">
      <div className="w-full grid grid-cols-1 md:grid-cols-6 gap-6 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course
          </label>
          <CourseListSelector
            courses={availableCourses.filter(
              (course) => !isCourseAlreadyAdded(course.code)
            )}
            selectedCode={editingEntry.code}
            onChange={(val) => {
              const course = availableCourses.find((c) => c.code === val);
              setEditingEntry({
                ...editingEntry,
                code: val,
                name: course?.name || "",
                credit: course?.credit || "",
              });
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <CourseStatusSelector
            status={editingEntry.status}
            onChange={(val) =>
              setEditingEntry({
                ...editingEntry,
                status: val,
              })
            }
            allowedStatuses={
              isPastSemester(year, semester)
                ? ["Passed", "Failed"]
                : year === currentYear && semester === currentSemester
                ? ["Ongoing"]
                : ["Ongoing", "Passed", "Failed"]
            }
          />
        </div>

        {(editingEntry.status === "Passed" ||
          editingEntry.status === "Failed") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grade
            </label>
            <select
              value={editingEntry.grade}
              onChange={(e) =>
                setEditingEntry({
                  ...editingEntry,
                  grade: e.target.value,
                })
              }
              className="border rounded p-2 w-full"
              required
            >
              <option value="">Select grade</option>
              {editingEntry.status === "Passed"
                ? gradeOptions.passed.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))
                : gradeOptions.failed.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
            </select>
          </div>
        )}

        <div className="flex gap-2 ml-8">
          <button
            type="button"
            onClick={saveEntry}
            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
          >
            Save
          </button>
          <button
            type="button"
            onClick={cancelEditing}
            className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseEditor;
