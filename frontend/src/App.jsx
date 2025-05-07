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

function App() {
  return (
    <Router>
      <Routes>
        {/* General Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/email-sent" element={<EmailSentPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/reset-success" element={<ResetPasswordSuccessPage />} />
        <Route path="/sign-up-student" element={<SignUpStudentPage />} />
        <Route path="/sign-up-advisor" element={<SignUpAdvisorPage />} />
        {/* Faculty Routes */}

        {/* Student Routes */}
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/advisor-dashboard" element={<AdminDashboard />} />
        <Route path="/manual-course-entry" element={<ManualCourseEntry />} />
      </Routes>
    </Router>
  );
}

export default App;
