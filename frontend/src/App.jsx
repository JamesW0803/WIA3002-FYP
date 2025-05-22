import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/general/LoginPage";
import ForgotPasswordPage from "./pages/general/ForgotPasswordPage";
import EmailSentPage from "./pages/general/EmailSentPage";
import ResetPasswordPage from "./pages/general/ResetPasswordPage";
import ResetPasswordSuccessPage from "./pages/general/ResetPasswordSuccessPage";
import SignUpAdvisorPage from "./pages/general/SignUpAdvisorPage";
import SignUpStudentPage from "./pages/general/SignUpStudentPage";
import StudentDashboard from "./pages/student/StudentDashboard";
import AdminDashboard from "./pages/faculty/Dashboard";
import AcademicProfile from "./pages/student/AcademicProfile";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import TranscriptView from "./pages/student/TranscriptView";
import ProgramPlanner from "./pages/student/ProgramPlanner";
import GPAPlanner from "./pages/student/GPAPlanner";
import SavedPlans from "./pages/student/SavedPlans";
import ProgressTracker from "./pages/student/ProgressTracker";
import CourseRecommendations from "./pages/student/CourseRecommendations";
import HelpdeskPage from "./pages/student/Helpdesk";
import FAQsPage from "./pages/student/FAQPage";
import ContactAdvisorPage from "./pages/student/ContactAdvisorPage";

import { AuthProvider } from "./context/AuthContext";
import Unauthorized from "./pages/general/Unauthorized";
import ManageCourses from "./pages/faculty/courses/ManageCourses";
import Helpdesk from "./pages/faculty/Helpdesk";
import ManageProgrammes from "./pages/faculty/programmes/ManageProgrammes";
import CourseDetails from "./pages/faculty/courses/CourseDetails";
import StudentDetails from "./pages/faculty/StudentDetails";
import ProgrammeDetails from "./pages/faculty/programmes/ProgrammeDetails";

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
              path="/program-planner"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <ProgramPlanner />
                </ProtectedRoute>
              }
            />

            <Route
              path="/gpa-planner"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <GPAPlanner />
                </ProtectedRoute>
              }
            />

            <Route
              path="/saved-plans"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <SavedPlans />
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
              path="/helpdesk"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <HelpdeskPage />
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
              path="/chat-with-advisor"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <ContactAdvisorPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Faculty*/}
          <Route path = "/admin" element = {<Layout/>}>
              <Route
                path="home"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="home/:studentName"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <StudentDetails/>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="programmes"
                element = {
                  <ProtectedRoute allowedRoles={["admin"]}><ManageProgrammes /></ProtectedRoute>
                } 
              />
              <Route 
                path="programmes/:programme_code"
                element = {
                  <ProtectedRoute allowedRoles={["admin"]}><ProgrammeDetails /></ProtectedRoute>
                } 
              />
              <Route 
                path="courses"
                element = {
                  <ProtectedRoute allowedRoles={["admin"]}><ManageCourses /></ProtectedRoute>
                }
              />
              <Route 
                  path="courses/:course_code"
                  element = {
                    <ProtectedRoute allowedRoles={["admin"]}><CourseDetails /></ProtectedRoute>
                  } 
              />
              <Route 
                path="helpdesk"
                element = {
                  <ProtectedRoute allowedRoles={["admin"]}><Helpdesk /></ProtectedRoute>
                } 
              />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
