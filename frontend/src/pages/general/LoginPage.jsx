import { useState } from "react";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/logo.svg";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-md shadow-md w-full max-w-md border">
        <div className="flex justify-center mb-6">
          <img src={Logo} alt="Plan IT Logo" className="h-28 w-auto" />
        </div>

        <label className="block mb-2 text-[#1E3A8A] font-semibold">
          Username
        </label>
        <div className="flex items-center border border-[#1E3A8A] rounded-md px-3 py-2 mb-4">
          <User className="w-5 h-5 text-[#1E3A8A] mr-2" />
          <input
            type="text"
            placeholder="Username"
            className="w-full outline-none text-[#1E3A8A]"
          />
        </div>

        <label className="block mb-2 text-[#1E3A8A] font-semibold">
          Password
        </label>
        <div className="flex items-center border border-[#1E3A8A] rounded-md px-3 py-2 mb-2">
          <Lock className="w-5 h-5 text-[#1E3A8A] mr-2" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full outline-none text-[#1E3A8A] bg-transparent [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="ml-2 text-[#1E3A8A]"
          >
            {showPassword ? (
              <Eye className="w-5 h-5" />
            ) : (
              <EyeOff className="w-5 h-5" />
            )}
          </button>
        </div>

        <div
          onClick={() => navigate("/forgot-password")}
          className="text-right mb-4 text-sm text-[#1E3A8A] hover:underline cursor-pointer"
        >
          Forgot Password?
        </div>

        <div className="space-y-3">
          <button className="w-full py-2 bg-[#1E3A8A] text-white rounded-md font-medium border border-[#1E3A8A] hover:bg-white hover:text-[#1E3A8A] transition">
            Log in As Advisor
          </button>
          <button className="w-full py-2 bg-[#1E3A8A] text-white rounded-md font-medium border border-[#1E3A8A] hover:bg-white hover:text-[#1E3A8A] transition">
            Log in As Student
          </button>
        </div>

        <div className="text-[#1F2937] mt-4 text-center text-sm">
          Don’t have an account?{" "}
          <span
            className="text-[#1E3A8A] font-semibold hover:underline cursor-pointer"
            onClick={() => navigate("/sign-up")}
          >
            Sign Up
          </span>
        </div>
      </div>
    </div>
  );
}
