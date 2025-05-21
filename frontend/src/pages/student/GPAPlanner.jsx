import React, { useState } from "react";

const gradePointsMap = {
  "A+": 4.0,
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "B-": 2.7,
  "C+": 2.3,
  C: 2.0,
  "C-": 1.7,
  "D+": 1.3,
  D: 1.0,
  F: 0.0,
};

const GPACalculator = () => {
  const [courses, setCourses] = useState([{ name: "", credit: "", grade: "" }]);

  const handleChange = (index, field, value) => {
    const newCourses = [...courses];
    newCourses[index][field] = value;
    setCourses(newCourses);
  };

  const addCourse = () => {
    setCourses([...courses, { name: "", credit: "", grade: "" }]);
  };

  const removeCourse = (index) => {
    const newCourses = [...courses];
    newCourses.splice(index, 1);
    setCourses(newCourses);
  };

  const calculateGPA = () => {
    let totalCredits = 0;
    let totalPoints = 0;

    courses.forEach(({ credit, grade }) => {
      const creditVal = parseFloat(credit);
      const point = gradePointsMap[grade];
      if (!isNaN(creditVal) && point !== undefined) {
        totalCredits += creditVal;
        totalPoints += creditVal * point;
      }
    });

    if (totalCredits === 0) return "0.00";
    return (totalPoints / totalCredits).toFixed(2);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold text-[#2c3e90] mb-6">
          GPA Planner
        </h1>
        <p className="text-gray-600 mb-6">
          Estimate how future courses will affect your GPA. This doesn't affect
          your official transcript.
        </p>

        <div className="space-y-4">
          {courses.map((course, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-4 bg-white p-4 rounded shadow-md"
            >
              <input
                type="text"
                placeholder="Course Name"
                className="col-span-5 px-3 py-2 border rounded"
                value={course.name}
                onChange={(e) => handleChange(index, "name", e.target.value)}
              />
              <input
                type="number"
                placeholder="Credit"
                className="col-span-2 px-3 py-2 border rounded"
                value={course.credit}
                onChange={(e) => handleChange(index, "credit", e.target.value)}
                min="0"
              />
              <select
                className="col-span-3 px-3 py-2 border rounded"
                value={course.grade}
                onChange={(e) => handleChange(index, "grade", e.target.value)}
              >
                <option value="">Grade</option>
                {Object.keys(gradePointsMap).map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
              <button
                onClick={() => removeCourse(index)}
                className="col-span-2 text-red-500 hover:text-red-700 font-medium"
                disabled={courses.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={addCourse}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Course
          </button>

          <div className="ml-auto text-lg font-medium text-gray-700">
            GPA: <span className="text-blue-700">{calculateGPA()}</span>
          </div>
        </div>
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">Tips:</h3>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            <li>Use this to plan future semesters</li>
            <li>Compare different grade scenarios</li>
            <li>See how many A's you need to reach target GPA</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GPACalculator;
