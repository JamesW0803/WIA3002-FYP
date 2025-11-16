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
  return (
    <section
      ref={viewSectionRef}
      className="mb-12 bg-white p-6 rounded-xl shadow-sm border border-gray-200"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">
            {programPlans.find((p) => p.id === viewingPlan)?.name}
          </h3>
          {programPlans.find((p) => p.id === viewingPlan)?.notes && (
            <p className="text-gray-600 mt-1">
              {programPlans.find((p) => p.id === viewingPlan)?.notes}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const plan = programPlans.find((p) => p.id === viewingPlan);
              if (plan) {
                setBackupPlan(plan);
              }
              setViewingPlan(null);
              setEditingPlan(viewingPlan); // only one mode stays open
              scrollToEditSection();
            }}
          >
            Edit
          </Button>
          <Button variant="outline" onClick={() => setViewingPlan(null)}>
            Close
          </Button>
        </div>
      </div>

      <PlanCard
        plan={programPlans.find((p) => p.id === viewingPlan)}
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
