import React from "react";
import { Button } from "../../../ui/button";
import PlanHeaderForm from "./PlanHeaderForm";
import CurrentAcademicStatus from "./CurrentAcademicStatus";
import TargetGPACalculator from "./TargetGPACalculator";
import GPASimulator from "../GPASimulator";
import GPAVisualization from "../GPAVisualization";
import { calculateProjectedGPA } from "../utils/gpaCalculations";

const EditCreateMode = ({
  planTitle,
  setPlanTitle,
  planNotes,
  setPlanNotes,
  currentGPA,
  setCurrentGPA,
  completedCredits,
  setCompletedCredits,
  targetGPA,
  setTargetGPA,
  plannedCredits,
  setPlannedCredits,
  requiredGPA,
  calculateRequiredGPA,
  gpaCourses,
  setGpaCourses,
  onCancel,
  onSave,
  isSaveDisabled,
  isEditMode,
}) => {
  return (
    <>
      <PlanHeaderForm
        planTitle={planTitle}
        setPlanTitle={setPlanTitle}
        planNotes={planNotes}
        setPlanNotes={setPlanNotes}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <CurrentAcademicStatus
          currentGPA={currentGPA}
          setCurrentGPA={setCurrentGPA}
          completedCredits={completedCredits}
          setCompletedCredits={setCompletedCredits}
        />

        <TargetGPACalculator
          targetGPA={targetGPA}
          setTargetGPA={setTargetGPA}
          plannedCredits={plannedCredits}
          setPlannedCredits={setPlannedCredits}
          requiredGPA={requiredGPA}
          calculateRequiredGPA={calculateRequiredGPA}
        />
      </div>

      <GPASimulator
        gpaCourses={gpaCourses}
        setGpaCourses={setGpaCourses}
        currentGPA={currentGPA}
        completedCredits={completedCredits}
      />

      <div className="flex justify-between mb-6">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="default" onClick={onSave} disabled={isSaveDisabled}>
          {isEditMode ? "Update Forecast" : "Save GPA Forecast"}
        </Button>
      </div>

      <GPAVisualization
        currentGPA={currentGPA}
        targetGPA={targetGPA}
        projectedGPA={calculateProjectedGPA(
          currentGPA,
          completedCredits,
          gpaCourses
        )}
      />
    </>
  );
};

export default EditCreateMode;
