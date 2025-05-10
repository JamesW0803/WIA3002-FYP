import { useState, useEffect, useMemo } from "react";

export const useAcademicProfile = () => {
  const [editingEntry, setEditingEntry] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [entries, setEntries] = useState([]);
  const [years, setYears] = useState([1, 2, 3, 4]);
  const [currentYear, setCurrentYear] = useState(null);
  const [currentSemester, setCurrentSemester] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasAddedFirstCourse, setHasAddedFirstCourse] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "info",
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

  // Load mock courses
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

  const isCourseAlreadyAdded = (courseCode, currentId = null) => {
    return entries.some(
      (entry) => entry.code === courseCode && entry.id !== currentId
    );
  };

  const isPastSemester = (year, semester) => {
    if (!currentYear || !currentSemester) return false;

    if (year < currentYear) return true;
    if (year === currentYear && semester < currentSemester) return true;

    return false;
  };

  const startEditing = (id) => {
    const entryToEdit = entries.find((e) => e.id === id);
    if (entryToEdit) {
      setEditingEntry({ ...entryToEdit });
      setEntries(entries.filter((e) => e.id !== id));
    }
  };

  const cancelEditing = () => {
    setEditingEntry(null);
  };

  const removeEntry = (id) => {
    setEntries(entries.filter((entry) => entry.id !== id));
    if (editingEntry?.id === id) {
      setEditingEntry(null);
    }
  };

  const saveEntry = () => {
    if (!editingEntry) return;

    if (!editingEntry.code) {
      showNotification("Please select a course", "error");
      return;
    }

    if (isCourseAlreadyAdded(editingEntry.code)) {
      showNotification(
        "This course has already been added to your academic profile",
        "error"
      );
      return;
    }

    const isPast = isPastSemester(editingEntry.year, editingEntry.semester);
    const isCurrent =
      editingEntry.year === currentYear &&
      editingEntry.semester === currentSemester;

    if (isPast && (editingEntry.status === "Ongoing" || !editingEntry.status)) {
      showNotification(
        "Past semesters must have either 'Passed' or 'Failed' status",
        "error"
      );
      return;
    }

    if (!isPast && !isCurrent && !editingEntry.status) {
      showNotification("Please select a status", "error");
      return;
    }

    if (
      (editingEntry.status === "Passed" || editingEntry.status === "Failed") &&
      !editingEntry.grade
    ) {
      showNotification(
        "Please enter a grade for passed/failed courses",
        "error"
      );
      return;
    }

    const isFirstCourse = entries.length === 0;

    setEntries([...entries, editingEntry]);
    setEditingEntry(null);

    if (isFirstCourse && !hasAddedFirstCourse) {
      setHasAddedFirstCourse(true);
      localStorage.setItem("hasAddedFirstCourse", "true");
      showNotification(
        "Great start! You've added your first course. Continue adding more courses to complete your academic profile.",
        "success"
      );
    }
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

    setEditingEntry({
      id: Date.now(),
      code: "",
      name: "",
      credit: "",
      status: "Ongoing",
      grade: "",
      year,
      semester,
    });
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

  return {
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
    showNotification,
    closeNotification,
    setEditingEntry,
  };
};
