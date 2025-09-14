import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, Lock, Eye, EyeOff } from "lucide-react";
import Logo from "../../assets/logo.svg";
import SignUpModal from "./SignUpModal";

export default function SignUpAdvisorPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    contact: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSignUp = async () => {
    const { username, email, contact, password, confirmPassword } = formData;

    if (!username || !email || !contact || !password || !confirmPassword) {
      alert("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    //Implement checking email and phone format here

    const payload = {
      name: formData.username,
      email: formData.email,
      password: formData.password,
      role: "admin",
      access_level: "basic",
    };

    try {
      const response = await fetch("http://localhost:5000/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok) {
        console.log("Advisor registered:", result);
        setIsSuccess(true);
        setShowModal(true);
      } else {
        console.error("Error:", result.message);
        setIsSuccess(false);
        setShowModal(true);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setIsSuccess(false);
      setShowModal(true);
    }
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
            className="w-full outline-none text-[#1E3A8A] bg-transparent [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
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

        <button
          className="w-full mt-4 bg-[#1E3A8A] text-white font-medium py-2 rounded-md hover:bg-white hover:text-[#1E3A8A] border border-[#1E3A8A] transition"
          onClick={handleSignUp}
        >
          Sign Up as Advisor
        </button>

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
      <SignUpModal
        show={showModal}
        success={isSuccess}
        role="advisor"
        onClose={() => navigate("/")}
        onRetry={() => setShowModal(false)}
      />
    </div>
  );
}
