import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export default function ResetPasswordSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
      <div className="bg-white p-8 rounded-md shadow-md w-full max-w-md text-center">
        <CheckCircle className="w-12 h-12 text-[#1E3A8A] mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2 text-[#1E3A8A]">
          Password Reset Successfully
        </h2>
        <p className="text-[#1F2937] mb-6">
          Your password has been reset. You can now log in with your new
          password.
        </p>
        <button
          onClick={() => navigate("/")}
          className="bg-[#1E3A8A] text-white font-medium px-6 py-2 rounded-md hover:bg-white hover:text-[#1E3A8A] border border-[#1E3A8A] transition"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
