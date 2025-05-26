import React from "react";
import YearCard from "./YearCard";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Plus } from "lucide-react";

const PlanCard = ({
  plan,
  plans,
  setPlans,
  allCourses,
  isViewMode = false,
}) => {
  const addYear = () => {
    const newYearNumber = plan.years.length + 1;
    const newYear = {
      year: newYearNumber,
      semesters: [
        {
          id: Date.now(),
          name: `Year ${newYearNumber} - Semester 1`,
          courses: [],
          completed: false,
        },
        {
          id: Date.now() + 1,
          name: `Year ${newYearNumber} - Semester 2`,
          courses: [],
          completed: false,
        },
      ],
    };

    const updatedPlans = plans.map((p) =>
      p.id === plan.id
        ? {
            ...p,
            years: [...p.years, newYear],
          }
        : p
    );
    setPlans(updatedPlans);
  };

  const deleteYear = (yearToDelete) => {
    if (plan.years.length <= 1) {
      alert("Cannot delete the only remaining year");
      return;
    }

    const updatedPlans = plans.map((p) =>
      p.id === plan.id
        ? {
            ...p,
            years: p.years.filter((y) => y.year !== yearToDelete),
          }
        : p
    );
    setPlans(updatedPlans);
  };

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
          {!isViewMode && plan.years.length < 4 && (
            <Button variant="outline" onClick={addYear} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Year
            </Button>
          )}
        </div>

        <div className="space-y-8">
          {plan.years.map((yearData) => (
            <div key={yearData.year} className="relative">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium">Year {yearData.year}</h4>
                {!isViewMode && plan.years.length > 1 && (
                  <button
                    onClick={() => deleteYear(yearData.year)}
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
                isViewMode={isViewMode}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanCard;
