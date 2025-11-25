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
  const [collapsedYears, setCollapsedYears] = useState(new Set());
  const [gaps, setGaps] = useState([]);

  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "info",
    isClosing: false,
  });

  const [gapUndo, setGapUndo] = useState({
    semesters: {},
    years: {},
  });

  // ---- DEBUG UTIL ----
  const AP_DEBUG = true; // flip to false to silence

  const trace = (...args) => {
    if (!AP_DEBUG) return;
    // eslint-disable-next-line no-console
    console.log("[AcademicProfile]", ...args);
  };

  const traceGroup = (label, fn) => {
    if (!AP_DEBUG) return fn?.();
    // eslint-disable-next-line no-console
    console.groupCollapsed(`[AcademicProfile] ${label}`);
    try {
      fn?.();
    } finally {
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  };

  const snapshotState = (where = "") => {
    traceGroup(`STATE SNAPSHOT ${where}`, () => {
      trace("years:", years);
      trace("gaps:", JSON.stringify(gaps));
      trace("entries count:", entries.length);
      const byTerm = {};
      entries.forEach((e) => {
        const k = `Y${e.year}-S${e.semester}`;
        byTerm[k] = (byTerm[k] || 0) + 1;
      });
      trace("entries by term:", byTerm);
    });
  };

  const semKey = (y, s) => `Y${y}-S${s}`;
  const yrKey = (y) => `Y${y}`;

  const isFutureReady = useMemo(() => {
    return !sessionLoading && studentYear != null && studentSemester != null;
  }, [sessionLoading, studentYear, studentSemester]);

  const gradeOptions = {
    passed: ["A+", "A", "A-", "B+", "B", "B-", "C+", "C"],
    failed: ["C-", "D+", "D", "F"],
  };

  const ALL_STATUSES = ["Planned", "Ongoing", "Passed", "Failed"];

  const ensureYearExists = (yr) => {
    trace("ensureYearExists called with", yr);
    if (!years.includes(yr)) {
      trace("→ adding missing year", yr);
      setYears((prev) => [...prev, yr].sort((a, b) => a - b));
    } else {
      trace("→ year already exists");
    }
  };

  const isGapSemester = (year, semester) => {
    return gaps.some(
      (g) => g.year === year && (g.semester === null || g.semester === semester)
    );
  };

  const isGapYear = (year) => {
    return gaps.some((g) => g.year === year && g.semester === null);
  };

  const toggleGapSemester = (year, semester) => {
    // cannot toggle if whole year is gapped
    if (isGapYear(year)) {
      showNotification(
        `Year ${year} is fully gapped. Remove gap year first.`,
        "error"
      );
      return;
    }

    const currentlyGapped = isGapSemester(year, semester);

    if (!currentlyGapped) {
      // Gap flow should be initiated by requestGapSemester (with dialog); keep this button as a no-op here
      showNotification(`Use "Gap Semester" to start the gap flow.`, "info");
      return;
    }

    // Ungap
    const key = semKey(year, semester);
    const pending = gapUndo.semesters[key];

    if (pending) {
      // Restore unsaved changes (UNDO)
      if (pending.mode === "remove") {
        // put removed courses back
        setEntries((prev) => [...prev, ...pending.removed]);
      } else if (pending.mode === "move") {
        // move back any moved courses
        setEntries((prev) => {
          const back = new Map(pending.moved.map((m) => [m.id, m]));
          return prev.map((e) => {
            const m = back.get(e.id);
            if (
              m &&
              e.year === m.to.year &&
              e.semester === (m.to.semester ?? e.semester)
            ) {
              return { ...e, year: m.from.year, semester: m.from.semester };
            }
            return e;
          });
        });
      }

      // remove the gap flag
      setGaps((prev) =>
        prev.filter((g) => !(g.year === year && g.semester === semester))
      );

      // clear undo record
      setGapUndo((prev) => {
        const next = { ...prev, semesters: { ...prev.semesters } };
        delete next.semesters[key];
        return next;
      });

      showNotification(
        `Ungapped Year ${year} • Semester ${semester} and restored previous courses (unsaved change).`,
        "success"
      );
    } else {
      // Irreversible path (already saved after gapping)
      setGaps((prev) =>
        prev.filter((g) => !(g.year === year && g.semester === semester))
      );
      showNotification(
        `Ungapped Year ${year} • Semester ${semester}. Changes were previously saved, so courses were not restored.`,
        "info"
      );
    }
  };

  const toggleGapYear = (year) => {
    const currentlyGapped = isGapYear(year);

    if (!currentlyGapped) {
      showNotification(`Use "Gap Year" to start the gap flow.`, "info");
      return;
    }

    const key = yrKey(year);
    const pending = gapUndo.years[key];

    if (pending) {
      // Restore unsaved changes (UNDO)
      if (pending.mode === "remove") {
        setEntries((prev) => [...prev, ...pending.removed]);
      } else if (pending.mode === "move") {
        setEntries((prev) => {
          const back = new Map(pending.moved.map((m) => [m.id, m]));
          return prev.map((e) => {
            const m = back.get(e.id);
            if (m && e.year === m.to.year) {
              return { ...e, year: m.from.year };
            }
            return e;
          });
        });
      }

      // remove the gap flag
      setGaps((prev) =>
        prev.filter((g) => !(g.year === year && g.semester === null))
      );

      // clear undo record
      setGapUndo((prev) => {
        const next = { ...prev, years: { ...prev.years } };
        delete next.years[key];
        return next;
      });

      showNotification(
        `Ungapped Year ${year} and restored previous courses (unsaved change).`,
        "success"
      );
    } else {
      // Irreversible path (already saved after gapping)
      setGaps((prev) =>
        prev.filter((g) => !(g.year === year && g.semester === null))
      );
      showNotification(
        `Ungapped Year ${year}. Changes were previously saved, so courses were not restored.`,
        "info"
      );
    }
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

  const getNextAvailableTerm = () => {
    // Next chronological term after the current latest entry or the student’s current term
    const ords = entries.map((e) => (e.year - 1) * 2 + e.semester);
    const baseOrd = Math.max(
      ords.length ? Math.max(...ords) : 0,
      (studentYear ?? 1 - 1) * 2 + (studentSemester ?? 1)
    );
    const nextOrd = baseOrd + 1;
    const nextYear = Math.floor((nextOrd - 1) / 2) + 1;
    const nextSemester = nextOrd % 2 === 0 ? 2 : 1;
    return { year: nextYear, semester: nextSemester };
  };

  //Fetching the profile
  useEffect(() => {
    if (!userId) {
      console.error("No user ID found in token");
      return;
    }
    const annotateRetakes = (list) => {
      // Sort by (year, semester) so “earlier” comes first
      const sorted = [...list].sort(
        (a, b) => a.year - b.year || a.semester - b.semester
      );
      const seenByCourse = new Map();

      return sorted.map((e) => {
        const prev = seenByCourse.get(e.code) || [];
        const isRetake = prev.length > 0; // any prior attempt makes this a retake (A/A+ attempts are blocked elsewhere)
        seenByCourse.set(e.code, [...prev, e]);
        return { ...e, isRetake };
      });
    };
    const fetchAcademicProfile = async () => {
      try {
        const res = await axiosClient.get(`/academic-profile/${userId}`);
        const loadedEntries = res.data.entries.map((entry) => ({
          id: entry._id,
          code: entry.course.course_code,
          name: entry.course.course_name,
          credit: entry.course.credit_hours,
          year: Number(entry.year),
          semester: Number(entry.semester),
          status: entry.status,
          grade: entry.grade,
          isRetake: false,
        }));
        setEntries(annotateRetakes(loadedEntries));
        setGaps(res.data.gaps || []);
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
          axiosClient.get(`/academic-profile/student-profile/${userId}`, {
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
        console.error("❌ Failed to load intake or session:", {
          message: err.message,
          url: err.config?.url,
          method: err.config?.method,
          status: err.response?.status,
          data: err.response?.data,
        });
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
    // invalid only if same course exists in THE SAME semester
    const current = editingEntry;
    return entries.some(
      (e) =>
        e.id !== currentId &&
        e.code === courseCode &&
        current &&
        e.year === current.year &&
        e.semester === current.semester
    );
  };

  const isPastSemester = (year, semester) => {
    if (studentYear == null || studentSemester == null) return false;
    const targetOrd = (year - 1) * 2 + semester;
    const currentOrd = (studentYear - 1) * 2 + studentSemester;
    return targetOrd < currentOrd;
  };

  const isEarlierTerm = (a, b) =>
    a.year < b.year || (a.year === b.year && a.semester < b.semester);
  const priorBestForCourse = (code, upTo) => {
    // Find best prior outcome before `upTo` {year, semester}
    // Returns { hasAorAplus, hasPassed, hadFailure }
    let hasAorAplus = false;
    let hasPassed = false;
    let hadFailure = false;
    entries.forEach((e) => {
      if (e.code !== code) return;
      if (
        !upTo ||
        isEarlierTerm({ year: e.year, semester: e.semester }, upTo)
      ) {
        if (e.status === "Passed") {
          hasPassed = true;
          if (e.grade === "A" || e.grade === "A+") hasAorAplus = true;
        } else if (e.status === "Failed") {
          hadFailure = true;
        }
      }
    });
    return { hasAorAplus, hasPassed, hadFailure };
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

  const startRetake = (entry) => {
    const { year, semester } = getNextAvailableTerm();
    setEditingEntry({
      id: Date.now(),
      code: entry.code,
      name: entry.name,
      credit: entry.credit,
      status: isFutureSemester(year, semester) ? "Planned" : "Ongoing",
      grade: "",
      year,
      semester,
      isRetake: true,
      retakeRequested: true, // UI hint
    });
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

    // Disallow duplicates in the same term
    if (
      entries.some(
        (e) =>
          e.code === editingEntry.code &&
          e.id !== editingEntry.id &&
          e.year === editingEntry.year &&
          e.semester === editingEntry.semester
      )
    ) {
      showNotification(
        "This course is already recorded in the same semester.",
        "error"
      );
      return;
    }
    // Retake policy: not allowed if prior A or A+
    const prior = priorBestForCourse(editingEntry.code, {
      year: editingEntry.year,
      semester: editingEntry.semester,
    });
    if (prior.hasAorAplus) {
      showNotification(
        `You already achieved ${editingEntry.code} with grade A/A+. Retakes are not allowed for A or A+.`,
        "error"
      );
      return;
    }
    // Auto-retake detection:
    // retake if there was any earlier attempt (failed OR passed below A)
    const isRetake =
      prior.hadFailure || (prior.hasPassed && !prior.hasAorAplus);

    if (!isRetake) {
      const prerequisiteCheck = await checkCoursePrerequisites(
        editingEntry.code,
        {
          year: editingEntry.year,
          semester: editingEntry.semester,
        }
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

    const isFuture = isFutureSemester(editingEntry.year, editingEntry.semester);

    if (
      isPast &&
      (editingEntry.status === "Ongoing" ||
        editingEntry.status === "Planned" ||
        !editingEntry.status)
    ) {
      showNotification(
        "Past semesters must have either 'Passed' or 'Failed' status",
        "error"
      );
      return;
    }

    // Future terms must be Planned
    if (isFuture && editingEntry.status !== "Planned") {
      showNotification(
        "Future semesters can only have status 'Planned'.",
        "error"
      );
      return;
    }
    if (!isPast && !isCurrent && !isFuture && !editingEntry.status) {
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

    const selectedCourse = availableCourses.find(
      (c) => c.code === editingEntry.code
    );
    if (selectedCourse) {
      const offered = selectedCourse.offered_semester.map((s) =>
        s.toLowerCase()
      );
      const offeredInThisSem =
        offered.includes(`semester ${editingEntry.semester}`) ||
        offered.includes("both") ||
        offered.includes("all") ||
        offered.includes("any");

      if (!offeredInThisSem) {
        showNotification(
          `${editingEntry.code} is not offered in Semester ${editingEntry.semester}`,
          "error"
        );
        return;
      }
    }
  };

  const addSemester = () => {
    const { year, semester } = getNextAvailableTerm();

    // Manual-only years: do not auto-add year.
    const maxYear = years.length ? Math.max(...years) : 0;
    if (year > maxYear) {
      showNotification(
        `Next term is Year ${year} • Semester ${semester}. Please add Year ${year} first.`,
        "error"
      );
      return;
    }

    showNotification(
      `Added Year ${year} • Semester ${semester} to your plan.`,
      "success"
    );
    setTimeout(() => {
      const newSection = document.querySelector(
        `[data-year="${year}"][data-semester="${semester}"]`
      );
      newSection?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const addNewEntry = (year, semester) => {
    if (isFutureSemester(year, semester)) {
      showNotification("You cannot add courses for future semesters.", "error");
      return;
    }
    if (isGapSemester(year, semester)) {
      showNotification(
        `Cannot add courses to a gapped term (Year ${year} • Semester ${semester}).`,
        "error"
      );
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
      if (!seenCourses.has(key)) seenCourses.set(key, []);
      const history = seenCourses.get(key); // prior attempts (chronological)

      // Any prior attempt => this one is a retake (A/A+ later attempts are blocked below)
      const isRetake = history.length > 0;

      // record for subsequent entries
      history.push({ status: entry.status, grade: entry.grade });

      return {
        code: entry.code,
        year: entry.year,
        semester: entry.semester,
        status: entry.status,
        grade: entry.grade || "",
        isRetake,
      };
    });

    // Validate no attempt after prior A/A+
    const historyByCourse = new Map();
    for (const e of processedEntries) {
      if (!historyByCourse.has(e.code)) historyByCourse.set(e.code, []);
      const hist = historyByCourse.get(e.code);
      const alreadyHasAorAplus = hist.some(
        (h) => h.status === "Passed" && (h.grade === "A" || h.grade === "A+")
      );
      if (alreadyHasAorAplus) {
        showNotification(
          `Cannot record ${e.code} again after achieving A/A+. Remove the later attempt to proceed.`,
          "error"
        );
        return;
      }
      hist.push(e);
    }

    // POST request
    try {
      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const userId = decoded.user_id;

      const response = await axiosClient.post(
        `/academic-profile/${userId}`,
        { entries: processedEntries, gaps },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = response.data;
      console.log("Saved:", data);
      showNotification("Academic profile updated successfully!", "success");
      setGapUndo({ semesters: {}, years: {} });
    } catch (error) {
      console.error("Error saving profile:", error);
      showNotification("Failed to save academic profile", "error");
    }
  };

  const recomputeYears = (opts = { keepCollapsed: true }) => {
    // Manual model: keep current years, make sure any year used by entries exists,
    // and keep at least Year 1.
    const keep = new Set(years);
    for (const e of entries) keep.add(e.year);
    if (keep.size === 0) keep.add(1);
    const next = Array.from(keep).sort((a, b) => a - b);
    setYears(next);
    if (!opts.keepCollapsed) {
      setCollapsedYears(
        (prev) => new Set([...prev].filter((y) => next.includes(y)))
      );
    }
  };

  const addYear = () => {
    const next = years.length ? Math.max(...years) + 1 : 1;
    setYears((prev) => [...prev, next].sort((a, b) => a - b));
    showNotification(`Added Year ${next}.`, "success");
  };

  const removeYear = (yearToRemove) => {
    const hasData = entries.some((e) => e.year === yearToRemove);
    if (hasData) {
      showNotification(
        `Cannot delete Year ${yearToRemove} because it has courses.`,
        "error"
      );
      return;
    }
    setYears((prev) => prev.filter((y) => y !== yearToRemove));
    showNotification(`Removed Year ${yearToRemove}.`, "success");
  };

  useEffect(() => {
    recomputeYears({ trimEmptyTail: true });
  }, [entries, studentYear, studentSemester]);

  // ---------- GAP HELPERS ----------
  const findCourseMeta = (code) => {
    const meta = availableCourses.find((c) => c.code === code);
    if (!meta) trace("findCourseMeta: no meta for", code);
    return meta;
  };

  const isOfferedIn = (offeredArr = [], semNum) => {
    const res = (() => {
      const norm = (offeredArr || []).map((s) => String(s).toLowerCase());
      return (
        norm.includes(`semester ${semNum}`) ||
        norm.includes("both") ||
        norm.includes("all") ||
        norm.includes("any")
      );
    })();
    trace("isOfferedIn:", { offeredArr, semNum, res });
    return res;
  };

  const nextTerm = (y, s) =>
    s === 1 ? { year: y, semester: 2 } : { year: y + 1, semester: 1 };

  const gapSemester = (year, semester, { action = "remove" } = {}) => {
    traceGroup(`gapSemester(Y${year} S${semester})`, () => {
      trace("action:", action);
      const inTerm = entries.filter(
        (e) => e.year === year && e.semester === semester
      );

      const target =
        semester === 1
          ? { year, semester: 2 }
          : { year: year + 1, semester: 1 };

      // If action === "move", we’ll move only those offered in target semester.
      let toMove = [];
      if (action === "move") {
        const canMove = (e) => {
          const meta = findCourseMeta(e.code);
          const offered = meta
            ? isOfferedIn(meta.offered_semester || [], target.semester)
            : false;
          return !!meta && offered;
        };
        toMove = inTerm.filter(canMove);
      }

      // --- record pending undo delta (unsaved) ---
      setGapUndo((prev) => ({
        ...prev,
        semesters: {
          ...prev.semesters,
          [semKey(year, semester)]: {
            mode: action,
            removed:
              action === "remove"
                ? [...inTerm]
                : inTerm.filter((e) => !toMove.includes(e)),
            moved:
              action === "move"
                ? toMove.map((e) => ({
                    id: e.id,
                    from: { year, semester },
                    to: { ...target },
                    snapshot: { ...e }, // keep a copy just in case
                  }))
                : [],
            target: action === "move" ? { ...target } : undefined,
          },
        },
      }));
      // --- end record ---

      if (semester === 2 && year + 1 > Math.max(4, ...(years || []))) {
        ensureYearExists(year + 1);
      }

      if (action === "remove") {
        // remove all courses in source term, mark gap
        setEntries((prev) =>
          prev.filter((e) => !(e.year === year && e.semester === semester))
        );
        setGaps((prev) => [
          ...prev.filter((g) => !(g.year === year && g.semester === semester)),
          { year, semester },
        ]);
        showNotification(
          `Gapped semester and removed ${inTerm.length} course(s)`,
          "success"
        );
        snapshotState("after gapSemester(remove)");
        return;
      }

      // action === "move"
      ensureYearExists(target.year);
      setEntries((prev) => {
        const withoutSource = prev.filter(
          (e) => !(e.year === year && e.semester === semester)
        );
        const moved = toMove.map((e) => ({
          ...e,
          year: target.year,
          semester: target.semester,
        }));
        return [...withoutSource, ...moved];
      });
      setGaps((prev) => [
        ...prev.filter((g) => !(g.year === year && g.semester === semester)),
        { year, semester },
      ]);

      const movedCount = toMove.length;
      const skippedCount = inTerm.length - movedCount;
      showNotification(
        `Gapped semester. Moved ${movedCount} course(s) to Year ${
          target.year
        } • Semester ${target.semester}${
          skippedCount ? `, cleared ${skippedCount} not offered` : ""
        }.`,
        "success"
      );
      snapshotState("after gapSemester(move)");
    });
  };

  const gapYear = (year, { action = "remove" } = {}) => {
    traceGroup(`gapYear(Y${year})`, () => {
      const inYear = entries.filter((e) => e.year === year);

      // For "move", we simply shift all to next year in your current code
      const targetYear = year + 1;

      // --- record pending undo delta (unsaved) ---
      setGapUndo((prev) => ({
        ...prev,
        years: {
          ...prev.years,
          [yrKey(year)]: {
            mode: action,
            removed: action === "remove" ? [...inYear] : [],
            moved:
              action === "move"
                ? inYear.map((e) => ({
                    id: e.id,
                    from: { year },
                    to: { year: targetYear },
                    snapshot: { ...e },
                  }))
                : [],
            targetYear: action === "move" ? targetYear : undefined,
          },
        },
      }));
      // --- end record ---

      if (action === "remove") {
        setEntries((prev) => prev.filter((e) => e.year !== year));
        setGaps((prev) => [
          ...prev.filter((g) => g.year !== year),
          { year, semester: null },
        ]);
        showNotification(
          `Gapped year and removed ${inYear.length} course(s)`,
          "success"
        );
        snapshotState("after gapYear(remove)");
        return;
      }

      // action === "move"
      ensureYearExists(targetYear);
      setEntries((prev) => {
        const others = prev.filter((e) => e.year !== year);
        const moved = inYear.map((e) => ({ ...e, year: targetYear }));
        return [...others, ...moved];
      });
      setGaps((prev) => [
        ...prev.filter((g) => g.year !== year),
        { year, semester: null },
      ]);
      showNotification(
        `Gapped year. Moved ${inYear.length} course(s) to Year ${targetYear}.`,
        "success"
      );
      snapshotState("after gapYear(move)");
    });
  };

  const requestGapSemester = (year, semester) => {
    trace("requestGapSemester called:", { year, semester });
    if (isGapYear(year)) {
      trace("Blocked: whole year already gapped");
      showNotification(
        `Year ${year} is already fully gapped. Remove year gap first.`,
        "error"
      );
      return;
    }
    const hasCourses = entries.some(
      (e) => e.year === year && e.semester === semester
    );
    trace("hasCourses in term:", hasCourses);
    if (!hasCourses) {
      setGaps((prev) => [
        ...prev.filter((g) => !(g.year === year && g.semester === semester)),
        { year, semester },
      ]);
      showNotification(`Gapped Year ${year} • Semester ${semester}`, "success");
      snapshotState("after requestGapSemester(no-courses)");
      return;
    }
    gapSemester(year, semester, { action: "remove" });
  };

  const requestGapYear = (year) => {
    trace("requestGapYear called:", { year });
    const hasCourses = entries.some((e) => e.year === year);
    trace("hasCourses in year:", hasCourses);
    if (!hasCourses) {
      setGaps((prev) => [
        ...prev.filter((g) => g.year !== year),
        { year, semester: null },
      ]);
      showNotification(`Gapped Year ${year}`, "success");
      snapshotState("after requestGapYear(no-courses)");
      return;
    }
    gapYear(year, { action: "remove" });
  };

  const persistProfile = async (entriesToSave = entries, gapsToSave = gaps) => {
    try {
      const token = localStorage.getItem("token");
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const userId = decoded.user_id;

      // keep server-friendly, sorted payload
      const sorted = [...entriesToSave].sort((a, b) =>
        Number(a.year) !== Number(b.year)
          ? Number(a.year) - Number(b.year)
          : Number(a.semester) - Number(b.semester)
      );

      const payloadEntries = sorted.map((e) => ({
        code: e.code,
        year: Number(e.year),
        semester: Number(e.semester),
        status: e.status,
        grade: e.grade || "",
        isRetake: !!e.isRetake,
      }));

      await axiosClient.post(
        `/academic-profile/${userId}`,
        { entries: payloadEntries, gaps: gapsToSave },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      trace("persistProfile: success", {
        entries: payloadEntries.length,
        gaps: gapsToSave.length,
      });
    } catch (err) {
      console.error("persistProfile failed:", err);
      showNotification("Failed to save profile after change", "error");
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

  const checkCoursePrerequisites = async (
    courseCode,
    { year, semester } = {}
  ) => {
    try {
      const userId = getUserIdFromStorage();

      const response = await axiosClient.get(
        `/courses/${courseCode}/check-prerequisites/${userId}`,
        {
          params: { year, semester },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Prerequisite check failed:", error);

      // IMPORTANT CHANGE: fall back to "ok" so we don't block saves
      return {
        hasPrerequisites: false,
        unmetPrerequisites: [],
        allPrerequisitesMet: true,
        requiredCourses: [],
      };
    }
  };

  const deleteYear = (yearToDelete, options = {}) => {
    traceGroup(`deleteYear(year=${yearToDelete})`, () => {
      trace("options:", options);
      const { mode, strategy, compact } = options;

      // Safety: UI forbids deleting core years only for "clearAndDelete"
      if (mode === "clearAndDelete" && Number(yearToDelete) <= 4) {
        trace("Blocked: trying to delete a core year (<=4)");
        showNotification(
          `Years 1–4 cannot be deleted. Choose "Remove courses only".`,
          "error"
        );
        return;
      }

      if (!years.includes(Number(yearToDelete))) {
        trace("Blocked: year does not exist in years list", years);
        showNotification(`Year ${yearToDelete} does not exist.`, "error");
        return;
      }

      const hadCourses = entries.some(
        (e) => Number(e.year) === Number(yearToDelete)
      );
      trace("hadCourses in that year:", hadCourses);

      // Compute next state first (so we can persist immediately and consistently)
      const nextEntries = entries.filter(
        (e) => Number(e.year) !== Number(yearToDelete)
      );

      const clearYearGapsFn = (gapsState) =>
        gapsState.filter((g) => Number(g.year) !== Number(yearToDelete));

      if (mode === "clearOnly" || mode === undefined) {
        // Update state
        setEntries(nextEntries);

        showNotification(
          hadCourses
            ? `Removed all courses in Year ${yearToDelete}.`
            : `No courses to remove in Year ${yearToDelete}.`,
          "success"
        );

        // Persist entries + current gaps (Step 3)
        persistProfile(nextEntries, gaps);

        snapshotState("after deleteYear(clearOnly)");
        return;
      }

      if (mode === "clearAndDelete") {
        // Remove year from UI list
        const nextYears = years.filter(
          (y) => Number(y) !== Number(yearToDelete)
        );
        setYears(nextYears);

        // Remove any gaps tied to that year
        const nextGaps = clearYearGapsFn(gaps);
        setGaps(nextGaps);

        // Update entries
        setEntries(nextEntries);

        // Optional legacy "compact" (shift later years down by 1)
        if (compact) {
          const compactYears = nextYears
            .map((y) =>
              Number(y) > Number(yearToDelete) ? Number(y) - 1 : Number(y)
            )
            .sort((a, b) => a - b);
          setYears(compactYears);
        }

        showNotification(
          `Year ${yearToDelete} deleted successfully.`,
          "success"
        );

        // Persist entries + gaps (Step 3)
        persistProfile(nextEntries, nextGaps);

        snapshotState("after deleteYear(clearAndDelete)");
        return;
      }

      // Deprecated path
      if (strategy) {
        trace("Deprecated strategy path triggered:", strategy);
        showNotification(
          `This action flow is deprecated. Use the new delete-year dialog.`,
          "info"
        );
      }
    });
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
    addSemester,
    startRetake,
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
    ALL_STATUSES,
    addYear,
    removeYear,
    recomputeYears,
    collapsedYears,
    setCollapsedYears,
    deleteYear,
    gaps,
    isGapSemester,
    isGapYear,
    toggleGapYear,
    toggleGapSemester,
    requestGapSemester,
    requestGapYear,
  };
};
