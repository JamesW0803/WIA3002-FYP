import React, { useState } from "react";

const GapSemesterDialog = ({
  year,
  semester,
  isOpen,
  hasCourses,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-4">
        <h3 className="text-lg font-semibold text-[#1E3A8A]">
          Gap Year {year} • Semester {semester}
        </h3>

        <div className="mt-3 space-y-3 text-sm">
          <p>
            This will mark{" "}
            <strong>
              Year {year} • Semester {semester}
            </strong>{" "}
            as a <strong>Gap Semester</strong>.
          </p>

          {hasCourses ? (
            <p className="text-gray-700">
              <strong>Confirmation:</strong> You have recorded courses in this
              semester. Gapping it will{" "}
              <strong>
                remove all recorded courses in Year {year} • Semester {semester}
              </strong>
              . Do you want to proceed?
            </p>
          ) : (
            <p className="text-gray-600">
              No recorded courses in this semester. Marking it as a Gap Semester
              will take effect immediately.
            </p>
          )}
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm()}
            className="px-4 py-2 rounded-md bg-amber-600 text-white hover:bg-amber-700"
          >
            Yes, Gap Semester
          </button>
        </div>
      </div>
    </div>
  );
};

export default GapSemesterDialog;
