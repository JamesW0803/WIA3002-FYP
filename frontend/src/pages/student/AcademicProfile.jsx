import React from "react";
import { useAcademicProfile } from "../../hooks/useAcademicProfile";
import Onboarding from "../../components/Students/Onboarding";
import YearSection from "../../components/Students/YearSection";
import Notification from "../../components/Students/Notification";

const AcademicProfile = () => {
  const {
    editingEntry,
    sessionLoading,
    availableCourses,
    entries,
    years,
    currentYear,
    currentSemester,
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
  } = useAcademicProfile();

  const { isFutureReady } = useAcademicProfile();

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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1E3A8A] mb-4 sm:mb-6">
          Academic Profile
        </h2>

        {showOnboarding ? (
          <Onboarding completeOnboarding={completeOnboarding} />
        ) : (
          <form onSubmit={handleSubmit}>
            {years.map((year) => (
              <YearSection
                key={year}
                year={year}
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
                currentYear={currentYear}
                currentSemester={currentSemester}
                setEditingEntry={setEditingEntry}
                entries={entries}
              />
            ))}

            <div className="mt-4 sm:mt-6">
              <button
                type="submit"
                className="w-full sm:w-auto bg-[#1E3A8A] text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
              >
                Save All Changes
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
