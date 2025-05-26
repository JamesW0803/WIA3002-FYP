import React from "react";

const GPAVisualization = ({ currentGPA, targetGPA, projectedGPA }) => {
  // Helper function to parse GPA values safely
  const parseGPA = (gpa) => Math.min(parseFloat(gpa) || 0, 4);

  return (
    <div className="bg-[#F0F4FF] p-6 rounded-lg border border-[#1E3A8A]/10">
      <h4 className="font-medium text-[#1E3A8A] mb-6">
        GPA Progress Visualization
      </h4>

      <div className="flex">
        {/* Y-axis with labels */}
        <div className="flex flex-col justify-between h-64 pr-2 text-xs text-gray-500">
          {[4.0, 3.0, 2.0, 1.0, 0.0].map((value) => (
            <span key={value}>{value.toFixed(1)}</span>
          ))}
        </div>

        {/* Main chart area */}
        <div className="flex-1 relative">
          {/* Chart container with fixed height */}
          <div className="h-64 relative">
            {/* Horizontal grid lines */}
            {[0, 1, 2, 3, 4].map((gpa) => (
              <div
                key={gpa}
                className="absolute left-0 right-0 border-t border-gray-200"
                style={{ bottom: `${(gpa / 4) * 100}%` }}
              />
            ))}

            {/* X-axis line - placed at the very bottom */}
            <div className="absolute bottom-0 left-0 right-0 border-b-2 border-gray-400"></div>

            {/* Bars container - aligned to x-axis */}
            <div className="absolute bottom-0 left-0 right-0 h-full flex justify-around px-4">
              {/* Current GPA */}
              <div className="flex flex-col items-center h-full">
                <div className="flex flex-col justify-end h-full w-20">
                  {" "}
                  <div
                    className="bg-blue-400 rounded-t-md relative"
                    style={{
                      height: `${(parseGPA(currentGPA) / 4) * 100}%`,
                    }}
                  >
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium">
                      {currentGPA || "0.00"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Projected GPA */}
              <div className="flex flex-col items-center h-full">
                <div className="flex flex-col justify-end h-full w-20">
                  {" "}
                  <div
                    className="bg-blue-500 rounded-t-md relative"
                    style={{
                      height: `${(parseGPA(projectedGPA) / 4) * 100}%`,
                    }}
                  >
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium">
                      {projectedGPA}
                    </div>
                  </div>
                </div>
              </div>

              {/* Target GPA (only shown if provided) */}
              {targetGPA && (
                <div className="flex flex-col items-center h-full">
                  <div className="flex flex-col justify-end h-full w-20">
                    {" "}
                    <div
                      className="bg-blue-600 rounded-t-md relative"
                      style={{
                        height: `${(parseGPA(targetGPA) / 4) * 100}%`,
                      }}
                    >
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium">
                        {targetGPA}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* X-axis labels container - positioned below the chart */}
          <div className="flex justify-around px-4 mt-1">
            <div className="w-16 text-center">
              {" "}
              <p className="text-sm font-medium">Current</p>
            </div>
            <div className="w-16 text-center">
              {" "}
              <p className="text-sm font-medium">Projected</p>
            </div>
            {targetGPA && (
              <div className="w-16 text-center">
                {" "}
                <p className="text-sm font-medium">Target</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* X-axis title */}
      <div className="text-center mt-2 text-sm text-gray-600">
        GPA Categories
      </div>
    </div>
  );
};

export default GPAVisualization;
