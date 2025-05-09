import React, { useState, useEffect, useMemo } from "react";
import CourseListSelector from "../../components/CourseListSelector";
import CourseStatusSelector from "../../components/CourseStatusSelector";
import Notification from "../../components/Notification";

const AcademicProfile = () => {
  const [availableCourses, setAvailableCourses] = useState([]);
  const [entries, setEntries] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [years, setYears] = useState([1, 2, 3, 4]);
  const [currentYear, setCurrentYear] = useState(null);
  const [currentSemester, setCurrentSemester] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasAddedFirstCourse, setHasAddedFirstCourse] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "info", // can be 'info', 'success', 'error'
    isClosing: false,
  });

  const gradeOptions = {
    passed: ["A+", "A", "A-", "B+", "B", "B-", "C+", "C"],
    failed: ["C-", "D+", "D", "F"],
  };

  // Check if this is the first time (no courses exist)
  useEffect(() => {
    if (entries.length === 0 && !hasAddedFirstCourse) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [entries, hasAddedFirstCourse]);

  useEffect(() => {
    const firstCourseFlag = localStorage.getItem("hasAddedFirstCourse");
    setHasAddedFirstCourse(firstCourseFlag === "true");
  }, []);

  // Get current year and semester from localStorage on component mount
  useEffect(() => {
    const savedYear = localStorage.getItem("studentYear");
    const savedSemester = localStorage.getItem("studentSemester");
    if (savedYear && savedSemester) {
      setCurrentYear(parseInt(savedYear));
      setCurrentSemester(parseInt(savedSemester));
    }
  }, []);

  // Check if a course code already exists in any entry (except the one being edited)
  const isCourseAlreadyAdded = (courseCode, currentId = null) => {
    return entries.some(
      (entry) => entry.code === courseCode && entry.id !== currentId
    );
  };

  // Check if a semester is in the past
  const isPastSemester = (year, semester) => {
    if (!currentYear || !currentSemester) return false;

    // If year is less than current year, it's definitely past
    if (year < currentYear) return true;

    // If same year but semester is less than current semester, it's past
    if (year === currentYear && semester < currentSemester) return true;

    return false;
  };

  //To-do: All these are mock data, future dev will retrieve course data from db
  useEffect(() => {
    const mockCourses = [
      { code: "WIX1002", name: "Fundamentals of Programming", credit: 5 },
      { code: "WIA1002", name: "Data Structure", credit: 5 },
      { code: "GIG1012", name: "Philosophy and Current Issues", credit: 2 },
      { code: "WIX1001", name: "Computing Mathematics I", credit: 3 },
      { code: "WIX1003", name: "Computer System and Organization", credit: 3 },
      { code: "WIA2010", name: "Human Computer Interaction", credit: 3 },
      { code: "WIA1003", name: "Computer System Architecture", credit: 3 },
      { code: "WIA1005", name: "Network Technology Foundation", credit: 4 },
      { code: "WIA1006", name: "Machine Learning", credit: 3 },
    ];

    setAvailableCourses(mockCourses);
  }, []);

  const startEditing = (id) => {
    setEditingId(id);
  };

  const cancelEditing = () => {
    setEntries(entries.filter((entry) => entry.id !== editingId));
    setEditingId(null);
  };

  const updateEntry = (id, field, value) => {
    // Prevent duplicate courses when updating
    if (field === "code" && isCourseAlreadyAdded(value, id)) {
      showNotification(
        "This course has already been added to your academic profile",
        "error"
      );
      return;
    }

    setEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const removeEntry = (id) => {
    setEntries(entries.filter((entry) => entry.id !== id));
  };

  const saveEntry = (id) => {
    const entry = entries.find((e) => e.id === id);

    // Check if course code is selected
    if (!entry.code) {
      showNotification("Please select a course", "error");
      return;
    }

    // Check for duplicate courses
    if (isCourseAlreadyAdded(entry.code, id)) {
      showNotification(
        "This course has already been added to your academic profile",
        "error"
      );
      return;
    }

    // Validate status based on semester
    const isPast = isPastSemester(entry.year, entry.semester);
    const isCurrent =
      entry.year === currentYear && entry.semester === currentSemester;

    if (isPast && (entry.status === "Ongoing" || !entry.status)) {
      showNotification(
        "Past semesters must have either 'Passed' or 'Failed' status",
        "error"
      );
      return;
    }

    if (!isPast && !isCurrent && !entry.status) {
      showNotification("Please select a status", "error");
      return;
    }

    // Validate grades for passed/failed courses
    if (
      (entry.status === "Passed" || entry.status === "Failed") &&
      !entry.grade
    ) {
      showNotification(
        "Please enter a grade for passed/failed courses",
        "error"
      );
      return;
    }

    const isFirstCourse =
      entries.filter((e) => e.code && e.id !== id).length === 0;

    if (isFirstCourse && !hasAddedFirstCourse) {
      setHasAddedFirstCourse(true);
      localStorage.setItem("hasAddedFirstCourse", "true");
      showNotification(
        "Great start! You've added your first course. Continue adding more courses to complete your academic profile.",
        "success"
      );
    }

    setEditingId(null);
  };

  const getAvailableCoursesForSelection = () => {
    return availableCourses.filter(
      (course) => !isCourseAlreadyAdded(course.code, editingId)
    );
  };

  const addNewEntry = (year, semester) => {
    if (
      !isPastSemester(year, semester) &&
      (year > currentYear ||
        (year === currentYear && semester > currentSemester))
    ) {
      showNotification("You cannot add courses for future semesters.", "error");
      return;
    }

    const newId =
      entries.length > 0 ? Math.max(...entries.map((e) => e.id)) + 1 : 1;

    setEntries([
      ...entries,
      {
        id: newId,
        code: "",
        name: "",
        credit: "",
        status: "Ongoing",
        grade: "",
        year,
        semester,
      },
    ]);
    setEditingId(newId);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("All entries:", entries);
    showNotification("Academic profile updated successfully!", "success");
  };

  const entriesByYearSemester = useMemo(() => {
    return years.reduce((acc, year) => {
      acc[year] = {
        1: entries.filter(
          (entry) => entry.year === year && entry.semester === 1
        ),
        2: entries.filter(
          (entry) => entry.year === year && entry.semester === 2
        ),
      };
      return acc;
    }, {});
  }, [years, entries]);

  const completeOnboarding = () => {
    setShowOnboarding(false);
    // Automatically add first course to Year 1 Semester 1
    addNewEntry(1, 1);
  };

  const showNotification = (message, type = "info") => {
    setNotification({
      show: true,
      message,
      type,
      isClosing: false,
    });
    setTimeout(() => {
      closeNotification();
    }, 5000);
  };

  const closeNotification = () => {
    setNotification((prev) => ({ ...prev, isClosing: true }));
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 300);
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-[#1E3A8A] mb-6">
          Academic Profile
        </h2>

        {showOnboarding ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-[#1E3A8A] mb-4">
              Welcome to Your Academic Profile!
            </h3>
            <p className="text-gray-600 mb-6">
              Let's get started by adding your first course. We'll begin with
              <span className="font-semibold"> Year 1 Semester 1</span>.
            </p>

            <div className="flex flex-col items-center space-y-4 mb-6">
              <div className="w-full max-w-md bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Tip:</span> Start with your
                  most recent completed semester. You can add more courses
                  later.
                </p>
              </div>
            </div>

            <button
              onClick={completeOnboarding}
              className="bg-[#1E3A8A] text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
            >
              Add My First Course
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {years.map((year) => (
              <div key={year} className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-[#1E3A8A] border-b pb-2">
                  Year {year}
                </h3>

                {[1, 2].map((semester) => (
                  <div key={semester} className="mb-6 ml-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-medium">
                        Semester {semester}
                      </h4>
                      <button
                        type="button"
                        onClick={() => addNewEntry(year, semester)}
                        className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100"
                      >
                        + Add Course
                      </button>
                    </div>

                    {entriesByYearSemester[year][semester]?.length > 0 ? (
                      entriesByYearSemester[year][semester].map(
                        (entry) =>
                          (entry.code || editingId === entry.id) && (
                            <div
                              key={entry.id}
                              className="bg-white p-4 rounded-lg shadow-md mb-4 flex items-center min-w-full"
                            >
                              {editingId === entry.id ? (
                                <div className="w-full grid grid-cols-1 md:grid-cols-6 gap-6 items-center">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Course
                                    </label>
                                    <CourseListSelector
                                      courses={getAvailableCoursesForSelection()}
                                      selectedCode={entry.code}
                                      onChange={(val) => {
                                        const course = availableCourses.find(
                                          (c) => c.code === val
                                        );
                                        updateEntry(entry.id, "code", val);
                                        updateEntry(
                                          entry.id,
                                          "name",
                                          course?.name || ""
                                        );
                                        updateEntry(
                                          entry.id,
                                          "credit",
                                          course?.credit || ""
                                        );
                                      }}
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Status
                                    </label>
                                    <CourseStatusSelector
                                      status={entry.status}
                                      onChange={(val) =>
                                        updateEntry(entry.id, "status", val)
                                      }
                                      allowedStatuses={
                                        isPastSemester(
                                          entry.year,
                                          entry.semester
                                        )
                                          ? ["Passed", "Failed"]
                                          : entry.year === currentYear &&
                                            entry.semester === currentSemester
                                          ? ["Ongoing"]
                                          : ["Ongoing", "Passed", "Failed"]
                                      }
                                    />
                                  </div>

                                  {(entry.status === "Passed" ||
                                    entry.status === "Failed") && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Grade
                                      </label>
                                      <select
                                        value={entry.grade}
                                        onChange={(e) =>
                                          updateEntry(
                                            entry.id,
                                            "grade",
                                            e.target.value
                                          )
                                        }
                                        className="border rounded p-2 w-full"
                                        required={
                                          entry.status === "Passed" ||
                                          entry.status === "Failed"
                                        }
                                      >
                                        <option value="">Select grade</option>
                                        {entry.status === "Passed"
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
                                      onClick={() => saveEntry(entry.id)}
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
                              ) : (
                                <div className="w-full flex items-center">
                                  <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-5">
                                      <p className="font-medium text-lg">
                                        {entry.code}
                                      </p>
                                      <p className="text-md text-gray-600">
                                        {entry.name}
                                      </p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-md">
                                        Credit: {entry.credit}
                                      </p>
                                    </div>
                                    <div className="col-span-2 flex items-center">
                                      {(entry.status === "Passed" ||
                                        entry.status === "Failed") &&
                                        entry.grade && (
                                          <span className="text-md">
                                            Grade: {entry.grade}
                                          </span>
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                      <span
                                        className={`px-3 py-1 rounded-full text-sm ${
                                          entry.status === "Passed"
                                            ? "bg-green-100 text-green-800"
                                            : entry.status === "Failed"
                                            ? "bg-red-100 text-red-800"
                                            : "bg-yellow-100 text-yellow-800"
                                        }`}
                                      >
                                        {entry.status}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-4 ml-8">
                                    <button
                                      type="button"
                                      onClick={() => startEditing(entry.id)}
                                      className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeEntry(entry.id)}
                                      className="text-red-600 hover:text-red-800 whitespace-nowrap"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                      )
                    ) : (
                      <p className="text-gray-500 italic text-sm ml-2">
                        No courses for this semester
                      </p>
                    )}
                  </div>
                ))}
              </div>
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
