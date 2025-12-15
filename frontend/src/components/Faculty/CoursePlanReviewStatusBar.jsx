import { CheckCircle2, Dot } from "lucide-react";
import { reviewActionByAdmin } from "../../constants/coursePlanReview";

/* =========================
   Small Bar Components
========================= */

const CompletedBar = ({ label }) => (
  <div
    className="
      flex items-center gap-2 px-3 py-1 rounded-full text-xs border
      bg-green-100 text-green-700 border-green-300
    "
  >
    <CheckCircle2 className="w-4 h-4" />
    <span>{label}</span>
  </div>
);

const ActiveBar = ({ step, accessLevel, setCoursePlanStatus }) => {
  const canTakeAction = accessLevel === step.requiredAccess;

  // === ACTIONABLE STATE ===
  if (canTakeAction) {
    return (
      <button
        onClick={() => setCoursePlanStatus(step.key)}
        className="
          flex items-center gap-2 px-3 py-1 rounded-full text-xs border
          bg-blue-100 text-blue-700 border-blue-300
          hover:bg-blue-200 transition
        "
      >
        <Dot className="w-5 h-5" />
        <span>{step.actionLabel}</span>
      </button>
    );
  }

  // === NON-ACTIONABLE STATE ===
  return (
    <div
      className="
        flex items-center gap-2 px-3 py-1 rounded-full text-xs border
        bg-gray-100 text-gray-500 border-gray-300
        cursor-not-allowed
      "
    >
      <Dot className="w-5 h-5 opacity-50" />
      <span>{step.pendingLabel}</span>
    </div>
  );
};

const PendingBar = ({ label }) => (
  <div
    className="
      flex items-center gap-2 px-3 py-1 rounded-full text-xs border
      bg-gray-100 text-gray-600 border-gray-300 cursor-not-allowed
    "
  >
    <Dot className="w-5 h-5 opacity-40" />
    <span>{label}</span>
  </div>
);

/* =========================
   Parent Component
========================= */

const CourseReviewStatusBar = ({ status, accessLevel, setCoursePlanStatus }) => {
  // status = 0 | 1 | 2 | 3

  const isCompleted = (stepKey) => status >= stepKey;
  const isActive = (stepKey) => status + 1 === stepKey;

  return (
    <div className="flex items-center gap-2 flex-wrap mt-2">
      {reviewActionByAdmin.map((step) => {
        if (isCompleted(step.key)) {
          return (
            <CompletedBar
              key={step.key}
              label={step.completionLabel}
            />
          );
        }

        if (isActive(step.key)) {
          return (
            <ActiveBar
              key={step.key}
              step={step}
              accessLevel={accessLevel}
              setCoursePlanStatus={setCoursePlanStatus}
            />
          );
        }

        return (
          <PendingBar
            key={step.key}
            label={step.pendingLabel}
          />
        );
      })}
    </div>
  );
};

export default CourseReviewStatusBar;
