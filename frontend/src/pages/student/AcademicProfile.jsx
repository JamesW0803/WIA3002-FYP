import React, { useState, useEffect } from "react";
import CourseListSelector from "../../components/CourseListSelector";
import CourseStatusSelector from "../../components/CourseStatusSelector";

const AcademicProfile = () => {
  const [availableCourses, setAvailableCourses] = useState([]);
  const [entries, setEntries] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [years, setYears] = useState([1, 2, 3, 4]);

  //To-do: All these are mock data, future dev will retrieve course data from db
  useEffect(() => {
    const mockCourses = [
      { code: "WIX1002", name: "Fundamentals of Programming", credit: 5 },
      { code: "WIA1002", name: "Data Structure", credit: 5 },
      { code: "GIG1012", name: "Philosophy and Current Issues", credit: 2 },
      { code: "WIX1001", name: "Computing Mathematics I", credit: 3 },
      { code: "WIA1003", name: "Computer System and Organization", credit: 3 },
      { code: "WIA2010", name: "Human Computer Interaction", credit: 3 },
      { code: "WIA1003", name: "Computer System Architecture", credit: 3 },
      { code: "WIA1005", name: "Network Technology Foundation", credit: 4 },
      { code: "WIA1006", name: "Machine Learning", credit: 3 },
    ];

    const mockEntries = [
      {
        id: 1,
        code: "WIX1002",
        name: "Fundamentals of Programming",
        credit: 5,
        status: "Completed",
        grade: "A",
        year: 1,
        semester: 1,
      },
      {
        id: 2,
        code: "WIA1002",
        name: "Data Structure",
        credit: 5,
        status: "Ongoing",
        year: 1,
        semester: 2,
      },
    ];

    setAvailableCourses(mockCourses);
    setEntries(mockEntries);
  }, []);

  const startEditing = (id) => {
    setEditingId(id);
  };

  const cancelEditing = () => {
    setEntries(
      entries.filter((entry) => entry.code !== "" || entry.id !== editingId)
    );
    setEditingId(null);
  };

  const updateEntry = (id, field, value) => {
    setEntries(
      entries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const removeEntry = (id) => {
    setEntries(entries.filter((entry) => entry.id !== id));
  };

  const saveEntry = (id) => {
    const entry = entries.find((e) => e.id === id);
    if (entry.status === "Completed" && !entry.grade) {
      alert("Please enter a grade for completed courses");
      return;
    }
    if (!entry.code || !entry.year || !entry.semester || !entry.status) {
      alert("Please fill all required fields");
      return;
    }
    setEditingId(null);
  };

  const addNewEntry = (year, semester) => {
    const newId =
      entries.length > 0 ? Math.max(...entries.map((e) => e.id)) + 1 : 1;
    setEntries([
      ...entries,
      {
        id: newId,
        code: "",
        name: "",
        credit: "",
        status: "",
        grade: "",
        year: year,
        semester: semester,
      },
    ]);
    setEditingId(newId);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("All entries:", entries);
    alert("Academic profile updated successfully!");
  };

  const entriesByYearSemester = years.reduce((acc, year) => {
    acc[year] = {
      1: entries.filter((entry) => entry.year === year && entry.semester === 1),
      2: entries.filter((entry) => entry.year === year && entry.semester === 2),
    };
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-[#1E3A8A] mb-6">
          Academic Profile
        </h2>

        <form onSubmit={handleSubmit}>
          {years.map((year) => (
            <div key={year} className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-[#1E3A8A] border-b pb-2">
                Year {year}
              </h3>

              {[1, 2].map((semester) => (
                <div key={semester} className="mb-6 ml-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-lg font-medium">Semester {semester}</h4>
                    <button
                      type="button"
                      onClick={() => addNewEntry(year, semester)}
                      className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100"
                    >
                      + Add Course
                    </button>
                  </div>

                  {entriesByYearSemester[year][semester]?.length > 0 ? (
                    entriesByYearSemester[year][semester].map(
                      (entry) =>
                        (entry.code || editingId === entry.id) && (
                          <div
                            key={entry.id}
                            className="bg-white p-4 rounded-lg shadow-md mb-4 flex items-center min-w-full"
                          >
                            {editingId === entry.id ? (
                              <div className="w-full grid grid-cols-1 md:grid-cols-6 gap-6 items-center">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Course
                                  </label>
                                  <CourseListSelector
                                    courses={availableCourses}
                                    selectedCode={entry.code}
                                    onChange={(val) => {
                                      const course = availableCourses.find(
                                        (c) => c.code === val
                                      );
                                      updateEntry(entry.id, "code", val);
                                      updateEntry(
                                        entry.id,
                                        "name",
                                        course?.name || ""
                                      );
                                      updateEntry(
                                        entry.id,
                                        "credit",
                                        course?.credit || ""
                                      );
                                    }}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                  </label>
                                  <CourseStatusSelector
                                    status={entry.status}
                                    onChange={(val) =>
                                      updateEntry(entry.id, "status", val)
                                    }
                                  />
                                </div>

                                {entry.status === "Completed" && (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Grade
                                    </label>
                                    <select
                                      value={entry.grade}
                                      onChange={(e) =>
                                        updateEntry(
                                          entry.id,
                                          "grade",
                                          e.target.value
                                        )
                                      }
                                      className="border rounded p-2 w-full"
                                    >
                                      <option value="">Select grade</option>
                                      <option value="A">A</option>
                                      <option value="B">B</option>
                                      <option value="C">C</option>
                                      <option value="D">D</option>
                                      <option value="F">F</option>
                                    </select>
                                  </div>
                                )}

                                <div className="flex gap-2 ml-8">
                                  <button
                                    type="button"
                                    onClick={() => saveEntry(entry.id)}
                                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditing}
                                    className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full flex items-center">
                                <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                  <div className="col-span-5">
                                    <p className="font-medium text-lg">
                                      {entry.code}
                                    </p>
                                    <p className="text-md text-gray-600">
                                      {entry.name}
                                    </p>
                                  </div>
                                  <div className="col-span-2">
                                    <p className="text-md">
                                      Credit: {entry.credit}
                                    </p>
                                  </div>
                                  <div className="col-span-2 flex items-center">
                                    {entry.status === "Completed" &&
                                      entry.grade && (
                                        <span className="text-md">
                                          Grade: {entry.grade}
                                        </span>
                                      )}
                                  </div>
                                  <div className="col-span-2">
                                    <span
                                      className={`px-3 py-1 rounded-full text-sm ${
                                        entry.status === "Completed"
                                          ? "bg-green-100 text-green-800"
                                          : "bg-yellow-100 text-yellow-800"
                                      }`}
                                    >
                                      {entry.status}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-4 ml-8">
                                  <button
                                    type="button"
                                    onClick={() => startEditing(entry.id)}
                                    className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeEntry(entry.id)}
                                    className="text-red-600 hover:text-red-800 whitespace-nowrap"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                    )
                  ) : (
                    <p className="text-gray-500 italic text-sm ml-2">
                      No courses for this semester
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}

          <div className="mt-6">
            <button
              type="submit"
              className="bg-[#1E3A8A] text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
            >
              Save All Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AcademicProfile;
