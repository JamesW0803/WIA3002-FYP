import { useEffect, useMemo, useState } from "react";
import axiosClient from "../../api/axiosClient";
import useChatStore from "../../stores/useChatStore";
import { X, FileText, Send, Loader2, Printer } from "lucide-react";
import PlanViewerModal from "./PlanViewerModal";
import { useAlert } from "../ui/AlertProvider";

const cls = (...a) => a.filter(Boolean).join(" ");

function PlanPreviewTable({ plan }) {
  if (!plan)
    return <div className="text-sm text-gray-500">No plan selected.</div>;

  return (
    <div className="space-y-6">
      {(plan.years || []).map((y) => (
        <div key={y.year} className="space-y-3">
          <div className="text-sm font-semibold text-gray-800">
            Year {y.year}
          </div>

          {(y.semesters || []).map((s) => {
            const rows = (s.courses || []).map((c) => ({
              ...c,
              course: c.course || c.courseDoc || null,
              code: c.course?.course_code || c.code || c.course_code || "",
              name: c.course?.course_name || c.name || c.title_at_time || "",
              credit:
                c.course?.credit_hours ?? c.credit ?? c.credit_at_time ?? 0,
              offered_semester:
                c.course?.offered_semester || c.offered_semester || [],
            }));

            const isGapSemester = !!s.isGapSemester || !!s.gapSemester;

            if (rows.length === 0 && isGapSemester) {
              return (
                <div key={s.id} className="mb-3">
                  <div className="text-xs text-gray-600 mb-1">
                    {s.name}
                    <span className="ml-2 text-gray-400">• Gap semester</span>
                  </div>
                  <div className="text-xs text-gray-500 italic px-3 py-2 bg-gray-50 border border-dashed rounded-lg">
                    This semester is marked as a gap semester (no courses
                    planned).
                  </div>
                </div>
              );
            }

            if (rows.length === 0) return null;

            const semTotal = rows.reduce(
              (t, c) => t + (Number(c.credit) || 0),
              0
            );

            return (
              <div key={s.id} className="mb-4">
                <div className="text-xs text-gray-600 mb-2">
                  {s.name}
                  <span className="ml-2 text-gray-400">
                    • {rows.length} course{rows.length > 1 ? "s" : ""} •{" "}
                    {semTotal} credits
                  </span>
                </div>

                <div className="overflow-x-auto border rounded-xl">
                  <table className="min-w-[720px] w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <TH>Code</TH>
                        <TH>Course</TH>
                        <TH className="w-20 text-right">Credit</TH>
                        <TH>Offered</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((c, i) => (
                        <tr
                          key={`${c.code}-${i}`}
                          className="odd:bg-white even:bg-gray-50/60"
                        >
                          <TD className="font-medium">{c.code || "—"}</TD>
                          <TD>{c.name || "—"}</TD>
                          <TD className="text-right">{c.credit ?? ""}</TD>
                          <TD className="text-gray-600">
                            {(c.offered_semester || []).join(", ") || "—"}
                          </TD>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function TH({ children, className = "" }) {
  return (
    <th
      className={cls(
        "px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b",
        className
      )}
    >
      {children}
    </th>
  );
}
function TD({ children, className = "" }) {
  return (
    <td className={cls("px-3 py-2 border-b align-top", className)}>
      {children}
    </td>
  );
}

export default function SharePlanModal({
  open,
  onClose,
  conversationId,
  mode = "send",
  onConfirmSelect,
}) {
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [note, setNote] = useState("");
  const [includeJson, setIncludeJson] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);

  const { sendMessage } = useChatStore();
  const { alert } = useAlert();

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        const studentId = localStorage.getItem("userId");
        const { data } = await axiosClient.get(
          `/academic-plans/students/${studentId}/plans`
        );
        const list = data?.data || [];
        setPlans(list);
        setSelectedId(list[0]?.identifier || null);
      } catch (e) {
        console.error("Failed to load plans", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.identifier === selectedId) || null,
    [plans, selectedId]
  );

  const doPrint = () => {
    if (!selectedPlan) return;
    const node = document.getElementById("share-plan-preview-print");
    if (!node) return;

    const w = window.open("", "_blank", "width=1000,height=800");
    if (!w) return;

    const html = `
      <html>
        <head>
          <title>${selectedPlan.name || "Academic Plan"}</title>
          <style>
            body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; }
            h1 { font-size: 20px; margin: 0 0 8px; }
            .muted { color: #555; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
            th { background: #f5f7fb; text-align: left; }
            .section { margin: 16px 0 8px; font-weight: 600; }
          </style>
        </head>
        <body>${node.innerHTML}</body>
      </html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const send = async () => {
    if (!selectedPlan || !conversationId) return;
    setLoading(true);
    try {
      const attachments = [];

      // Send as "plan" so TicketTimeline/Message renderer can detect it.
      if (includeJson) {
        attachments.push({
          type: "plan",
          planId: selectedPlan._id,
          planName: selectedPlan.name,
          mimeType: "application/vnd.academic-plan+json",
          size: 0,
          caption: "Academic plan",
        });
      }

      const header = `Shared academic plan: ${selectedPlan.name}`;
      const notePart = note.trim() ? `\n\nNote: ${note.trim()}` : "";
      const text = header + notePart;

      await sendMessage(conversationId, text, attachments);
      onClose?.();
    } catch (e) {
      console.error("Share plan failed", e);
      alert("Failed to share the plan. Please try again.", { title: "Error" });
    } finally {
      setLoading(false);
    }
  };

  const confirmSelect = () => {
    if (!selectedPlan) return;
    onConfirmSelect?.({
      planId: selectedPlan.identifier,
      planName: selectedPlan.name || "",
    });
    onClose?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[180]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(800px,94vw)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="font-semibold">Share Academic Plan</div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100"
            type="button"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-5 p-5 max-h-[70vh] overflow-y-auto">
          <div>
            <div className="text-sm text-gray-700 mb-2">Select a plan</div>

            <div className="space-y-2">
              {loading ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : plans.length === 0 ? (
                <div className="text-sm text-gray-500">
                  You don’t have any plans yet.
                </div>
              ) : (
                plans.map((p) => (
                  <label
                    key={p.identifier}
                    className={cls(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer",
                      selectedId === p.identifier
                        ? "border-brand bg-brand/5"
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="plan"
                      className="w-4 h-4"
                      checked={selectedId === p.identifier}
                      onChange={() => setSelectedId(p.identifier)}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {p.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {p.semesters} sem • {p.credits} credits
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="mt-5 space-y-3">
              <label className="flex items-center gap-2 text-sm select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={includeJson}
                  onChange={(e) => setIncludeJson(e.target.checked)}
                />
                <span className="inline-flex items-center gap-1">
                  <FileText className="w-4 h-4" /> Attach JSON export
                </span>
              </label>
            </div>

            <div className="mt-5">
              <div className="text-sm text-gray-700 mb-1">Optional note</div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                placeholder="E.g. Please review Semester 3 prerequisites."
                className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
              />
              <div className="mt-1 text-[11px] text-gray-400">
                {note.length}/1000
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setViewerOpen(true)}
                className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm"
                type="button"
                disabled={!selectedPlan}
              ></button>
              <button
                onClick={doPrint}
                className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm inline-flex items-center gap-2"
                type="button"
                disabled={!selectedPlan}
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-700">Preview</div>
            </div>

            <div
              id="share-plan-preview-print"
              className="border rounded-xl p-3 bg-gray-50 max-h-[52vh] overflow-auto"
            >
              {selectedPlan ? (
                <PlanPreviewTable plan={selectedPlan} />
              ) : (
                <div className="text-sm text-gray-500">No plan selected</div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            disabled={loading}
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={mode === "send" ? send : confirmSelect}
            disabled={
              loading || !selectedPlan || (mode === "send" && !conversationId)
            }
            className={cls(
              "px-4 py-2 rounded-lg text-white inline-flex items-center gap-2",
              loading ? "bg-gray-400" : "bg-brand hover:bg-brand/90"
            )}
            type="button"
          >
            {mode === "send" ? "Send to Chat" : "Confirm"}
          </button>
        </div>

        <PlanViewerModal
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          plan={selectedPlan || null}
        />
      </div>
    </div>
  );
}
