import React, { useState } from "react";
import { Card } from "../../ui/card";
import SavedPlanCard from "../SavedPlanCard";
import PlanEditor from "./PlanEditor";
import PlanViewer from "./PlanViewer";
import { Plus } from "lucide-react";
import { generateNewPlanFromStartingPoint } from "../AcademicPlanner/utils/planHelpers";
import axiosClient from "../../../api/axiosClient";

const ProgramPlansSection = ({
  programPlans,
  setProgramPlans,
  tempPlans,
  setTempPlans,
  editingPlan,
  setEditingPlan,
  viewingPlan,
  setViewingPlan,
  isCreatingNew,
  setIsCreatingNew,
  unsavedPlan,
  setUnsavedPlan,
  editSectionRef,
  viewSectionRef,
  scrollToEditSection,
  scrollToViewSection,
  completedCourses,
  allCourses,
  completedCoursesByYear,
  startingPlanPoint,
}) => {
  const [backupPlan, setBackupPlan] = useState(null);
  const addPlan = () => {
    const activePlans = programPlans.filter(
      (plan) => !tempPlans.includes(plan.id)
    );

    if (activePlans.length >= 3) {
      alert("Max 3 plans allowed.");
      return;
    }

    const newPlan = generateNewPlanFromStartingPoint(
      activePlans.length,
      startingPlanPoint
    );

    setUnsavedPlan(newPlan);
    setEditingPlan(newPlan.id);
    setIsCreatingNew(true);
    setTempPlans([...tempPlans, newPlan.id]);
    scrollToEditSection();
  };

  const handleSave = async (updatedPlanData) => {
    try {
      const token = localStorage.getItem("token");
      const planId = editingPlan;

      const totalSemesters = updatedPlanData.years.reduce(
        (total, year) => total + year.semesters.length,
        0
      );
      const totalCredits = updatedPlanData.years.reduce(
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

      // Update the plan data with recalculated values
      const payload = {
        ...updatedPlanData,
        semesters: totalSemesters,
        credits: totalCredits,
      };

      // Send PUT to /academic-plans/plans/:planId
      const res = await axiosClient.put(
        `/academic-plans/plans/${planId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const saved = res.data.data;

      // Merge updated plan into state
      setProgramPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? {
                ...saved,
                id: saved.identifier,
                semesters: totalSemesters,
                credits: totalCredits,
              }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to save plan", err);
      alert(
        `Failed to save plan: ${err.response?.data?.message || err.message}`
      );
    } finally {
      // Exit edit mode
      setEditingPlan(null);
    }
  };

  const handleEditPlan = (plan) => {
    setBackupPlan(plan);
    // if we were in View mode, close it
    setViewingPlan(null);

    // make sure we're in “edit existing,” not “create new”
    setIsCreatingNew(false);

    // open the editor for this plan
    setEditingPlan(plan.id);
    scrollToEditSection();
  };

  const handleViewPlan = (plan) => {
    console.log("Viewing plan:", plan);
    const planId = plan.id;
    console.log("Plan ID:", planId);
    setViewingPlan(planId);
    setEditingPlan(null);
    scrollToViewSection();
  };

  const handleDeletePlan = async (plan) => {
    if (!window.confirm(`Delete plan “${plan.name}”?`)) return;
    try {
      const token = localStorage.getItem("token");
      // call your DELETE /academic-plans/:id
      await axiosClient.delete(`/academic-plans/plans/${plan.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // remove from state
      setProgramPlans(programPlans.filter((p) => p.id !== plan.id));
      // if we were viewing it, close viewer
      if (viewingPlan === plan.id) {
        setViewingPlan(null);
      }
    } catch (err) {
      console.error("Failed to delete plan", err);
      alert("Could not delete plan—please try again.");
    }
  };

  return (
    <>
      {/* Saved Plans Section */}
      <section className="mb-12">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">
          Your Saved Program Plans
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programPlans
            .filter((plan) => !tempPlans.includes(plan.id))
            .map((plan) => (
              <SavedPlanCard
                key={plan.id}
                plan={plan}
                type="program"
                onEdit={() => {
                  handleEditPlan(plan);
                }}
                onDelete={() => {
                  handleDeletePlan(plan);
                }}
                onView={() => handleViewPlan(plan)}
              />
            ))}

          {programPlans.filter((plan) => !tempPlans.includes(plan.id)).length <
            3 && (
            <Card
              className="border-2 border-dashed border-gray-300 hover:border-[#1E3A8A] transition-colors flex flex-col items-center justify-center min-h-[200px] cursor-pointer"
              onClick={addPlan}
            >
              <div className="text-center p-4">
                <Plus className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                <h3 className="font-medium text-gray-700">Create New Plan</h3>
                <p className="text-sm text-gray-500 mt-1">Program schedule</p>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* Edit Section */}
      {editingPlan && (
        <PlanEditor
          plan={programPlans.find((p) => p.id === editingPlan)}
          onCancel={() => setEditingPlan(null)}
          onSave={handleSave}
          allCourses={allCourses}
          completedCourses={completedCourses}
          completedCoursesByYear={completedCoursesByYear}
          editingPlan={editingPlan}
          setEditingPlan={setEditingPlan}
          isCreatingNew={isCreatingNew}
          setIsCreatingNew={setIsCreatingNew}
          unsavedPlan={unsavedPlan}
          setUnsavedPlan={setUnsavedPlan}
          programPlans={programPlans}
          setProgramPlans={setProgramPlans}
          tempPlans={tempPlans}
          setTempPlans={setTempPlans}
          editSectionRef={editSectionRef}
          originalPlan={backupPlan}
          onDiscard={() => {
            if (isCreatingNew) {
              // undo the “new plan” placeholder
              setTempPlans((ts) => ts.filter((id) => id !== editingPlan));
              setUnsavedPlan(null);
            } else {
              // restore the backed-up version
              setProgramPlans((ps) =>
                ps.map((p) => (p.id === editingPlan ? backupPlan : p))
              );
            }
            // close the editor
            setEditingPlan(null);
            setBackupPlan(null);
          }}
        />
      )}

      {/* View Section */}
      {viewingPlan && (
        <PlanViewer
          allCourses={allCourses}
          completedCourses={completedCourses}
          completedCoursesByYear={completedCoursesByYear}
          viewingPlan={viewingPlan}
          setViewingPlan={setViewingPlan}
          setEditingPlan={setEditingPlan}
          programPlans={programPlans}
          scrollToEditSection={scrollToEditSection}
          viewSectionRef={viewSectionRef}
        />
      )}
    </>
  );
};

export default ProgramPlansSection;
