import React, { useState, useEffect, useRef } from "react";
import Notification from "../Notification";
import { gradePointsMap } from "./utils/gpaCalculations";
import GPATipsSection from "./GPAPlanner/GPATipsSection";
import PlansListView from "./GPAPlanner/PlansListView";
import EditCreateMode from "./GPAPlanner/EditCreateMode";
import ViewModeLayout from "./GPAPlanner/ViewModeLayout";

const GPAPlannerSection = () => {
  const [notification, setNotification] = useState(null);
  const [currentGPA, setCurrentGPA] = useState("");
  const [completedCredits, setCompletedCredits] = useState("");
  const [targetGPA, setTargetGPA] = useState("");
  const [plannedCredits, setPlannedCredits] = useState("");
  const [requiredGPA, setRequiredGPA] = useState(null);
  const [gpaCourses, setGpaCourses] = useState([
    { name: "", credit: "", grade: "" },
  ]);
  const [gpaForecasts, setGpaForecasts] = useState([]);
  const [planTitle, setPlanTitle] = useState("");
  const [planNotes, setPlanNotes] = useState("");
  const [mode, setMode] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  const formRef = useRef(null);

  useEffect(() => {
    if (mode !== "list" && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [mode]);

  const showNotification = (title, description, type = "info") => {
    setNotification({ title, description, type });
  };

  const hideNotification = () => {
    setNotification(null);
  };

  const calculateRequiredGPA = () => {
    if (!currentGPA || !completedCredits || !targetGPA || !plannedCredits)
      return;

    const currentPoints = parseFloat(currentGPA) * parseFloat(completedCredits);
    const totalCredits =
      parseFloat(completedCredits) + parseFloat(plannedCredits);
    const requiredPoints = parseFloat(targetGPA) * totalCredits - currentPoints;
    const required = requiredPoints / parseFloat(plannedCredits);

    setRequiredGPA(required);
    return required;
  };

  const calculateProjectedGPA = () => {
    if (!currentGPA || !completedCredits || gpaCourses.length === 0)
      return "0.00";

    const currentPoints = parseFloat(currentGPA) * parseFloat(completedCredits);
    let newPoints = 0;
    let newCredits = 0;

    gpaCourses.forEach(({ credit, grade }) => {
      const creditVal = parseFloat(credit);
      const point = gradePointsMap[grade];
      if (!isNaN(creditVal)) {
        newCredits += creditVal;
        newPoints += creditVal * (point || 0);
      }
    });

    if (newCredits === 0) return "0.00";

    const totalPoints = currentPoints + newPoints;
    const totalCredits = parseFloat(completedCredits) + newCredits;
    return (totalPoints / totalCredits).toFixed(2);
  };

  const saveGpaForecast = () => {
    // Validate required fields
    if (!currentGPA || !completedCredits || !planTitle.trim()) {
      showNotification(
        "Missing Data",
        "Please fill all required fields",
        "error"
      );
      return;
    }

    const required = calculateRequiredGPA();
    if (required > 4.0) {
      showNotification(
        "Impossible Target",
        "Required GPA is above 4.0",
        "error"
      );
      return;
    }

    const newForecast = {
      id: mode === "edit" ? editingId : Date.now(),
      name: planTitle,
      created: new Date().toISOString().split("T")[0],
      type: "gpa",
      currentGPA,
      completedCredits,
      targetGPA,
      plannedCredits,
      requiredGPA: required,
      gpaCourses,
      projectedGPA: calculateProjectedGPA(),
      notes: planNotes,
    };

    setGpaForecasts((prev) => {
      const updated =
        mode === "edit"
          ? prev.map((f) => (f.id === editingId ? newForecast : f))
          : [...prev, newForecast];
      return updated;
    });

    showNotification(
      mode === "edit" ? "Updated" : "Saved",
      `Forecast ${mode === "edit" ? "updated" : "saved"} successfully`,
      "success"
    );

    // Reset to list view after saving
    setMode("list");
    resetForm();
  };

  const resetForm = () => {
    setCurrentGPA("");
    setCompletedCredits("");
    setTargetGPA("");
    setPlannedCredits("");
    setRequiredGPA(null);
    setGpaCourses([{ name: "", credit: "", grade: "" }]);
    setPlanTitle("");
    setPlanNotes("");
    setEditingId(null);
    setViewingId(null);
  };

  const loadForecastForEdit = (forecast) => {
    setCurrentGPA(forecast.currentGPA);
    setCompletedCredits(forecast.completedCredits);
    setTargetGPA(forecast.targetGPA);
    setPlannedCredits(forecast.plannedCredits);
    setRequiredGPA(forecast.requiredGPA);
    setGpaCourses(forecast.gpaCourses);
    setPlanTitle(forecast.name);
    setPlanNotes(forecast.notes);
    setEditingId(forecast.id);
    setMode("edit");
  };

  const loadForecastForView = (forecast) => {
    setCurrentGPA(forecast.currentGPA);
    setCompletedCredits(forecast.completedCredits);
    setTargetGPA(forecast.targetGPA);
    setPlannedCredits(forecast.plannedCredits);
    setRequiredGPA(forecast.requiredGPA);
    setGpaCourses(forecast.gpaCourses);
    setPlanTitle(forecast.name);
    setPlanNotes(forecast.notes);
    setViewingId(forecast.id);
    setMode("view");
  };

  const startNewForecast = () => {
    resetForm();
    setPlanTitle(`New GPA Forecast ${gpaForecasts.length + 1}`);
    setMode("create");
  };

  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-[#1E3A8A]/20">
      {notification && (
        <Notification
          title={notification.title}
          message={notification.description}
          type={notification.type}
          onClose={hideNotification}
        />
      )}
      <h3 className="text-xl font-semibold mb-6 text-[#1E3A8A]">
        GPA Simulator & Planner
      </h3>

      {/* LIST VIEW - Show saved plans and create new option */}
      <PlansListView
        gpaForecasts={gpaForecasts}
        onView={loadForecastForView}
        onEdit={loadForecastForEdit}
        onDelete={(id) => {
          setGpaForecasts(gpaForecasts.filter((f) => f.id !== id));
          showNotification(
            "Forecast Deleted",
            "Your GPA forecast has been removed.",
            "error"
          );
        }}
        onCreateNew={startNewForecast}
      />

      {/* CREATE/EDIT VIEW - Form for creating or editing a forecast */}
      {(mode === "create" || mode === "edit" || mode === "view") && (
        <div ref={formRef}>
          {mode !== "view" ? (
            <EditCreateMode
              planTitle={planTitle}
              setPlanTitle={setPlanTitle}
              planNotes={planNotes}
              setPlanNotes={setPlanNotes}
              currentGPA={currentGPA}
              setCurrentGPA={setCurrentGPA}
              completedCredits={completedCredits}
              setCompletedCredits={setCompletedCredits}
              targetGPA={targetGPA}
              setTargetGPA={setTargetGPA}
              plannedCredits={plannedCredits}
              setPlannedCredits={setPlannedCredits}
              requiredGPA={requiredGPA}
              calculateRequiredGPA={calculateRequiredGPA}
              gpaCourses={gpaCourses}
              setGpaCourses={setGpaCourses}
              onCancel={() => setMode("list")}
              onSave={saveGpaForecast}
              isSaveDisabled={
                !currentGPA || !completedCredits || !planTitle.trim()
              }
              isEditMode={mode === "edit"}
            />
          ) : (
            <ViewModeLayout
              plan={gpaForecasts.find((f) => f.id === viewingId)}
              onBack={() => setMode("list")}
              onEdit={() =>
                loadForecastForEdit(
                  gpaForecasts.find((f) => f.id === viewingId)
                )
              }
            />
          )}
        </div>
      )}

      {/* Tips Section */}
      <GPATipsSection />
    </section>
  );
};

export default GPAPlannerSection;
