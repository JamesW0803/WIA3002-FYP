import React from "react";
import SemesterCard from "./SemesterCard";
import { Card, CardContent } from "../../components/ui/card";

const YearCard = ({
  yearData,
  planId,
  setPlans,
  plans,
  allCourses,
  completedCoursesByYear,
  isViewMode = false,
}) => {
  // YearCard.jsx (replace the return block)
  return (
    <Card className="bg-gray-50 overflow-visible relative z-0">
      <CardContent className="p-4 relative z-0 overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {yearData.semesters.map((semester, index) => {
            const previousSemesters = yearData.semesters.slice(0, index).concat(
              plans
                .find((p) => p.id === planId)
                ?.years?.filter((y) => y.year < yearData.year)
                ?.flatMap((y) => y.semesters) || []
            );

            return (
              <SemesterCard
                key={semester.id}
                semester={semester}
                planId={planId}
                year={yearData.year}
                setPlans={setPlans}
                plans={plans}
                allCourses={allCourses}
                previousSemesters={previousSemesters}
                completedCoursesByYear={completedCoursesByYear}
                isViewMode={isViewMode}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default YearCard;
