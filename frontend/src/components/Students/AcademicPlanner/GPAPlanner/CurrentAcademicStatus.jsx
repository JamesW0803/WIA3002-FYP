import React from "react";
import { Input } from "../../../ui/input";

const CurrentAcademicStatus = ({
  currentGPA,
  setCurrentGPA,
  completedCredits,
  setCompletedCredits,
}) => {
  return (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <h4 className="font-medium text-[#1E3A8A] mb-4">
        Current Academic Status
      </h4>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Cumulative GPA <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min="0"
            max="4"
            step="0.01"
            placeholder="e.g. 3.25"
            value={currentGPA}
            onChange={(e) => setCurrentGPA(e.target.value)}
            disabled={true}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Credits Completed <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min="0"
            placeholder="e.g. 45"
            value={completedCredits}
            onChange={(e) => setCompletedCredits(e.target.value)}
            disabled={true}
          />
        </div>
      </div>
    </div>
  );
};

export default CurrentAcademicStatus;
