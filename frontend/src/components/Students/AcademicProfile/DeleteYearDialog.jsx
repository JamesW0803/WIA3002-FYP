import React, { useState } from "react";

const DeleteYearDialog = ({ year, isOpen, onClose, onConfirm }) => {
  const [mode, setMode] = useState("clearOnly"); // "clearOnly" | "clearAndDelete"

  if (!isOpen) return null;

  const cannotDeleteCoreYears = year <= 4;
  const deletingDisabled = cannotDeleteCoreYears;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-4">
        <h3 className="text-lg font-semibold text-[#1E3A8A]">
          Delete Year {year}
        </h3>

        <div className="mt-3 space-y-3 text-sm">
          <p className="text-gray-700">
            Choose what to do with the recorded courses in{" "}
            <strong>Year {year}</strong>.
          </p>

          <label className="flex items-start gap-2 p-2 rounded border">
            <input
              type="radio"
              name="mode"
              value="clearOnly"
              checked={mode === "clearOnly"}
              onChange={() => setMode("clearOnly")}
            />
            <div>
              <div className="font-medium">Remove courses only</div>
              <div className="text-xs text-gray-600">
                All recorded courses in Year {year} will be removed. The year
                remains.
              </div>
            </div>
          </label>

          <label
            className={`flex items-start gap-2 p-2 rounded border ${
              deletingDisabled ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            <input
              type="radio"
              name="mode"
              value="clearAndDelete"
              disabled={deletingDisabled}
              checked={mode === "clearAndDelete"}
              onChange={() => setMode("clearAndDelete")}
            />
            <div>
              <div className="font-medium">
                Remove courses and delete the year
                {deletingDisabled && (
                  <span className="ml-2 text-xs text-amber-700">
                    (Years 1–4 cannot be deleted)
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600">
                Deletes all courses in Year {year} and removes the year from
                your plan.
              </div>
            </div>
          </label>
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ mode })}
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteYearDialog;
