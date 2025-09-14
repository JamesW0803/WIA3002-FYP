import { useEffect, useMemo, useRef, useState } from "react";
import { X, Download, Printer, Search, FileText } from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");

export default function PlanViewerModal({ open, onClose, plan, planUrl }) {
  const [loading, setLoading] = useState(false);
  const [loadedPlan, setLoadedPlan] = useState(null);
  const [query, setQuery] = useState("");
  const printRef = useRef(null);

  const data = plan || loadedPlan;

  useEffect(() => {
    if (!open) return;
    if (plan) {
      setLoadedPlan(null);
      return;
    }
    if (!planUrl) return;

    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(planUrl);
        const json = await res.json();
        if (!active) return;
        setLoadedPlan(json);
      } catch (e) {
        console.error("Failed to load plan JSON:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, plan, planUrl]);

  const flatCourses = useMemo(() => {
    if (!data) return [];
    const out = [];
    (data.years || []).forEach((y) => {
      (y.semesters || []).forEach((s) => {
        (s.courses || []).forEach((c) => {
          out.push({
            year: y.year,
            semesterId: s.id,
            semesterName: s.name,
            ...c,
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

  const exportCSV = () => {
    if (!data) return;
    const cols = [
      "Plan Name",
      "Identifier",
      "Year",
      "Semester",
      "Course Code",
      "Course Name",
      "Credit",
      "Prerequisites",
      "Offered",
    ];
    const lines = [cols.join(",")];
    filteredCourses.forEach((c) => {
      const row = [
        csvSafe(data.name),
        csvSafe(data.identifier || ""),
        csvSafe(c.year),
        csvSafe(c.semesterName),
        csvSafe(c.code),
        csvSafe(c.name),
        csvSafe(c.credit),
        csvSafe((c.prerequisites || []).join(" / ")),
        csvSafe((c.offered_semester || []).join(" / ")),
      ];
      lines.push(row.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = (data.name || "AcademicPlan").replace(/[^\w.-]+/g, "_");
    a.href = url;
    a.download = `${base}_courses.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const doPrint = () => {
    // Print only the modal content
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
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold truncate flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand" />
              {data?.name || "Academic Plan"}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {data ? (
                <>
                  {data.semesters ?? "—"} semesters • {data.credits ?? "—"}{" "}
                  credits
                  {data.identifier ? ` • ID: ${data.identifier}` : ""}
                </>
              ) : loading ? (
                "Loading…"
              ) : (
                "—"
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses, codes, prerequisites…"
                className="pl-8 pr-3 py-2 border rounded-lg text-sm w-[240px]"
              />
            </div>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
              disabled={!data || loading}
            >
              <Download className="w-4 h-4" /> CSV
            </button>
            <button
              onClick={doPrint}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
              disabled={!data || loading}
            >
              <Printer className="w-4 h-4" /> Print
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
        <div className="flex-1 overflow-auto p-5" ref={printRef}>
          {!data ? (
            <div className="text-sm text-gray-500">
              {loading ? "Loading plan…" : "No data found."}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-sm text-gray-500">
              No courses match your search.
            </div>
          ) : (
            <>
              {/* Grouped view by Year → Semester */}
              {(data.years || []).map((y) => (
                <div key={y.year} className="mb-6">
                  <div className="text-sm font-semibold text-gray-800 mb-2">
                    Year {y.year}
                  </div>
                  {(y.semesters || []).map((s) => {
                    // hide semester block if no rows after filter
                    const rows = (s.courses || [])
                      .map((c) => ({
                        year: y.year,
                        semesterName: s.name,
                        ...c,
                      }))
                      .filter((c) =>
                        filteredCourses.some(
                          (fc) =>
                            fc.code === c.code &&
                            fc.semesterName === c.semesterName &&
                            fc.year === c.year
                        )
                      );
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
                                <TH>Prerequisites</TH>
                                <TH>Offered</TH>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((c, i) => (
                                <tr
                                  key={`${c.code}-${i}`}
                                  className="odd:bg-white even:bg-gray-50/60"
                                >
                                  <TD className="font-medium">{c.code}</TD>
                                  <TD>{c.name}</TD>
                                  <TD className="text-right">
                                    {c.credit ?? ""}
                                  </TD>
                                  <TD className="text-gray-600">
                                    {(c.prerequisites || []).join(", ") || "—"}
                                  </TD>
                                  <TD className="text-gray-600">
                                    {(c.offered_semester || []).join(", ") ||
                                      "—"}
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

function csvSafe(v) {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
