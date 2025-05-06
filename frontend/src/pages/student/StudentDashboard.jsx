import React from "react";
import { Link } from "react-router-dom";

const StudentDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Box */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border-l-4 border-[#1E3A8A]">
          <h2 className="text-2xl font-bold text-[#1E3A8A]">
            Welcome back, [Student Name]!
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
