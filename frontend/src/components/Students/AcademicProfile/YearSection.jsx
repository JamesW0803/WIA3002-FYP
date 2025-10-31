import React from "react";
import SemesterSection from "./SemesterSection";

const YearSection = (props) => {
  const { year } = props;
  return (
    <div key={year} className="mb-6 sm:mb-8">
      <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-[#1E3A8A] border-b pb-2">
        Year {year}
      </h3>

      {[1, 2].map((semester) => (
        <SemesterSection key={semester} {...props} semester={semester} />
      ))}
    </div>
  );
};

export default YearSection;
