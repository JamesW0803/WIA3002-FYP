import React, { useState } from "react";
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

const recommendedCourses = [
  // Year 1 Courses
  {
    code: "CSC101",
    name: "Introduction to Computer Science",
    credits: 4,
    type: "Faculty Core",
    prerequisites: [],
  },
  {
    code: "MAT121",
    name: "Discrete Mathematics",
    credits: 3,
    type: "Faculty Core",
    prerequisites: [],
  },
  {
    code: "ENG101",
    name: "Academic Writing",
    credits: 3,
    type: "University",
    prerequisites: [],
  },
  {
    code: "PHY110",
    name: "Physics for Computing",
    credits: 4,
    type: "Faculty Core",
    prerequisites: [],
  },
  {
    code: "SHE101",
    name: "Critical Thinking",
    credits: 2,
    type: "SHE Cluster",
    prerequisites: [],
  },

  // Year 2 Courses
  {
    code: "CSC201",
    name: "Data Structures & Algorithms",
    credits: 4,
    type: "Programme Core",
    prerequisites: ["CSC101"],
  },
  {
    code: "CSC202",
    name: "Computer Architecture",
    credits: 3,
    type: "Programme Core",
    prerequisites: ["CSC101"],
  },
  {
    code: "MAT221",
    name: "Statistics for Computing",
    credits: 3,
    type: "Faculty Core",
    prerequisites: ["MAT121"],
  },
  {
    code: "SHE201",
    name: "Professional Ethics",
    credits: 2,
    type: "SHE Cluster",
    prerequisites: [],
  },
  {
    code: "CSC203",
    name: "Database Systems",
    credits: 3,
    type: "Programme Core",
    prerequisites: ["CSC101"],
  },

  // Year 3 Courses
  {
    code: "CSC301",
    name: "Operating Systems",
    credits: 4,
    type: "Programme Core",
    prerequisites: ["CSC202"],
  },
  {
    code: "CSC302",
    name: "Software Engineering",
    credits: 4,
    type: "Programme Core",
    prerequisites: ["CSC201"],
  },
  {
    code: "CSC303",
    name: "Computer Networks",
    credits: 3,
    type: "Programme Core",
    prerequisites: ["CSC202"],
  },
  {
    code: "CSE301",
    name: "Machine Learning",
    credits: 4,
    type: "Specialization Elective",
    prerequisites: ["MAT221"],
  },
  {
    code: "SHE301",
    name: "Entrepreneurship",
    credits: 2,
    type: "SHE Cluster",
    prerequisites: [],
  },

  // Year 4 Courses
  {
    code: "CSC401",
    name: "Final Year Project I",
    credits: 6,
    type: "Programme Core",
    prerequisites: ["CSC302"],
  },
  {
    code: "CSC402",
    name: "Cloud Computing",
    credits: 4,
    type: "Programme Core",
    prerequisites: ["CSC303"],
  },
  {
    code: "CSE401",
    name: "Cybersecurity",
    credits: 4,
    type: "Specialization Elective",
    prerequisites: ["CSC303"],
  },
  {
    code: "CSC403",
    name: "Final Year Project II",
    credits: 6,
    type: "Programme Core",
    prerequisites: ["CSC401"],
  },
  {
    code: "CSE402",
    name: "Big Data Analytics",
    credits: 4,
    type: "Specialization Elective",
    prerequisites: ["CSE301"],
  },
];

const generateCoursePlan = (courses, strategy = "balanced") => {
  let plan = [];
  let year = [];
  let semester = [];
  let creditSum = 0;

  // Sort courses based on prerequisites (courses with unmet prerequisites come later)
  const sortedCourses = [...courses].sort((a, b) => {
    return a.prerequisites.length - b.prerequisites.length;
  });

  // Target credits per semester based on strategy
  const targetCredits = strategy === "light" ? 16 : 18;
  const maxCredits = 20; // Upper limit for both strategies

  sortedCourses.forEach((course) => {
    // Start new semester if adding this course would exceed max credits
    if (creditSum + course.credits > maxCredits) {
      year.push(semester);
      semester = [];
      creditSum = 0;

      // Start new year after 2 semesters
      if (year.length === 2) {
        plan.push(year);
        year = [];
      }
    }

    // Add course to current semester
    semester.push(course);
    creditSum += course.credits;

    // If we're close to target, consider starting new semester
    if (
      strategy === "balanced" &&
      creditSum >= targetCredits &&
      creditSum + 3 <= maxCredits // Leave room for at least a 3-credit course
    ) {
      year.push(semester);
      semester = [];
      creditSum = 0;

      if (year.length === 2) {
        plan.push(year);
        year = [];
      }
    }
  });

  // Add remaining courses
  if (semester.length > 0) year.push(semester);
  if (year.length > 0) plan.push(year);

  return plan;
};

const CourseRecommendations = () => {
  const [generatedPlan, setGeneratedPlan] = useState([]);
  const [strategy, setStrategy] = useState("balanced");
  const [selectedTypes, setSelectedTypes] = useState([
    "Programme Core",
    "Faculty Core",
  ]);

  const handleGeneratePlan = () => {
    const filteredCourses = recommendedCourses.filter((course) =>
      selectedTypes.includes(course.type)
    );
    const plan = generateCoursePlan(filteredCourses, strategy);
    setGeneratedPlan(plan);
  };

  const toggleCourseType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

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

      {/* Filters Section */}
      <Card className="mb-6">
        <CardContent className="p-6 space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-800 mb-1">
                How to use these filters
              </h4>
              <p className="text-sm text-blue-700">
                Select course types to include in your plan, then choose a
                strategy. Click "Generate Plan" to create your personalized
                schedule.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2 text-gray-700">
                <NotebookPen className="w-4 h-4" />
                Select Course Types
              </h3>
              <div className="space-y-2">
                {[
                  "Programme Core",
                  "Faculty Core",
                  "University",
                  "SHE Cluster",
                  "Specialization Elective",
                ].map((type) => (
                  <div key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`type-${type}`}
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleCourseType(type)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`type-${type}`}
                      className="ml-2 text-sm text-gray-700"
                    >
                      {type}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2 text-gray-700">
                <Calendar className="w-4 h-4" />
                Planning Strategy
              </h3>
              <div className="space-y-3">
                {[
                  {
                    value: "balanced",
                    label: "Balanced Workload",
                    description:
                      "18-20 credits per semester (ideal for on-time graduation)",
                  },
                  {
                    value: "light",
                    label: "Lighter Semesters",
                    description:
                      "16-20 credits per semester (more manageable workload)",
                  },
                ].map((option) => (
                  <div key={option.value} className="flex items-start">
                    <input
                      type="radio"
                      id={`strategy-${option.value}`}
                      name="strategy"
                      checked={strategy === option.value}
                      onChange={() => setStrategy(option.value)}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5"
                    />
                    <div className="ml-2">
                      <label
                        htmlFor={`strategy-${option.value}`}
                        className="block text-sm font-medium text-gray-700"
                      >
                        {option.label}
                      </label>
                      <p className="text-xs text-gray-500">
                        {option.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
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

      {/* Recommended Courses */}
      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <BookOpenCheck className="w-5 h-5" />
        Available Courses ({selectedTypes.join(", ")})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {recommendedCourses
          .filter((course) => selectedTypes.includes(course.type))
          .map((course) => (
            <Card
              key={course.code}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4 space-y-3">
                <h4 className="font-semibold text-[#1E3A8A]">
                  {course.code}: {course.name}
                </h4>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{course.credits} credits</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                    {course.type}
                  </span>
                </div>
                {course.prerequisites.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Requires: {course.prerequisites.join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Generated Plan */}
      {generatedPlan.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Suggested Course Plan (
            {strategy === "balanced"
              ? "Balanced Workload"
              : "Lighter Semesters"}
            )
          </h3>

          <div className="space-y-8">
            {generatedPlan.map((year, yearIndex) => (
              <Card
                key={yearIndex}
                className="border border-gray-200 shadow-sm"
              >
                <CardContent className="p-0">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h4 className="font-bold text-lg">Year {yearIndex + 1}</h4>
                  </div>

                  <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                    {year.map((semester, semesterIndex) => {
                      const totalCredits = semester.reduce(
                        (sum, course) => sum + course.credits,
                        0
                      );
                      const creditStatus =
                        totalCredits < 16
                          ? "text-amber-600"
                          : totalCredits > 20
                          ? "text-red-600"
                          : "text-green-600";

                      return (
                        <div key={semesterIndex} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-[#1E3A8A]">
                              Semester {semesterIndex + 1}
                            </h5>
                            <span
                              className={`text-sm bg-gray-50 px-2 py-1 rounded-full font-medium ${creditStatus}`}
                            >
                              {totalCredits} credits
                              {totalCredits < 16 && " (Very Light)"}
                              {totalCredits > 20 && " (Heavy)"}
                            </span>
                          </div>

                          <ul className="space-y-3">
                            {semester.map((course) => (
                              <li
                                key={course.code}
                                className="flex items-start gap-3"
                              >
                                <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <Check className="w-3 h-3 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {course.code} - {course.name}
                                  </p>
                                  <div className="flex gap-4 text-sm text-gray-600">
                                    <span>{course.credits} credits</span>
                                    <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                      {course.type}
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
      )}
    </div>
  );
};

export default CourseRecommendations;
