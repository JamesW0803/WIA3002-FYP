import React from "react";
import { Button } from "../../ui/button";
import PlanCard from "../PlanCard";

const PlanViewer = ({
  viewingPlan,
  setViewingPlan,
  setEditingPlan,
  setBackupPlan,
  programPlans,
  scrollToEditSection,
  viewSectionRef,
  allCourses,
  completedCoursesByYear,
}) => {
  // Find the plan object once to use for both details and logic
  const plan = programPlans.find((p) => p.id === viewingPlan);

  if (!plan) return null;

  return (
    <section
      ref={viewSectionRef}
      className="mb-12 bg-white p-6 rounded-xl shadow-sm border border-gray-200"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">
            {plan.name}
          </h3>
          {plan.notes && (
            <p className="text-gray-600 mt-1">
              {plan.notes}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {/* ✅ ONLY show Edit button if the plan is NOT default */}
          {!plan.isDefault && (
            <Button
              variant="outline"
              onClick={() => {
                setBackupPlan(plan);
                setViewingPlan(null);
                setEditingPlan(viewingPlan);
                scrollToEditSection();
              }}
            >
              Edit
            </Button>
          )}
          
          <Button variant="outline" onClick={() => setViewingPlan(null)}>
            Close
          </Button>
        </div>
      </div>

      <PlanCard
        plan={plan}
        setPlans={() => {}}
        plans={programPlans}
        allCourses={allCourses}
        completedCoursesByYear={completedCoursesByYear}
        isViewMode={true}
      />
    </section>
  );
};

export default PlanViewer;