import React from "react";

const TargetInformationView = ({ targetGPA, plannedCredits, requiredGPA }) => (
  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
    <h3 className="font-medium text-lg text-[#1E3A8A] mb-4">
      Target Information
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p className="text-sm font-medium text-gray-500">Target GPA</p>
        <p className="text-xl font-semibold">{targetGPA}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">Planned Credits</p>
        <p className="text-xl font-semibold">{plannedCredits}</p>
      </div>
      {requiredGPA && (
        <div className="md:col-span-2">
          <p className="text-sm font-medium text-gray-500">
            Required GPA in Future Courses
          </p>
          <p
            className={`text-xl font-semibold ${
              requiredGPA > 4.0 ? "text-red-600" : "text-[#1E3A8A]"
            }`}
          >
            {requiredGPA.toFixed(2)}
            {requiredGPA > 4.0 && (
              <span className="text-sm text-red-500 ml-2">
                (Impossible target)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  </div>
);

export default TargetInformationView;
