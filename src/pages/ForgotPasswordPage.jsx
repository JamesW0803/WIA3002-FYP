import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    navigate("/email-sent");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
      <div className="bg-white p-8 rounded-md shadow-md w-full max-w-md">
        <button
          onClick={() => navigate("/")}
          className="flex items-center text-[#1E3A8A] mb-4 hover:underline"
        >
          <ArrowLeft className="mr-1 w-4 h-4" /> Back to Login
        </button>
        <h2 className="text-xl font-semibold mb-4 text-[#1E3A8A]">
          Forgot Password
        </h2>
        <label className="block mb-2 text-[#1E3A8A]">
          Enter your email address
        </label>
        <input
          type="email"
          placeholder="example@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-[#1E3A8A] px-4 py-2 rounded-md mb-4"
        />
        <button
          onClick={handleSubmit}
          className="w-full bg-[#1E3A8A] text-white font-medium py-2 rounded-md hover:bg-white hover:text-[#1E3A8A] border border-[#1E3A8A] transition"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
