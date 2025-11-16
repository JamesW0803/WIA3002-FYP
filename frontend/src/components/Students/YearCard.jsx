import React from "react";
import SemesterCard from "./SemesterCard";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Plus } from "lucide-react";

const YearCard = ({
  yearData,
  planId,
  setPlans,
  plans,
  allCourses,
  completedCoursesByYear,
  isViewMode = false,
}) => {
  const isGapYear = !!yearData.isGapYear;
  const handleAddSemester = () => {
    if (isViewMode || isGapYear) return;

    // Find the plan and year to get current semester count
    const currentPlan = plans.find((p) => p.id === planId);
    const targetYear = currentPlan?.years.find((y) => y.year === yearData.year);
    const count = targetYear?.semesters?.length || 0;

    if (count >= 2) {
      alert("Maximum 2 semesters per year.");
      return;
    }

    const newSemIndex = count + 1;

    const newSemester = {
      id: Date.now(),
      name: `Year ${yearData.year} - Semester ${newSemIndex}`,
      courses: [],
      completed: false,
      _isDraft: true, // <- draft until user confirms
    };

    const updatedPlans = plans.map((p) =>
      p.id === planId
        ? {
            ...p,
            years: p.years.map((y) =>
              y.year === yearData.year
                ? { ...y, semesters: [...y.semesters, newSemester] }
                : y
            ),
          }
        : p
    );

    setPlans(updatedPlans);
  };

  const handleConfirmSemester = (semesterId) => {
    const updatedPlans = plans.map((p) =>
      p.id === planId
        ? {
            ...p,
            years: p.years.map((y) =>
              y.year === yearData.year
                ? {
                    ...y,
                    semesters: y.semesters.map((s) =>
                      s.id === semesterId ? { ...s, _isDraft: false } : s
                    ),
                  }
                : y
            ),
          }
        : p
    );
    setPlans(updatedPlans);
  };

  const handleCancelSemester = (semesterId) => {
    const updatedPlans = plans.map((p) =>
      p.id === planId
        ? {
            ...p,
            years: p.years.map((y) =>
              y.year === yearData.year
                ? {
                    ...y,
                    semesters: y.semesters.filter((s) => s.id !== semesterId),
                  }
                : y
            ),
          }
        : p
    );
    setPlans(updatedPlans);
  };

  return (
    <Card className="bg-gray-50 overflow-visible relative z-0">
      <CardContent className="p-4 relative z-0 overflow-visible">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-medium">
            Year {yearData.year}
            {isGapYear && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                Gap Year
              </span>
            )}
          </h4>
          {!isViewMode && !isGapYear && yearData.semesters.length < 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddSemester}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Semester
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {yearData.semesters.map((semester) => {
            const previousSemesters = yearData.semesters
              .filter((s) => s.name < semester.name)
              .concat(
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
                onConfirmDraft={() => handleConfirmSemester(semester.id)}
                onCancelDraft={() => handleCancelSemester(semester.id)}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default YearCard;
