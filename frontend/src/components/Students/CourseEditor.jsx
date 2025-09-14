import React, { useEffect, useMemo, useState } from "react";
import CourseListSelector from "./CourseListSelector";
import CourseStatusSelector from "./CourseStatusSelector";
import { CheckCircle, TriangleAlert } from "lucide-react";
import { useAcademicProfile } from "../../hooks/useAcademicProfile";

const CourseEditor = ({
  editingEntry,
  availableCourses,
  isCourseAlreadyAdded,
  setEditingEntry,
  saveEntry,
  cancelEditing,
  gradeOptions,
  isPastSemester,
  currentYear,
  currentSemester,
  entries,
  targetSemester,
}) => {
  const { isFutureSemester } = useAcademicProfile();
  const year = editingEntry?.year;
  const semester = editingEntry?.semester;

  const selectedFromList = useMemo(
    () => availableCourses.find((c) => c.code === editingEntry?.code),
    [editingEntry?.code, availableCourses]
  );
  const isOfferedIn = (offeredArr = [], semNum) => {
    const norm = (offeredArr || []).map((s) => String(s).toLowerCase());
    return (
      norm.includes(`semester ${semNum}`) ||
      norm.includes("both") ||
      norm.includes("all") ||
      norm.includes("any")
    );
  };

  const isOffered =
    !selectedFromList ||
    isOfferedIn(selectedFromList.offered_semester, semester);

  const [isCheckingPrerequisites, setIsCheckingPrerequisites] = useState(false);
  const { checkCoursePrerequisites, showNotification } = useAcademicProfile();

  const selectedCourse = useMemo(() => {
    return availableCourses.find((c) => c.code === editingEntry?.code);
  }, [editingEntry?.code, availableCourses]);

  // normalize to an array of code‐strings (no objects)
  const prerequisiteCodes = useMemo(() => {
    return (selectedCourse?.prerequisites || []).map((pr) =>
      typeof pr === "string" ? pr : pr.course_code
    );
  }, [selectedCourse]);

  // Enhanced prerequisite check state
  const [prerequisiteCheck, setPrerequisiteCheck] = useState({
    hasPrerequisites: false,
    unmetPrerequisites: [],
    allPrerequisitesMet: true,
    requiredCourses: [],
    sameTermConflict: false,
  });

  // Combined prerequisite checking logic
  useEffect(() => {
    const check = async () => {
      if (!editingEntry.code || !selectedCourse) {
        setPrerequisiteCheck({
          hasPrerequisites: false,
          unmetPrerequisites: [],
          allPrerequisitesMet: true,
          requiredCourses: [],
          sameTermConflict: false,
        });
        return;
      }

      // 1) local, term‐aware missing list
      const localMissing = prerequisiteCodes.filter((code) => {
        return !entries.some(
          (e) =>
            e.code === code &&
            e.status === "Passed" &&
            (e.year < year || (e.year === year && e.semester < semester))
        );
      });

      // 2) server missing list
      const serverCheck = await checkCoursePrerequisites(editingEntry.code, {
        year: editingEntry.year,
        semester: editingEntry.semester,
      });

      // 3) merge both
      const combined = Array.from(
        new Set([...localMissing, ...serverCheck.unmetPrerequisites])
      );

      // 4) detect any prereq taken in this exact same term
      const sameTermConflict = prerequisiteCodes.some((code) =>
        entries.some(
          (e) =>
            e.code === code &&
            e.year === editingEntry.year &&
            e.semester === editingEntry.semester
        )
      );

      setPrerequisiteCheck({
        hasPrerequisites: prerequisiteCodes.length > 0,
        unmetPrerequisites: combined,
        allPrerequisitesMet: combined.length === 0,
        requiredCourses: prerequisiteCodes,
        sameTermConflict,
      });
    };

    check();
  }, [editingEntry.code, entries, year, semester, selectedCourse]);

  const disabledCourseCodes = useMemo(() => {
    return entries
      .filter((entry) => {
        const sameCourse = entry.code === editingEntry?.code;
        const sameId = entry.id === editingEntry?.id;
        const passedOrOngoing = entry.status !== "Failed";
        return !sameId && sameCourse && passedOrOngoing;
      })
      .map((entry) => entry.code);
  }, [entries, editingEntry?.id, editingEntry?.code]);

  const handleCourseSelect = (courseCode) => {
    const selectedCourse = availableCourses.find((c) => c.code === courseCode);
    setEditingEntry({
      ...editingEntry,
      code: courseCode,
      name: selectedCourse?.name || "",
      credit: selectedCourse?.credit || "",
    });
  };

  const getUnmetLocalPrereqs = () => {
    if (prerequisiteCodes.length === 0) return [];
    return prerequisiteCodes.filter((code) => {
      return !entries.some(
        (e) =>
          e.code === code &&
          e.status === "Passed" &&
          (e.year < editingEntry.year ||
            (e.year === editingEntry.year &&
              e.semester < editingEntry.semester))
      );
    });
  };

  const hasSameSemesterPrerequisites = () => {
    if (prerequisiteCodes.length === 0) return false;
    return prerequisiteCodes.some((code) =>
      entries.some(
        (e) =>
          e.code === code &&
          e.year === editingEntry.year &&
          e.semester === editingEntry.semester
      )
    );
  };

  const handleSave = async () => {
    if (!isOffered) {
      showNotification(
        `${editingEntry.code} is not offered in Semester ${semester}.`,
        "error"
      );
      return;
    }
    // 1️⃣ Block future‐semester entries immediately
    if (isFutureSemester(year, semester)) {
      showNotification("Cannot add courses for future semesters.", "error");
      return;
    }
    const unmet = getUnmetLocalPrereqs();
    if (unmet.length > 0) {
      showNotification(
        `Cannot add ${editingEntry.code}. Missing prerequisites: ${unmet.join(
          ", "
        )}`,
        "error"
      );
      return;
    }

    if (hasSameSemesterPrerequisites()) {
      showNotification(
        `Cannot add ${editingEntry.code}. Some prerequisites are in the same semester. 
      Prerequisites must be completed in earlier semesters.`,
        "error"
      );
      return;
    }

    if (!editingEntry?.code) {
      showNotification("Please select a course", "error");
      return;
    }

    // Check prerequisites before allowing save
    const serverCheck = await checkCoursePrerequisites(editingEntry.code, {
      year: editingEntry.year,
      semester: editingEntry.semester,
    });

    if (!serverCheck.allPrerequisitesMet) {
      showNotification(
        `Cannot add ${
          editingEntry.code
        }. Missing prerequisites: ${serverCheck.unmetPrerequisites.join(", ")}`,
        "error"
      );
      return;
    }

    // Additional validation
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

    saveEntry();
  };

  const renderPrerequisiteStatus = () => {
    // 1) still checking…
    if (isCheckingPrerequisites) {
      return (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
          …spinner…
        </div>
      );
    }

    // 2) same‐semester conflict → RED and exit
    if (hasSameSemesterPrerequisites()) {
      return (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800 text-sm font-medium flex items-center">
            <TriangleAlert className="h-4 w-4 mr-1" />
            Prerequisite Conflict
          </p>
          <p className="text-red-700 text-xs mt-1">
            Some prerequisites are in the same semester
          </p>
          <div className="mt-2 text-xs text-red-700">
            <p>
              You cannot take a course in the same semester as its
              prerequisites. Prerequisites must be completed in earlier
              semesters.
            </p>
          </div>
        </div>
      );
    }

    // 3) no prereqs on this course → nothing
    if (!prerequisiteCheck.hasPrerequisites) {
      return null;
    }

    // 4) all prereqs met → GREEN
    if (prerequisiteCheck.allPrerequisitesMet) {
      return (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 text-sm font-medium flex items-center">
            <CheckCircle className="h-4 w-4 mr-1" />
            All prerequisites met
          </p>
        </div>
      );
    }

    // 5) ONLY now show YELLOW if there *are* unmet prereqs
    if (prerequisiteCheck.unmetPrerequisites.length > 0) {
      return (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800 text-sm font-medium flex items-center">
            <TriangleAlert className="h-4 w-4 mr-1" />
            Prerequisite Warning
          </p>
          <p className="text-yellow-700 text-xs mt-1">
            Missing: {prerequisiteCheck.unmetPrerequisites.join(", ")}
          </p>
          <div className="mt-2 text-xs text-yellow-700">
            <p>
              You must complete these prerequisites before taking this course.
            </p>
          </div>
        </div>
      );
    }

    // 6) default
    return null;
  };

  const AlertBox = ({ variant = "warning", title, children }) => {
    const base = "mt-2 p-2 border rounded";
    const styles =
      variant === "error"
        ? "bg-red-50 border-red-200"
        : "bg-yellow-50 border-yellow-200";
    const titleColor = variant === "error" ? "text-red-800" : "text-yellow-800";
    const textColor = variant === "error" ? "text-red-700" : "text-yellow-700";
    return (
      <div className={`${base} ${styles}`}>
        {title && (
          <p className={`${titleColor} text-sm font-medium flex items-center`}>
            <TriangleAlert className="h-4 w-4 mr-1" />
            {title}
          </p>
        )}
        {children && (
          <div className={`text-xs mt-1 ${textColor}`}>{children}</div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4 border border-gray-200">
      {isFutureSemester(editingEntry.year, editingEntry.semester) && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800 text-sm font-medium">
            Warning: This is a future semester
          </p>
          <p className="text-red-700 text-xs mt-1">
            Courses cannot be added to future semesters
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
        <div className="md:col-span-2 row-span-2 md:row-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course
          </label>
          <CourseListSelector
            selectedCode={editingEntry.code}
            selectedLabel={
              editingEntry.code
                ? `${editingEntry.code}${
                    editingEntry.name ? " - " + editingEntry.name : ""
                  }`
                : ""
            }
            onChange={handleCourseSelect}
            disabledCodes={disabledCourseCodes}
            targetSemester={semester}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <CourseStatusSelector
            status={editingEntry.status}
            onChange={(val) =>
              setEditingEntry({
                ...editingEntry,
                status: val,
              })
            }
            allowedStatuses={
              isPastSemester(year, semester)
                ? ["Passed", "Failed"]
                : year === currentYear && semester === currentSemester
                ? ["Ongoing"]
                : ["Ongoing", "Passed", "Failed"]
            }
          />
        </div>

        {(editingEntry.status === "Passed" ||
          editingEntry.status === "Failed") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grade
            </label>
            <select
              value={editingEntry.grade}
              onChange={(e) =>
                setEditingEntry({
                  ...editingEntry,
                  grade: e.target.value,
                })
              }
              className="border rounded p-2 w-full"
              required
            >
              <option value="">Select grade</option>
              {editingEntry.status === "Passed"
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

        <div className="md:col-span-2 flex gap-2 w-[250px]">
          <button
            type="button"
            onClick={handleSave}
            disabled={
              isFutureSemester(editingEntry.year, editingEntry.semester) ||
              !isOffered ||
              !prerequisiteCheck.allPrerequisitesMet ||
              isCheckingPrerequisites ||
              !editingEntry.code ||
              !editingEntry.status ||
              ((editingEntry.status === "Passed" ||
                editingEntry.status === "Failed") &&
                !editingEntry.grade) ||
              getUnmetLocalPrereqs().length > 0 ||
              hasSameSemesterPrerequisites()
            }
            className={`px-4 py-2 rounded-md flex-1 border transition-colors ${
              prerequisiteCheck.allPrerequisitesMet &&
              !isCheckingPrerequisites &&
              editingEntry.code &&
              editingEntry.status &&
              ((editingEntry.status !== "Passed" &&
                editingEntry.status !== "Failed") ||
                editingEntry.grade)
                ? "bg-[#1E3A8A] text-white border-[#1E3A8A] hover:bg-white hover:text-[#1E3A8A]"
                : "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"
            }`}
          >
            {isCheckingPrerequisites ? "Checking..." : "Save Course"}
          </button>
          <button
            type="button"
            onClick={cancelEditing}
            className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
      <div className="md:col-span-6 max-w-[385px]">
        {/* Duplicate course */}
        {isCourseAlreadyAdded(editingEntry.code, editingEntry?.id) && (
          <AlertBox variant="error" title="Duplicate Course">
            This course has already been taken in another semester/year.
          </AlertBox>
        )}

        {/* Not offered this semester */}
        {!isOffered && editingEntry.code && (
          <AlertBox variant="error" title="Not Offered This Semester">
            {editingEntry.code} is not offered in Semester {semester}. Please
            choose a course offered in this semester.
          </AlertBox>
        )}
        {/* Prerequisite status (existing logic) */}
        {renderPrerequisiteStatus()}
      </div>
    </div>
  );
};

export default CourseEditor;
