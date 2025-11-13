import React from "react";
import { useAcademicProfile } from "../../hooks/useAcademicProfile";
import Onboarding from "../../components/Students/AcademicProfile/Onboarding";
import YearSection from "../../components/Students/AcademicProfile/YearSection";
import Notification from "../../components/Students/AcademicProfile/Notification";
import PageHeader from "../../components/Students/PageHeader";

const AcademicProfile = () => {
  const {
    editingEntry,
    sessionLoading,
    availableCourses,
    entries,
    years,
    currentYear,
    currentSemester,
    studentYear,
    studentSemester,
    showOnboarding,
    notification,
    gradeOptions,
    entriesByYearSemester,
    isCourseAlreadyAdded,
    isPastSemester,
    isFutureSemester,
    startEditing,
    cancelEditing,
    removeEntry,
    saveEntry,
    addNewEntry,
    handleSubmit,
    completeOnboarding,
    closeNotification,
    setEditingEntry,
    addSemester,
    addYear,
    startRetake,
    collapsedYears,
    setCollapsedYears,
    isFutureReady,
    deleteYear,
    isGapYear,
    requestGapYear,
    isGapSemester,
    requestGapSemester,
    checkCoursePrerequisites,
    showNotification,
    toggleGapYear,
    toggleGapSemester,
  } = useAcademicProfile();

  const onToggleCollapse = (y) => {
    setCollapsedYears((prev) => {
      const next = new Set(prev);
      next.has(y) ? next.delete(y) : next.add(y);
      return next;
    });
  };

  if (!isFutureReady) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] sm:min-h-screen px-4">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-base sm:text-lg text-gray-600 mt-4">
            Loading your academic profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Academic Profile" />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        {showOnboarding ? (
          <Onboarding completeOnboarding={completeOnboarding} />
        ) : (
          <form onSubmit={handleSubmit}>
            {years.map((year) => (
              <YearSection
                key={year}
                year={year}
                isCollapsed={collapsedYears.has(year)}
                onToggleCollapse={onToggleCollapse}
                entriesByYearSemester={entriesByYearSemester}
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
                currentYear={studentYear}
                currentSemester={studentSemester}
                setEditingEntry={setEditingEntry}
                entries={entries}
                deleteYear={deleteYear}
                isGapYear={isGapYear}
                requestGapYear={requestGapYear}
                isFutureSemester={isFutureSemester}
                isGapSemester={isGapSemester}
                requestGapSemester={requestGapSemester}
                checkCoursePrerequisites={checkCoursePrerequisites}
                showNotification={showNotification}
                toggleGapYear={toggleGapYear}
                toggleGapSemester={toggleGapSemester}
              />
            ))}

            <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                className="w-full sm:w-auto bg-[#1E3A8A] text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
              >
                Save All Changes
              </button>
              <button
                type="button"
                onClick={addSemester}
                className="w-full sm:w-auto bg-blue-50 text-blue-700 px-6 py-2 rounded-md hover:bg-blue-100 transition border border-blue-200"
                title="Append the next chronological semester (e.g., Year 5 • Semester 1)"
              >
                + Add Semester
              </button>
              <button
                type="button"
                onClick={addYear}
                className="w-full sm:w-auto bg-blue-50 text-blue-700 px-6 py-2 rounded-md hover:bg-blue-100 transition border border-blue-200"
                title="Add one more academic year (manual)"
              >
                + Add Year
              </button>
            </div>
          </form>
        )}
      </div>

      {notification.show && (
        <Notification
          message={notification.message}
          type={notification.type}
          isClosing={notification.isClosing}
          onClose={closeNotification}
        />
      )}
    </div>
  );
};

export default AcademicProfile;
