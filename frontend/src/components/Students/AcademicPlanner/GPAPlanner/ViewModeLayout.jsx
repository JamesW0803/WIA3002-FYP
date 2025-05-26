import React from "react";
import { Button } from "../../../ui/button";
import CurrentAcademicStatusView from "./CurrentAcademicStatusView";
import TargetInformationView from "./TargetInformationView";
import CourseListView from "./CourseListView";
import GPAVisualization from "../GPAVisualization";

const ViewModeLayout = ({ plan, onBack, onEdit }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-[#1E3A8A]">{plan.name}</h2>
          {plan.notes && (
            <p className="text-gray-600 mt-2 whitespace-pre-line">
              {plan.notes}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Back to List
          </Button>
          <Button variant="default" onClick={onEdit}>
            Edit Plan
          </Button>
        </div>
      </div>

      <CurrentAcademicStatusView
        currentGPA={plan.currentGPA}
        completedCredits={plan.completedCredits}
      />

      <TargetInformationView
        targetGPA={plan.targetGPA}
        plannedCredits={plan.plannedCredits}
        requiredGPA={plan.requiredGPA}
      />

      {plan.gpaCourses.length > 0 && (
        <CourseListView courses={plan.gpaCourses} />
      )}

      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="font-medium text-lg text-[#1E3A8A] mb-4">
          GPA Projection
        </h3>
        <GPAVisualization
          currentGPA={plan.currentGPA}
          targetGPA={plan.targetGPA}
          projectedGPA={plan.projectedGPA}
        />
      </div>
    </div>
  );
};

export default ViewModeLayout;
