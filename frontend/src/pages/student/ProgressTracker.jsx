import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { BookOpenCheck, CheckCircle, Clock, GraduationCap } from "lucide-react";
import axiosClient from "../../api/axiosClient";

const creditRequirements = {
  "Faculty Core": 17,
  "Programme Core": 59,
  "University Courses": 14,
  "Specialization Electives": 30,
  "SHE Cluster": 8,
};

const categoryMap = {
  faculty_core: "Faculty Core",
  programme_core: "Programme Core",
  university_language: "University Courses",
  university_cocurriculum: "University Courses",
  university_other: "University Courses",
  programme_elective: "Specialization Electives",
  she_cluster_1: "SHE Cluster",
  she_cluster_2: "SHE Cluster",
  she_cluster_3: "SHE Cluster",
  she_cluster_4: "SHE Cluster",
};

const ProgressBar = ({ percentage, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-600",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    violet: "bg-violet-500",
    rose: "bg-rose-500",
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full ${colors[color]} transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

const ProgressTracker = () => {
  const [entries, setEntries] = useState([]);
  const [coursesMap, setCoursesMap] = useState({});
  const [completedByCategory, setCompletedByCategory] = useState({});
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const [selectedCat, setSelectedCat] = useState(null);

  // Fetch academic profile entries
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      if (!token || !userId) return;
      try {
        const res = await axiosClient.get(`/academic-profile/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEntries(res.data.entries);
      } catch (err) {
        console.error("Failed to load academic profile", err);
      }
    };
    fetchProfile();
  }, []);

  // Fetch full courses list for credit lookup
  useEffect(() => {
    const fetchCourses = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await axiosClient.get("/courses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const map = {};
        res.data.forEach((course) => {
          const code = course.course_code || course.code;
          map[code] = course.credit_hours || course.credit || 0;
        });
        setCoursesMap(map);
      } catch (err) {
        console.error("Failed to load courses", err);
      }
    };
    fetchCourses();
  }, []);

  // Compute completed credits by category
  useEffect(() => {
    const counts = Object.keys(creditRequirements).reduce((acc, cat) => {
      acc[cat] = 0;
      return acc;
    }, {});
    entries.forEach((entry) => {
      if (entry.status === "Passed") {
        const cat = categoryMap[entry.course.type];
        const cr = coursesMap[entry.course.course_code] || 0;
        if (cat) counts[cat] += cr;
      }
    });
    setCompletedByCategory(counts);
    setUpdatedAt(new Date());
  }, [entries, coursesMap]);

  const creditsEarned = Object.values(completedByCategory).reduce(
    (sum, val) => sum + val,
    0
  );
  const totalCreditsRequired = Object.values(creditRequirements).reduce(
    (sum, val) => sum + val,
    0
  );
  const totalPercentage = Math.round(
    (creditsEarned / totalCreditsRequired) * 100
  );
  const remainingCredits = totalCreditsRequired - creditsEarned;

  const categoryIcons = {
    "Faculty Core": <BookOpenCheck className="w-5 h-5" />,
    "Programme Core": <GraduationCap className="w-5 h-5" />,
    "University Courses": <BookOpenCheck className="w-5 h-5" />,
    "Specialization Electives": <GraduationCap className="w-5 h-5" />,
    "SHE Cluster": <BookOpenCheck className="w-5 h-5" />,
  };
  const colors = ["blue", "emerald", "violet", "amber", "rose"];

  // Filter unique passed courses for selected category with credit lookup
  const filteredCourses = selectedCat
    ? entries
        .filter(
          (e) =>
            categoryMap[e.course.type] === selectedCat && e.status === "Passed"
        )
        .reduce((acc, entry) => {
          if (!acc.find((c) => c.code === entry.course.course_code)) {
            const code = entry.course.course_code;
            acc.push({
              code,
              name: entry.course.course_name,
              status: entry.status,
              isRetake: entry.isRetake,
              credit: coursesMap[code] || 0,
            });
          }
          return acc;
        }, [])
    : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-[#1E3A8A]">Progress Tracker</h2>
        <div className="text-sm text-gray-500">
          Last updated: {updatedAt.toLocaleDateString()}
        </div>
      </div>
      {/* Overall Progress Card */}
      <Card className="mb-8 border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <GraduationCap className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Overall Progress</h3>
              </div>
              <p className="text-sm text-gray-500">
                Track your journey towards graduation
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Completed</span>
                <span className="font-medium">
                  {creditsEarned} / {totalCreditsRequired} credits
                </span>
              </div>
              <ProgressBar
                percentage={totalPercentage}
                color={
                  totalPercentage > 75
                    ? "emerald"
                    : totalPercentage > 50
                    ? "blue"
                    : "amber"
                }
              />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {totalPercentage}% complete
                </span>
                <span className="text-gray-600">
                  {remainingCredits} credits remaining
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
                <p className="text-xl font-bold mt-1">{creditsEarned}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium">Remaining</span>
                </div>
                <p className="text-xl font-bold mt-1">{remainingCredits}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Progress */}
      <h3 className="text-xl font-semibold text-gray-800 mb-4">By Category</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {Object.keys(creditRequirements).map((cat, index) => {
          const completed = completedByCategory[cat] || 0;
          const total = creditRequirements[cat];
          const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
          const color = colors[index % colors.length];
          return (
            <Card
              key={cat}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedCat(cat)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-full">
                    {categoryIcons[cat]}
                  </div>
                  <h4 className="font-medium text-gray-800">{cat}</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">
                      {completed} / {total} credits
                    </span>
                  </div>
                  <ProgressBar percentage={percent} color={color} />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{percent}% complete</span>
                    <span className="text-gray-600">
                      {total - completed} remaining
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed list */}
      {selectedCat && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-lg font-semibold mb-4">
            {selectedCat} Courses Taken
          </h4>
          {filteredCourses.length ? (
            <ul className="space-y-2">
              {filteredCourses.map((c) => (
                <li
                  key={c.code}
                  className="flex justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {c.code} - {c.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {c.credit} credits
                    </div>
                    {c.isRetake && (
                      <span className="text-xs text-yellow-800">Retaken</span>
                    )}
                  </div>
                  {c.status === "Failed" && (
                    <span className="text-xs text-red-600">Failed</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              No passed courses in this category yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;
