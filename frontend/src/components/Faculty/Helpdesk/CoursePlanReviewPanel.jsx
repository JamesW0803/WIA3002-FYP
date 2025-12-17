import { CheckCircle2, Dot } from "lucide-react";
import { reviewActionByAdmin } from "../../../constants/coursePlanReview";

/* =========================
   Status Pill Components
========================= */

const CompletedBar = ({ label }) => (
  <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[11px] border bg-green-100 text-green-700 border-green-300">
    <CheckCircle2 className="w-4 h-4" />
    <span>{label}</span>
  </div>
);

const PendingBar = ({ label }) => (
  <div className="flex items-center gap-2 px-3 py-1 rounded-full text-[11px] border bg-gray-100 text-gray-600 border-gray-300">
    <Dot className="w-5 h-5 opacity-40" />
    <span>{label}</span>
  </div>
);

/* =========================
   Status Indicator Bar
   (Completed + Pending only)
========================= */

const CourseReviewStatusBar = ({ status }) => {
  const isCompleted = (stepKey) => status >= stepKey;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {reviewActionByAdmin.map((step) => {
        if(step.key === 1) return 
        return (
          isCompleted(step.key) ? (
            <CompletedBar
              key={step.key}
              label={step.completionLabel}
            />
          ) : (
            <PendingBar
              key={step.key}
              label={step.pendingLabel}
            />
          )
        )
      }

      )}
    </div>
  );
};

/* =========================
   Header-style Review Panel
========================= */

const CoursePlanReviewPanel = ({
  status,
  accessLevel,
  setCoursePlanStatus,
  onViewPlan,
}) => {
  // Determine current active step (status + 1)
  const adminStep = reviewActionByAdmin.find(
    (step) => step.requiredAccess === accessLevel
  );

  const currentStep = reviewActionByAdmin.find(
    (step) => step.key === status
  )

  const canAction = ( 
    adminStep?.key === currentStep?.key ||
    (adminStep?.key)-1 === currentStep?.key 
  )

  const isCompleted = status >= adminStep?.key;

  const handleCoursePlanStatusChange = () => {    
    if(isCompleted){
      setCoursePlanStatus(adminStep.key-1)
    }else{
      setCoursePlanStatus(adminStep.key)
    }
  }

return (
  <div className="bg-white border-b">
    <div className="px-4 py-2 flex items-center justify-between gap-4">
      {/* Left: Title + Status indicators */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
          Review Status
        </span>

        <CourseReviewStatusBar status={status} />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {canAction && (
          <button
            onClick={handleCoursePlanStatusChange}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-brand text-white hover:bg-brand/90 transition"
          >
            {isCompleted
              ? adminStep.rejectAction
              : adminStep.approveAction}
          </button>
        )}

        <button
          onClick={onViewPlan}
          className="text-sm font-medium text-brand hover:underline whitespace-nowrap"
        >
          View Course Plan
        </button>
      </div>
    </div>
  </div>
);

};

export default CoursePlanReviewPanel;