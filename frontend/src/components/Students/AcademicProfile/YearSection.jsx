import React, { useState } from "react";
import SemesterSection from "./SemesterSection";
import DeleteYearDialog from "./DeleteYearDialog";
import GapYearDialog from "./GapYearDialog";

const YearSection = (props) => {
  const {
    year,
    onToggleCollapse,
    isCollapsed,
    entries,
    deleteYear,
    studentYear,
    isGapYear,
    requestGapYear,
    isFutureSemester,
    isGapSemester,
    requestGapSemester,
    checkCoursePrerequisites,
    showNotification,
    toggleGapYear,
    toggleGapSemester,
  } = props;
  const gappedYear = isGapYear(year);
  const [openDelete, setOpenDelete] = useState(false);
  const [openGap, setOpenGap] = useState(false);

  const isCurrentYear = studentYear === year;
  const hasCourses = entries.some((e) => e.year === year);

  return (
    <div key={year} data-year={year} className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-[#1E3A8A] border-b pb-2">
          Year {year}
        </h3>
        <div className="flex items-center gap-3">
          {gappedYear && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Gap Year
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              if (gappedYear) {
                // Ungap immediately
                toggleGapYear(year);
              } else {
                // Gap flow with dialog (move/remove)
                setOpenGap(true);
              }
            }}
            className="text-sm text-amber-700 hover:text-amber-900"
            title="Gap this whole year"
          >
            {gappedYear ? "Ungap Year" : "Gap Year"}
          </button>
          <button
            type="button"
            onClick={() => onToggleCollapse(year)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isCollapsed ? "Expand" : "Collapse"}
          </button>
          <button
            type="button"
            onClick={() => setOpenDelete(true)}
            className="text-sm text-red-600 hover:text-red-800"
            title="Delete this year"
          >
            Delete
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {[1, 2].map((semester) => (
            <SemesterSection
              key={semester}
              {...props}
              semester={semester}
              isFutureSemester={isFutureSemester}
              isGapSemester={isGapSemester}
              isGapYear={isGapYear}
              requestGapSemester={requestGapSemester}
              checkCoursePrerequisites={checkCoursePrerequisites}
              showNotification={showNotification}
              toggleGapSemester={toggleGapSemester}
            />
          ))}
        </>
      )}

      <DeleteYearDialog
        year={year}
        isOpen={openDelete}
        onClose={() => setOpenDelete(false)}
        onConfirm={({ mode }) => {
          console.log("[YearSection] DeleteYear onConfirm", { year, mode });
          deleteYear(year, { mode });
          setOpenDelete(false);
        }}
      />

      <GapYearDialog
        year={year}
        isOpen={openGap}
        hasCourses={hasCourses}
        onClose={() => setOpenGap(false)}
        onConfirm={() => {
          console.log("[YearSection] GapYear onConfirm", {
            year,
            gappedYear,
          });
          // NOTE: You show "Ungap Year" but do not toggle here.
          // If you *do* want to ungap when already gapped, uncomment:
          // if (gappedYear) { toggleGapYear(year); setOpenGap(false); return; }
          requestGapYear(year);
          setOpenGap(false);
        }}
      />
    </div>
  );
};

export default YearSection;
