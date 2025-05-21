export const STUDENT_NAV_ITEMS = [
  {
    title: "Dashboard",
    path: "/student-dashboard",
  },
  {
    title: "Academic",
    submenu: [
      { title: "Academic Profile", path: "/academic-profile" },
      { title: "Transcript View", path: "/transcript-view" },
    ],
  },
  {
    title: "Planner",
    submenu: [
      { title: "Program Planner", path: "/program-planner" },
      { title: "GPA Planner", path: "/gpa-planner" },
      { title: "Saved Plans", path: "/saved-plans" },
      { title: "Progress Tracker", path: "/progress-tracker" },
      { title: "Course Recommendations", path: "/course-recommendations" },
    ],
  },
  {
    title: "Support",
    submenu: [
      { title: "Helpdesk", path: "/helpdesk" },
      { title: "FAQ", path: "/faq" },
      { title: "Contact Advisor", path: "/chat-with-advisor" },
    ],
  },
];

export const ADMIN_NAV_ITEMS = [
  {
    title: "Home",
    path: "/advisor-dashboard",
  },
  {
    title: "Manage courses",
    path: "/manage-courses",
  },
  {
    title: "Helpdesk",
    path: "/admin-helpdesk",
  },
];
