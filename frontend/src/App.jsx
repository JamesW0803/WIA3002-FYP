import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/general/LoginPage";
import ForgotPasswordPage from "./pages/general/ForgotPasswordPage";
import EmailSentPage from "./pages/general/EmailSentPage";
import ResetPasswordPage from "./pages/general/ResetPasswordPage";
import ResetPasswordSuccessPage from "./pages/general/ResetPasswordSuccessPage";
import SignUpPage from "./pages/general/SignUpPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/email-sent" element={<EmailSentPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/reset-success" element={<ResetPasswordSuccessPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
      </Routes>
    </Router>
  );
}

export default App;
