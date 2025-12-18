import React, { useState } from "react";
import { Card } from "../../ui/card";
import SavedPlanCard from "../SavedPlanCard";
import PlanEditor from "./PlanEditor";
import PlanViewer from "./PlanViewer";
import { Plus } from "lucide-react";
import { generateNewPlanFromStartingPoint } from "../AcademicPlanner/utils/planHelpers";
import axiosClient from "../../../api/axiosClient";
import { normalizePlanForUI } from "../../../utils/normalisePlan";
import { useAlert } from "../../ui/AlertProvider";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [backupPlan, setBackupPlan] = useState(null);
  const { confirm, alert } = useAlert();
  const closeAllModes = () => {
    setViewingPlan(null);
    setEditingPlan(null);
    setIsCreatingNew(false);
    setUnsavedPlan(null);
  };
  const openViewer = (planId) => {
    setEditingPlan(null); // ensure editor closed
    setIsCreatingNew(false); // ensure create-new closed
    setViewingPlan(planId); // open viewer
  };

  const openEditor = (planId, { creatingNew = false } = {}) => {
    setViewingPlan(null); // ensure viewer closed
    setIsCreatingNew(creatingNew);
    setEditingPlan(planId); // open editor
  };
  const addPlan = () => {
    closeAllModes();
    const activePlans = programPlans.filter(
      (plan) => !tempPlans.includes(plan.id)
    );

    if (activePlans.length >= 3) {
      alert("Max 3 plans allowed.", { title: "Maximum Plans Reached" });
      return;
    }

    const newPlan = generateNewPlanFromStartingPoint(
      activePlans.length,
      startingPlanPoint
    );

    setUnsavedPlan(newPlan);
    openEditor(newPlan.id, { creatingNew: true });
    setTempPlans([...tempPlans, newPlan.id]);
    scrollToEditSection();
  };

  const handleSendToAdvisor = async (plan) => {
    const ok = await confirm("Proceed to Contact Advisor Page?", {
      title: "Sending plan...",
      confirmText: "Proceed",
      cancelText: "Cancel",
      disableClose: false, // allow backdrop close if you want
    });

    if (!ok) return;

    navigate("/chat-with-advisor", {
      state: {
        openTicketPreview: true,
        planId: plan.id || plan._id,
        planName: plan.name || "",
        plan,
        from: "academic-planner",
      },
    });
  };

  const resolveCourseId = (c) =>
    c?._id ||
    c?.course?._id ||
    c?.course ||
    allCourses.find((ac) => ac.code === c?.code)?._id;

  const latestCredit = (c) => {
    // prefer populated live credit, then UI field, then snapshot, then catalog
    const fromPopulated = c?.course?.credit_hours;
    const fromUI = c?.credit;
    const fromSnapshot = c?.credit_at_time;
    const fromCatalog = allCourses.find((ac) => ac.code === c?.code)?.credit;
    return Number(fromPopulated ?? fromUI ?? fromSnapshot ?? fromCatalog ?? 0);
  };

  const handleSave = async (updatedPlanData) => {
    try {
      const token = localStorage.getItem("token");
      const planId = editingPlan;

      const cleanedYears = (updatedPlanData.years || [])
        .map((y) => {
          const cleanedSemesters = (y.semesters || [])
            .filter(
              (s) => !s._isDraft && (s.isGap || (s.courses?.length || 0) > 0)
            )
            .map((s, idx) => ({
              ...s,
              name: `Year ${y.year} - Semester ${idx + 1}`,
              courses: (s.courses || []).map((c) => {
                const cid = resolveCourseId(c);
                if (!cid) {
                  throw new Error(
                    `Missing ObjectId for course ${c?.code || "(unknown)"}`
                  );
                }
                return {
                  course: cid,
                  credit_at_time: latestCredit(c),
                  course_code: c.code,
                  title_at_time: c.name,
                };
              }),
            }));

          return { ...y, semesters: cleanedSemesters };
        })
        .filter((y) => y.isGapYear || (y.semesters && y.semesters.length > 0));

      const payload = {
        ...updatedPlanData,
        years: cleanedYears,
      };

      // Now totals based on cleaned payload
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
                (courseSum, c) => courseSum + (c?.credit_at_time || 0),
                0
              ),
            0
          ),
        0
      );

      // Send PUT to /academic-plans/plans/:planId
      const res = await axiosClient.put(
        `/academic-plans/plans/${planId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const saved = normalizePlanForUI(res.data.data);

      // Merge updated plan into state
      setProgramPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? {
                ...saved,
                id: saved.id,
                semesters: totalSemesters,
                credits: totalCredits,
              }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to save plan", err);
      alert("Failed to save plan", { title: " " });
    } finally {
      // Exit edit mode
      setEditingPlan(null);
    }
  };

  const handleEditPlan = (plan) => {
    setBackupPlan(plan);
    // if we were in View mode, close it
    openEditor(plan.id);
    scrollToEditSection();
  };

  const handleViewPlan = (plan) => {
    console.log("Viewing plan:", plan);
    const planId = plan.id;
    console.log("Plan ID:", planId);
    openViewer(plan.id);
    scrollToViewSection();
  };

  const handleDeletePlan = async (plan) => {
    const ok = await confirm(`Delete plan “${plan.name}”?`, {
      title: "Delete Plan",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;
    try {
      const token = localStorage.getItem("token");
      await axiosClient.delete(`/academic-plans/plans/${plan.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProgramPlans((prev) => prev.filter((p) => p.id !== plan.id));

      if (viewingPlan === plan.id) {
        setViewingPlan(null);
      }
      if (editingPlan === plan.id) {
        setEditingPlan(null);
        setUnsavedPlan(null);
        setBackupPlan(null);
      }
      alert("Plan deleted successfully.", { title: "Deleted" });
    } catch (err) {
      console.error("Failed to delete plan", err);
      alert("Could not delete plan—please try again.", { title: "Error" });
    }
  };

  const semesterIndex = (year, semester) =>
    (Number(year) - 1) * 2 + (Number(semester) - 1);

  const extractSemesterNumber = (name = "") => {
    const parts = String(name).split(" ");
    const semStr = parts[3]; // "Year X - Semester Y"
    const semNum = parseInt(semStr, 10);
    return Number.isNaN(semNum) ? 1 : semNum;
  };

  const getPlanFirstSemester = (plan) => {
    let best = null;
    let minIdx = Infinity;

    (plan.years || []).forEach((y) => {
      (y.semesters || []).forEach((s) => {
        const hasCourses = Array.isArray(s.courses) && s.courses.length > 0;
        if (!hasCourses || s.isGap) return;

        const semNum = extractSemesterNumber(s.name);
        const idx = semesterIndex(y.year, semNum);

        if (idx < minIdx) {
          minIdx = idx;
          best = { year: y.year, semester: semNum };
        }
      });
    });

    return best;
  };

  const isPlanOutdated = (plan) => {
    if (!startingPlanPoint) return false;
    const first = getPlanFirstSemester(plan);
    if (!first) return false; // empty plan → can't say it's outdated

    const planIdx = semesterIndex(first.year, first.semester);
    const startIdx = semesterIndex(
      startingPlanPoint.year,
      startingPlanPoint.semester
    );

    // if plan starts before the "next to plan" point → outdated
    return planIdx < startIdx;
  };

  const handleSetCurrentPlan = async (plan) => {
    try {
      const token = localStorage.getItem("token");
      await axiosClient.patch(
        `/academic-plans/plans/${plan.id}/set-default`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProgramPlans((prev) =>
        prev.map((p) => ({
          ...p,
          isDefault: p.id === plan.id,
        }))
      );

      alert(`“${plan.name}” is now your current plan!`, { title: " " });
    } catch (err) {
      console.error("Failed to set current plan", err);
      alert("Could not set this plan as current. Please try again.", {
        title: " ",
      });
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
                isOutdated={isPlanOutdated(plan)}
                onEdit={() => {
                  handleEditPlan(plan);
                }}
                onDelete={() => {
                  handleDeletePlan(plan);
                }}
                onView={() => handleViewPlan(plan)}
                onSetCurrent={() => handleSetCurrentPlan(plan)}
                onSendToAdvisor={handleSendToAdvisor}
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
          setBackupPlan={setBackupPlan}
          programPlans={programPlans}
          scrollToEditSection={scrollToEditSection}
          viewSectionRef={viewSectionRef}
        />
      )}
    </>
  );
};

export default ProgramPlansSection;
