import { useState } from "react";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "../../assets/logo.svg";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { jwtDecode } from "jwt-decode";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (role) => {
    setErrorMessage("");
    if (!username.trim() || !password.trim()) {
      setErrorMessage("Please fill in both username and password.");
      return;
    }

    try {
      const payload = {
        identifier: username,
        password,
        role,
      };

      const response = await axiosClient.post("/user/login", payload);

      if (response.status === 200) {
        const { token, user } = response.data;

        // 1. store the raw token
        localStorage.setItem("token", token);

        // 2. decode it
        const decoded = jwtDecode(token);
        // your backend is signing { user_id: user.id, role: user.role }
        const userId = decoded.user_id;

        // 3. store the decoded user_id
        localStorage.setItem("userId", userId);

        // (optionally) keep the user object around too
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);

        // clear any old semester/year data for students
        if (role === "student") {
          localStorage.removeItem("studentYear");
          localStorage.removeItem("studentSemester");
        }

        // Clear previous year/semester data when logging in
        if (role === "student") {
          localStorage.removeItem("studentYear");
          localStorage.removeItem("studentSemester");
        }
        // Navigate after successful login
        navigate(role === "student" ? "/student-dashboard" : "/admin/student-progress");
      }
    } catch (error) {
      console.error("Error during login:", error);
      setErrorMessage(
        error.response?.data?.message || "Login failed. Please try again."
      );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-md shadow-md w-full max-w-md border">
        <div className="flex justify-center mb-6">
          <img src={Logo} alt="Plan IT Logo" className="h-28 w-auto" />
        </div>

        <label className="block mb-2 text-[#1E3A8A] font-semibold">
          Username or Email
        </label>
        <div className="flex items-center border border-[#1E3A8A] rounded-md px-3 py-2 mb-4">
          <User className="w-5 h-5 text-[#1E3A8A] mr-2" />
          <input
            required
            type="text"
            placeholder="Username or Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full outline-none text-[#1E3A8A]"
          />
        </div>

        <label className="block mb-2 text-[#1E3A8A] font-semibold">
          Password
        </label>
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

        {errorMessage && (
          <div className="text-red-500 text-sm mt-2 text-center">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => handleLogin("admin")}
            className="w-full py-2 bg-[#1E3A8A] text-white rounded-md font-medium border border-[#1E3A8A] hover:bg-white hover:text-[#1E3A8A] transition"
          >
            Log in As Advisor
          </button>
          <button
            onClick={() => handleLogin("student")}
            className="w-full py-2 bg-[#1E3A8A] text-white rounded-md font-medium border border-[#1E3A8A] hover:bg-white hover:text-[#1E3A8A] transition"
          >
            Log in As Student
          </button>
        </div>

        <div className="text-[#1F2937] mt-4 text-center text-sm">
          Don’t have an account?{" "}
          <span
            className="text-[#1E3A8A] font-semibold hover:underline cursor-pointer"
            onClick={() => setShowModal(true)}
          >
            Sign Up
          </span>
        </div>
      </div>
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-20">
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
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
