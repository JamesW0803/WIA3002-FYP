import React, { useEffect, useMemo, useReducer, useCallback } from "react";
import axiosClient from "../../../api/axiosClient";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Info, ChevronDown } from "lucide-react";
import {
  gradePointsMap,
  computeTermAndCumulative,
  requiredMultiTermGPAForTarget,
  suggestPerCourseGradesWeighted,
  simulateRetake,
  safeNum,
  checkThresholds,
} from "./utils/gpaUtils";

let jsPDF, autoTable;
const ensurePDFLibs = async () => {
  if (!jsPDF) jsPDF = (await import("jspdf")).default;
  if (!autoTable) {
    const at = await import("jspdf-autotable");
    autoTable = at.default || at;
  }
};

const Panel = ({ title, children, footer, className = "" }) => (
  <div
    className={`bg-gray-50 p-4 sm:p-5 rounded-lg border space-y-3 ${className}`}
  >
    {title ? <p className="font-medium text-[#1E3A8A]">{title}</p> : null}
    {children}
    {footer}
  </div>
);

const Metric = ({ label, value, sub }) => (
  <div className="bg-gray-50 p-4 rounded-lg border">
    <p className="text-sm text-gray-600">{label}</p>
    <p className="text-2xl sm:text-3xl font-bold text-[#1E3A8A]">{value}</p>
    {sub ? <p className="text-xs text-gray-500 mt-1">{sub}</p> : null}
  </div>
);

const TipsPanel = () => (
  <details className="group">
    <summary className="cursor-pointer list-none">
      <div className="flex items-center justify-between bg-[#1E3A8A]/5 border border-[#1E3A8A]/20 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1E3A8A]/10 text-[#1E3A8A]">
            <Info className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium text-[#1E3A8A]">
            Tips: How to use the GPA Planner
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-[#1E3A8A] transition-transform group-open:rotate-180" />
      </div>
    </summary>

    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700">
      <ol className="space-y-2 list-decimal pl-5">
        <li>
          <span className="font-semibold">Check your snapshot</span>…
        </li>
        <li>
          <span className="font-semibold">Select a Plan</span>…
        </li>
        <li>
          Set a <span className="font-semibold">Target CGPA</span>…
        </li>
        <li>
          Tune <span className="font-semibold">Weights</span> and{" "}
          <span className="font-semibold">Bias</span>…
        </li>
        <li>
          Use <span className="font-semibold">Thresholds</span>…
        </li>
        <li>
          Review <span className="font-semibold">Suggested Min Grade</span>…
        </li>
        <li>Export the PDF summary…</li>
        <li>
          Use <span className="font-semibold">Retake Impact</span>…
        </li>
      </ol>
    </div>
  </details>
);

const initialState = {
  selectedPlanId: "",
  multiTermCount: 1,
  targetCGPA: "",
  biasStrength: 0.2,
  thresholds: { deansListGPA: 3.7, deansMinCredits: 16, probationGPA: 2.0 },
  weightsMap: {},

  // retake controls
  retakeCourse: "",
  retakeNewGrade: "",
};

function reducer(state, action) {
  switch (action.type) {
    case "plan/set":
      return { ...state, selectedPlanId: action.id };
    case "terms/setCount":
      return { ...state, multiTermCount: action.n };
    case "target/set":
      return { ...state, targetCGPA: action.value };
    case "bias/set":
      return { ...state, biasStrength: action.value };
    case "thresholds/set":
      return { ...state, thresholds: { ...state.thresholds, ...action.patch } };
    case "weights/setOne":
      return {
        ...state,
        weightsMap: { ...state.weightsMap, [action.key]: action.value },
      };
    case "retake/setCourse":
      return { ...state, retakeCourse: action.value };
    case "retake/setGrade":
      return { ...state, retakeNewGrade: action.value };
    default:
      return state;
  }
}

// --- Main ---
const GPAPlannerSection = ({
  completedCoursesByYear = {},
  programPlans = [],
}) => {
  // Transcript entries loaded once
  const [entries, setEntries] = React.useState([]);
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      if (!token || !userId) return;
      try {
        const res = await axiosClient.get(`/academic-profile/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEntries(res.data.entries || []);
      } catch (e) {
        console.error("Failed to load transcript", e);
      }
    })();
  }, []);

  // Derived transcript view (single source of truth)
  const transcript = useMemo(
    () => computeTermAndCumulative(entries),
    [entries]
  );
  const completedCredits = transcript.totalCredits || 0;
  const currentGPA = transcript.cgpa || 0;

  // Retake candidates (derived)
  const failedList = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      if (e.status === "Failed") {
        const code = e.course?.course_code || e.course?.code || "UNK";
        if (!map.has(code)) {
          map.set(code, {
            code,
            name: e.course?.course_name || e.course?.name || "Course",
            credit: e.course?.credit_hours || e.course?.credit || 0,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [entries]);

  // Planner inputs/state
  const [state, dispatch] = useReducer(reducer, initialState);

  // Next N semesters from selected plan (derived)
  const upcomingTerms = useMemo(() => {
    if (!state.selectedPlanId) return [];
    const plan = programPlans.find((p) => p.id === state.selectedPlanId);
    if (!plan) return [];
    const out = [];
    let count = 0;
    for (const [yi, y] of (plan.years || []).entries()) {
      for (const [si, s] of (y.semesters || []).entries()) {
        if (count >= state.multiTermCount) break;
        const courses = (s.courses || []).map((c, idx) => ({
          code: c.code,
          name: c.name,
          credit: c.credit || c.credit_hours || 0,
          _key: `${yi}-${si}-${idx}-${c.code || c.name || "UNK"}`,
        }));
        out.push({
          label: `Year ${y.year || yi + 1} • Sem ${s.semester || si + 1}`,
          courses,
          credits: courses.reduce((sum, c) => sum + safeNum(c.credit), 0),
        });
        count++;
      }
      if (count >= state.multiTermCount) break;
    }
    return out;
  }, [state.selectedPlanId, state.multiTermCount, programPlans]);

  // Auto-seed weights for any new course keys
  const weightsMap = useMemo(() => {
    const next = { ...state.weightsMap };
    for (const t of upcomingTerms)
      for (const c of t.courses) {
        if (next[c._key] == null) next[c._key] = 1;
      }
    return next;
  }, [state.weightsMap, upcomingTerms]);

  // Requirement + per-course suggestions (derived)
  const requiredAvgForSelection = useMemo(() => {
    const creditsArr = upcomingTerms.map((t) => t.credits);
    const sum = creditsArr.reduce((s, x) => s + x, 0);
    if (!state.targetCGPA || sum <= 0) return null;
    return requiredMultiTermGPAForTarget(
      currentGPA,
      completedCredits,
      parseFloat(state.targetCGPA),
      creditsArr
    );
  }, [state.targetCGPA, upcomingTerms, currentGPA, completedCredits]);

  const perTermTargets = useMemo(() => {
    if (requiredAvgForSelection == null) return [];
    return upcomingTerms.map((t) =>
      suggestPerCourseGradesWeighted(
        t.courses,
        requiredAvgForSelection,
        weightsMap,
        state.biasStrength
      )
    );
  }, [upcomingTerms, requiredAvgForSelection, weightsMap, state.biasStrength]);

  // Threshold notes (derived)
  const thresholdNotes = useMemo(() => {
    const lastTermGPA = transcript.terms.length
      ? transcript.terms[transcript.terms.length - 1].gpa
      : null;
    const firstTermCredits = upcomingTerms[0]?.credits || 0;
    return checkThresholds({
      termGPARequired: requiredAvgForSelection,
      termCreditsPlanned: firstTermCredits,
      cgpaNow: currentGPA,
      lastTermGPA,
      thresholds: state.thresholds,
    });
  }, [
    requiredAvgForSelection,
    upcomingTerms,
    currentGPA,
    transcript.terms,
    state.thresholds,
  ]);

  // Retake preview (derived)
  const retakeResult = useMemo(() => {
    const picked = failedList.find((f) => f.code === state.retakeCourse);
    if (!picked || !state.retakeNewGrade) return null;
    const curPts = currentGPA * completedCredits;
    const { newCGPA } = simulateRetake(
      curPts,
      completedCredits,
      picked.credit,
      state.retakeNewGrade
    );
    return { from: currentGPA, to: Number(newCGPA.toFixed(2)) };
  }, [
    failedList,
    state.retakeCourse,
    state.retakeNewGrade,
    currentGPA,
    completedCredits,
  ]);

  // PDF export (unchanged function, just uses derived data)
  const exportGoalsPDF = useCallback(async () => {
    if (!upcomingTerms[0]) return;
    await ensurePDFLibs();

    const doc = new jsPDF();
    const planName =
      programPlans.find((p) => p.id === state.selectedPlanId)?.name ||
      "Selected Plan";

    doc.setFontSize(14);
    doc.text("My Grade Goals for Next Term", 14, 16);
    doc.setFontSize(10);
    doc.text(`Plan: ${planName}`, 14, 22);
    doc.text(
      `Target CGPA: ${state.targetCGPA || "—"}   Required Term Avg: ${
        requiredAvgForSelection != null
          ? requiredAvgForSelection.toFixed(2)
          : "—"
      }`,
      14,
      28
    );
    doc.text(`Term: ${upcomingTerms[0].label}`, 14, 34);

    const rows = (perTermTargets[0] || upcomingTerms[0].courses).map((c) => [
      c.code || "",
      c.name || "",
      String(c.credit),
      (c.target || "—").toString(),
    ]);

    autoTable(doc, {
      head: [["Code", "Name", "Credits", "Suggested Min Grade"]],
      body: rows,
      startY: 38,
      styles: { fontSize: 9 },
      headStyles: { fillColor: undefined },
    });

    const file = `grade-goals-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(file);
  }, [
    upcomingTerms,
    perTermTargets,
    programPlans,
    state.selectedPlanId,
    state.targetCGPA,
    requiredAvgForSelection,
  ]);

  // --- Render ---
  return (
    <section className="bg-white px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 rounded-xl shadow-sm border border-[#1E3A8A]/20 space-y-6 sm:space-y-8">
      <h3 className="text-lg sm:text-xl font-semibold text-[#1E3A8A]">
        GPA Simulator & Planner
      </h3>

      <TipsPanel />

      {/* Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Metric
          label="Cumulative GPA"
          value={(transcript.cgpa || 0).toFixed(2)}
          sub={`Completed Credits: ${completedCredits}`}
        />
        <div className="lg:col-span-2 bg-gray-50 p-4 rounded-lg border">
          <p className="font-medium text-[#1E3A8A] mb-3">Per-Semester GPA</p>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {!transcript.terms.length && (
              <span className="text-sm text-gray-500">No transcript data.</span>
            )}
            {transcript.terms.map((t, i) => (
              <div key={i} className="px-3 py-2 rounded border bg-white">
                <div className="text-xs text-gray-600">{t.label}</div>
                <div className="font-semibold">
                  {t.credits > 0 ? t.gpa.toFixed(2) : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls + Summary */}
      <Panel>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Plan
            </label>
            <select
              className="w-full border rounded px-3 py-2"
              value={state.selectedPlanId}
              onChange={(e) =>
                dispatch({ type: "plan/set", id: e.target.value })
              }
            >
              <option value="">— Choose a saved plan —</option>
              {programPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target CGPA
            </label>
            <Input
              type="number"
              min="0"
              max="4"
              step="0.01"
              value={state.targetCGPA}
              onChange={(e) =>
                dispatch({ type: "target/set", value: e.target.value })
              }
              placeholder="e.g., 3.60"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Include Upcoming Terms
            </label>
            <select
              className="w-full border rounded px-3 py-2"
              value={state.multiTermCount}
              onChange={(e) =>
                dispatch({
                  type: "terms/setCount",
                  n: parseInt(e.target.value || 1),
                })
              }
              disabled={!state.selectedPlanId}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Requirement banner */}
        <div
          className={`mt-1 p-3 rounded border text-sm ${
            requiredAvgForSelection && requiredAvgForSelection > 4
              ? "bg-red-50 border-red-200"
              : "bg-white"
          }`}
        >
          {requiredAvgForSelection == null ? (
            <p className="text-gray-600">
              Choose a plan, number of terms, and set a Target CGPA to see
              requirements and course-level targets.
            </p>
          ) : (
            <>
              <p className="text-gray-700">
                To reach{" "}
                <span className="font-medium">
                  {parseFloat(state.targetCGPA).toFixed(2)}
                </span>{" "}
                after the next{" "}
                <span className="font-medium">{state.multiTermCount}</span>{" "}
                {state.multiTermCount === 1 ? "term" : "terms"}, you need an
                average{" "}
                <span
                  className={`font-bold ${
                    requiredAvgForSelection > 4
                      ? "text-red-600"
                      : "text-[#1E3A8A]"
                  }`}
                >
                  {requiredAvgForSelection.toFixed(2)}
                </span>{" "}
                across those terms.
              </p>
              {requiredAvgForSelection > 4 && (
                <p className="text-xs text-red-600 mt-1">
                  This exceeds 4.00 (impossible). Consider adding more terms,
                  taking more credits, or adjusting the target.
                </p>
              )}
            </>
          )}
        </div>

        {/* Weights + thresholds */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border rounded p-3">
            <p className="font-medium text-sm text-[#1E3A8A] mb-2">
              Difficulty/Priority Weights
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <label className="text-sm text-gray-700">Bias Strength</label>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={state.biasStrength}
                onChange={(e) =>
                  dispatch({
                    type: "bias/set",
                    value: parseFloat(e.target.value),
                  })
                }
                className="accent-[#1E3A8A] w-full sm:max-w-xs"
              />
              <span className="text-xs text-gray-600">
                {state.biasStrength.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Higher bias nudges tougher courses toward higher suggested grades
              while keeping the overall requirement balanced.
            </p>
          </div>

          <div className="bg-white border rounded p-3">
            <p className="font-medium text-sm text-[#1E3A8A] mb-2">
              Thresholds
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-600">
                  Dean’s List GPA
                </label>
                <Input
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  value={state.thresholds.deansListGPA}
                  onChange={(e) =>
                    dispatch({
                      type: "thresholds/set",
                      patch: { deansListGPA: parseFloat(e.target.value || 0) },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">
                  Dean’s List Min Credits
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={state.thresholds.deansMinCredits}
                  onChange={(e) =>
                    dispatch({
                      type: "thresholds/set",
                      patch: { deansMinCredits: parseInt(e.target.value || 0) },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">
                  Probation CGPA
                </label>
                <Input
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  value={state.thresholds.probationGPA}
                  onChange={(e) =>
                    dispatch({
                      type: "thresholds/set",
                      patch: { probationGPA: parseFloat(e.target.value || 0) },
                    })
                  }
                />
              </div>
            </div>
            {thresholdNotes.length > 0 && (
              <ul className="mt-2 space-y-1">
                {thresholdNotes.map((n, i) => (
                  <li
                    key={i}
                    className={`text-xs ${
                      n.level === "error"
                        ? "text-red-700"
                        : n.level === "warn"
                        ? "text-yellow-700"
                        : "text-gray-700"
                    }`}
                  >
                    • {n.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Panel>

      {/* Terms & Weights (compact) */}
      <Panel title="Upcoming Terms">
        {upcomingTerms.length === 0 ? (
          <div className="text-sm text-gray-500">
            No upcoming courses detected from the selected plan.
          </div>
        ) : (
          <div className="space-y-6">
            {upcomingTerms.map((term, tIdx) => {
              const targets = perTermTargets[tIdx] || [];
              const rows = targets.length ? targets : term.courses;
              return (
                <div key={tIdx} className="bg-white border rounded">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-3 border-b">
                    <p className="font-medium text-gray-800">{term.label}</p>
                    <p className="text-sm text-gray-600">
                      {term.credits} credits
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                      <thead>
                        <tr className="bg-gray-100 text-left text-sm">
                          <th className="p-2 border">Code</th>
                          <th className="p-2 border">Name</th>
                          <th className="p-2 border">Credits</th>
                          <th className="p-2 border">Weight (0.5–2)</th>
                          <th className="p-2 border">Suggested Min Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((c, idx) => {
                          const key = c._key;
                          return (
                            <tr key={key} className="text-sm">
                              <td className="p-2 border whitespace-nowrap">
                                {c.code}
                              </td>
                              <td className="p-2 border">{c.name}</td>
                              <td className="p-2 border">{c.credit}</td>
                              <td className="p-2 border">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0.5"
                                  max="2"
                                  value={weightsMap[key] ?? 1}
                                  onChange={(e) => {
                                    const v = Math.max(
                                      0.5,
                                      Math.min(
                                        2,
                                        parseFloat(e.target.value) || 1
                                      )
                                    );
                                    dispatch({
                                      type: "weights/setOne",
                                      key,
                                      value: v,
                                    });
                                  }}
                                  className="w-24 border rounded px-2 py-1"
                                />
                              </td>
                              <td className="p-2 border font-semibold">
                                {c.target || "—"}
                                {typeof c._gp === "number" && (
                                  <div className="text-xs text-gray-500">
                                    ≈ {c._gp.toFixed(2)}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2">
          <Button
            variant="default"
            onClick={exportGoalsPDF}
            disabled={!upcomingTerms[0]}
            className="w-full sm:w-auto"
          >
            Export “My Grade Goals (Next Term)” as PDF
          </Button>
        </div>
      </Panel>

      {/* Retake Impact */}
      <Panel title="Retake Impact">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Choose a failed course
            </label>
            <select
              className="w-full border rounded px-3 py-2"
              value={state.retakeCourse}
              onChange={(e) =>
                dispatch({ type: "retake/setCourse", value: e.target.value })
              }
            >
              <option value="">—</option>
              {failedList.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.code} • {f.name} ({f.credit} cr)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Expected new grade
            </label>
            <select
              className="w-full border rounded px-3 py-2"
              value={state.retakeNewGrade}
              onChange={(e) =>
                dispatch({ type: "retake/setGrade", value: e.target.value })
              }
            >
              <option value="">—</option>
              {Object.keys(gradePointsMap).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={!state.retakeCourse || !state.retakeNewGrade}
            >
              Simulate
            </Button>
          </div>
        </div>

        {retakeResult && (
          <div className="text-sm">
            CGPA change:{" "}
            <span className="font-semibold">
              {retakeResult.from.toFixed(2)} → {retakeResult.to.toFixed(2)}
            </span>
            <span className="ml-2 text-gray-500">
              ({retakeResult.to - retakeResult.from >= 0 ? "+" : ""}
              {(retakeResult.to - retakeResult.from).toFixed(2)})
            </span>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Assumption: retake adds a new Passed attempt to CGPA and the original
          Failed doesn’t add credits. Adjust for your university’s policy if
          needed.
        </p>
      </Panel>
    </section>
  );
};

export default GPAPlannerSection;
