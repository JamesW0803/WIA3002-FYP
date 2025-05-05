import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/general/LoginPage";
import ForgotPasswordPage from "./pages/general/ForgotPasswordPage";
import EmailSentPage from "./pages/general/EmailSentPage";
import ResetPasswordPage from "./pages/general/ResetPasswordPage";
import ResetPasswordSuccessPage from "./pages/general/ResetPasswordSuccessPage";
import SignUpAdvisorPage from "./pages/general/SignUpAdvisorPage";
import SignUpStudentPage from "./pages/general/SignUpStudentPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/email-sent" element={<EmailSentPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/reset-success" element={<ResetPasswordSuccessPage />} />
        <Route path="/sign-up-student" element={<SignUpStudentPage />} />
        <Route path="/sign-up-advisor" element={<SignUpAdvisorPage />} />
      </Routes>
    </Router>
  );
}

export default App;
