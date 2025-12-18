import { useEffect, useMemo, useRef, useState } from "react";
import { X, Printer, Search } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { useAlert } from "../ui/AlertProvider";

const cls = (...a) => a.filter(Boolean).join(" ");

export default function PlanViewerModal({
  open,
  onClose,
  plan,
  planUrl,
  attachment,
}) {
  const [loading, setLoading] = useState(false);
  const [loadedPlan, setLoadedPlan] = useState(null);
  const [query, setQuery] = useState("");
  const printRef = useRef(null);

  const { alert } = useAlert();

  const data = plan || loadedPlan;

  useEffect(() => {
    if (!open) return;

    // If a full plan is already provided, don't fetch.
    if (plan) {
      setLoadedPlan(null);
      setLoading(false);
      return;
    }

    const planId = attachment?.planId;
    const urlFromAttachment = attachment?.url;
    const effectiveUrl = planUrl || urlFromAttachment;

    if (!planId && !effectiveUrl) {
      setLoadedPlan(null);
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        setLoading(true);

        // Prefer planId fetch (authoritative/latest)
        if (planId) {
          const token = localStorage.getItem("token");
          const res = await axiosClient.get(`/academic-plans/plans/${planId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.data?.data) throw new Error("NOT_FOUND");
          if (!active) return;
          setLoadedPlan(res.data.data);
          return;
        }

        // If you later support planUrl that returns JSON, you can fetch it here.
        // For now: if only planUrl exists and isn't a planId, we don't auto-parse it.
        if (!active) return;
        setLoadedPlan(null);
      } catch (e) {
        if (e.message === "NOT_FOUND" || e.response?.status === 404) {
          setLoadedPlan(null);
          setTimeout(
            () =>
              alert("This academic plan is no longer available.", {
                title: "Error",
              }),
            0
          );
        } else {
          console.error("Error loading plan:", e);
        }
        if (active) setLoadedPlan(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, plan, planUrl, attachment, alert]);

  const flatCourses = useMemo(() => {
    if (!data) return [];
    const out = [];
    (data.years || []).forEach((y) => {
      (y.semesters || []).forEach((s) => {
        (s.courses || []).forEach((c) => {
          const courseDoc = c.course || {};
          out.push({
            year: y.year,
            semesterName: s.name,
            code: courseDoc.course_code || c.course_code || c.code || "",
            name: courseDoc.course_name || c.title_at_time || c.name || "",
            prerequisites: courseDoc.prerequisites || [],
            offered_semester: courseDoc.offered_semester || [],
            credit:
              courseDoc.credit_hours ?? c.credit_at_time ?? c.credit ?? null,
            course: courseDoc,
          });
        });
      });
    });
    return out;
  }, [data]);

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return flatCourses;
    return flatCourses.filter(
      (c) =>
        (c.code || "").toLowerCase().includes(q) ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.prerequisites || []).some((p) =>
          (p || "").toLowerCase().includes(q)
        ) ||
        (c.offered_semester || []).some((os) =>
          (os || "").toLowerCase().includes(q)
        ) ||
        ("" + (c.year ?? "")).includes(q) ||
        (c.semesterName || "").toLowerCase().includes(q)
    );
  }, [flatCourses, query]);

  const doPrint = () => {
    const node = printRef.current;
    if (!node) return;
    const w = window.open("", "_blank", "width=1000,height=800");
    if (!w) return;

    const html = `
      <html>
        <head>
          <title>${data?.name || "Academic Plan"}</title>
          <style>
            body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; }
            h1 { font-size: 20px; margin: 0 0 8px; }
            .muted { color: #555; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
            th { background: #f5f7fb; text-align: left; }
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[190]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute left-1/2 top-1/2 w-[min(980px,94vw)] -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="min-w-0">
            <div className="font-semibold truncate">
              {data?.name || "Academic Plan"}
            </div>
            <div className="text-xs text-gray-500">
              {loading ? "Loading…" : data ? "Preview" : "No data"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={doPrint}
              className="px-3 py-2 rounded-lg border hover:bg-gray-50 inline-flex items-center gap-2"
              type="button"
              disabled={!data}
            >
              <Printer className="w-4 h-4" />
              Print
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Close"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[74vh] overflow-y-auto">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search course code, name, prerequisites, offered semester…"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand"
              disabled={!data}
            />
          </div>

          <div ref={printRef} className="space-y-4">
            {!data ? (
              <div className="text-sm text-gray-500">
                {loading ? "Loading plan…" : "No plan data to display."}
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-xl">
                <table className="min-w-[880px] w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <TH className="w-20">Year</TH>
                      <TH className="w-40">Semester</TH>
                      <TH className="w-28">Code</TH>
                      <TH>Course</TH>
                      <TH className="w-24 text-right">Credit</TH>
                      <TH>Prerequisites</TH>
                      <TH>Offered</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((c, i) => (
                      <tr
                        key={`${c.code}-${i}`}
                        className="odd:bg-white even:bg-gray-50/60"
                      >
                        <TD className="text-gray-700">{c.year}</TD>
                        <TD className="text-gray-700">{c.semesterName}</TD>
                        <TD className="font-medium">{c.code || "—"}</TD>
                        <TD>{c.name || "—"}</TD>
                        <TD className="text-right">{c.credit ?? ""}</TD>
                        <TD className="text-gray-600">
                          {(c.prerequisites || []).join(", ") || "—"}
                        </TD>
                        <TD className="text-gray-600">
                          {(c.offered_semester || []).join(", ") || "—"}
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
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
