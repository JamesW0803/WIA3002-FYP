import { useEffect, useMemo, useRef, useState } from "react";
import { X, Printer, Search, FileText } from "lucide-react";
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

  const hasSearch = query.trim().length > 0;

  useEffect(() => {
    if (!open) return;

    // If the modal is given a full plan (e.g. from SharePlanModal), just use it.
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
        let json = null;

        if (planId) {
          // NEW: fetch the latest version of the plan from your API
          const token = localStorage.getItem("token");
          const res = await axiosClient.get(`/academic-plans/plans/${planId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.data?.data) {
            throw new Error("NOT_FOUND");
          }
          json = res.data.data;
        }

        if (!active) return;
        setLoadedPlan(json);
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
        console.error("Failed to load plan:", e);
        if (active) setLoadedPlan(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, plan, planUrl, attachment]);

  const flatCourses = useMemo(() => {
    if (!data) return [];
    const out = [];

    (data.years || []).forEach((y) => {
      (y.semesters || []).forEach((s) => {
        (s.courses || []).forEach((c) => {
          const courseDoc = c.course || {}; // populated Course document (if any)

          out.push({
            year: y.year,
            semesterId: s.id,
            semesterName: s.name,

            // normalized fields used for search
            code: courseDoc.course_code || c.course_code || "",
            name: courseDoc.course_name || c.title_at_time || "",
            prerequisites: courseDoc.prerequisites || [],
            offered_semester: courseDoc.offered_semester || [],

            credit: courseDoc.credit_hours ?? c.credit_at_time ?? null,

            // keep full course doc in case we need it for display
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(1100px,95vw)] h-[min(85vh,900px)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col">
        {/* Header — made mobile-friendly and wrapped */}
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-b flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1 order-1">
            <div className="font-semibold truncate flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand" />
              {data?.name || "Academic Plan"}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {data ? (
                <>
                  {data.semesters ?? "—"} semesters • {data.credits ?? "—"}{" "}
                  credits
                </>
              ) : loading ? (
                "Loading…"
              ) : (
                "—"
              )}
            </div>
          </div>

          <div className="order-3 sm:order-2 flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses, codes, prerequisites…"
                className="pl-8 pr-3 py-2 border rounded-lg text-sm w-36 sm:w-[240px]"
              />
            </div>

            <button
              onClick={doPrint}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
              disabled={!data || loading}
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-5" ref={printRef}>
          {!data ? (
            <div className="text-sm text-gray-500">
              {loading ? "Loading plan…" : "No data found."}
            </div>
          ) : hasSearch && filteredCourses.length === 0 ? (
            <div className="text-sm text-gray-500">
              No courses match your search.
            </div>
          ) : (
            <>
              {(data.years || []).map((y) => (
                <div key={y.year} className="mb-6">
                  <div className="text-sm font-semibold text-gray-800 mb-2">
                    Year {y.year}
                    {y.isGapYear && (
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        • Gap year
                      </span>
                    )}
                  </div>
                  {(y.semesters || []).map((s) => {
                    const rows = filteredCourses.filter(
                      (c) => c.year === y.year && c.semesterName === s.name
                    );

                    const isGapSemester = !!s.isGap;

                    // If user is searching: only show semesters that actually have matches
                    if (hasSearch && rows.length === 0) return null;

                    // No search, no courses, but this semester is explicitly marked as a gap
                    if (!hasSearch && rows.length === 0 && isGapSemester) {
                      return (
                        <div key={s.id} className="mb-3">
                          <div className="text-xs text-gray-600 mb-1">
                            {s.name}
                            <span className="ml-2 text-gray-400">
                              • Gap semester
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 italic px-3 py-2 bg-gray-50 border border-dashed rounded-lg">
                            This semester is marked as a gap semester (no
                            courses planned).
                          </div>
                        </div>
                      );
                    }

                    // Still no rows and not a gap semester → nothing to render
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
                                  <TD className="font-medium">
                                    {c.course?.course_code || c.code}
                                  </TD>
                                  <TD>{c.course?.course_name || c.name}</TD>
                                  <TD className="text-right">
                                    {c.course?.credit_hours ?? c.credit ?? ""}
                                  </TD>
                                  <TD className="text-gray-600">
                                    {(
                                      c.course?.offered_semester ||
                                      c.offered_semester ||
                                      []
                                    ).join(", ") || "—"}
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
            </>
          )}
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
