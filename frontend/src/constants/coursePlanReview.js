const REQUESTED_FOR_REVIEW = "Requested for review"
const SUGGESTED_BY_ACADEMIC_ADVISOR = "Suggested by Academic Advisor"
const ENDORSED_BY_HOD = "Endorsed by HOD"
const APPROVED_BY_TDID = "Approved by TDID"

export const coursePlanReviewStatus = [
  { key: 1, label:  REQUESTED_FOR_REVIEW},
  { key: 2, label: SUGGESTED_BY_ACADEMIC_ADVISOR },
  { key: 3, label: ENDORSED_BY_HOD },
  { key: 4, label: APPROVED_BY_TDID },
];

export const reviewActionByAdmin = [
  {
    key: 1,
    completionLabel: "Requested for Review",
    pendingLabel: "-",
    approveAction: "-",
    rejectAction: "-",
    requiredAccess: "-",
  },
  {
    key: 2,
    completionLabel: "Reviewed by Academic Advisor",
    pendingLabel: "Awaiting Advisor Review",
    approveAction: "Review as Advisor",
    rejectAction: "Request Revision",
    requiredAccess: "academic_advisor",
  },
  {
    key: 3,
    completionLabel: "Endorsed by HOD",
    pendingLabel: "Awaiting HOD Endorsement",
    approveAction: "Endorse as HOD",
    rejectAction: "Withdrawal Endorsement",
    requiredAccess: "hod",
  },
  {
    key: 4,
    completionLabel: "Approved by TDID",
    pendingLabel: "Awaiting TDID Approval",
    approveAction: "Approve as TDID",
    rejectAction: "Reject as TDID",
    requiredAccess: "tdid",
  }
];

