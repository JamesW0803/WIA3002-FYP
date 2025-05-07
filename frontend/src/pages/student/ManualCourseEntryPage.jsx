import React, { useState } from "react";
import StudentDashboardNavbar from "../../components/StudentDashboardNavbar";

const ManualCourseEntry = () => {
  const [courses, setCourses] = useState([{ code: "", name: "", credit: "" }]);

  const handleChange = (index, field, value) => {
    const updated = [...courses];
    updated[index][field] = value;
    setCourses(updated);
  };

  const addCourse = () => {
    setCourses([...courses, { code: "", name: "", credit: "" }]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Courses submitted:", courses);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-[#1E3A8A] mb-6">
          Manual Course Entry
        </h2>
        <form onSubmit={handleSubmit}>
          {courses.map((course, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 bg-white p-4 rounded-xl shadow"
            >
              <input
                type="text"
                placeholder="Course Code"
                className="border rounded p-2"
                value={course.code}
                onChange={(e) => handleChange(index, "code", e.target.value)}
              />
              <input
                type="text"
                placeholder="Course Name"
                className="border rounded p-2"
                value={course.name}
                onChange={(e) => handleChange(index, "name", e.target.value)}
              />
              <input
                type="number"
                placeholder="Credit Hours"
                className="border rounded p-2"
                value={course.credit}
                onChange={(e) => handleChange(index, "credit", e.target.value)}
              />
            </div>
          ))}
          <div className="flex gap-4 mt-4">
            <button
              type="button"
              onClick={addCourse}
              className="bg-gray-300 hover:bg-gray-400 text-black font-semibold px-4 py-2 rounded-xl"
            >
              + Add Course
            </button>
            <button
              type="submit"
              className="bg-[#1E3A8A] text-white rounded-md font-medium border border-[#1E3A8A] hover:bg-white hover:text-[#1E3A8A] transition px-6 py-2 rounded-xl"
            >
              Submit Courses
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualCourseEntry;
