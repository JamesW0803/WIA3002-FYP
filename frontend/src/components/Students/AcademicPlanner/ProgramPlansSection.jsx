import React from "react";
import { Card } from "../../ui/card";
import SavedPlanCard from "../SavedPlanCard";
import PlanEditor from "./PlanEditor";
import PlanViewer from "./PlanViewer";
import { Plus } from "lucide-react";

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
}) => {
  const addPlan = () => {
    const activePlans = programPlans.filter(
      (plan) => !tempPlans.includes(plan.id)
    );

    if (activePlans.length >= 3) {
      alert("Max 3 plans allowed.");
      return;
    }

    const newPlan = {
      id: Date.now(),
      name: `Plan ${String.fromCharCode(65 + activePlans.length)}`,
      created: new Date().toISOString().split("T")[0],
      semesters: 8,
      credits: 0,
      notes: "",
      years: [
        {
          year: 1,
          semesters: [
            {
              id: Date.now(),
              name: "Year 1 - Semester 1",
              courses: [],
              completed: false,
            },
            {
              id: Date.now() + 1,
              name: "Year 1 - Semester 2",
              courses: [],
              completed: false,
            },
          ],
        },
      ],
    };

    setUnsavedPlan(newPlan);
    setEditingPlan(newPlan.id);
    setIsCreatingNew(true);
    setTempPlans([...tempPlans, newPlan.id]);
    scrollToEditSection();
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan.id);
    setViewingPlan(null);
    setIsCreatingNew(false);
    scrollToEditSection();
  };

  const handleViewPlan = (plan) => {
    setViewingPlan(plan.id);
    setEditingPlan(null);
    scrollToViewSection();
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
                onEdit={() => handleEditPlan(plan)}
                onDelete={() => {
                  if (window.confirm(`Delete ${plan.name}?`)) {
                    setProgramPlans(
                      programPlans.filter((p) => p.id !== plan.id)
                    );
                    if (viewingPlan === plan.id) {
                      setViewingPlan(null);
                    }
                  }
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
        />
      )}

      {/* View Section */}
      {viewingPlan && (
        <PlanViewer
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
