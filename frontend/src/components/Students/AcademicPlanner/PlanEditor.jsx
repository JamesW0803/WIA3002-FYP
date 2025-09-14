import React from "react";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { X } from "lucide-react";
import PlanCard from "../PlanCard";
import axiosClient from "../../../api/axiosClient";

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
  completedCourses,
  allCourses,
  completedCoursesByYear,
  originalPlan,
  onDiscard,
}) => {
  // if we're building a brand-new plan, drive PlanCard from unsavedPlan;
  // otherwise use the saved programPlans array
  const cardPlans = isCreatingNew ? [unsavedPlan] : programPlans;
  const cardSetPlans = isCreatingNew
    ? (newPlansArray) => setUnsavedPlan(newPlansArray[0])
    : setProgramPlans;

  // save (POST or PUT) handler
  const savePlan = async () => {
    const token = localStorage.getItem("token");
    const studentId = localStorage.getItem("userId");
    const planId = editingPlan;
    const payload = isCreatingNew
      ? unsavedPlan
      : programPlans.find((p) => p.id === planId);
    if (isCreatingNew) delete payload.id;

    const totalSemesters = payload.years.reduce(
      (total, year) => total + year.semesters.length,
      0
    );
    const totalCredits = payload.years.reduce(
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

    // Update payload with calculated values
    const updatedPayload = {
      ...payload,
      semesters: totalSemesters,
      credits: totalCredits,
    };

    const endpoint = isCreatingNew
      ? `/academic-plans/students/${studentId}/plans`
      : `/academic-plans/plans/${planId}`;
    const method = isCreatingNew ? "post" : "put";
    try {
      const response = await axiosClient[method](endpoint, updatedPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const saved = response.data.data;

      if (isCreatingNew) {
        setProgramPlans([
          ...programPlans,
          {
            ...saved,
            id: saved.identifier,
            semesters: totalSemesters,
            credits: totalCredits,
          },
        ]);
      } else {
        setProgramPlans(
          programPlans.map((p) =>
            p.id === editingPlan
              ? {
                  ...saved,
                  id: saved.identifier,
                  semesters: totalSemesters,
                  credits: totalCredits,
                }
              : p
          )
        );
      }

      setTempPlans(tempPlans.filter((id) => id !== editingPlan));
      setUnsavedPlan(null);
      setEditingPlan(null);
      setIsCreatingNew(false);
    } catch (error) {
      console.error("Failed to save plan", error);
      alert(
        `Failed to save plan: ${error.response?.data?.message || error.message}`
      );
    }
  };

  // name change handler
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

  // notes change handler
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
      className="mb-12 bg-white p-6 rounded-xl shadow-sm border border-[#1E3A8A]/20 overflow-visible relative z-0"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-xl font-semibold text-[#1E3A8A]">
          {isCreatingNew ? "Create New Program Plan" : "Edit Program Plan"}
        </h3>
        <Button variant="outline" onClick={onDiscard} className="gap-2">
          <X className="w-4 h-4" />
          Cancel
        </Button>
      </div>

      {/* Inputs */}
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

      {/* Plan preview/editor */}
      <PlanCard
        plan={
          isCreatingNew
            ? unsavedPlan
            : programPlans.find((p) => p.id === editingPlan)
        }
        setPlans={cardSetPlans}
        plans={cardPlans}
        allCourses={allCourses}
        isViewMode={false}
        completedCourses={completedCourses}
        completedCoursesByYear={completedCoursesByYear}
      />

      {/* Actions */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
        <Button variant="outline" onClick={onDiscard}>
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
