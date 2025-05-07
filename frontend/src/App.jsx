import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/general/LoginPage";
import ForgotPasswordPage from "./pages/general/ForgotPasswordPage";
import EmailSentPage from "./pages/general/EmailSentPage";
import ResetPasswordPage from "./pages/general/ResetPasswordPage";
import ResetPasswordSuccessPage from "./pages/general/ResetPasswordSuccessPage";
import SignUpAdvisorPage from "./pages/general/SignUpAdvisorPage";
import SignUpStudentPage from "./pages/general/SignUpStudentPage";
import StudentDashboard from "./pages/student/StudentDashboard";
import AdminDashboard from "./pages/faculty/dashboard";
import ManualCourseEntry from "./pages/student/ManualCourseEntryPage";
import  ProtectedRoute  from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { AuthProvider } from  "./context/AuthContext";
import Unauthorized from "./pages/general/Unauthorized";

function App() {
  return (

    <Router>
      <AuthProvider>
        <Routes>

          {/* Visitors*/ }
          <Route path="/" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/email-sent" element={<EmailSentPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/reset-success" element={<ResetPasswordSuccessPage />} />
          <Route path="/sign-up-student" element={<SignUpStudentPage />} />
          <Route path="/sign-up-advisor" element={<SignUpAdvisorPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route path="/" element = {<Layout />} >
            {/* Student*/ }
            <Route 
              path="/student-dashboard"
              element = {
                <ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>
              } 
            />
            <Route 
              path="/manual-course-entry"
              element = {
                <ProtectedRoute allowedRoles={["student"]}><ManualCourseEntry /></ProtectedRoute>
              } 
            />
            
            {/* Admin*/ }
            <Route 
              path="/advisor-dashboard"
              element = {
                <ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>
              } 
            />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
