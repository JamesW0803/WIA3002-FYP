import React from "react";

const Onboarding = ({ completeOnboarding }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 text-center max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold text-[#1E3A8A] mb-4">
        Welcome to Your Academic Profile!
      </h3>
      <p className="text-gray-600 mb-6">
        Let's get started by adding your first course. We'll begin with
        <span className="font-semibold"> Year 1 Semester 1</span>.
      </p>

      <div className="flex flex-col items-center space-y-4 mb-6">
        <div className="w-full max-w-md bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Tip:</span> Start with your most
            recent completed semester. You can add more courses later.
          </p>
        </div>
      </div>

      <button
        onClick={completeOnboarding}
        className="bg-[#1E3A8A] text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
      >
        Add My First Course
      </button>
    </div>
  );
};

export default Onboarding;
