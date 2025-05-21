import React from "react";
import SemesterCard from "./SemesterCard";
import { Card, CardContent } from "../../components/ui/card";

const YearCard = ({ yearData, planId, setPlans, plans, allCourses }) => {
  return (
    <Card className="bg-gray-50">
      <CardContent className="p-4">
        <div className="space-y-6">
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
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default YearCard;
