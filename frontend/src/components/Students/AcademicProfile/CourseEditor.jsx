import React, { useEffect, useMemo, useState } from "react";
import CourseListSelector from "./CourseListSelector";
import CourseStatusSelector from "./CourseStatusSelector";
import { TriangleAlert } from "lucide-react";
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
    isFutureSemester,
    isGapSemester,
    checkCoursePrerequisites,
    showNotification,
  } = props;
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
    // disable only if same course appears in the SAME year+semester
    return entries
      .filter((entry) => {
        const sameCourse = entry.code === editingEntry?.code;
        const sameId = entry.id === editingEntry?.id;
        const sameTerm =
          entry.year === editingEntry?.year &&
          entry.semester === editingEntry?.semester;
        return !sameId && sameCourse && sameTerm;
      })
      .map((entry) => entry.code);
  }, [
    entries,
    editingEntry?.id,
    editingEntry?.code,
    editingEntry?.year,
    editingEntry?.semester,
  ]);

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

  const isEarlierTerm = (a, b) =>
    a.year < b.year || (a.year === b.year && a.semester < b.semester);
  const hasPriorExcellentGrade = (courseCode) => {
    return entries.some(
      (e) =>
        e.code === courseCode &&
        e.status === "Passed" &&
        (e.grade === "A" || e.grade === "A+") &&
        isEarlierTerm(
          { year: e.year, semester: e.semester },
          { year, semester }
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
    if (isFutureSemester(year, semester) && editingEntry.status !== "Planned") {
      showNotification(
        "Future semesters can only have status 'Planned'.",
        "error"
      );
      return;
    }

    if (isGapSemester(year, semester)) {
      showNotification(
        `This term is gapped (Year ${year} • Semester ${semester}). Remove the gap to add or modify courses.`,
        "error"
      );
      return;
    }

    // Prevent retake if a prior A or A+ already exists
    if (hasPriorExcellentGrade(editingEntry.code)) {
      showNotification(
        `You already achieved ${editingEntry.code} with grade A/A+. Retakes are not allowed for A or A+.`,
        "error"
      );
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

    // Skip prereqs if explicit retake
    if (!editingEntry.isRetake) {
      const serverCheck = await checkCoursePrerequisites(editingEntry.code, {
        year: editingEntry.year,
        semester: editingEntry.semester,
      });
      if (!serverCheck.allPrerequisitesMet) {
        showNotification(
          `Cannot add ${
            editingEntry.code
          }. Missing prerequisites: ${serverCheck.unmetPrerequisites.join(
            ", "
          )}`,
          "error"
        );
        return;
      }
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
      {isGapSemester(editingEntry.year, editingEntry.semester) && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
          <p className="text-amber-800 text-sm font-medium">
            This term is currently gapped. Remove the gap to modify courses.
          </p>
        </div>
      )}
      {editingEntry?.isRetake && (
        <div className="mb-2 inline-flex items-center px-2 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-medium border border-amber-200">
          Retake
        </div>
      )}
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
            allowRetake={!!editingEntry?.isRetake}
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
                : ["Planned"] // Future
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
              (isFutureSemester(editingEntry.year, editingEntry.semester) &&
                editingEntry.status !== "Planned") ||
              !isOffered ||
              (!editingEntry.isRetake &&
                !prerequisiteCheck.allPrerequisitesMet) ||
              isCheckingPrerequisites ||
              !editingEntry.code ||
              isCourseAlreadyAdded(editingEntry.code, editingEntry?.id) ||
              !editingEntry.status ||
              ((editingEntry.status === "Passed" ||
                editingEntry.status === "Failed") &&
                !editingEntry.grade) ||
              getUnmetLocalPrereqs().length > 0 ||
              (!editingEntry.isRetake && hasSameSemesterPrerequisites())
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
        {editingEntry.code && hasPriorExcellentGrade(editingEntry.code) && (
          <AlertBox variant="error" title="Retake Not Allowed">
            You previously achieved grade <strong>A</strong> or{" "}
            <strong>A+</strong> for this course. Retakes are disabled for A/A+.
          </AlertBox>
        )}
        {isCourseAlreadyAdded(editingEntry.code, editingEntry?.id) && (
          <AlertBox variant="error" title="Duplicate in This Semester">
            This course is already added in{" "}
            <strong>the same year &amp; semester</strong>. Remove the other
            entry or choose a different course.
          </AlertBox>
        )}

        {!isOffered && editingEntry.code && (
          <AlertBox variant="error" title="Not Offered This Semester">
            {editingEntry.code} is not offered in Semester {semester}. Please
            choose a course offered in this semester.
          </AlertBox>
        )}
      </div>
    </div>
  );
};

export default CourseEditor;
