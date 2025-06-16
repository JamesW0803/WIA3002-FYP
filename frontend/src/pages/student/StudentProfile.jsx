import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Eye,
  EyeOff,
  LogOut,
  Edit,
  Save,
  X,
  Lock,
  Image,
  User,
} from "lucide-react";
import axiosClient from "../../api/axiosClient";

const getInitials = (username) => {
  const match = username.match(/[a-zA-Z]/g) || [];
  return match.slice(0, 2).join("").toUpperCase();
};

const DEFAULT_COLORS = [
  "#1E3A8A", // Navy Blue
  "#065F46", // Emerald Green
  "#7C3AED", // Purple
  "#DC2626", // Red
  "#D97706", // Amber
  "#059669", // Green
  "#2563EB", // Blue
  "#9333EA", // Violet
];

const StudentProfile = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [username] = useState("jwyn0803");
  const [name, setName] = useState("James Wong Yi Ngie");
  const [email] = useState("22004837@siswa.um.edu.my");
  const [studentId] = useState("22004837");
  const [intake, setIntake] = useState("-");
  const [phone, setPhone] = useState("011-10592288");
  const [address, setAddress] = useState("Pacific 63, Jalan 13/6");
  const [programme, setProgramme] = useState("-");
  const [department, setDepartment] = useState("-");
  const [status] = useState("Active");

  const [bgColor, setBgColor] = useState("#1E3A8A");
  const [profilePic, setProfilePic] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showProfilePicOptions, setShowProfilePicOptions] = useState(false);

  const storedYear = parseInt(localStorage.getItem("studentYear")) || 1;
  const storedSemester = parseInt(localStorage.getItem("studentSemester")) || 1;
  const storedCgpa = parseFloat(localStorage.getItem("studentCGPA")) || 0.0;

  const [semester] = useState(storedYear * storedSemester);
  const [cgpa] = useState(storedCgpa);

  const handleSetDefaultProfile = (color) => {
    setBgColor(color);
    setProfilePic(null);
    setShowProfilePicOptions(false);
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePic(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  const handlePasswordResetRequest = () => {
    setShowPasswordModal(true);
  };

  const handlePasswordChange = () => {
    // Validate passwords
    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    // Reset form and close modal
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setShowPasswordModal(false);

    // Show success message
    alert("Password changed successfully!");
  };

  useEffect(() => {
    const fetchStudentProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const user = JSON.parse(localStorage.getItem("user")); // { username, role }
        const decoded = JSON.parse(atob(token.split(".")[1]));
        const userId = decoded.user_id;

        console.log("📦 Token:", token);
        console.log("👤 Decoded userId:", userId);
        console.log(
          "📤 Sending request to: ",
          `/user/student-profile/${userId}`
        );

        const res = await axiosClient.get(`/user/student-profile/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = res.data;
        console.log("✅ Received student profile:", data);

        setProgramme(data.programme);
        setDepartment(data.department);
        setIntake(data.intake);
      } catch (error) {
        console.error("❌ Failed to load student profile:", error);
        if (error.response) {
          console.error(
            "📡 Server responded with:",
            error.response.status,
            error.response.data
          );
        }
      }
    };

    fetchStudentProfile();
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gray-50">
      <div className="p-4 md:p-8 max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#1E3A8A]" />
                  Change Password
                </h2>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError("");
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-[#1E3A8A] font-semibold">
                    Current Password
                  </label>
                  <div className="flex items-center border border-[#1E3A8A] rounded-md px-3 py-2">
                    <Lock className="w-5 h-5 text-[#1E3A8A] mr-2" />
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full outline-none text-[#1E3A8A] bg-transparent [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      className="ml-2 text-[#1E3A8A]"
                    >
                      {showCurrentPassword ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <EyeOff className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-[#1E3A8A] font-semibold">
                    New Password
                  </label>
                  <div className="flex items-center border border-[#1E3A8A] rounded-md px-3 py-2">
                    <Lock className="w-5 h-5 text-[#1E3A8A] mr-2" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full outline-none text-[#1E3A8A] bg-transparent [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="ml-2 text-[#1E3A8A]"
                    >
                      {showNewPassword ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <EyeOff className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-[#1E3A8A] font-semibold">
                    Confirm New Password
                  </label>
                  <div className="flex items-center border border-[#1E3A8A] rounded-md px-3 py-2">
                    <Lock className="w-5 h-5 text-[#1E3A8A] mr-2" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full outline-none text-[#1E3A8A] bg-transparent [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
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

                {passwordError && (
                  <div className="text-red-500 text-sm mt-1">
                    {passwordError}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError("");
                  }}
                  className="px-4 py-2 text-[#1E3A8A] hover:bg-[#1E3A8A] hover:bg-opacity-10 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordChange}
                  className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#172B58] text-white rounded-lg transition-colors"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        )}

        {showProfilePicOptions && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Image className="w-5 h-5 text-[#1E3A8A]" />
                  Profile Picture
                </h2>
                <button
                  onClick={() => setShowProfilePicOptions(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload from device
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePicChange}
                    className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-100 file:text-blue-700
                    hover:file:bg-blue-200 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or choose a default color
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleSetDefaultProfile(color)}
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm"
                        style={{ backgroundColor: color }}
                      >
                        {profilePic ? null : getInitials(username)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowProfilePicOptions(false)}
                  className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#172B58] text-white rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header with Edit Button */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
          <div className="flex items-center space-x-4 md:space-x-6">
            <div className="relative group">
              {profilePic ? (
                <img
                  src={profilePic}
                  alt="Profile"
                  className="rounded-full w-20 h-20 md:w-24 md:h-24 object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div
                  className="rounded-full w-20 h-20 md:w-24 md:h-24 flex items-center justify-center text-white font-bold text-3xl shadow-md"
                  style={{ backgroundColor: bgColor }}
                >
                  {getInitials(username)}
                </div>
              )}
              {isEditing && (
                <button
                  onClick={() => setShowProfilePicOptions(true)}
                  className="absolute -bottom-1 -right-1 bg-white p-2 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Edit className="w-4 h-4 text-[#1E3A8A]" />
                </button>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{name}</h1>
              <p className="text-gray-600">{email}</p>
              <p className="text-sm text-gray-500 mt-1">
                Student ID: {studentId}
              </p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={toggleEdit}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                isEditing
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-800"
                  : "bg-[#1E3A8A] hover:bg-[#172B58] text-white"
              }`}
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </>
              )}
            </button>
            {isEditing && (
              <button className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#172B58] text-white rounded-lg transition-colors flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Personal Info Section */}
        <section className="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-[#1E3A8A]">
              Personal Information
            </h2>
            {isEditing && (
              <span className="text-xs px-2 py-1 bg-[#1E3A8A] bg-opacity-10 text-[#1E3A8A] rounded-full">
                Editing Mode
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                />
              ) : (
                <p className="text-gray-900 font-medium">{name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                />
              ) : (
                <p className="text-gray-900 font-medium">{phone}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              {isEditing ? (
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                  rows={3}
                />
              ) : (
                <p className="text-gray-900 font-medium">{address}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Academic Intake
              </label>
              <p className="text-gray-900 font-medium">{intake}</p>
            </div>
          </div>
        </section>

        {/* Academic Info Section */}
        <section className="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold text-[#1E3A8A] mb-4">
            Academic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Programme
              </label>
              <p className="text-gray-900 font-medium">{programme}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <p className="text-gray-900 font-medium">{department}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Semester
              </label>
              <p className="text-gray-900 font-medium">Semester {semester}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CGPA
              </label>
              <div className="flex items-center gap-2">
                <p className="text-gray-900 font-medium">{cgpa.toFixed(2)}</p>
                <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-[#1E3A8A] h-2.5 rounded-full"
                    style={{ width: `${(cgpa / 4.0) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Account Settings Section */}
        <section className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-[#1E3A8A] mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#1E3A8A]" />
            Security
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-2">Password</h3>
              <p className="text-sm text-gray-600 mb-3">
                Change your password to keep your account secure
              </p>
              <button
                onClick={handlePasswordResetRequest}
                className="px-4 py-2 bg-[#1E3A8A] bg-opacity-10 hover:bg-opacity-20 text-[#1E3A8A] rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Change Password
              </button>
            </div>
          </div>
        </section>

        {/* Logout Button */}
        <div className="flex justify-center">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
