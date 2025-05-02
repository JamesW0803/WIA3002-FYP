import { useNavigate } from "react-router-dom";

export default function EmailSentPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
      <div className="bg-white p-8 rounded-md shadow-md w-full max-w-md text-center">
        <h2 className="text-xl font-semibold mb-4 text-[#1E3A8A]">
          Check Your Email
        </h2>
        <p className="text-[#1F2937] mb-6">
          A password reset link has been sent to your email address.
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
