import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";
import Logo from "../../assets/logo.svg";

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    contact: "",
    password: "",
    confirmPassword: "",
    department: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="flex items-center justify-center min-h-screen py-10 bg-gray-100 font-sans">
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
            name="username"
            type="text"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            className="w-full outline-none text-[#1E3A8A] bg-transparent"
          />
        </div>

        <label className="block mb-2 text-[#1E3A8A] font-semibold">
          Email Address
        </label>
        <div className="flex items-center border border-[#1E3A8A] rounded-md px-3 py-2 mb-4">
          <Mail className="w-5 h-5 text-[#1E3A8A] mr-2" />
          <input
            name="email"
            type="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
            className="w-full outline-none text-[#1E3A8A] bg-transparent"
          />
        </div>

        <label className="block mb-2 text-[#1E3A8A] font-semibold">
          Contact Number
        </label>
        <div className="flex items-center border border-[#1E3A8A] rounded-md px-3 py-2 mb-4">
          <Phone className="w-5 h-5 text-[#1E3A8A] mr-2" />
          <input
            name="contact"
            type="tel"
            placeholder="Contact number"
            value={formData.contact}
            onChange={handleChange}
            className="w-full outline-none text-[#1E3A8A] bg-transparent"
          />
        </div>

        <label className="block mb-2 text-[#1E3A8A] font-semibold">
          Password
        </label>
        <div className="flex items-center border border-[#1E3A8A] rounded-md px-3 py-2 mb-4">
          <Lock className="w-5 h-5 text-[#1E3A8A] mr-2" />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full outline-none text-[#1E3A8A] bg-transparent"
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

        <label className="block mb-2 text-[#1E3A8A] font-semibold">
          Confirm Password
        </label>
        <div className="flex items-center border border-[#1E3A8A] rounded-md px-3 py-2 mb-4">
          <Lock className="w-5 h-5 text-[#1E3A8A] mr-2" />
          <input
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full outline-none text-[#1E3A8A] bg-transparent"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="ml-2 text-[#1E3A8A]"
          >
            {showConfirmPassword ? (
              <Eye className="w-5 h-5" />
            ) : (
              <EyeOff className="w-5 h-5" />
            )}
          </button>
        </div>

        <label className="block mb-2 text-[#1E3A8A] font-semibold">
          Department
        </label>
        <div className="relative mb-4">
          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            className="w-full appearance-none border border-[#1E3A8A] px-4 py-2 rounded-md text-[#1E3A8A] bg-white"
            placeholder="Choose your department"
          >
            <option value="" disabled hidden>
              Choose your department
            </option>
            <option value="Artificial Intelligence">
              Artificial Intelligence
            </option>
            <option value="Software Engineering">Software Engineering</option>
            <option value="Information Systems">Information Systems</option>
            <option value="Computer System and Network">
              Computer System and Network
            </option>
            <option value="Multimedia">Multimedia</option>
            <option value="Data Science">Data Science</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#1E3A8A] w-4 h-4 pointer-events-none" />
        </div>

        <div className="flex items-center my-4">
          <hr className="flex-grow border-gray-300" />
          <span className="mx-2 text-sm text-gray-500">Sign Up as</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        <div className="flex justify-between gap-4">
          <button className="w-full bg-[#1E3A8A] text-white font-medium py-2 rounded-md hover:bg-white hover:text-[#1E3A8A] border border-[#1E3A8A] transition">
            Advisor
          </button>
          <button className="w-full bg-[#1E3A8A] text-white font-medium py-2 rounded-md hover:bg-white hover:text-[#1E3A8A] border border-[#1E3A8A] transition">
            Student
          </button>
        </div>

        <div className="text-[#1F2937] mt-4 text-center text-sm">
          Have an account?{" "}
          <span
            className="text-[#1E3A8A] font-semibold hover:underline cursor-pointer"
            onClick={() => navigate("/")}
          >
            Log In
          </span>
        </div>
      </div>
    </div>
  );
}
