import React, { useEffect, useMemo, useState } from "react";
import CourseListSelector from "./CourseListSelector";
import CourseStatusSelector from "./CourseStatusSelector";
import { TriangleAlert } from "lucide-react";
import { useAcademicProfile } from "../../../hooks/useAcademicProfile";
import GradeSelector from "./GradeSelector";

const CourseEditor = (props) => {
  const {
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
  } = props;

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

  const prerequisiteCodes = useMemo(() => {
    return (selectedCourse?.prerequisites || []).map((pr) =>
      typeof pr === "string" ? pr : pr.course_code
    );
  }, [selectedCourse]);

  const [prerequisiteCheck, setPrerequisiteCheck] = useState({
    hasPrerequisites: false,
    unmetPrerequisites: [],
    allPrerequisitesMet: true,
    requiredCourses: [],
    sameTermConflict: false,
  });

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

      const localMissing = prerequisiteCodes.filter((code) => {
        return !entries.some(
          (e) =>
            e.code === code &&
            e.status === "Passed" &&
            (e.year < year || (e.year === year && e.semester < semester))
        );
      });

      const serverCheck = await checkCoursePrerequisites(editingEntry.code, {
        year: editingEntry.year,
        semester: editingEntry.semester,
      });

      const combined = Array.from(
        new Set([...localMissing, ...serverCheck.unmetPrerequisites])
      );

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
    <div className="bg-white p-4 rounded-lg shadow-md mb-4 border border-gray-200 overflow-visible relative z-40">
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

      {/* responsive grid: 1 col (mobile) → 2 cols (md) → 6 cols (lg) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
        <div className="lg:col-span-2">
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

        <div className="relative z-20">
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
            <GradeSelector
              status={editingEntry.status}
              grade={editingEntry.grade}
              gradeOptions={gradeOptions}
              onChange={(g) => setEditingEntry({ ...editingEntry, grade: g })}
            />
          </div>
        )}

        {/* Buttons: full width on mobile; side-by-side from md+ */}
        <div className="lg:col-span-2 flex flex-col sm:flex-row gap-2 w-full relative z-10">
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

      {/* Alerts below the grid, with wider max width on larger screens */}
      <div className="mt-3 lg:max-w-md">
        {isCourseAlreadyAdded(editingEntry.code, editingEntry?.id) && (
          <AlertBox variant="error" title="Duplicate Course">
            This course has already been taken in another semester/year.
          </AlertBox>
        )}

        {!isOffered && editingEntry.code && (
          <AlertBox variant="error" title="Not Offered This Semester">
            {editingEntry.code} is not offered in Semester {semester}. Please
            choose a course offered in this semester.
          </AlertBox>
        )}

        {/* Prereq rendering stays as before */}
        {/* Move your renderPrerequisiteStatus() content here if you want; keeping your logic */}
      </div>
    </div>
  );
};

export default CourseEditor;
