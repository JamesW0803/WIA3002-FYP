import { useState, useEffect } from "react";
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
import SignUpModal from "./SignUpModal";
import axiosClient from "../../api/axiosClient";
import Notification from "../../components/Students/Notification";
import mongoose from "mongoose";

export default function SignUpStudentPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    contact: "",
    password: "",
    confirmPassword: "",
    department: "",
    programme: "",
    academicSession: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [filteredProgrammes, setFilteredProgrammes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [academicSessions, setAcademicSessions] = useState([]);
  const [isLoading, setIsLoading] = useState({
    departments: false,
    programmes: false,
    sessions: false,
  });
  const [validationErrors, setValidationErrors] = useState({
    username: "",
    email: "",
  });
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "info",
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading((prev) => ({
          ...prev,
          departments: true,
          sessions: true,
        }));

        // Fetch departments
        const departmentsRes = await axiosClient.get("/programmes/departments");
        setDepartments(departmentsRes.data);

        // Fetch academic sessions
        const sessionsRes = await axiosClient.get("/academic-sessions");
        setAcademicSessions(
          Array.isArray(sessionsRes.data) ? sessionsRes.data : []
        );
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
      } finally {
        setIsLoading((prev) => ({
          ...prev,
          departments: false,
          sessions: false,
        }));
      }
    };

    fetchInitialData();
  }, []);

  const showNotification = (message, type = "info") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 5000);
  };

  const validateForm = () => {
    const requiredFields = [
      "username",
      "email",
      "contact",
      "password",
      "confirmPassword",
      "department",
      "programme",
      "academicSession",
    ];

    const missingFields = requiredFields.filter((field) => !formData[field]);

    if (missingFields.length > 0) {
      showNotification(`Please fill in all required fields`, "error");
      return false;
    }

    return true;
  };

  const validateStudentEmail = (email) => {
    // If user hasn't entered anything yet
    if (!email) return { valid: false, message: "Email is required" };

    // Check if it's already a full email (they might paste it)
    if (email.includes("@")) {
      const emailRegex = /^\d{8}@siswa\.um\.edu\.my$/;
      if (!emailRegex.test(email)) {
        return {
          valid: false,
          message: "Must be a valid student email (8 digits @siswa.um.edu.my)",
        };
      }
      return { valid: true };
    }

    // If just numbers entered, validate the numbers
    const numberRegex = /^\d{8}$/;
    if (!numberRegex.test(email)) {
      return {
        valid: false,
        message: "Must be 8 digits (your student ID)",
      };
    }

    return { valid: true };
  };

  const handleDepartmentChange = async (e) => {
    const department = e.target.value;
    setFormData((prev) => ({
      ...prev,
      department,
      programme: "",
    }));

    if (department) {
      try {
        setIsLoading((prev) => ({ ...prev, programmes: true }));
        const encodedDepartment = encodeURIComponent(department);
        const response = await axiosClient.get(
          `/programmes/by-department/${encodedDepartment}`
        );
        setFilteredProgrammes(response.data);
      } catch (err) {
        console.error("Failed to fetch programmes:", err);
        setFilteredProgrammes([]);
      } finally {
        setIsLoading((prev) => ({ ...prev, programmes: false }));
      }
    } else {
      setFilteredProgrammes([]);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUsernameBlur = async () => {
    if (!formData.username) return;

    try {
      const response = await axiosClient.get(
        `/user/check-username/${encodeURIComponent(formData.username)}`
      );
      if (response.data.exists) {
        setValidationErrors((prev) => ({
          ...prev,
          username: "This username is already taken",
        }));
        showNotification(
          `Username '${formData.username}' is already taken`,
          "error"
        );
      } else {
        setValidationErrors((prev) => ({ ...prev, username: "" }));
      }
    } catch (err) {
      console.error("Error checking username:", err);
    }
  };

  const handleEmailBlur = async () => {
    if (!formData.email) return;

    // First validate the format
    const formatValidation = validateStudentEmail(formData.email);
    if (!formatValidation.valid) {
      setValidationErrors((prev) => ({
        ...prev,
        email: formatValidation.message,
      }));
      showNotification(formatValidation.message, "error");
      return;
    }

    // Then check if email exists
    try {
      const fullEmail = formData.email.includes("@")
        ? formData.email
        : `${formData.email}@siswa.um.edu.my`;

      const response = await axiosClient.get(
        `/user/check-email/${encodeURIComponent(fullEmail)}`
      );
      if (response.data.exists) {
        setValidationErrors((prev) => ({
          ...prev,
          email: "This student email is already registered",
        }));
        showNotification(
          `Student email '${fullEmail}' is already registered`,
          "error"
        );
      } else {
        setValidationErrors((prev) => ({ ...prev, email: "" }));
      }
    } catch (err) {
      console.error("Error checking email:", err);
    }
  };

  const handleSignUp = async () => {
    // Validate all fields first
    if (!validateForm()) return;

    const fullEmail = formData.email.includes("@")
      ? formData.email
      : `${formData.email}@siswa.um.edu.my`;

    const formatValidation = validateStudentEmail(fullEmail);
    if (!formatValidation.valid) {
      showNotification(formatValidation.message, "error");
      return;
    }

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      showNotification("Passwords do not match!", "error");
      return;
    }

    // Find the selected academic session object
    const selectedSession = academicSessions.find(
      (session) => session._id === formData.academicSession
    );

    if (!selectedSession) {
      showNotification("Please select a valid academic session", "error");
      return;
    }

    const programmeId = formData.programme;
    if (!mongoose.Types.ObjectId.isValid(programmeId)) {
      showNotification("Invalid programme selected", "error");
      return;
    }

    const payload = {
      name: formData.username,
      email: fullEmail,
      password: formData.password,
      role: "student",
      faculty: "Faculty of Computer Science and Information Technology",
      department: formData.department,
      programme: programmeId,
      contact: formData.contact,
      academicSession: formData.academicSession,
      semester: selectedSession.semester,
    };

    try {
      const response = await axiosClient.post("/user", payload);

      if (response.status === 201) {
        setIsSuccess(true);
        showNotification("Registration successful!", "success");
        setShowModal(true);
      }
    } catch (err) {
      console.error("Registration failed:", err);
      setIsSuccess(false);

      // Handle duplicate email/username errors
      if (err.response?.data?.message === "Email or username already exists") {
        if (err.response.data.error.email) {
          showNotification("This email is already registered", "error");
          setValidationErrors((prev) => ({
            ...prev,
            email: "This email is already registered",
          }));
        }
        if (err.response.data.error.username) {
          showNotification("This username is already taken", "error");
          setValidationErrors((prev) => ({
            ...prev,
            username: "This username is already taken",
          }));
        }
      } else {
        showNotification(
          err.response?.data?.message || "Registration failed",
          "error"
        );
      }

      setShowModal(true);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen py-10 bg-gray-50 font-sans">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-200">
        <div className="flex justify-center mb-8">
          <img src={Logo} alt="Plan IT Logo" className="h-28 w-auto" />
        </div>

        <div className="space-y-5">
          <div>
            <label className="block mb-2 text-[#1E3A8A] font-semibold">
              Username
            </label>
            <div className="flex items-center border border-[#1E3A8A] rounded-md px-3 py-2 focus-within:border-[#1E3A8A] focus-within:ring-1 focus-within:ring-[#1E3A8A]">
              <User className="w-5 h-5 text-[#1E3A8A] mr-2" />
              <input
                name="username"
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                onBlur={handleUsernameBlur}
                className="w-full outline-none text-[#1E3A8A] bg-transparent placeholder-gray-400"
              />
            </div>
            {validationErrors.username && (
              <p className="text-red-600 text-xs mt-1">
                {validationErrors.username}
              </p>
            )}
          </div>

          <div>
            <label className="block mb-2 text-[#1E3A8A] font-semibold">
              Student Email
            </label>
            <div className="flex items-center border border-[#1E3A8A] rounded-md px-3 py-2 focus-within:border-[#1E3A8A] focus-within:ring-1 focus-within:ring-[#1E3A8A]">
              <Mail className="w-5 h-5 text-[#1E3A8A] mr-2" />
              <div className="flex items-center w-full">
                <input
                  name="email"
                  type="text"
                  placeholder="Student ID"
                  value={
                    formData.email.includes("@")
                      ? formData.email.split("@")[0]
                      : formData.email
                  }
                  onChange={(e) => {
                    // Only allow numbers
                    const value = e.target.value.replace(/\D/g, "");
                    // Limit to 8 characters
                    const studentId = value.slice(0, 8);
                    setFormData((prev) => ({
                      ...prev,
                      email: studentId,
                    }));
                  }}
                  onBlur={(e) => {
                    const validation = validateStudentEmail(
                      formData.email.length === 8
                        ? `${formData.email}@siswa.um.edu.my`
                        : formData.email
                    );
                    if (!validation.valid) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        email: validation.message,
                      }));
                      showNotification(validation.message, "error");
                    } else {
                      setValidationErrors((prev) => ({ ...prev, email: "" }));
                    }
                  }}
                  className="w-full outline-none text-[#1E3A8A] bg-transparent placeholder-gray-400"
                />
                <span className="text-gray-500 ml-1 text-sm">
                  @siswa.um.edu.my
                </span>
              </div>
            </div>
            {validationErrors.email && (
              <p className="text-red-600 text-xs mt-1">
                {validationErrors.email}
              </p>
            )}
          </div>

          <div>
            <label className="block mb-2 text-[#1E3A8A] font-semibold">
              Contact Number
            </label>
            <div className="flex items-center border border-[#1E3A8A] rounded-md px-3 py-2 mb-4 focus-within:border-[#1E3A8A] focus-within:ring-1 focus-within:ring-[#1E3A8A]">
              <Phone className="w-5 h-5 text-[#1E3A8A] mr-2" />
              <input
                name="contact"
                type="tel"
                placeholder="Contact number"
                value={formData.contact}
                onChange={handleChange}
                className="w-full outline-none text-[#1E3A8A] bg-transparent placeholder-gray-400"
              />
            </div>
          </div>

          <div>
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
          </div>

          <div>
            <label className="block mb-2 text-[#1E3A8A] font-semibold">
              Confirm Password
            </label>
            <div className="flex items-center border border-[#1E3A8A] rounded-md px-3 py-2 mb-4 focus-within:border-[#1E3A8A] focus-within:ring-1 focus-within:ring-[#1E3A8A]">
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
          </div>

          <div>
            <label className="block mb-2 text-[#1E3A8A] font-semibold">
              Department
            </label>
            <div className="relative">
              <select
                name="department"
                value={formData.department}
                onChange={handleDepartmentChange}
                className="w-full appearance-none border border-[#1E3A8A] px-4 py-2 rounded-md text-[#1E3A8A] bg-white focus-within:border-[#1E3A8A] focus-within:ring-1 focus-within:ring-[#1E3A8A]"
                disabled={isLoading.departments}
              >
                <option value="" disabled hidden>
                  {isLoading.departments
                    ? "Loading departments..."
                    : "Choose your department"}
                </option>
                <option value="Department of Artificial Intelligence">
                  Artificial Intelligence
                </option>
                <option value="Department of Software Engineering">
                  Software Engineering
                </option>
                <option value="Department of Information System">
                  Information Systems
                </option>
                <option value="Department of Computer System and Technology">
                  Computer System and Technology
                </option>
                <option value="Multimedia Unit">Multimedia</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#1E3A8A] w-4 h-4 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block mb-2 text-[#1E3A8A] font-semibold">
              Programme
            </label>
            <div className="relative">
              <select
                name="programme"
                value={formData.programme}
                onChange={handleChange}
                className="w-full appearance-none border border-[#1E3A8A] px-4 py-2 rounded-md text-[#1E3A8A] bg-white focus-within:border-[#1E3A8A] focus-within:ring-1 focus-within:ring-[#1E3A8A]"
                disabled={!formData.department || isLoading.programmes}
              >
                <option value="" disabled hidden>
                  {isLoading.programmes
                    ? "Loading programmes..."
                    : formData.department
                    ? "Select your programme"
                    : "Please select department first"}
                </option>
                {filteredProgrammes.map((prog) => (
                  <option key={prog._id} value={prog._id}>
                    {prog.programme_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#1E3A8A] w-4 h-4 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block mb-2 text-[#1E3A8A] font-semibold">
              Intake Academic Session
            </label>
            <div className="relative mb-6">
              <select
                name="academicSession"
                value={formData.academicSession}
                onChange={handleChange}
                className="w-full appearance-none border border-[#1E3A8A] px-4 py-2 rounded-md text-[#1E3A8A] bg-white focus-within:border-[#1E3A8A] focus-within:ring-1 focus-within:ring-[#1E3A8A]"
                disabled={isLoading.sessions}
                required
              >
                <option value="" disabled hidden>
                  {isLoading.sessions
                    ? "Loading sessions..."
                    : "Select intake academic session"}
                </option>
                {academicSessions.map((session) => (
                  <option key={session._id} value={session._id}>
                    {session.year} - {session.semester}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#1E3A8A] w-4 h-4 pointer-events-none" />
            </div>
          </div>

          <button
            className="w-full mt-2 bg-[#1E3A8A] text-white font-medium py-2 rounded-md hover:bg-white hover:text-[#1E3A8A] border border-[#1E3A8A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:ring-offset-2"
            onClick={handleSignUp}
          >
            Sign Up as Student
          </button>

          <div className="text-[#1F2937] text-center text-sm pt-2">
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
      <SignUpModal
        show={showModal}
        success={isSuccess}
        role="student"
        onClose={() => navigate("/")}
        onRetry={() => setShowModal(false)}
      />
      {notification.show && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification((prev) => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
}
