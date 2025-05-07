import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import axiosClient from "../../api/axiosClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [showSignupChoiceModal, setShowSignupChoiceModal] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      await axiosClient.post("user/request-reset", { email });
      navigate("/email-sent");
    } catch (error) {
      if (error.response?.status === 404) {
        setShowNotFoundModal(true);
      } else {
        alert("Something went wrong. Please try again later.");
      }
    }
  };

  const openSignupChoiceModal = () => {
    setShowNotFoundModal(false);
    setShowSignupChoiceModal(true);
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
          required
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
        {showNotFoundModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white px-10 py-8 rounded shadow-md text-center w-[400px] min-h-[175px]">
              <p className="text-red-600 mb-6 text-lg">Email does not exist.</p>
              <div className="flex flex-col items-center space-y-4">
                <button
                  onClick={openSignupChoiceModal}
                  className="w-full bg-[#1E3A8A] text-white font-medium py-2 rounded-md hover:bg-white hover:text-[#1E3A8A] border border-[#1E3A8A] transition"
                >
                  Create Account
                </button>
                <button
                  onClick={() => setShowNotFoundModal(false)}
                  className="text-gray-600 underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showSignupChoiceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-md p-6 w-full max-w-sm shadow-lg border">
              <h2 className="text-lg font-semibold text-[#1E3A8A] mb-4 text-center">
                Sign Up As
              </h2>
              <div className="space-y-3">
                <button
                  className="w-full py-2 bg-[#1E3A8A] text-white rounded-md font-medium border border-[#1E3A8A] hover:bg-white hover:text-[#1E3A8A] transition"
                  onClick={() => navigate("/sign-up-advisor")}
                >
                  Advisor
                </button>
                <button
                  className="w-full py-2 bg-[#1E3A8A] text-white rounded-md font-medium border border-[#1E3A8A] hover:bg-white hover:text-[#1E3A8A] transition"
                  onClick={() => navigate("/sign-up-student")}
                >
                  Student
                </button>
                <button
                  className="w-full mt-2 text-sm text-gray-500 hover:underline"
                  onClick={() => setShowSignupChoiceModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
