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
  completedCourses,
  completedCoursesByYear,
  isViewMode = false,
}) => {
  const addYear = () => {
    const lastYear = plan.years[plan.years.length - 1].year;
    const newYearNumber = lastYear + 1;
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

    // Remove the year and then renumber years > deleted year (shift down by 1)
    const updatedPlans = plans.map((p) => {
      if (p.id !== plan.id) return p;

      // 1) Filter out the deleted year
      const filtered = p.years.filter((y) => y.year !== yearToDelete);

      // 2) Renumber: any y.year > yearToDelete gets decremented by 1
      const renumbered = filtered.map((y) => {
        const newYearNumber = y.year > yearToDelete ? y.year - 1 : y.year;

        // 3) Rebuild semester names to match the new year number & keep 1 to n order
        const semesters = y.semesters.map((sem, idx) => ({
          ...sem,
          name: `Year ${newYearNumber} - Semester ${idx + 1}`,
        }));

        return { ...y, year: newYearNumber, semesters };
      });

      // 4) Also re-sort by year in case the deleted was not the last one
      renumbered.sort((a, b) => a.year - b.year);

      return { ...p, years: renumbered };
    });

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
    <Card className="bg-white shadow-md overflow-visible relative z-0">
      <CardContent className="p-6 space-y-6 overflow-visible relative z-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold truncate">
              {plan.name}
            </h3>
            <p className="text-sm text-gray-600">
              Total Credits: {totalCredits}
            </p>
          </div>
          {!isViewMode && plan.years.length < 4 && (
            <Button
              variant="outline"
              onClick={addYear}
              className="gap-2 w-full sm:w-auto"
            >
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
                completedCourses={completedCourses}
                completedCoursesByYear={completedCoursesByYear}
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
