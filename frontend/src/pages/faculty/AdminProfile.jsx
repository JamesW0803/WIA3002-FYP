import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LogOut,
  Edit,
  Save,
  X,
  Lock,
  ShieldCheck,
  Calendar,
  Loader2,
} from "lucide-react";
import Notification from "../../components/Students/AcademicProfile/Notification";
import { useAcademicProfile } from "../../hooks/useAcademicProfile";
import axiosClient from "../../api/axiosClient";
import ChangePasswordModal from "../../components/Faculty/Profile/ChangePasswordModal";

// 1. Define the mapping object outside the component
const ACCESS_LEVEL_MAP = {
  hod: "Head Of Department",
  tdid: "TDID",
  academic_advisor: "Academic Advisor",
  basic: "Basic Admin",
  super: "Super Admin",
};

const getInitials = (username) => {
  if (!username) return "AD";
  const match = username.match(/[a-zA-Z]/g) || [];
  return match.slice(0, 2).join("").toUpperCase();
};

const AdminProfile = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    contact: "",
    access_level: "basic",
    role: "admin",
    createdAt: "",
  });

  const { showNotification, closeNotification, notification } = useAcademicProfile();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        const response = await axiosClient.get(`/user/admin/${user.username}`);
        const admin = response.data; 
        
        setFormData({
          username: admin.username,
          email: admin.email,
          contact: admin.contact || "N/A",
          access_level: admin.access_level || "basic",
          role: admin.role,
          createdAt: admin.createdAt,
        });
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    if (user?.username) fetchAdminData();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const payload = { 
        username: formData.username,
        contact: formData.contact,
      };
      await axiosClient.put(`/user/admin/${user._id}`, payload);
      showNotification("Profile updated successfully", "success");
      setIsEditing(false);
    } catch (err) {
      showNotification("Error updating profile", "error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-10 h-10 text-[#1E3A8A] animate-spin" />
          <p className="text-gray-500 font-medium">Loading Admin Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-gray-50">
      <div className="p-4 md:p-8 max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">
          <div className="flex items-center space-x-4 md:space-x-6">
            <div className="relative">
              <div className="rounded-full w-20 h-20 md:w-24 md:h-24 flex items-center justify-center text-white font-bold text-3xl shadow-md bg-[#1E3A8A]">
                {getInitials(formData.username)}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-white" title="Active Account" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 capitalize">
                {formData.username}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {/* 2. Map Access Level in the Badge */}
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                  {ACCESS_LEVEL_MAP[formData.access_level] || formData.access_level}
                </span>
                <span className="text-sm text-gray-500 border-l pl-2">
                  System {formData.role}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                isEditing ? "bg-gray-200 text-gray-800" : "bg-[#1E3A8A] text-white"
              }`}
            >
              {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              {isEditing ? "Cancel" : "Edit Profile"}
            </button>
            {isEditing && (
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-[#1E3A8A] text-white rounded-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Details */}
          <section className="p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h2 className="text-lg font-semibold text-[#1E3A8A] mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Account Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Username</label>
                {isEditing ? (
                  <input
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{formData.username}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Email Address</label>
                <p className="text-gray-900 font-medium">{formData.email}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Contact Number</label>
                {isEditing ? (
                  <input
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{formData.contact}</p>
                )}
              </div>
            </div>
          </section>

          {/* Administrative Metadata */}
          <section className="p-6 bg-gray-50 rounded-xl border border-gray-200">
            <h2 className="text-lg font-semibold text-[#1E3A8A] mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> System Info
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Access Privilege</label>
                {/* 3. Map Access Level in the Info Section */}
                <p className="text-gray-900 font-medium ">
                  {ACCESS_LEVEL_MAP[formData.access_level] || formData.access_level}
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Registered Since</label>
                <p className="text-gray-900 font-medium">
                  {formData.createdAt ? new Date(formData.createdAt).toLocaleDateString('en-MY', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : "N/A"}
                </p>
              </div>
              <div className="pt-2">
                <button className="text-sm text-[#1E3A8A] font-semibold flex items-center gap-1 hover:underline"
                  onClick={() => setIsPasswordModalOpen(true)} // Add this
                >
                  <Lock className="w-4 h-4" /> Change Security Password
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t flex justify-center">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </div>

      {notification.show && (
        <Notification
          message={notification.message}
          type={notification.type}
          isClosing={notification.isClosing}
          onClose={closeNotification}
        />
      )}

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        userId={user?._id}
        showNotification={showNotification}
      />
    </div>
  );
};

export default AdminProfile;