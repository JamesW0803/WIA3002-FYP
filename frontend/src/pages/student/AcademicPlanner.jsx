import React, { useState, useRef } from "react";
import { Button } from "../../components/ui/button";
import ProgramPlansSection from "../../components/Students/AcademicPlanner/ProgramPlansSection";
import GPAPlannerSection from "../../components/Students/AcademicPlanner/GPAPlannerSection";
import { COURSES_DATABASE } from "../../constants/courses";
import { Plus } from "lucide-react";
import {
  generateNewPlan,
  canAddNewPlan,
} from "../../components/Students/AcademicPlanner/utils/planHelpers";

const AcademicPlanner = () => {
  const [activeTab, setActiveTab] = useState("program");
  const [editingPlan, setEditingPlan] = useState(null);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [tempPlans, setTempPlans] = useState([]);
  const [unsavedPlan, setUnsavedPlan] = useState(null);

  const editSectionRef = useRef(null);
  const viewSectionRef = useRef(null);

  const addPlan = () => {
    const activePlans = programPlans.filter(
      (plan) => !tempPlans.includes(plan.id)
    );

    if (!canAddNewPlan(programPlans, tempPlans)) {
      alert("Max 3 plans allowed.");
      return;
    }

    setViewingPlan(null);

    const newPlan = generateNewPlan(activePlans.length);
    setUnsavedPlan(newPlan);
    setEditingPlan(newPlan.id);
    setIsCreatingNew(true);
    setTempPlans([...tempPlans, newPlan.id]);
    scrollToEditSection();
  };

  const scrollToEditSection = () => {
    setTimeout(() => {
      editSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const scrollToViewSection = () => {
    setTimeout(() => {
      viewSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Sample saved plans data
  const [programPlans, setProgramPlans] = useState([
    {
      id: 1,
      name: "Plan A - On Time",
      created: "2025-03-12",
      semesters: 8,
      credits: 120,
      notes: "Graduation on time, heavy 6th semester",
      years: [
        {
          year: 1,
          semesters: [
            {
              id: 1,
              name: "Year 1 - Semester 1",
              courses: [
                COURSES_DATABASE.find((c) => c.code === "WIX1001"),
                COURSES_DATABASE.find((c) => c.code === "WIX1002"),
              ],
              completed: false,
            },
            {
              id: 2,
              name: "Year 1 - Semester 2",
              courses: [COURSES_DATABASE.find((c) => c.code === "WIA1002")],
              completed: false,
            },
          ],
        },
      ],
    },
  ]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A]">
            Academic Planner
          </h2>
          <p className="text-gray-600 mt-1">Plan your academic journey</p>
        </div>
        {activeTab === "program" && (
          <Button
            variant="defaultWithIcon"
            className="w-full md:w-auto"
            onClick={addPlan}
          >
            <Plus className="w-4 h-4" />
            Create New Program Plan
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-100 p-1 rounded-lg max-w-md">
        <Button
          variant={activeTab === "program" ? "default" : "ghost"}
          className={`flex-1 ${
            activeTab !== "program" ? "hover:bg-gray-50 text-gray-700" : ""
          }`}
          onClick={() => setActiveTab("program")}
        >
          Program Plans
        </Button>
        <Button
          variant={activeTab === "gpa" ? "default" : "ghost"}
          className={`flex-1 ${
            activeTab !== "gpa" ? "hover:bg-gray-50 text-gray-700" : ""
          }`}
          onClick={() => setActiveTab("gpa")}
        >
          GPA Forecasts
        </Button>
      </div>

      {activeTab === "program" ? (
        <ProgramPlansSection
          programPlans={programPlans}
          setProgramPlans={setProgramPlans}
          tempPlans={tempPlans}
          setTempPlans={setTempPlans}
          editingPlan={editingPlan}
          setEditingPlan={setEditingPlan}
          viewingPlan={viewingPlan}
          setViewingPlan={setViewingPlan}
          isCreatingNew={isCreatingNew}
          setIsCreatingNew={setIsCreatingNew}
          unsavedPlan={unsavedPlan}
          setUnsavedPlan={setUnsavedPlan}
          editSectionRef={editSectionRef}
          viewSectionRef={viewSectionRef}
          scrollToEditSection={scrollToEditSection}
          scrollToViewSection={scrollToViewSection}
        />
      ) : (
        <GPAPlannerSection />
      )}
    </div>
  );
};

export default AcademicPlanner;
