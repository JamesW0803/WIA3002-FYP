import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const StudentDashboard = () => {
  const { user } = useAuth();
  const [showYearSemesterModal, setShowYearSemesterModal] = useState(false);
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");

  useEffect(() => {
    const savedYear = localStorage.getItem("studentYear");
    const savedSemester = localStorage.getItem("studentSemester");

    if (!savedYear || !savedSemester) {
      setShowYearSemesterModal(true);
    }
  }, []);

  const handleSaveYearSemester = () => {
    if (!year || !semester) {
      alert("Please select both year and semester");
      return;
    }

    localStorage.setItem("studentYear", year);
    localStorage.setItem("studentSemester", semester);
    setShowYearSemesterModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {showYearSemesterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-[#1E3A8A] mb-4">
              Welcome! Please select your current academic status
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="">Select Year</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="">Select Semester</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleSaveYearSemester}
                className="bg-[#1E3A8A] text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="p-6 max-w-6xl mx-auto">
        {/* Welcome Box */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border-l-4 border-[#1E3A8A]">
          <h2 className="text-2xl font-bold text-[#1E3A8A]">
            Welcome back, {user.username}!
          </h2>
          <p className="text-gray-600 mt-1">
            Here's a quick overview of your academic progress.
          </p>
        </div>

        {/* GPA & Course Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-md p-5 border-t-4 border-[#1E3A8A]">
            <h3 className="text-xl font-semibold text-[#1E3A8A] mb-3">
              GPA Overview
            </h3>
            <p className="text-gray-700">
              Latest CGPA:{" "}
              <span className="font-bold text-green-600">3.67</span>
            </p>
            <Link
              to="/gpa-planner"
              className="inline-block mt-4 bg-[#1E3A8A] hover:bg-blue-900 text-white px-4 py-2 rounded-xl transition"
            >
              Go to GPA Planner
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-5 border-t-4 border-[#1E3A8A]">
            <h3 className="text-xl font-semibold text-[#1E3A8A] mb-3">
              Course Path Summary
            </h3>
            <p className="text-gray-700">
              Total Courses Completed: <span className="font-bold">24</span>
            </p>
            <p className="text-gray-700">
              Courses Remaining: <span className="font-bold">12</span>
            </p>
            <Link
              to="/course-path"
              className="inline-block mt-4 bg-[#1E3A8A] hover:bg-blue-900 text-white px-4 py-2 rounded-xl transition"
            >
              View Course Path
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-md p-5 mb-6 border-l-4 border-[#1E3A8A]">
          <h3 className="text-xl font-semibold text-[#1E3A8A] mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/edit-profile" className="action-button">
              Edit Profile
            </Link>
            <Link to="/submit-gpa" className="action-button">
              Submit GPA
            </Link>
            <Link to="/view-progress" className="action-button">
              View Progress
            </Link>
            <Link
              to="/logout"
              className="action-button bg-red-500 hover:bg-red-600"
            >
              Logout
            </Link>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-md p-5 border-t-4 border-[#1E3A8A]">
          <h3 className="text-xl font-semibold text-[#1E3A8A] mb-3">
            Recent Activities
          </h3>
          <ul className="text-gray-600 list-disc list-inside space-y-2">
            <li>Submitted GPA for Semester 4</li>
            <li>Updated completed course list</li>
            <li>Viewed course path suggestion</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
