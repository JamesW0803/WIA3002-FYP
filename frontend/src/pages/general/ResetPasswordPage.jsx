import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { useNavigate, useParams } from "react-router-dom";
import { useAlert } from "../../components/ui/AlertProvider";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { token } = useParams();
  const { alert } = useAlert();

  const handleReset = async () => {
    if (password !== confirmPassword) {
      alert("Passwords do not match.", { title: "Error" });
      return;
    }

    try {
      await axiosClient.post("user/reset-password", {
        token,
        password,
      });
      navigate("/reset-success");
    } catch (err) {
      alert("Token expired or invalid. Please try again.", { title: "Error" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
      <div className="bg-white p-8 rounded-md shadow-md w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-[#1E3A8A]">
          Reset Password
        </h2>

        <label className="block mb-2 text-[#1E3A8A]">New Password</label>
        <div className="flex items-center border border-[#1E3A8A] rounded-md px-3 py-2 mb-2">
          <Lock className="w-5 h-5 text-[#1E3A8A] mr-2" />
          <input
            required
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full outline-none text-[#1E3A8A] bg-transparent [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="ml-2 text-[#1E3A8A]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <Eye className="w-5 h-5" />
            ) : (
              <EyeOff className="w-5 h-5" />
            )}
          </button>
        </div>

        <label className="block mb-2 text-[#1E3A8A]">
          Confirm New Password
        </label>
        <div className="flex items-center border border-[#1E3A8A] rounded-md px-3 py-2 mb-2">
          <Lock className="w-5 h-5 text-[#1E3A8A] mr-2" />
          <input
            required
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full outline-none text-[#1E3A8A] bg-transparent [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="ml-2 text-[#1E3A8A]"
            aria-label={
              showConfirmPassword
                ? "Hide confirm password"
                : "Show confirm password"
            }
          >
            {showConfirmPassword ? (
              <Eye className="w-5 h-5" />
            ) : (
              <EyeOff className="w-5 h-5" />
            )}
          </button>
        </div>

        <button
          onClick={handleReset}
          className="w-full bg-[#1E3A8A] text-white font-medium py-2 mt-4 rounded-md hover:bg-white hover:text-[#1E3A8A] border border-[#1E3A8A] transition"
        >
          Reset Password
        </button>
      </div>
    </div>
  );
}
