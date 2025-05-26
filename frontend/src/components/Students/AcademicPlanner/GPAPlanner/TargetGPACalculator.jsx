import React from "react";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";

const TargetGPACalculator = ({
  targetGPA,
  setTargetGPA,
  plannedCredits,
  setPlannedCredits,
  requiredGPA,
  calculateRequiredGPA,
}) => {
  return (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <h4 className="font-medium text-[#1E3A8A] mb-4">Target GPA Calculator</h4>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Desired Target CGPA
          </label>
          <Input
            type="number"
            min="0"
            max="4"
            step="0.1"
            placeholder="e.g. 3.5"
            value={targetGPA}
            onChange={(e) => setTargetGPA(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Planned Future Credits
          </label>
          <Input
            type="number"
            min="0"
            placeholder="e.g. 15"
            value={plannedCredits}
            onChange={(e) => setPlannedCredits(e.target.value)}
          />
        </div>
        <Button
          variant="default"
          className="w-full"
          onClick={calculateRequiredGPA}
        >
          Calculate Required GPA
        </Button>
        {requiredGPA !== null && (
          <RequiredGPAResult
            targetGPA={targetGPA}
            plannedCredits={plannedCredits}
            requiredGPA={requiredGPA}
          />
        )}
      </div>
    </div>
  );
};

const RequiredGPAResult = ({ targetGPA, plannedCredits, requiredGPA }) => (
  <div
    className={`mt-4 p-3 rounded border ${
      requiredGPA > 4.0
        ? "bg-red-50 border-red-200"
        : "bg-[#F0F4FF] border-[#1E3A8A]/20"
    }`}
  >
    <p className="text-sm text-gray-700">
      To reach <span className="font-medium">{targetGPA}</span> after{" "}
      {plannedCredits} more credits, you need an average GPA of{" "}
      <span
        className={`font-bold ${
          requiredGPA > 4.0 ? "text-red-600" : "text-[#1E3A8A]"
        }`}
      >
        {requiredGPA.toFixed(2)}
      </span>{" "}
      in your future courses.
    </p>
    {requiredGPA > 4.0 && (
      <p className="text-red-500 text-sm mt-2">
        Note: This target is mathematically impossible (above 4.0)
      </p>
    )}
  </div>
);

export default TargetGPACalculator;
