import React from "react";

const CourseEntry = ({
  entry,
  startEditing,
  removeEntry,
  currentYear,
  currentSemester,
}) => {
  const isCurrent =
    entry.year === currentYear && entry.semester === currentSemester;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center">
        {/* Left: title & meta */}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-base sm:text-lg">{entry.code}</p>
            <span
              className={`px-2 py-0.5 rounded-full text-xs sm:text-sm ${
                entry.status === "Passed"
                  ? "bg-green-100 text-green-800"
                  : entry.status === "Failed"
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {entry.status}
            </span>
            {entry.isRetake && (
              <span className="inline-block bg-yellow-200 text-yellow-800 text-[11px] font-semibold px-2 py-0.5 rounded">
                Retake
              </span>
            )}
          </div>
          <p className="text-sm sm:text-base text-gray-700 mt-0.5">
            {entry.name}
          </p>

          <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-gray-600 mt-2">
            <span>Credit: {entry.credit}</span>
            {(entry.status === "Passed" || entry.status === "Failed") &&
              entry.grade && <span>Grade: {entry.grade}</span>}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex gap-3 sm:gap-4 sm:ml-6">
          <button
            type="button"
            onClick={() => startEditing(entry.id)}
            className="text-blue-600 hover:text-blue-800 text-sm sm:text-base"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => removeEntry(entry.id)}
            className="text-red-600 hover:text-red-800 text-sm sm:text-base"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseEntry;
