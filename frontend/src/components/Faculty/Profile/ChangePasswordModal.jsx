import React, { useState } from "react";
import { X, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import axiosClient from "../../../api/axiosClient";

const ChangePasswordModal = ({ isOpen, onClose, userId, showNotification }) => {
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic Validation
    if (passwords.newPassword !== passwords.confirmPassword) {
      return showNotification("New passwords do not match", "error");
    }
    if (passwords.newPassword.length < 6) {
      return showNotification("Password must be at least 6 characters", "error");
    }

    try {
      setLoading(true);
      // Adjust the endpoint according to your backend API
      await axiosClient.put(`/user/change-password`, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      onClose();

      showNotification("Password updated successfully", "success");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to update password";
        onClose();

      showNotification("Error updating password", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2 text-[#1E3A8A]">
            <Lock className="w-5 h-5" />
            <h2 className="text-xl font-bold">Change Password</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Current Password</label>
            <div className="relative">
              <input
                type={showPasswords ? "text" : "password"}
                name="currentPassword"
                required
                value={passwords.currentPassword}
                onChange={handleChange}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">New Password</label>
            <input
              type={showPasswords ? "text" : "password"}
              name="newPassword"
              required
              value={passwords.newPassword}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Confirm New Password</label>
            <input
              type={showPasswords ? "text" : "password"}
              name="confirmPassword"
              required
              value={passwords.confirmPassword}
              onChange={handleChange}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="text-sm text-gray-500 flex items-center gap-1 hover:text-[#1E3A8A]"
          >
            {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPasswords ? "Hide" : "Show"} Passwords
          </button>

          {/* Modal Footer */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#1E3A8A] text-white rounded-lg font-medium hover:bg-[#1e3a8acc] transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;