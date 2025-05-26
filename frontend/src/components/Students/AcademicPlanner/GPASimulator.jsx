import React from "react";
import { Button } from "../../ui/button";
import { Plus } from "lucide-react";

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

const GPASimulator = ({
  gpaCourses,
  setGpaCourses,
  currentGPA,
  completedCredits,
}) => {
  const handleGpaCourseChange = (index, field, value) => {
    const newCourses = [...gpaCourses];
    newCourses[index][field] = value;
    setGpaCourses(newCourses);
  };

  const addGpaCourse = () => {
    setGpaCourses([...gpaCourses, { name: "", credit: "", grade: "" }]);
  };

  const removeGpaCourse = (index) => {
    const newCourses = [...gpaCourses];
    newCourses.splice(index, 1);
    setGpaCourses(newCourses);
  };

  const calculateGPA = (courses) => {
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

  const calculateProjectedGPA = () => {
    if (!currentGPA || !completedCredits || gpaCourses.length === 0)
      return "0.00";

    const currentPoints = parseFloat(currentGPA) * parseFloat(completedCredits);
    let newPoints = 0;
    let newCredits = 0;

    gpaCourses.forEach(({ credit, grade }) => {
      const creditVal = parseFloat(credit);
      const point = gradePointsMap[grade];
      if (!isNaN(creditVal) && point !== undefined) {
        newCredits += creditVal;
        newPoints += creditVal * point;
      }
    });

    if (newCredits === 0) return "0.00";

    const totalPoints = currentPoints + newPoints;
    const totalCredits = parseFloat(completedCredits) + newCredits;
    return (totalPoints / totalCredits).toFixed(2);
  };

  return (
    <div className="mb-8">
      <h4 className="font-medium text-[#1E3A8A] mb-4">GPA Simulation</h4>
      <div className="space-y-4 mb-6">
        {gpaCourses.map((course, index) => (
          <div
            key={index}
            className="grid grid-cols-12 gap-4 bg-gray-50 p-4 rounded-lg"
          >
            <input
              type="text"
              placeholder="Course Name"
              className="col-span-5 px-3 py-2 border rounded"
              value={course.name}
              onChange={(e) =>
                handleGpaCourseChange(index, "name", e.target.value)
              }
            />
            <input
              type="number"
              placeholder="Credits"
              className="col-span-2 px-3 py-2 border rounded"
              value={course.credit}
              onChange={(e) =>
                handleGpaCourseChange(index, "credit", e.target.value)
              }
              min="1"
            />
            <select
              className="col-span-3 px-3 py-2 border rounded"
              value={course.grade}
              onChange={(e) =>
                handleGpaCourseChange(index, "grade", e.target.value)
              }
            >
              <option value="">Select Grade</option>
              {Object.keys(gradePointsMap).map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
            <button
              onClick={() => removeGpaCourse(index)}
              className="col-span-2 text-red-500 hover:text-red-700 font-medium"
              disabled={gpaCourses.length === 1}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Button
          onClick={addGpaCourse}
          variant="default"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Course
        </Button>

        <div className="ml-auto flex items-center gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Simulated Semester GPA</p>
            <p className="text-xl font-bold text-[#1E3A8A]">
              {calculateGPA(gpaCourses)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Projected Cumulative GPA</p>
            <p className="text-xl font-bold text-[#1E3A8A]">
              {calculateProjectedGPA()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPASimulator;
