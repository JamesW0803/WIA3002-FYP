import React, { useEffect, useMemo, useState, useCallback } from "react";
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
          <span className="font-semibold text-gray-800">
            Check your snapshot:
          </span>{" "}
          See your current CGPA and past term GPAs at the top. This sets your
          starting point.
        </li>
        <li>
          <span className="font-semibold text-gray-800">Select a Plan</span> and
          choose <span className="font-semibold">Include Upcoming Terms</span>{" "}
          (1–4). We’ll automatically pull the next N semesters from that plan.
        </li>
        <li>
          Set a <span className="font-semibold">Target CGPA</span>. The planner
          computes the <span className="font-semibold">required average</span>{" "}
          across your selected terms. If it’s{" "}
          <span className="font-semibold text-red-600">&gt; 4.00</span>, that’s
          impossible—add more terms, adjust credits, or lower the target.
        </li>
        <li>
          Tune per-course <span className="font-semibold">Weights (0.5–2)</span>{" "}
          to mark difficulty/priority. Use the blue{" "}
          <span className="font-semibold">Bias Strength</span> slider to “nudge”
          suggestions: higher-weighted courses will get slightly higher
          suggested grades while keeping the overall average correct.
        </li>
        <li>
          Use <span className="font-semibold">Thresholds</span> (Dean’s List GPA
          & minimum credits; probation CGPA) to get warnings if your plan risks
          missing them. Adjust credits/weights/terms until warnings clear.
        </li>
        <li>
          Review each term’s table. The{" "}
          <span className="font-semibold">Suggested Min Grade</span> is a
          planning target—not a guarantee. You can tweak weights to better match
          your strategy.
        </li>
        <li>
          Click{" "}
          <span className="font-semibold">
            Export “My Grade Goals (Next Term)”
          </span>{" "}
          to save a PDF summary of your next term’s targets for quick reference.
        </li>
        <li>
          Use <span className="font-semibold">Retake Impact</span> to simulate
          how replacing a failed course with a new grade could improve your
          CGPA. (Assumption: the retake adds new passed credits and the original
          F doesn’t count toward CGPA—adjust if your university differs.)
        </li>
      </ol>

      <div className="mt-3 rounded-md bg-gray-50 p-3 text-xs text-gray-600">
        <p className="mb-1 font-semibold text-gray-700">Pro tips</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Want Dean’s List? Set the threshold and aim for per-course targets
            that keep the required average at or above that GPA with enough
            credits.
          </li>
          <li>
            If a term looks tight, increase credits this term or spread targets
            over more terms (multi-term mode).
          </li>
          <li>
            Bias Strength is capped to prevent extreme targets; it’s meant to
            guide effort, not replace study strategy.
          </li>
        </ul>
      </div>
    </div>
  </details>
);

// Lazy import for smaller bundle; requires: npm i jspdf jspdf-autotable
let jsPDF, autoTable;
const ensurePDFLibs = async () => {
  if (!jsPDF) {
    const mod = await import("jspdf");
    jsPDF = mod.default;
  }
  if (!autoTable) {
    const at = await import("jspdf-autotable");
    autoTable = at.default || at; // different bundlers export differently
  }
};

const GPAPlannerSection = ({
  completedCoursesByYear = {},
  programPlans = [],
}) => {
  const [entries, setEntries] = useState([]); // transcript rows
  const [currentGPA, setCurrentGPA] = useState(0);
  const [completedCredits, setCompletedCredits] = useState(0);

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [multiTermCount, setMultiTermCount] = useState(1); // 1..4

  const [upcomingTerms, setUpcomingTerms] = useState([]); // [{label, courses: [{code,name,credit,_key}], credits}]
  const [targetCGPA, setTargetCGPA] = useState("");

  const [biasStrength, setBiasStrength] = useState(0.2); // 0..0.5
  const [weightsMap, setWeightsMap] = useState({}); // key -> weight (0.5..2)

  const [requiredAvgForSelection, setRequiredAvgForSelection] = useState(null);
  const [perTermTargets, setPerTermTargets] = useState([]); // [[]] parallel to upcomingTerms

  const [retakeCourse, setRetakeCourse] = useState("");
  const [retakeNewGrade, setRetakeNewGrade] = useState("");
  const [retakeResult, setRetakeResult] = useState(null);

  const [thresholds, setThresholds] = useState({
    deansListGPA: 3.7,
    deansMinCredits: 16,
    probationGPA: 2.0,
  });
  const [thresholdNotes, setThresholdNotes] = useState([]);

  // 1) Load transcript once
  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      if (!token || !userId) return;
      try {
        const res = await axiosClient.get(`/academic-profile/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const es = res.data.entries || [];
        setEntries(es);

        const { cgpa, totalCredits } = computeTermAndCumulative(es);
        setCurrentGPA(Number(cgpa.toFixed(2)));
        setCompletedCredits(totalCredits);
      } catch (e) {
        console.error("Failed to load transcript", e);
      }
    };
    run();
  }, []);

  // Transcript views
  const transcriptView = useMemo(
    () => computeTermAndCumulative(entries),
    [entries]
  );

  // Build retake candidates (Failed only)
  const failedList = useMemo(() => {
    const set = new Map();
    entries.forEach((e) => {
      if (e.status === "Failed") {
        const code = e.course?.course_code || e.course?.code;
        const key = code || `${e.year}-${e.semester}-${e.course?._id}`;
        set.set(key, {
          code: code || "UNK",
          name: e.course?.course_name || e.course?.name || "Course",
          credit: e.course?.credit_hours || e.course?.credit || 0,
        });
      }
    });
    return Array.from(set.values());
  }, [entries]);

  // Helper: Extract next N semesters from selected plan
  const getNextNSemesters = useCallback((plan, n) => {
    if (!plan) return [];
    const result = [];
    let count = 0;
    for (let yi = 0; yi < (plan.years || []).length && count < n; yi++) {
      const y = plan.years[yi];
      for (let si = 0; si < (y.semesters || []).length && count < n; si++) {
        const s = y.semesters[si];
        const label = `Year ${y.year || yi + 1} • Sem ${s.semester || si + 1}`;
        const courses =
          (s.courses || []).map((c, idx) => ({
            code: c.code,
            name: c.name,
            credit: c.credit || c.credit_hours || 0,
            // Stable key for weightsMap; includes position to avoid collisions
            _key: `${yi}-${si}-${idx}-${c.code || c.name || "UNK"}`,
          })) || [];
        result.push({
          label,
          courses,
          credits: courses.reduce((sum, c) => sum + safeNum(c.credit), 0),
        });
        count++;
      }
    }
    return result;
  }, []);

  // 2) Update terms when plan or multiTermCount changes
  useEffect(() => {
    if (!selectedPlanId) {
      setUpcomingTerms([]);
      return;
    }
    const plan = programPlans.find((p) => p.id === selectedPlanId);
    const terms = getNextNSemesters(plan, multiTermCount);
    setUpcomingTerms(terms);

    // Initialize missing weights to 1
    const nextWeights = { ...weightsMap };
    terms.forEach((t) =>
      t.courses.forEach((c) => {
        if (nextWeights[c._key] == null) nextWeights[c._key] = 1;
      })
    );
    setWeightsMap(nextWeights);
  }, [selectedPlanId, multiTermCount, programPlans, getNextNSemesters]); // eslint-disable-line

  // 3) Recompute multi-term requirement & per-course targets
  useEffect(() => {
    const upCreditsArr = upcomingTerms.map((t) => t.credits);
    const sumUp = upCreditsArr.reduce((s, x) => s + x, 0);

    if (!targetCGPA || sumUp <= 0) {
      setRequiredAvgForSelection(null);
      setPerTermTargets([]);
      return;
    }

    const req = requiredMultiTermGPAForTarget(
      currentGPA,
      completedCredits,
      parseFloat(targetCGPA),
      upCreditsArr
    );
    setRequiredAvgForSelection(req);

    if (req != null) {
      const targets = upcomingTerms.map((t) =>
        suggestPerCourseGradesWeighted(t.courses, req, weightsMap, biasStrength)
      );
      setPerTermTargets(targets);
    } else {
      setPerTermTargets([]);
    }
  }, [
    targetCGPA,
    upcomingTerms,
    currentGPA,
    completedCredits,
    weightsMap,
    biasStrength,
  ]);

  // 4) Threshold notes (uses last term GPA if available)
  useEffect(() => {
    const lastTermGPA =
      transcriptView.terms.length > 0
        ? transcriptView.terms[transcriptView.terms.length - 1].gpa
        : null;
    const firstTermCredits = upcomingTerms[0]?.credits || 0;

    const notes = checkThresholds({
      termGPARequired: requiredAvgForSelection,
      termCreditsPlanned: firstTermCredits,
      cgpaNow: currentGPA,
      lastTermGPA,
      thresholds,
    });
    setThresholdNotes(notes);
  }, [
    requiredAvgForSelection,
    upcomingTerms,
    currentGPA,
    transcriptView.terms,
    thresholds,
  ]);

  const handleWeightChange = (key, val) => {
    const v = Math.max(0.5, Math.min(2, parseFloat(val) || 1));
    setWeightsMap((prev) => ({ ...prev, [key]: v }));
  };

  const handleSimulateRetake = () => {
    const curPts = currentGPA * completedCredits;
    const picked = failedList.find((f) => f.code === retakeCourse);
    if (!picked || !retakeNewGrade) {
      setRetakeResult(null);
      return;
    }
    const { newCGPA } = simulateRetake(
      curPts,
      completedCredits,
      picked.credit,
      retakeNewGrade
    );
    setRetakeResult({ from: currentGPA, to: Number(newCGPA.toFixed(2)) });
  };

  const exportGoalsPDF = async () => {
    if (!upcomingTerms[0]) return;
    await ensurePDFLibs();

    const doc = new jsPDF();
    const planName =
      programPlans.find((p) => p.id === selectedPlanId)?.name ||
      "Selected Plan";

    doc.setFontSize(14);
    doc.text("My Grade Goals for Next Term", 14, 16);
    doc.setFontSize(10);
    doc.text(`Plan: ${planName}`, 14, 22);
    doc.text(
      `Target CGPA: ${targetCGPA || "—"}   Required Term Avg: ${
        requiredAvgForSelection != null
          ? requiredAvgForSelection.toFixed(2)
          : "—"
      }`,
      14,
      28
    );
    doc.text(`Term: ${upcomingTerms[0].label}`, 14, 34);

    const rows =
      (perTermTargets[0] || upcomingTerms[0].courses).map((c) => [
        c.code || "",
        c.name || "",
        String(c.credit),
        (c.target || "—").toString(),
      ]) || [];

    autoTable(doc, {
      head: [["Code", "Name", "Credits", "Suggested Min Grade"]],
      body: rows,
      startY: 38,
      styles: { fontSize: 9 },
      headStyles: { fillColor: undefined }, // keep default theme
    });

    const file = `grade-goals-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(file);
  };

  return (
    <section className="bg-white p-6 rounded-xl shadow-sm border border-[#1E3A8A]/20 space-y-8">
      <h3 className="text-xl font-semibold text-[#1E3A8A]">
        GPA Simulator & Planner
      </h3>

      <TipsPanel />

      {/* Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Cumulative GPA</p>
          <p className="text-2xl font-bold text-[#1E3A8A]">
            {(transcriptView.cgpa || 0).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Completed Credits: {completedCredits}
          </p>
        </div>
        <div className="lg:col-span-2 bg-gray-50 p-4 rounded-lg border">
          <p className="font-medium text-[#1E3A8A] mb-3">Per-Semester GPA</p>
          <div className="flex flex-wrap gap-3">
            {transcriptView.terms.length === 0 && (
              <span className="text-sm text-gray-500">No transcript data.</span>
            )}
            {transcriptView.terms.map((t, i) => (
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

      {/* Plan-linked what-if */}
      <div className="bg-gray-50 p-4 rounded-lg border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Plan
            </label>
            <select
              className="w-full border rounded px-3 py-2"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
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
              value={targetCGPA}
              onChange={(e) => setTargetCGPA(e.target.value)}
              placeholder="e.g., 3.60"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Include Upcoming Terms
            </label>
            <select
              className="w-full border rounded px-3 py-2"
              value={multiTermCount}
              onChange={(e) => setMultiTermCount(parseInt(e.target.value || 1))}
              disabled={!selectedPlanId}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Required average summary */}
        <div
          className={`mt-1 p-3 rounded border ${
            requiredAvgForSelection && requiredAvgForSelection > 4
              ? "bg-red-50 border-red-200"
              : "bg-white"
          }`}
        >
          {requiredAvgForSelection == null ? (
            <p className="text-sm text-gray-600">
              Choose a plan, number of terms, and set a Target CGPA to see
              requirements and course-level targets.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-700">
                To reach{" "}
                <span className="font-medium">
                  {parseFloat(targetCGPA).toFixed(2)}
                </span>{" "}
                after the next{" "}
                <span className="font-medium">{multiTermCount}</span>{" "}
                {multiTermCount === 1 ? "term" : "terms"}, you need an average{" "}
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

        {/* Bias + thresholds controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border rounded p-3">
            <p className="font-medium text-sm text-[#1E3A8A] mb-2">
              Difficulty/Priority Weights
            </p>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-700">Bias Strength</label>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={biasStrength}
                onChange={(e) => setBiasStrength(parseFloat(e.target.value))}
                className="accent-[#1E3A8A]"
              />
              <span className="text-xs text-gray-600">
                {biasStrength.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Higher bias nudges tougher courses towards higher suggested grades
              while keeping the overall requirement balanced.
            </p>
          </div>
          <div className="bg-white border rounded p-3">
            <p className="font-medium text-sm text-[#1E3A8A] mb-2">
              Thresholds
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-600">
                  Dean’s List GPA
                </label>
                <Input
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  value={thresholds.deansListGPA}
                  onChange={(e) =>
                    setThresholds((t) => ({
                      ...t,
                      deansListGPA: parseFloat(e.target.value || 0),
                    }))
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
                  value={thresholds.deansMinCredits}
                  onChange={(e) =>
                    setThresholds((t) => ({
                      ...t,
                      deansMinCredits: parseInt(e.target.value || 0),
                    }))
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
                  value={thresholds.probationGPA}
                  onChange={(e) =>
                    setThresholds((t) => ({
                      ...t,
                      probationGPA: parseFloat(e.target.value || 0),
                    }))
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

        {/* Multi-term tables + weights */}
        <div className="space-y-6">
          {upcomingTerms.length === 0 ? (
            <div className="text-sm text-gray-500">
              No upcoming courses detected from the selected plan.
            </div>
          ) : (
            upcomingTerms.map((term, tIdx) => {
              const targets = perTermTargets[tIdx] || [];
              const rows = targets.length ? targets : term.courses;
              return (
                <div key={tIdx} className="bg-white border rounded">
                  <div className="flex items-center justify-between p-3 border-b">
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
                          const key = c._key || `${tIdx}|${c.code}|${idx}`;
                          return (
                            <tr key={key} className="text-sm">
                              <td className="p-2 border">{c.code}</td>
                              <td className="p-2 border">{c.name}</td>
                              <td className="p-2 border">{c.credit}</td>
                              <td className="p-2 border">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0.5"
                                  max="2"
                                  value={weightsMap[key] ?? 1}
                                  onChange={(e) =>
                                    handleWeightChange(key, e.target.value)
                                  }
                                  className="w-24 border rounded px-2 py-1"
                                />
                              </td>
                              <td className="p-2 border font-semibold">
                                {c.target || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Export */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            onClick={exportGoalsPDF}
            disabled={!upcomingTerms[0]}
          >
            Export “My Grade Goals (Next Term)” as PDF
          </Button>
        </div>
      </div>

      {/* Retake impact simulator (unchanged UI, kept for completeness) */}
      <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
        <p className="font-medium text-[#1E3A8A]">Retake Impact</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Choose a failed course
            </label>
            <select
              className="w-full border rounded px-3 py-2"
              value={retakeCourse}
              onChange={(e) => setRetakeCourse(e.target.value)}
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
              value={retakeNewGrade}
              onChange={(e) => setRetakeNewGrade(e.target.value)}
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
              onClick={handleSimulateRetake}
              disabled={!retakeCourse || !retakeNewGrade}
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
          Failed doesn’t add credits (typical policy). Adjust to your
          university’s rules if needed.
        </p>
      </div>
    </section>
  );
};

export default GPAPlannerSection;
