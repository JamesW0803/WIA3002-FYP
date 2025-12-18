import { X } from "lucide-react";
import { reviewActionByAdmin } from "../../../constants/coursePlanReview";

const cls = (...a) => a.filter(Boolean).join(" ");

export default function CoursePlanReviewModal({
  open,
  onClose,
  plan,
  academicProfile,

  // 🔽 new props
  status,
  accessLevel,
  onAction,
}) {
  if (!open) return null;

  /**
   * Merge completed academic entries + planned courses
   */
  const mergedYears = (() => {
    const map = [];

    // 1️⃣ Completed courses
    if (academicProfile?.entries?.length) {
      academicProfile.entries.forEach((entry) => {
        const y = entry.year - 1;
        const s = entry.semester - 1;

        if (!map[y]) map[y] = { year: entry.year, semesters: [] };
        if (!map[y].semesters[s]) {
          map[y].semesters[s] = {
            semester: s + 1,
            courses: [],
          };
        }

        map[y].semesters[s].courses.push({
          source: "completed",
          course: entry.course,
        });
      });
    }

    // 2️⃣ Planned courses
    if (plan?.years?.length) {
      plan.years.forEach((yearPlan) => {
        const y = yearPlan.year - 1;
        if (!map[y]) map[y] = { year: yearPlan.year, semesters: [] };

        yearPlan.semesters.forEach((semPlan, idx) => {
          if (!map[y].semesters[idx]) {
            map[y].semesters[idx] = {
              semester: idx + 1,
              courses: [],
            };
          }

          semPlan.courses.forEach((c) => {
            const exists = map[y].semesters[idx].courses.some(
              (x) =>
                x.course?.course_code === c.course?.course_code
            );

            if (!exists) {
              map[y].semesters[idx].courses.push({
                source: "planned",
                course: c.course,
              });
            }
          });
        });
      });
    }

    return map.filter(Boolean);
  })();

  return (
    <div className="fixed inset-0 z-[220]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(1200px,96vw)] h-[min(85vh,900px)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="min-w-0">
            <div className="font-semibold text-lg truncate">
              {plan?.name || "Course Plan Review"}
            </div>
            <div className="text-xs text-gray-500">
              Review completed and planned courses
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5">
          {mergedYears.length === 0 ? (
            <div className="text-sm text-gray-500">
              No academic data available.
            </div>
          ) : (
            <div className="space-y-8">
              {mergedYears.map((year) => (
                <div key={year.year}>
                  <div className="mb-3 text-sm font-semibold text-gray-800">
                    Year {year.year}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SemesterColumn semester={year.semesters[0]} />
                    <SemesterColumn semester={year.semesters[1]} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🔽 Action Footer */}
        <ReviewActionFooter
          status={status}
          accessLevel={accessLevel}
          onAction={onAction}
        />
      </div>
    </div>
  );
}

/* =========================
   Semester Column
========================= */

function SemesterColumn({ semester }) {
  if (!semester) {
    return (
      <div className="border rounded-xl p-4 bg-gray-50 text-sm text-gray-400 italic">
        No semester data
      </div>
    );
  }

  const courses = semester.courses || [];
  const totalCredits = courses.reduce(
    (t, c) => t + (Number(c.course?.credit_hours) || 0),
    0
  );

  const hasCompleted = courses.some((c) => c.source === "completed");
  const hasPlanned = courses.some((c) => c.source === "planned");

  const semesterStatus =
    hasCompleted && hasPlanned
      ? "Mixed"
      : hasPlanned
      ? "Planned"
      : "Completed";

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="px-4 py-2 bg-gray-50 border-b flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-gray-700">
            Semester {semester.semester}
          </div>
          <div className="text-xs text-gray-500">
            {courses.length} course{courses.length !== 1 ? "s" : ""} •{" "}
            {totalCredits} credits
          </div>
        </div>

        <span
          className={cls(
            "text-xs font-medium px-2 py-1 rounded-full",
            semesterStatus === "Completed" &&
              "bg-green-100 text-green-700",
            semesterStatus === "Planned" &&
              "bg-blue-100 text-blue-700",
            semesterStatus === "Mixed" &&
              "bg-yellow-100 text-yellow-700"
          )}
        >
          {semesterStatus}
        </span>
      </div>

      {courses.length === 0 ? (
        <div className="p-4 text-sm text-gray-500 italic">
          No courses in this semester.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <TH>Code</TH>
              <TH>Course</TH>
              <TH className="w-20 text-right">Credit</TH>
            </tr>
          </thead>
          <tbody>
            {courses.map((item, idx) => {
              const course = item.course || {};
              return (
                <tr key={idx} className="border-b">
                  <TD className="font-medium">
                    {course.course_code || "—"}
                  </TD>
                  <TD>{course.course_name || "—"}</TD>
                  <TD className="text-right">
                    {course.credit_hours ?? "—"}
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* =========================
   Review Action Footer
========================= */

function ReviewActionFooter({ status, accessLevel, onAction }) {
  const adminStep = reviewActionByAdmin.find(
    (s) => s.requiredAccess === accessLevel
  );

  const currentStep = reviewActionByAdmin.find(
    (s) => s.key === status
  );

  const canAction =
    adminStep?.key === currentStep?.key ||
    adminStep?.key - 1 === currentStep?.key;

  if (!canAction) return null;

  const isCompleted = status >= adminStep.key;

  return (
    <div className="px-5 py-4 border-t bg-gray-50 flex justify-end gap-3">
      <button
        onClick={() =>
          onAction(isCompleted ? adminStep.key - 1 : adminStep.key)
        }
        className={cls(
          "px-4 py-2 rounded-lg text-sm font-medium transition",
          isCompleted
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-brand text-white hover:bg-brand/90"
        )}
      >
        {isCompleted
          ? adminStep.rejectAction
          : adminStep.approveAction}
      </button>
    </div>
  );
}

/* =========================
   Table Helpers
========================= */

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
    <td className={cls("px-3 py-2 align-top", className)}>
      {children}
    </td>
  );
}
