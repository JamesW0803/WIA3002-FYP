import { useAcademicProfile } from "../../hooks/useAcademicProfile";
import Onboarding from "../../components/Students/Onboarding";
import YearSection from "../../components/Students/YearSection";
import Notification from "../../components/Students/Notification";

const AcademicProfile = () => {
  const {
    editingEntry,
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-[#1E3A8A] mb-6">
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

            <div className="mt-6">
              <button
                type="submit"
                className="bg-[#1E3A8A] text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
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
