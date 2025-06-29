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
      { title: "Academic Planner", path: "/academic-planner" },
      { title: "Progress Tracker", path: "/progress-tracker" },
      { title: "Course Recommendations", path: "/course-recommendations" },
    ],
  },
  {
    title: "Support",
    submenu: [
      { title: "Contact Advisor", path: "/chat-with-advisor" },
      { title: "FAQ", path: "/faq" },
    ],
  },
];

export const ADMIN_NAV_ITEMS = [
  {
    title: "Home",
    path: "/admin/student-progress",
  },
  {
    title: "Programmes",
    submenu: [
      { title: "Overview", path: "/admin/programmes" },
      { title: "Programme Enrollment", path: "/admin/programme-intakes" },
    ],
  },
  {
    title: "Courses",
    path: "/admin/courses",
  },
  {
    title: "Helpdesk",
    path: "/admin/helpdesk",
  },
];
