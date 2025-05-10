import React from "react";

const CourseEntry = ({
  entry,
  startEditing,
  removeEntry,
  isPastSemester,
  currentYear,
  currentSemester,
}) => {
  const isCurrent =
    entry.year === currentYear && entry.semester === currentSemester;

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4 flex items-center min-w-full">
      <div className="w-full flex items-center">
        <div className="flex-1 grid grid-cols-12 gap-4 items-center">
          <div className="col-span-5">
            <p className="font-medium text-lg">{entry.code}</p>
            <p className="text-md text-gray-600">{entry.name}</p>
          </div>
          <div className="col-span-2">
            <p className="text-md">Credit: {entry.credit}</p>
          </div>
          <div className="col-span-2 flex items-center">
            {(entry.status === "Passed" || entry.status === "Failed") &&
              entry.grade && (
                <span className="text-md">Grade: {entry.grade}</span>
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
    </div>
  );
};

export default CourseEntry;
