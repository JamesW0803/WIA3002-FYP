import React from "react";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { COURSES_DATABASE } from "../../../constants/courses";
import { X } from "lucide-react";
import PlanCard from "../PlanCard";

const PlanEditor = ({
  editingPlan,
  setEditingPlan,
  isCreatingNew,
  setIsCreatingNew,
  unsavedPlan,
  setUnsavedPlan,
  programPlans,
  setProgramPlans,
  tempPlans,
  setTempPlans,
  editSectionRef,
}) => {
  const savePlan = () => {
    if (isCreatingNew && unsavedPlan) {
      setProgramPlans([...programPlans, unsavedPlan]);
    }

    setTempPlans(tempPlans.filter((id) => id !== editingPlan));
    setUnsavedPlan(null);
    setEditingPlan(null);
    setIsCreatingNew(false);
  };

  const handlePlanNameChange = (e) => {
    const newName = e.target.value;
    if (isCreatingNew) {
      setUnsavedPlan((prev) => (prev ? { ...prev, name: newName } : null));
    } else {
      setProgramPlans(
        programPlans.map((plan) =>
          plan.id === editingPlan ? { ...plan, name: newName } : plan
        )
      );
    }
  };

  const handlePlanNotesChange = (e) => {
    const newNotes = e.target.value;
    if (isCreatingNew) {
      setUnsavedPlan((prev) => (prev ? { ...prev, notes: newNotes } : null));
    } else {
      setProgramPlans(
        programPlans.map((plan) =>
          plan.id === editingPlan ? { ...plan, notes: newNotes } : plan
        )
      );
    }
  };

  return (
    <section
      ref={editSectionRef}
      className="mb-12 bg-white p-6 rounded-xl shadow-sm border border-[#1E3A8A]/20"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-xl font-semibold text-[#1E3A8A]">
          {isCreatingNew ? "Create New Program Plan" : "Edit Program Plan"}
        </h3>
        <Button
          variant="outline"
          onClick={() => {
            if (isCreatingNew) {
              setTempPlans(tempPlans.filter((id) => id !== editingPlan));
              setUnsavedPlan(null);
            }
            setEditingPlan(null);
          }}
          className="gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </Button>
      </div>

      {/* Input Fields */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1E3A8A] mb-2">
            Plan Name
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:border-[#1E3A8A]"
            value={
              isCreatingNew
                ? unsavedPlan?.name || ""
                : programPlans.find((p) => p.id === editingPlan)?.name || ""
            }
            onChange={handlePlanNameChange}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <Textarea
            className="w-full"
            value={
              isCreatingNew
                ? unsavedPlan?.notes || ""
                : programPlans.find((p) => p.id === editingPlan)?.notes || ""
            }
            onChange={handlePlanNotesChange}
            placeholder="Add any notes about this plan..."
          />
        </div>
      </div>

      <PlanCard
        plan={
          isCreatingNew
            ? unsavedPlan
            : programPlans.find((p) => p.id === editingPlan)
        }
        setPlans={setProgramPlans}
        plans={programPlans}
        allCourses={COURSES_DATABASE}
        isViewMode={false}
      />

      <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => {
            if (isCreatingNew) {
              setTempPlans(tempPlans.filter((id) => id !== editingPlan));
              setUnsavedPlan(null);
            }
            setEditingPlan(null);
          }}
        >
          Discard Changes
        </Button>
        <Button variant="default" onClick={savePlan}>
          Save Plan
        </Button>
      </div>
    </section>
  );
};

export default PlanEditor;
