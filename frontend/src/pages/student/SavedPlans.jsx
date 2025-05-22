import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import SavedPlanCard from "../../components/Students/SavedPlanCard";
import { Plus } from "lucide-react";

const SavedPlans = () => {
  const [activeTab, setActiveTab] = useState("program");

  const programPlans = [
    {
      id: 1,
      name: "Plan A - On Time",
      created: "2025-03-12",
      semesters: 8,
      credits: 120,
      notes: "Graduation on time, heavy 6th semester",
    },
    {
      id: 2,
      name: "Plan B - Light Load",
      created: "2025-04-02",
      semesters: 9,
      credits: 120,
      notes: "Less stress, delayed by 1 semester",
    },
  ];

  const gpaPlans = [
    {
      id: 101,
      name: "GPA Boost Plan",
      created: "2025-03-25",
      gpaTarget: 3.8,
      currentGPA: 3.2,
      terms: 3,
      notes: "Assumes A grades in next 4 subjects",
    },
  ];

  const plans = activeTab === "program" ? programPlans : gpaPlans;

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-[#1E3A8A]">Saved Plans</h2>
        <Button variant="default" className="hidden md:flex gap-2">
          <Plus className="w-4 h-4" />
          Create New {activeTab === "program" ? "Program Plan" : "GPA Plan"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === "program" ? "default" : "ghost"}
          className={`flex-1 ${
            activeTab !== "program" ? "bg-transparent hover:bg-gray-200" : ""
          }`}
          onClick={() => setActiveTab("program")}
        >
          Program Plans
        </Button>
        <Button
          variant={activeTab === "gpa" ? "default" : "ghost"}
          className={`flex-1 ${
            activeTab !== "gpa" ? "bg-transparent hover:bg-gray-200" : ""
          }`}
          onClick={() => setActiveTab("gpa")}
        >
          GPA Forecasts
        </Button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <SavedPlanCard
            key={plan.id}
            plan={plan}
            type={activeTab}
            onEdit={() => alert(`Edit ${plan.name}`)}
            onDelete={() => alert(`Delete ${plan.name}`)}
            onView={() => alert(`Viewing ${plan.name}`)}
          />
        ))}

        {/* Add New Card */}
        <Card className="border-2 border-dashed border-gray-300 hover:border-[#1E3A8A] transition-colors flex flex-col items-center justify-center min-h-[200px] cursor-pointer">
          <div className="text-center p-4">
            <Plus className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <h3 className="font-medium text-gray-700">Create New Plan</h3>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === "program" ? "Program schedule" : "GPA forecast"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SavedPlans;
