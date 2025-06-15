import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  BookOpenCheck,
  Calendar,
  Check,
  GraduationCap,
  Info,
  Lightbulb,
  NotebookPen,
} from "lucide-react";
import axiosClient from "../../api/axiosClient";
import semesterMapping from "../../constants/semesterMapping";
import rawDefaultPlan from "../../constants/defaultPlan.json";
import generateCustomCoursePlan from "../../utils/generateCustomCoursePlan";
import { findLastCompletedSemester } from "../../components/Students/AcademicPlanner/utils/planHelpers";

const groupDefaultPlanByYearSemester = (allCourses) => {
  let specializationCount = 1;

  const findCourse = (code) => allCourses.find((c) => c.course_code === code);

  const organizedPlan = Object.entries(semesterMapping).map(
    ([year, semesters]) => ({
      year,
      semesters: Object.entries(semesters).map(([semName, codes]) => {
        const courses = codes
          .map((code) => {
            if (code.startsWith("SPECIALIZATION_")) {
              return {
                course_name: `Specialization Elective (${specializationCount++})`,
                course_code: "SPECIALIZATION",
                credit_hours: 3,
                type: "programme_elective",
              };
            }

            const course = findCourse(code);
            if (!course) return null;

            return {
              course_name: course.course_name,
              course_code: course.course_code,
              credit_hours: course.credit_hours,
              type: course.type,
            };
          })
          .filter(Boolean);

        return {
          name: semName,
          totalCredits: courses.reduce((sum, c) => sum + c.credit_hours, 0),
          courses,
        };
      }),
    })
  );

  return organizedPlan;
};

const CourseRecommendations = () => {
  const [generatedPlan, setGeneratedPlan] = useState([]);
  const [strategy, setStrategy] = useState("balanced");
  const [allCourses, setAllCourses] = useState([]);
  const [defaultPlan, setDefaultPlan] = useState([]);
  const [expandedYears, setExpandedYears] = useState(() => {
    const initialState = {};
    Object.keys(semesterMapping).forEach((year) => {
      initialState[year] = true;
    });
    return initialState;
  });
  const [planMode, setPlanMode] = useState("normal"); // normal | gapYear | gapSem | outbound
  const [gapModalOpen, setGapModalOpen] = useState(false); // For gap year/semester
  const [courseModalOpen, setCourseModalOpen] = useState(false); // For course details
  const [selection, setSelection] = useState({ year: 1, sem: 1 });
  const [completedEntries, setCompletedEntries] = useState([]);
  const [startPoint, setStartPoint] = useState({ year: 1, sem: 1 });
  const [gapYears, setGapYears] = useState([]);
  const [gapSemesters, setGapSemesters] = useState([]);
  const [outboundSemesters, setOutboundSemesters] = useState([]);
  const [remainingCourses, setRemainingCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [prerequisiteDetails, setPrerequisiteDetails] = useState([]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");

        const [coursesRes, profileRes] = await Promise.all([
          axiosClient.get("/courses", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axiosClient.get(`/academic-profile/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const allCoursesData = coursesRes.data.map((course) => ({
          ...course,
          // Convert prerequisite IDs to codes if needed
          prerequisites: course.prerequisites
            ? course.prerequisites
                .map((id) => {
                  const prereq = coursesRes.data.find((c) => c._id === id);
                  return prereq ? prereq.course_code : null;
                })
                .filter(Boolean)
            : [],
        }));
        setAllCourses(allCoursesData);

        const defaultPlanData = groupDefaultPlanByYearSemester(rawDefaultPlan);
        setDefaultPlan(defaultPlanData);

        const entries = profileRes.data.entries;
        setCompletedEntries(entries);
        const last = findLastCompletedSemester(entries);
        setStartPoint({ year: last.year, sem: last.semester });

        // Calculate remaining courses using allCoursesData and entries
        calculateRemainingCourses(allCoursesData, entries, last);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };

    fetchAllData();
  }, []);

  // Add this function to fetch prerequisite details
  const fetchPrerequisiteDetails = (prerequisiteCodes) => {
    try {
      const details = prerequisiteCodes
        .map((code) => {
          const course = allCourses.find((c) => c.course_code === code);
          return course
            ? {
                code: course.course_code,
                name: course.course_name,
                credits: course.credit_hours,
              }
            : null;
        })
        .filter(Boolean);

      setPrerequisiteDetails(details);
    } catch (err) {
      console.error("Failed to fetch prerequisite details:", err);
      setPrerequisiteDetails([]);
    }
  };

  // Update the course card click handler
  const handleCourseClick = async (course) => {
    setSelectedCourse(course);
    if (course.prerequisites && course.prerequisites.length > 0) {
      fetchPrerequisiteDetails(course.prerequisites);
    } else {
      setPrerequisiteDetails([]);
    }
    setCourseModalOpen(true);
  };

  const calculateRemainingCourses = (
    allCoursesData,
    entries,
    lastCompletedSemester
  ) => {
    // Create a map of course codes to their latest status
    const courseStatusMap = new Map();

    entries.forEach((entry) => {
      const code = entry.course.course_code;
      // Only keep the latest status for each course
      if (
        !courseStatusMap.has(code) ||
        entry.year > courseStatusMap.get(code).year ||
        (entry.year === courseStatusMap.get(code).year &&
          entry.semester > courseStatusMap.get(code).semester)
      ) {
        courseStatusMap.set(code, {
          status: entry.status,
          year: entry.year,
          semester: entry.semester,
        });
      }
    });

    // Get all course codes that are either:
    // 1. Not passed at all, or
    // 2. Failed in their latest attempt
    const remainingCourses = allCoursesData.filter((course) => {
      const latestStatus = courseStatusMap.get(course.course_code);

      // If never taken, include it
      if (!latestStatus) return true;

      // If latest status is failed, include it
      if (latestStatus.status === "Failed") return true;

      // Otherwise, exclude it (passed in latest attempt)
      return false;
    });

    setRemainingCourses(remainingCourses);

    // Debug logs
    console.log("Course status map:", courseStatusMap);
    console.log("Remaining courses count:", remainingCourses.length);
  };

  const handleGeneratePlan = () => {
    const last = findLastCompletedSemester(completedEntries);

    const plan = generateCustomCoursePlan({
      completedEntries,
      allCourses,
      gapYears,
      gapSemesters,
      outboundSemesters,
      startPoint: { year: last.year, sem: last.semester },
      strategy: planMode === "normal" ? "regular" : planMode,
    });

    setGeneratedPlan(plan);
  };

  const toggleYear = (year) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  const adaptivePlanByYear = Object.entries(
    generatedPlan.reduce((acc, semEntry) => {
      const { year } = semEntry;
      if (!acc[year]) acc[year] = [];
      acc[year].push(semEntry);
      return acc;
    }, {})
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1E3A8A] mb-2">
            Course Recommendations
          </h2>
          <p className="text-gray-600 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            This page recommends courses for your future semesters based on your
            progress
          </p>
        </div>
      </div>

      {/* 1. Suggested Course Plan by Faculty */}
      {defaultPlan.length > 0 && (
        <div className="mt-6 w-full mb-8">
          <div className="bg-white border rounded-md p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <NotebookPen className="w-5 h-5 text-gray-600" />
              Suggested Course Plan by Faculty
            </h3>

            {defaultPlan.map((yearObj, yearIndex) => {
              const isExpanded = expandedYears[yearObj.year] ?? true;

              return (
                <div
                  key={yearIndex}
                  className={`pt-6 ${
                    yearIndex !== 0 ? "border-t-2 border-gray-300 mt-4" : ""
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xl font-semibold text-gray-800">
                      {yearObj.year}
                    </h4>
                    <button
                      onClick={() => toggleYear(yearObj.year)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {isExpanded ? "Hide" : "Show"}
                    </button>
                  </div>

                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4 transition-all duration-300 ${
                      isExpanded
                        ? "opacity-100 max-h-[1000px]"
                        : "opacity-0 max-h-0 overflow-hidden"
                    }`}
                  >
                    {yearObj.semesters.map((semester, semIdx) => (
                      <div key={semIdx}>
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="text-md font-medium text-gray-600">
                            {semester.name}
                          </h5>
                          <span className="text-sm text-green-600 font-medium">
                            {semester.totalCredits} credits
                          </span>
                        </div>

                        <div className="space-y-3">
                          {semester.courses.map((course, idx) => (
                            <div
                              key={idx}
                              className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-100"
                            >
                              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-1">
                                <Check className="w-3 h-3 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {course.course_code} – {course.course_name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {course.credit_hours} credits
                                </div>
                                <div className="text-xs text-gray-500 mt-1 capitalize">
                                  {course.type.replace(/_/g, " ")}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Courses Remaining to Complete */}
      {remainingCourses.length > 0 && (
        <div className="mb-8">
          <div className="bg-white border rounded-md p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BookOpenCheck className="w-5 h-5 text-gray-600" />
              Courses Remaining to Complete ({remainingCourses.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {remainingCourses.map((course) => (
                <Card
                  key={course.course_code}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleCourseClick(course)}
                >
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-semibold text-[#1E3A8A]">
                      {course.course_code}: {course.course_name}
                    </h4>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{course.credit_hours} credits</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                        {course.type.replace(/_/g, " ")}
                      </span>
                    </div>
                    {course.prerequisites &&
                      course.prerequisites.length > 0 && (
                        <p className="text-xs text-gray-500">
                          Requires: ({course.prerequisites.length})
                          prerequisites
                        </p>
                      )}
                    {course.offered_semester && (
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">Offered:</span>{" "}
                        {course.offered_semester.join(", ")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Planning Strategy */}
      <div className="mb-8">
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-800 mb-1">
                  Generate Your Personalized Course Plan
                </h4>
                <p className="text-sm text-blue-700">
                  Select a planning strategy and click "Generate Plan" to create
                  your personalized schedule based on your academic progress.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2 text-gray-700">
                <Calendar className="w-4 h-4" />
                Planning Strategy
              </h3>
              <div className="space-y-2">
                {[
                  { value: "regular", label: "Regular" },
                  { value: "lighter", label: "Lighter" },
                  { value: "gapYear", label: "Gap Year" },
                  { value: "gapSem", label: "Gap Semester" },
                  { value: "outbound", label: "Outbound Programme" },
                ].map((opt) => (
                  <div key={opt.value} className="flex items-center">
                    <input
                      type="radio"
                      name="planMode"
                      value={opt.value}
                      checked={planMode === opt.value}
                      onChange={() => {
                        setPlanMode(opt.value);
                        // Only open modal for gap year/semester or outbound
                        if (
                          ["gapYear", "gapSem", "outbound"].includes(opt.value)
                        ) {
                          setGapModalOpen(true);
                        } else {
                          setGapModalOpen(false);
                        }
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      {opt.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                className="bg-[#1E3A8A] text-white px-8 py-3"
                onClick={handleGeneratePlan}
              >
                Generate Course Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Generated Plan */}
      {generatedPlan.length > 0 && (
        <div className="mt-8">
          <div className="bg-white border rounded-md p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-gray-600" />
              Suggested Course Plan (
              {strategy === "regular"
                ? "Regular Workload"
                : strategy === "lighter"
                ? "Lighter Workload"
                : strategy === "gapYear"
                ? "With Gap Year"
                : strategy === "gapSem"
                ? "With Gap Semester"
                : "Outbound Programme"}
              )
            </h3>

            <div className="space-y-8">
              {adaptivePlanByYear.map(([year, semEntries]) => (
                <Card key={year} className="border border-gray-200 shadow-sm">
                  <CardContent className="p-0">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <h4 className="font-bold text-lg">Year {year}</h4>
                    </div>

                    <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                      {semEntries.map((semEntry, idx) => {
                        const { sem, courses } = semEntry;
                        const totalCredits = courses.reduce(
                          (sum, c) => sum + c.credit_hours,
                          0
                        );
                        const creditStatus =
                          totalCredits < 16
                            ? "text-amber-600"
                            : totalCredits > 20
                            ? "text-red-600"
                            : "text-green-600";

                        return (
                          <div key={idx} className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-[#1E3A8A]">
                                Semester {sem}
                              </h5>
                              <span
                                className={`text-sm bg-gray-50 px-2 py-1 rounded-full font-medium ${creditStatus}`}
                              >
                                {totalCredits} credits
                              </span>
                            </div>

                            <ul className="space-y-3">
                              {courses.map((course) => (
                                <li
                                  key={course.course_code}
                                  className="flex items-start gap-3"
                                >
                                  <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <Check className="w-3 h-3 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium">
                                      {course.course_code} -{" "}
                                      {course.course_name}
                                    </p>
                                    <div className="flex gap-4 text-sm text-gray-600">
                                      <span>{course.credit_hours} credits</span>
                                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded capitalize">
                                        {course.type.replace(/_/g, " ")}
                                      </span>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal for gap year/semester selection */}
      {gapModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
            <h4 className="font-semibold mb-4">
              {planMode === "gapYear"
                ? "Select year to gap"
                : planMode === "gapSem"
                ? "Select semester to gap"
                : "Select outbound semester"}
            </h4>

            <div className="mb-4">
              <label className="block text-sm mb-1">Year</label>
              <select
                value={selection.year}
                onChange={(e) =>
                  setSelection((s) => ({ ...s, year: +e.target.value }))
                }
                className="w-full border p-2 rounded"
              >
                {[1, 2, 3, 4].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>

            {(planMode === "gapSem" || planMode === "outbound") && (
              <div className="mb-4">
                <label className="block text-sm mb-1">Semester</label>
                <select
                  value={selection.sem}
                  onChange={(e) =>
                    setSelection((s) => ({ ...s, sem: +e.target.value }))
                  }
                  className="w-full border p-2 rounded"
                >
                  {[1, 2].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-600"
                onClick={() => {
                  setGapModalOpen(false);
                  setPlanMode("normal");
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => {
                  if (planMode === "gapYear") {
                    setGapYears((g) => [...g, selection.year]);
                  } else if (planMode === "gapSem") {
                    setGapSemesters((g) => [...g, { ...selection }]);
                  } else if (planMode === "outbound") {
                    setOutboundSemesters((g) => [...g, { ...selection }]);
                  }
                  setGapModalOpen(false);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {courseModalOpen && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-[#1E3A8A]">
                  {selectedCourse.course_code}: {selectedCourse.course_name}
                </h3>
                <button
                  onClick={() => setCourseModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500">Credits</p>
                  <p className="text-gray-800">{selectedCourse.credit_hours}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Type</p>
                  <p className="text-gray-800 capitalize">
                    {selectedCourse.type.replace(/_/g, " ")}
                  </p>
                </div>
                {selectedCourse.offered_semester && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">
                      Offered In
                    </p>
                    <p className="text-gray-800">
                      {selectedCourse.offered_semester.join(", ")}
                    </p>
                  </div>
                )}
              </div>

              {prerequisiteDetails.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Prerequisites ({prerequisiteDetails.length})
                  </h4>
                  <div className="space-y-2">
                    {prerequisiteDetails.map((prereq, index) => (
                      <div
                        key={index}
                        className="flex items-start p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                          <Check className="w-3 h-3 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {prereq.code}: {prereq.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {prereq.credits} credits
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => setCourseModalOpen(false)}
                  className="bg-[#1E3A8A] text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseRecommendations;
