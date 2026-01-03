import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  GraduationCap,
  TrendingUp,
  Calendar,
  FileText,
  User,
  ArrowRight,
  Activity,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import axiosClient from "../../api/axiosClient";
import { Card, CardContent } from "../../components/ui/card";

// --- Helper Functions ---

const parseYear = (yearData) => {
  if (!yearData) return null;
  // If it's a number (2023), return it
  if (typeof yearData === "number") return yearData;
  // If it's a string ("2023/2024"), split and take the first part
  return parseInt(String(yearData).split("/")[0], 10);
};

const parseSemester = (semData) => {
  if (!semData) return null;
  // If it's a number (1), return it
  if (typeof semData === "number") return semData;
  // If it's a string ("Semester 1"), remove non-digits
  return parseInt(String(semData).replace(/\D/g, ""), 10);
};

// Calculate current student Year/Sem based on Intake vs Current Session
const calculateStudentProgress = (
  intakeYear,
  intakeSem,
  currentYear,
  currentSem
) => {
  // 1. Validation
  if (!intakeYear || !currentYear || !intakeSem || !currentSem) {
    return { year: 1, semester: 1 };
  }

  // 2. Calculation Logic
  // Formula: (Year Difference * 2) + Current Semester Offset
  const yearDiff = currentYear - intakeYear;

  // intakeSem - 1 gives us the "base" offset (0 for Sem 1, 1 for Sem 2)
  const totalSemesters = yearDiff * 2 + currentSem - (intakeSem - 1);

  if (totalSemesters <= 0) return { year: 1, semester: 1 };

  // Example: If totalSemesters is 7
  // Year = Math.ceil(7 / 2) = 4
  // Semester = (7 % 2 === 0) ? 2 : 1  -> 1
  // Result: Year 4, Semester 1
  const studentYear = Math.ceil(totalSemesters / 2);
  const studentSemester = totalSemesters % 2 === 0 ? 2 : 1;

  return { year: studentYear, semester: studentSemester };
};

// --- Components ---

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  colorClass,
  loading,
  alert,
}) => (
  <Card
    className={`border-l-4 shadow-sm hover:shadow-md transition-shadow ${
      alert ? "border-l-red-500" : "border-l-[#1E3A8A]"
    }`}
  >
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <h3
              className={`text-2xl font-bold ${
                alert ? "text-red-600" : "text-gray-900"
              }`}
            >
              {value}
            </h3>
          )}
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${colorClass.replace("bg-", "text-")}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const StudentDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // State for all dashboard data
  const [data, setData] = useState({
    cgpa: 0,
    completedCredits: 0,
    totalCreditsRequired: 120, // Default fallback
    currentYear: 1,
    currentSemester: 1,
    status: "Active",
    statusNote: "Good Standing",
    isProbation: false,
    studentName: "",
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Ensure we have a user object (from AuthContext)
      if (!user) return;

      try {
        setLoading(true);

        // --- ID RETRIEVAL ---
        const userId =
          user.user_id ||
          user._id ||
          localStorage.getItem("userId") ||
          JSON.parse(localStorage.getItem("user"))?._id;

        if (!userId) {
          console.error("User ID not found in context or localStorage");
          return;
        }

        // Parallel Fetching
        // Added studentProfileRes to get intake info consistently with Academic Profile page
        const [profileRes, requirementsRes, sessionRes, studentProfileRes] =
          await Promise.allSettled([
            axiosClient.get(`/academic-profile/${userId}`),
            axiosClient.get(
              `/programme-intakes/student/${userId}/requirements`
            ),
            axiosClient.get(`/academic-sessions/current`),
            axiosClient.get(`/academic-profile/student-profile/${userId}`),
          ]);

        // 1. Process Profile Data
        let profile = {};
        if (profileRes.status === "fulfilled") {
          profile = profileRes.value.data;
        }

        // 2. Process Requirements Data
        let totalReq = 120; // fallback
        if (
          requirementsRes.status === "fulfilled" &&
          requirementsRes.value.data?.totalRequiredCredits
        ) {
          totalReq = requirementsRes.value.data.totalRequiredCredits;
        }

        // 3. Calculate Current Year/Sem
        let studentProgress = { year: 1, semester: 1 };

        if (sessionRes.status === "fulfilled") {
          const sessionData = sessionRes.value.data;

          // A. Parse Current Session
          const currentYear = parseYear(sessionData.year);
          const currentSem = parseSemester(sessionData.semester);

          // B. Parse Intake Session
          // We use the specific student-profile endpoint results for reliability
          let intakeYear = null;
          let intakeSem = 1;

          if (studentProfileRes.status === "fulfilled") {
            const spData = studentProfileRes.value.data;
            intakeYear = parseYear(spData.intakeYear);
            intakeSem = parseSemester(spData.intakeSemester);
          } else if (profile.student) {
            // Fallback: Try to get from the main profile object if specific call failed
            if (profile.student.programme_intake?.academic_session_id) {
              intakeYear = parseYear(
                profile.student.programme_intake.academic_session_id.year
              );
              intakeSem = parseSemester(
                profile.student.programme_intake.academic_session_id.semester
              );
            } else if (profile.student.academicSession) {
              intakeYear = parseYear(profile.student.academicSession.year);
              intakeSem = parseSemester(
                profile.student.academicSession.semester
              );
            }
          }

          // C. Calculate Progress
          studentProgress = calculateStudentProgress(
            intakeYear,
            intakeSem,
            currentYear,
            currentSem
          );
        }

        // 4. Determine Academic Status
        const cgpa = profile.cgpa || 0.0;
        const isProbation = cgpa > 0 && cgpa < 2.0;
        const statusText = profile.student?.status || "Active";
        const statusNote = isProbation ? "Academic Probation" : "Good Standing";

        setData({
          cgpa: cgpa,
          completedCredits: profile.completed_credit_hours || 0,
          totalCreditsRequired: totalReq,
          currentYear: studentProgress.year,
          currentSemester: studentProgress.semester,
          status: statusText,
          statusNote: statusNote,
          isProbation: isProbation,
          studentName: profile.student?.fullName || user.username || "Student",
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Calculate progress bar width
  const progressPercent = Math.min(
    100,
    Math.round((data.completedCredits / data.totalCreditsRequired) * 100)
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header Section */}
      <div className="bg-[#1E3A8A] text-white pt-8 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold backdrop-blur-sm border border-white/30">
              {data.studentName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome back, {data.studentName.split(" ")[0]}!
              </h1>
              <div className="flex items-center gap-3 mt-1 text-blue-100">
                <span className="bg-blue-800/50 px-2 py-0.5 rounded text-sm border border-blue-400/30">
                  Year {data.currentYear}, Semester {data.currentSemester}
                </span>
                <span className="text-sm opacity-80">
                  Let's check your progress today.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* CGPA Card */}
          <StatCard
            title="Current CGPA"
            value={data.cgpa.toFixed(2)}
            subtitle={data.statusNote}
            icon={TrendingUp}
            colorClass={
              data.isProbation
                ? "text-red-600 bg-red-100"
                : "text-emerald-600 bg-emerald-100"
            }
            loading={loading}
            alert={data.isProbation}
          />

          {/* Credits Progress Card */}
          <Card className="border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Credit Progress
                  </p>
                  {loading ? (
                    <div className="h-8 w-24 bg-gray-200 animate-pulse rounded mt-1"></div>
                  ) : (
                    <h3 className="text-2xl font-bold text-gray-900">
                      {data.completedCredits}
                      <span className="text-sm text-gray-400 font-normal ml-1">
                        / {data.totalCreditsRequired}
                      </span>
                    </h3>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <GraduationCap className="w-6 h-6" />
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    progressPercent >= 100 ? "bg-emerald-500" : "bg-blue-600"
                  }`}
                  style={{ width: `${loading ? 0 : progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-right font-medium">
                {progressPercent}% Completed
              </p>
            </CardContent>
          </Card>

          {/* Status Card */}
          <StatCard
            title="Academic Status"
            value={data.status} // e.g., "Active", "Probation"
            subtitle={
              data.status === "Active"
                ? "Keep up the good work!"
                : "Action required"
            }
            icon={Activity}
            colorClass={
              data.isProbation
                ? "text-amber-600 bg-amber-100"
                : "text-purple-600 bg-purple-100"
            }
            loading={loading}
          />
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/academic-planner" className="group">
              <Card className="h-full hover:border-blue-500 transition-all cursor-pointer border hover:shadow-md hover:-translate-y-1">
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Calendar className="w-6 h-6 text-[#1E3A8A]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Academic Planner
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Plan upcoming semesters
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/progress-tracker" className="group">
              <Card className="h-full hover:border-emerald-500 transition-all cursor-pointer border hover:shadow-md hover:-translate-y-1">
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                    <BookOpen className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Progress Tracker
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Check graduation requirements
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/academic-profile" className="group">
              <Card className="h-full hover:border-purple-500 transition-all cursor-pointer border hover:shadow-md hover:-translate-y-1">
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      My Transcript
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Update passed courses
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/student-profile" className="group">
              <Card className="h-full hover:border-amber-500 transition-all cursor-pointer border hover:shadow-md hover:-translate-y-1">
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                    <User className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Student Profile
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Manage personal details
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Recent/Suggested Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-t-4 border-t-[#1E3A8A]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#1E3A8A]" />
                  Recommended Next Steps
                </h3>
              </div>
              <ul className="space-y-4">
                {/* Dynamic Logic for recommendations */}

                {/* 1. Low CGPA Warning */}
                {data.isProbation && (
                  <li className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        Academic Attention Needed
                      </p>
                      <p className="text-sm text-red-600 mt-1">
                        Your CGPA is currently below 2.0. We strongly recommend
                        scheduling a meeting with your advisor.
                      </p>
                      <Link
                        to="/chat-with-advisor"
                        className="text-xs font-semibold text-red-700 hover:underline mt-2 inline-block"
                      >
                        Contact Advisor &rarr;
                      </Link>
                    </div>
                  </li>
                )}

                {/* 2. Standard Recommendation */}
                <li className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 shrink-0" />
                  <p className="text-sm text-gray-600">
                    Ensure your{" "}
                    <Link
                      to="/academic-profile"
                      className="text-blue-600 font-medium hover:underline"
                    >
                      Transcript
                    </Link>{" "}
                    is up to date with your latest exam results from{" "}
                    <strong>
                      Year {data.currentYear} Semester {data.currentSemester}
                    </strong>
                    .
                  </p>
                </li>

                {/* 3. Planning Recommendation */}
                <li className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500 shrink-0" />
                  <p className="text-sm text-gray-600">
                    View{" "}
                    <Link
                      to="/course-recommendations"
                      className="text-blue-600 font-medium hover:underline"
                    >
                      Course Recommendations
                    </Link>{" "}
                    to see which electives fit your remaining credit hours.
                  </p>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1E3A8A] to-blue-900 text-white shadow-lg overflow-hidden relative">
            {/* Background Pattern */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-blue-400 opacity-10 rounded-full blur-xl"></div>

            <CardContent className="p-8 flex flex-col justify-between h-full relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-xl">Advisor Support</h3>
                </div>
                <p className="text-blue-100 text-sm leading-relaxed mb-6">
                  Unsure about your specialization or internship path? Connect
                  with your academic advisor to discuss your study plan and
                  career goals.
                </p>
              </div>
              <Link
                to="/chat-with-advisor"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#1E3A8A] px-5 py-3 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Contact Advisor <ArrowRight className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
