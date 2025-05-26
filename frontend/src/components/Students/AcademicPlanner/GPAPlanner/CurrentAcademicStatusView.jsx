import React from "react";

const CurrentAcademicStatusView = ({ currentGPA, completedCredits }) => (
  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
    <h3 className="font-medium text-lg text-[#1E3A8A] mb-4">
      Current Academic Status
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p className="text-sm font-medium text-gray-500">Current GPA</p>
        <p className="text-xl font-semibold">{currentGPA}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">Completed Credits</p>
        <p className="text-xl font-semibold">{completedCredits}</p>
      </div>
    </div>
  </div>
);

export default CurrentAcademicStatusView;
