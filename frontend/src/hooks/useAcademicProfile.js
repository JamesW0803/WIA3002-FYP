import { useState, useEffect, useMemo } from "react";
import axiosClient from "../api/axiosClient";
import { getUserIdFromStorage } from "../utils/getUserIdFromStorage";

export const useAcademicProfile = () => {
  const userId = getUserIdFromStorage();
  const [editingBackup, setEditingBackup] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [entries, setEntries] = useState([]);
  const [years, setYears] = useState([1, 2, 3, 4]);
  const [currentYear, setCurrentYear] = useState(null);
  const [currentSemester, setCurrentSemester] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasAddedFirstCourse, setHasAddedFirstCourse] = useState(false);
  const [intakeYear, setIntakeYear] = useState(null);
  const [intakeSemester, setIntakeSemester] = useState(null);
  const [studentYear, setStudentYear] = useState(null);
  const [studentSemester, setStudentSemester] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "info",
    isClosing: false,
  });

  const isFutureReady = useMemo(() => {
    return !sessionLoading && studentYear != null && studentSemester != null;
  }, [sessionLoading, studentYear, studentSemester]);

  const gradeOptions = {
    passed: ["A+", "A", "A-", "B+", "B", "B-", "C+", "C"],
    failed: ["C-", "D+", "D", "F"],
  };

  const computeSemesterNumber = (
    intakeYear,
    intakeSem,
    targetYear,
    targetSem
  ) => {
    // intakeYear is a string like "2022/2023"
    const startYear = parseInt(intakeYear.split("/")[0], 10);
    const yearDiff = targetYear - startYear;
    // two semesters per year, and intakeSem is 1 or 2:
    //   e.g. if intakeSem=1, then Semester 1 is ordinal 1, Semester 2 is ordinal 2, etc.
    return yearDiff * 2 + targetSem - (intakeSem - 1);
  };

  const isFutureSemester = (year, sem) => {
    if (sessionLoading) return false;
    if (studentYear == null || studentSemester == null) return true;

    const targetOrd = (year - 1) * 2 + sem;
    const currentOrd = (studentYear - 1) * 2 + studentSemester;

    return targetOrd > currentOrd;
  };

  //Fetching the profile
  useEffect(() => {
    if (!userId) {
      console.error("No user ID found in token");
      return;
    }
    const fetchAcademicProfile = async () => {
      try {
        const res = await axiosClient.get(`/academic-profile/${userId}`);
        const loadedEntries = res.data.entries.map((entry) => ({
          id: entry._id,
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

  useEffect(() => {
    const fetchIntakeAndSession = async () => {
      try {
        // grab token + userId
        const token = localStorage.getItem("token");
        const decoded = JSON.parse(atob(token.split(".")[1]));
        const userId = decoded.user_id;

        const [profileRes, sessionRes] = await Promise.all([
          axiosClient.get(`/user/student-profile/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axiosClient.get(`/academic-sessions/current`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        // 1) intake stays the same (intakeYear is a "YYYY/YYYY" string,
        //    intakeSemester hopefully already a number)
        const { intakeYear: iY, intakeSemester: iS } = profileRes.data;
        // parse "Semester 1" → 1
        const intakeSemNum =
          typeof iS === "string" ? parseInt(iS.replace(/\D/g, ""), 10) : iS;
        setIntakeYear(iY);
        setIntakeSemester(intakeSemNum);

        // 2) parse the session payload into numbers:
        const rawYear = sessionRes.data.year; // e.g. "2025/2026"
        const rawSem = sessionRes.data.semester; // e.g. "Semester 1"

        const parsedYear =
          typeof rawYear === "string"
            ? parseInt(rawYear.split("/")[0], 10)
            : Number(rawYear);

        const parsedSem =
          typeof rawSem === "string"
            ? parseInt(rawSem.replace(/\D/g, ""), 10)
            : Number(rawSem);

        setCurrentYear(parsedYear);
        setCurrentSemester(parsedSem);

        // 3) now your existing computeSemesterNumber will work
        const totalSemesters = computeSemesterNumber(
          iY, // intakeYear string
          intakeSemNum, // intakeSem number
          parsedYear, // now a number
          parsedSem // now a number
        );

        // 4) derive relative progress
        const relYear = Math.ceil(totalSemesters / 2);
        const relSem = totalSemesters % 2 === 0 ? 2 : 1;

        setStudentYear(relYear);
        setStudentSemester(relSem);
        setSessionLoading(false);
      } catch (err) {
        console.error("❌ Failed to load intake or session:", err);
        showNotification(
          "Failed to load academic intake/session info",
          "error"
        );
        setSessionLoading(false);
      }
    };

    fetchIntakeAndSession();
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axiosClient.get("/courses", {
          params: { minimal: "true" },
        });
        const formattedCourses = response.data.map((course) => ({
          code: course.code,
          name: course.name,
          credit: course.credit,
          prerequisites: course.prerequisites,
          offered_semester: course.offered_semester,
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
    if (studentYear == null || studentSemester == null) return false;
    const targetOrd = (year - 1) * 2 + semester;
    const currentOrd = (studentYear - 1) * 2 + studentSemester;
    return targetOrd < currentOrd;
  };

  const startEditing = (id) => {
    const entryToEdit = entries.find((e) => e.id === id);
    if (entryToEdit) {
      setEditingEntry({ ...entryToEdit });
      setEntries(entries.filter((e) => e.id !== id));
    }
  };

  const cancelEditing = () => {
    if (editingBackup) {
      setEntries((prev) => [...prev, editingBackup]);
      setEditingBackup(null);
    }
    setEditingEntry(null);
  };

  const removeEntry = (id) => {
    setEntries(entries.filter((entry) => entry.id !== id));
    if (editingEntry?.id === id) {
      setEditingEntry(null);
    }
    if (editingBackup?.id === id) setEditingBackup(null);
  };

  const saveEntry = async () => {
    if (!editingEntry) return;

    if (!editingEntry.code) {
      showNotification("Please select a course", "error");
      return;
    }

    // helper: is term A earlier than term B?
    const isEarlierTerm = (a, b) =>
      a.year < b.year || (a.year === b.year && a.semester < b.semester);

    // Look for an earlier failed attempt of the same course
    const earlierFailed = entries.some(
      (e) =>
        e.code === editingEntry.code &&
        e.status === "Failed" &&
        isEarlierTerm(
          { year: e.year, semester: e.semester },
          { year: editingEntry.year, semester: editingEntry.semester }
        )
    );

    // If there are failed attempts, mark this as a retake
    const isRetake = earlierFailed && editingEntry.status !== "Failed";

    if (!isRetake) {
      const prerequisiteCheck = await checkCoursePrerequisites(
        editingEntry.code
      );
      if (!prerequisiteCheck.allPrerequisitesMet) {
        showNotification(
          `Cannot add ${
            editingEntry.code
          }. Missing prerequisites: ${prerequisiteCheck.unmetPrerequisites.join(
            ", "
          )}`,
          "error"
        );
        return;
      }
    }

    const entryToSave = {
      ...editingEntry,
      isRetake,
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
    setEditingBackup(null);

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
    if (isFutureSemester(year, semester)) {
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

    if (
      entries.some(({ year, semester }) => isFutureSemester(year, semester))
    ) {
      showNotification(
        "Cannot save profile. Please remove courses for future semesters first.",
        "error"
      );
      return;
    }

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

      const response = await axiosClient.post(
        `/academic-profile/${userId}`,
        { entries: processedEntries },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = response.data;
      console.log("Saved:", data);
      showNotification("Academic profile updated successfully!", "success");
    } catch (error) {
      console.error("Error saving profile:", error);
      showNotification("Failed to save academic profile", "error");
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

  const checkCoursePrerequisites = async (courseCode) => {
    try {
      const userId = getUserIdFromStorage();
      const response = await axiosClient.get(
        `/courses/${courseCode}/check-prerequisites/${userId}`
      );
      return response.data;
    } catch (error) {
      console.error("Prerequisite check failed:", error);
      return {
        hasPrerequisites: false,
        unmetPrerequisites: [],
        allPrerequisitesMet: true,
      };
    }
  };

  return {
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
    isFutureReady,
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
    checkCoursePrerequisites,
  };
};
