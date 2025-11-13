import React from "react";
import CourseEntry from "./CourseEntry";
import CourseEditor from "./CourseEditor";
import GapSemesterDialog from "./GapSemesterDialog";

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
  isFutureSemester,
  isGapSemester,
  isGapYear,
  requestGapSemester,
  checkCoursePrerequisites,
  showNotification,
  toggleGapSemester,
}) => {
  const isDisabled =
    isFutureSemester(year, semester) || isGapSemester(year, semester);
  const isGapped = isGapSemester(year, semester);
  const yearIsGapped = isGapYear(year);

  const [openGap, setOpenGap] = React.useState(false);
  const hasCoursesHere = entries.some(
    (e) => e.year === year && e.semester === semester
  );

  const semesterEntries = entries.filter(
    (entry) => entry.year === year && entry.semester === semester
  );

  const isEditingHere =
    editingEntry?.year === year && editingEntry?.semester === semester;
  return (
    <div
      key={semester}
      data-year={year}
      data-semester={semester}
      className={`mb-4 sm:mb-6 sm:ml-4 relative ${
        isEditingHere ? "z-30" : "z-0"
      } ${
        // a little extra space so the dropdown never gets covered on small screens
        isEditingHere ? "pb-8" : ""
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <h4 className="text-base sm:text-lg font-medium">
          Semester {semester}
          {isDisabled && isGapped && (
            <span className="ml-2 text-sm text-amber-700">(Gap Semester)</span>
          )}
          {isDisabled && !isGapped && isFutureSemester(year, semester) && (
            <span className="ml-2 text-sm text-gray-500">
              (Future Semester)
            </span>
          )}
        </h4>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (isGapped) {
                // Ungap immediately
                toggleGapSemester(year, semester);
              } else {
                // Gap flow with dialog (move/remove)
                setOpenGap(true);
              }
            }}
            disabled={yearIsGapped}
            className={`text-sm px-3 py-1 rounded ${
              yearIsGapped
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : isGapped
                ? "bg-amber-100 text-amber-800 border border-amber-200"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
            title={
              yearIsGapped
                ? "Year is fully gapped; remove that first"
                : "Toggle gap for this semester"
            }
          >
            {isGapped ? "Ungap Semester" : "Gap Semester"}
          </button>

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
          {isGapped
            ? "This semester is gapped"
            : "No courses for this semester"}
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
          isFutureSemester={isFutureSemester}
          isGapSemester={isGapSemester}
          checkCoursePrerequisites={checkCoursePrerequisites}
          showNotification={showNotification}
        />
      )}

      <GapSemesterDialog
        year={year}
        semester={semester}
        isOpen={openGap}
        hasCourses={hasCoursesHere}
        onClose={() => setOpenGap(false)}
        onConfirm={() => {
          console.log("[SemesterSection] GapSemester onConfirm", {
            year,
            semester,
          });
          requestGapSemester(year, semester);
          setOpenGap(false);
        }}
      />
    </div>
  );
};

export default SemesterSection;
