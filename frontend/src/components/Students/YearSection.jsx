import React from "react";
import SemesterSection from "./SemesterSection";

const YearSection = ({
  year,
  entriesByYearSemester,
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
  return (
    <div key={year} className="mb-8">
      <h3 className="text-xl font-semibold mb-4 text-[#1E3A8A] border-b pb-2">
        Year {year}
      </h3>

      {[1, 2].map((semester) => (
        <SemesterSection
          key={semester}
          year={year}
          semester={semester}
          entries={entriesByYearSemester[year][semester]}
          editingEntry={editingEntry}
          addNewEntry={addNewEntry}
          startEditing={startEditing}
          removeEntry={removeEntry}
          saveEntry={saveEntry}
          cancelEditing={cancelEditing}
          availableCourses={availableCourses}
          isCourseAlreadyAdded={isCourseAlreadyAdded}
          gradeOptions={gradeOptions}
          isPastSemester={isPastSemester}
          currentYear={currentYear}
          currentSemester={currentSemester}
          setEditingEntry={setEditingEntry}
        />
      ))}
    </div>
  );
};

export default YearSection;
