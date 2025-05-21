import React from "react";
import YearCard from "./YearCard";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

const PlanCard = ({
  plan,
  plans,
  setPlans,
  allCourses,
  onAddYear,
  onDeleteYear,
}) => {
  const totalCredits = plan.years.reduce(
    (total, year) =>
      total +
      year.semesters.reduce(
        (sum, semester) =>
          sum +
          semester.courses.reduce(
            (courseSum, course) => courseSum + (course?.credit || 0),
            0
          ),
        0
      ),
    0
  );

  return (
    <Card className="bg-white shadow-md">
      <CardContent className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold">{plan.name}</h3>
            <p className="text-sm text-gray-600">
              Total Credits: {totalCredits}
            </p>
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={onAddYear}
              disabled={plan.years.length >= 4}
            >
              Add Year
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {plan.years.map((yearData) => (
            <div key={yearData.year} className="relative">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium">Year {yearData.year}</h4>
                {plan.years.length > 1 && (
                  <button
                    onClick={() => onDeleteYear(yearData.year)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete Year
                  </button>
                )}
              </div>
              <YearCard
                yearData={yearData}
                planId={plan.id}
                setPlans={setPlans}
                plans={plans}
                allCourses={allCourses}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanCard;
