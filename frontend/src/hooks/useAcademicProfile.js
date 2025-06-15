import { useState, useEffect, useMemo } from "react";
import axiosClient from "../api/axiosClient";
import { getUserIdFromStorage } from "../utils/getUserIdFromStorage";

export const useAcademicProfile = () => {
  const userId = getUserIdFromStorage();
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

  //Fetching the profile
  useEffect(() => {
    if (!userId) {
      console.error("No user ID found in token");
      return;
    }
    const fetchAcademicProfile = async () => {
      try {
        const res = await axiosClient.get(`/academic-profile/${userId}`); // userId = logged-in student's id
        const loadedEntries = res.data.entries.map((entry) => ({
          id: entry._id, // or Date.now() if none
          code: entry.course.course_code,
          name: entry.course.course_name,
          credit: entry.course.credit_hours,
          year: entry.year,
          semester: entry.semester,
          status: entry.status,
          grade: entry.grade,
          isRetake: entry.isRetake || false,
        }));
        setEntries(loadedEntries);
      } catch (err) {
        console.error("Error fetching profile:", err);
        showNotification("Failed to load academic profile", "error");
      }
    };

    fetchAcademicProfile();
  }, []);

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

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axiosClient.get("/courses");
        const formattedCourses = response.data.map((course) => ({
          code: course.course_code,
          name: course.course_name,
          credit: course.credit_hours,
        }));
        setAvailableCourses(formattedCourses);
      } catch (error) {
        console.error("Error fetching courses:", error);
        showNotification("Failed to load courses", "error");
      }
    };

    fetchCourses();
  }, []);

  const isCourseAlreadyAdded = (courseCode, currentId = null) => {
    const attempts = entries.filter(
      (entry) => entry.code === courseCode && entry.id !== currentId
    );

    if (attempts.length === 0) return false;

    // Only consider passed or ongoing attempts as "already taken"
    const hasPassedOrOngoingAttempt = attempts.some(
      (entry) => entry.status === "Passed" || entry.status === "Ongoing"
    );

    return hasPassedOrOngoingAttempt;
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

    // Find all previous attempts of this course
    const previousAttempts = entries.filter(
      (entry) =>
        entry.code === editingEntry.code && entry.id !== editingEntry.id
    );

    // Check if there are any previous failed attempts
    const hasFailedAttempts = previousAttempts.some(
      (attempt) => attempt.status === "Failed"
    );

    // Check if there are any passed or ongoing attempts
    const hasPassedOrOngoingAttempts = previousAttempts.some(
      (attempt) => attempt.status === "Passed" || attempt.status === "Ongoing"
    );

    // If there are passed or ongoing attempts, don't allow adding
    if (hasPassedOrOngoingAttempts) {
      showNotification(
        "This course has already been passed or is ongoing in another semester/year",
        "error"
      );
      return;
    }

    // If there are failed attempts, mark this as a retake
    const isRetake = hasFailedAttempts && editingEntry.status !== "Failed";

    const entryToSave = {
      ...editingEntry,
      isRetake: isRetake,
    };

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
    setEntries([...entries, entryToSave]);
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
      isRetake: false,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Step 1: Sort entries by year and semester
    const sortedEntries = [...entries].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.semester - b.semester;
    });

    const seenCourses = new Map(); // track status history per course

    const processedEntries = sortedEntries.map((entry) => {
      const key = entry.code;

      if (!seenCourses.has(key)) {
        seenCourses.set(key, []);
      }

      const history = seenCourses.get(key);

      // Determine if any past attempt failed
      const hasPreviousFailure = history.some((h) => h.status === "Failed");

      // Retake only if there's a previous failure AND this is not that failed one
      const isRetake =
        history.some((h) => h.status === "Failed") && entry.status !== "Failed";

      // Save this attempt into the history
      history.push({ status: entry.status });

      return {
        code: entry.code,
        year: entry.year,
        semester: entry.semester,
        status: entry.status,
        grade: entry.grade || "",
        isRetake: isRetake,
      };
    });

    // POST request
    try {
      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const userId = decoded.user_id;

      const response = await axiosClient.post(`/academic-profile/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ entries: processedEntries }),
      });

      const data = await response.json();
      console.log("Saved:", data);
      showNotification("Academic profile updated successfully!", "success");
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

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

  const entriesByYearSemester = useMemo(() => {
    const grouped = {};

    entries.forEach((entry) => {
      const key = `Year ${entry.year} - Semester ${entry.semester}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    });

    return grouped;
  }, [entries]);

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
