import React from "react";
import { useAcademicProfile } from "../../hooks/useAcademicProfile";
import CourseEntry from "./CourseEntry";
import CourseEditor from "./CourseEditor";

const SemesterSection = ({
  year,
  semester,
  entries,
  editingEntry,
  addNewEntry,
  startEditing,
  removeEntry,
  saveEntry,
  cancelEditing,
  availableCourses,
  isCourseAlreadyAdded,
  gradeOptions,
  isPastSemester,
  currentYear,
  currentSemester,
  setEditingEntry,
}) => {
  const { isFutureSemester } = useAcademicProfile();
  const isDisabled = isFutureSemester(year, semester);

  const semesterEntries = entries.filter(
    (entry) => entry.year === year && entry.semester === semester
  );

  return (
    <div key={semester} className="mb-4 sm:mb-6 sm:ml-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <h4 className="text-base sm:text-lg font-medium">
          Semester {semester}
          {isDisabled && (
            <span className="ml-2 text-sm text-gray-500">
              (Future Semester)
            </span>
          )}
        </h4>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => addNewEntry(year, semester)}
            disabled={isDisabled}
            className={`text-sm px-3 py-1 rounded
              ${
                isDisabled
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
              }`}
          >
            + Add Course
          </button>
        </div>
      </div>

      {semesterEntries?.length > 0 ? (
        <div className="space-y-3 sm:space-y-4">
          {semesterEntries.map((entry) => (
            <CourseEntry
              key={entry.id}
              entry={entry}
              startEditing={startEditing}
              removeEntry={removeEntry}
              isPastSemester={isPastSemester}
              currentYear={currentYear}
              currentSemester={currentSemester}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic text-sm ml-0 sm:ml-2">
          No courses for this semester
        </p>
      )}

      {editingEntry?.year === year && editingEntry?.semester === semester && (
        <CourseEditor
          editingEntry={editingEntry}
          availableCourses={availableCourses}
          isCourseAlreadyAdded={isCourseAlreadyAdded}
          setEditingEntry={setEditingEntry}
          saveEntry={saveEntry}
          cancelEditing={cancelEditing}
          gradeOptions={gradeOptions}
          isPastSemester={isPastSemester}
          currentYear={currentYear}
          currentSemester={currentSemester}
          entries={entries}
          targetSemester={semester}
        />
      )}
    </div>
  );
};

export default SemesterSection;
