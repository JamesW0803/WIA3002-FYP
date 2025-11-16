import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import LoginPage from "./pages/general/LoginPage";
import ForgotPasswordPage from "./pages/general/ForgotPasswordPage";
import EmailSentPage from "./pages/general/EmailSentPage";
import ResetPasswordPage from "./pages/general/ResetPasswordPage";
import ResetPasswordSuccessPage from "./pages/general/ResetPasswordSuccessPage";
import SignUpAdvisorPage from "./pages/general/SignUpAdvisorPage";
import SignUpStudentPage from "./pages/general/SignUpStudentPage";
import StudentDashboard from "./pages/student/StudentDashboard";
import AdminDashboard from "./pages/faculty/dashboard";
import AcademicProfile from "./pages/student/AcademicProfile";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import TranscriptView from "./pages/student/TranscriptView";
import AcademicPlanner from "./pages/student/AcademicPlanner";
import ProgressTracker from "./pages/student/ProgressTracker";
import CourseRecommendations from "./pages/student/CourseRecommendations";
import FAQsPage from "./pages/student/FAQPage";
import ContactAdvisorPage from "./pages/student/ContactAdvisorPage";
import StudentProfile from "./pages/student/StudentProfile";
import ProgrammeEnrollmentDetails from "./pages/faculty/programmeIntakes/ProgrammeEnrollmentDetails";
import GraduationRequirement from "./components/Faculty/GraduationRequirement";
import CoursePlan from "./components/Faculty/CoursePlan";
import StudentAcademicProfile from "./components/Faculty/StudentAcademicProfile";
import StudentGraduationRequirement from "./components/Faculty/StudentGraduationRequirement";
import StudentCoursePlan from "./components/Faculty/StudentCoursePlan";
import DefaultProgrammePlan from "./components/Faculty/DefaultProgrammePlan";

import { AuthProvider } from "./context/AuthContext";
import Unauthorized from "./pages/general/Unauthorized";
import ManageCourses from "./pages/faculty/courses/ManageCourses";
import Helpdesk from "./pages/faculty/Helpdesk";
import ManageProgrammes from "./pages/faculty/programmes/ManageProgrammes";
import CourseDetails from "./pages/faculty/courses/CourseDetails";
import StudentDetails from "./pages/faculty/studentProgress/StudentDetails";
import ProgrammeDetails from "./pages/faculty/programmes/ProgrammeDetails";
import AddCourse from "./pages/faculty/courses/AddCourse";
import AdminProfile from "./pages/faculty/AdminProfile";
import ManageProgrammeEnrollments from "./pages/faculty/programmeIntakes/ManageProgrammeEnrollments";
import AddProgrammeEnrollment from "./pages/faculty/programmeIntakes/AddProgrammeEnrollment";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Visitors*/}
          <Route path="/" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/email-sent" element={<EmailSentPage />} />
          <Route
            path="/reset-password/:token"
            element={<ResetPasswordPage />}
          />
          <Route path="/reset-success" element={<ResetPasswordSuccessPage />} />
          <Route path="/sign-up-student" element={<SignUpStudentPage />} />
          <Route path="/sign-up-advisor" element={<SignUpAdvisorPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Student*/}
          <Route path="/" element={<Layout />}>
            <Route
              path="/student-dashboard"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/academic-profile"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <AcademicProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transcript-view"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <TranscriptView />
                </ProtectedRoute>
              }
            />

            <Route
              path="/academic-planner"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <AcademicPlanner />
                </ProtectedRoute>
              }
            />

            <Route
              path="/progress-tracker"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <ProgressTracker />
                </ProtectedRoute>
              }
            />

            <Route
              path="/course-recommendations"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <CourseRecommendations />
                </ProtectedRoute>
              }
            />

            <Route
              path="/chat-with-advisor"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <ContactAdvisorPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/faq"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <FAQsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student-profile"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentProfile />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Faculty*/}
          <Route path="/admin" element={<Layout />}>
            <Route
              path="student-progress"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            {/* <Route
                path="student-progress/:student_name"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <StudentDetails/>
                  </ProtectedRoute>
                }
              /> */}
            <Route
              path="student-progress/:student_name"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <StudentDetails />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={<Navigate to="academic-profile" replace />}
              />
              <Route path="academic-profile" element={<StudentAcademicProfile />} />
              <Route path="graduation-requirement" element={<StudentGraduationRequirement />}/>
              <Route path="default-programme-plan" element={<DefaultProgrammePlan />} />
              <Route path="course-plan" element={<StudentCoursePlan />} />
            </Route>
            <Route
              path="programmes"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ManageProgrammes />
                </ProtectedRoute>
              }
            />
            <Route
              path="programme-intakes"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ManageProgrammeEnrollments />
                </ProtectedRoute>
              }
            />
            <Route
              path="programme-intakes/add-programme-intake"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AddProgrammeEnrollment />
                </ProtectedRoute>
              }
            />
            <Route
              path="programme-intakes/:programme_intake_code"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ProgrammeEnrollmentDetails />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={<Navigate to="graduation-requirement" replace />}
              />
              <Route
                path="graduation-requirement"
                element={<GraduationRequirement />}
              />
              <Route path="course-plan" element={<CoursePlan />} />
            </Route>
            <Route
              path="programmes/:programme_code"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ProgrammeDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="courses"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ManageCourses />
                </ProtectedRoute>
              }
            />
            <Route
              path="courses/:course_code"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <CourseDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="courses/add-course"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AddCourse />
                </ProtectedRoute>
              }
            />
            <Route
              path="helpdesk"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Helpdesk />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminProfile />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
