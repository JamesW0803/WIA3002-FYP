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
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Target,
  Clock,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import axiosClient from "../../api/axiosClient";
import { Card, CardContent } from "../../components/ui/card";

// --- Helper Functions (Unchanged) ---
const parseYear = (yearData) => {
  if (!yearData) return null;
  if (typeof yearData === "number") return yearData;
  return parseInt(String(yearData).split("/")[0], 10);
};

const parseSemester = (semData) => {
  if (!semData) return null;
  if (typeof semData === "number") return semData;
  return parseInt(String(semData).replace(/\D/g, ""), 10);
};

const calculateStudentProgress = (
  intakeYear,
  intakeSem,
  currentYear,
  currentSem
) => {
  if (!intakeYear || !currentYear || !intakeSem || !currentSem) {
    return { year: 1, semester: 1 };
  }

  const yearDiff = currentYear - intakeYear;
  const totalSemesters = yearDiff * 2 + currentSem - (intakeSem - 1);

  if (totalSemesters <= 0) return { year: 1, semester: 1 };

  const studentYear = Math.ceil(totalSemesters / 2);
  const studentSemester = totalSemesters % 2 === 0 ? 2 : 1;

  return { year: studentYear, semester: studentSemester };
};

// --- UI Components ---

const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
  status,
}) => {
  // Logic: "Default" now uses the brand theme instead of plain gray
  const styles = {
    default: {
      bg: "bg-blue-50",
      icon: "text-[#1E3A8A]",
      border: "border-slate-100",
    },
    positive: {
      bg: "bg-emerald-50",
      icon: "text-emerald-600",
      border: "border-emerald-100",
    },
    warning: {
      bg: "bg-amber-50",
      icon: "text-amber-600",
      border: "border-amber-100",
    },
    negative: {
      bg: "bg-red-50",
      icon: "text-red-600",
      border: "border-red-100",
    },
  };

  const currentStyle = styles[status] || styles.default;

  return (
    <Card
      className={`border ${currentStyle.border} shadow-sm hover:shadow-md transition-all duration-300`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 animate-pulse rounded mt-1" />
            ) : (
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
                {value}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs font-medium text-slate-400 mt-2 flex items-center gap-1">
                {subtitle}
              </p>
            )}
          </div>
          <div
            className={`p-3 rounded-xl ${currentStyle.bg} transition-colors`}
          >
            <Icon className={`w-6 h-6 ${currentStyle.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const QuickAction = ({ to, icon: Icon, title, description }) => (
  <Link to={to} className="group block h-full">
    <Card className="h-full border border-slate-200 hover:border-[#1E3A8A] hover:shadow-md transition-all duration-300 group-hover:-translate-y-1">
      <CardContent className="p-5">
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-lg bg-slate-50 group-hover:bg-[#1E3A8A] transition-colors duration-300">
              <Icon className="w-6 h-6 text-slate-600 group-hover:text-white transition-colors duration-300" />
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#1E3A8A] transition-colors" />
          </div>
          <div className="mt-auto">
            <h3 className="font-semibold text-slate-900 group-hover:text-[#1E3A8A] transition-colors">
              {title}
            </h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </Link>
);

const ProgressBar = ({ value, max, label, loading }) => {
  const percentage = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <div>
          <span className="text-sm font-medium text-slate-700 block mb-1">
            {label}
          </span>
          <span className="text-xs text-slate-500">Target: {max} credits</span>
        </div>
        <span className="text-lg font-bold text-[#1E3A8A]">
          {loading ? "..." : `${percentage}%`}
        </span>
      </div>

      {/* Enhanced Progress Bar */}
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div
          className="absolute h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: loading ? "0%" : `${percentage}%`,
            backgroundColor: "#1E3A8A",
            // Add a subtle gradient to the bar itself for depth
            backgroundImage:
              "linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)",
            backgroundSize: "1rem 1rem",
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-slate-400 font-medium">
        <span>Start</span>
        <span>{value} Completed</span>
      </div>
    </div>
  );
};

const AlertCard = ({ type, title, message, action }) => {
  const config = {
    warning: {
      icon: AlertCircle,
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconColor: "text-amber-600",
      textColor: "text-amber-900",
      buttonBg: "bg-amber-100 hover:bg-amber-200",
      buttonText: "text-amber-800",
    },
    info: {
      icon: Sparkles, // Changed check to sparkles for "Updates/Info"
      bg: "bg-indigo-50",
      border: "border-indigo-100",
      iconColor: "text-indigo-600",
      textColor: "text-indigo-900",
      buttonBg: "bg-indigo-100 hover:bg-indigo-200",
      buttonText: "text-indigo-800",
    },
  };

  const {
    icon: Icon,
    bg,
    border,
    iconColor,
    textColor,
    buttonBg,
    buttonText,
  } = config[type];

  return (
    <div
      className={`${bg} ${border} border rounded-xl p-4 transition-all hover:shadow-sm`}
    >
      <div className="flex gap-4">
        <div className={`p-2 bg-white/60 rounded-full h-fit`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <h4 className={`font-semibold ${textColor}`}>{title}</h4>
          <p className={`text-sm ${textColor} mt-1 opacity-90`}>{message}</p>
          {action && (
            <Link
              to={action.to}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold ${buttonBg} ${buttonText} mt-3 transition-colors`}
            >
              {action.text} <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---

const StudentDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    cgpa: 0,
    completedCredits: 0,
    totalCreditsRequired: 120,
    currentYear: 1,
    currentSemester: 1,
    status: "Active",
    isProbation: false,
    studentName: "",
    isProfileIncomplete: false,
    programmeName: "",
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const userId =
          user.user_id ||
          user._id ||
          localStorage.getItem("userId") ||
          JSON.parse(localStorage.getItem("user"))?._id;

        if (!userId) return;

        const [
          profileRes,
          requirementsRes,
          sessionRes,
          studentProfileRes,
          studentUserProfileRes,
        ] = await Promise.allSettled([
          axiosClient.get(`/academic-profile/${userId}`),
          axiosClient.get(`/programme-intakes/student/${userId}/requirements`),
          axiosClient.get(`/academic-sessions/current`),
          axiosClient.get(`/academic-profile/student-profile/${userId}`),
          axiosClient.get(`/user/student-profile/${userId}`),
        ]);

        let profile = {};
        if (profileRes.status === "fulfilled") profile = profileRes.value.data;

        let isProfileIncomplete = false;
        let programmeName = "";
        if (studentUserProfileRes.status === "fulfilled") {
          const sp = studentUserProfileRes.value.data;
          const fullNameOk = !!(sp.fullName && sp.fullName.trim());
          const phoneOk = !!(sp.phone && sp.phone.trim());
          const addressOk = !!(sp.address && sp.address.trim());
          isProfileIncomplete = !(fullNameOk && phoneOk && addressOk);
          programmeName = sp.programme || "";
        } else {
          // If the profile fetch fails, don't block the UI with a warning
          isProfileIncomplete = false;
          programmeName = "";
        }

        let totalReq = 120;
        if (
          requirementsRes.status === "fulfilled" &&
          requirementsRes.value.data?.totalRequiredCredits
        ) {
          totalReq = requirementsRes.value.data.totalRequiredCredits;
        }

        let studentProgress = { year: 1, semester: 1 };
        if (sessionRes.status === "fulfilled") {
          const sessionData = sessionRes.value.data;
          const currentYear = parseYear(sessionData.year);
          const currentSem = parseSemester(sessionData.semester);

          let intakeYear = null;
          let intakeSem = 1;

          if (studentProfileRes.status === "fulfilled") {
            const spData = studentProfileRes.value.data;
            intakeYear = parseYear(spData.intakeYear);
            intakeSem = parseSemester(spData.intakeSemester);
          } else if (profile.student) {
            // Fallback logic from original code
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
          studentProgress = calculateStudentProgress(
            intakeYear,
            intakeSem,
            currentYear,
            currentSem
          );
        }

        const cgpa = profile.cgpa || 0.0;
        const isProbation = cgpa > 0 && cgpa < 2.0;

        setData({
          cgpa,
          completedCredits: profile.completed_credit_hours || 0,
          totalCreditsRequired: totalReq,
          currentYear: studentProgress.year,
          currentSemester: studentProgress.semester,
          status: profile.student?.status || "Active",
          isProbation,
          studentName: profile.student?.fullName || user.username || "Student",
          isProfileIncomplete,
          programmeName,
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1. Brand Header Section with Gradient */}
      <div className="bg-[#1E3A8A] text-white pt-10 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Abstract Background Shapes for texture */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white opacity-5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-blue-400 opacity-10 blur-2xl"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2 text-blue-200">
                <GraduationCap className="w-5 h-5" />
                <span className="text-sm font-semibold tracking-wide uppercase">
                  Student
                </span>
              </div>
              <h1 className="text-3xl font-bold">
                Welcome back, {data.studentName}
              </h1>
              <p className="text-blue-200 mt-2 max-w-xl">
                Track your academic progress, manage your courses, and stay
                updated with your latest requirements.
              </p>
            </div>

            {/* Academic Year Badge - Now Glassmorphism */}
            <div className="inline-flex items-center gap-3 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl">
              <div className="bg-white/20 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">
                  Current Session
                </p>
                <p className="text-sm font-bold text-white">
                  Year {data.currentYear} • Sem {data.currentSemester}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content - Negative Margin for "Overlap" effect */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-12 relative z-20">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            title="Current CGPA"
            value={data.cgpa > 0 ? data.cgpa.toFixed(2) : "—"}
            subtitle={data.cgpa > 0 ? "Academic Standing" : "No data available"}
            icon={TrendingUp}
            loading={loading}
            status={
              data.isProbation
                ? "negative"
                : data.cgpa >= 3.5
                ? "positive"
                : "default"
            }
          />

          <MetricCard
            title="Academic Status"
            value={data.status}
            subtitle={data.isProbation ? "Action Required" : "Good Standing"}
            icon={CheckCircle}
            loading={loading}
            status={data.isProbation ? "warning" : "positive"}
          />

          <MetricCard
            title="Credit Progress"
            value={`${data.completedCredits} / ${data.totalCreditsRequired}`}
            subtitle="Credits Earned"
            icon={Target}
            loading={loading}
            status="default"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Progress & Actions (Span 2) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions Grid */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">
                  Quick Actions
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <QuickAction
                  to="/academic-profile"
                  icon={FileText}
                  title="View Transcript"
                  description="Access your full academic history and grades."
                />
                <QuickAction
                  to="/academic-planner"
                  icon={Calendar}
                  title="Course Planner"
                  description="Plan your schedule for upcoming semesters."
                />
                <QuickAction
                  to="/progress-tracker"
                  icon={BookOpen}
                  title="Progress Tracker"
                  description="Check remaining requirements for graduation."
                />
                <QuickAction
                  to="/student-profile"
                  icon={User}
                  title="My Profile"
                  description="Update personal details and contact info."
                />
              </div>
            </section>

            {/* Progress Section */}
            <Card className="border border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Degree Progress
                    </h2>
                    <p className="text-slate-500 text-sm">
                      {data.programmeName || "—"}
                    </p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <span className="text-xs font-semibold text-[#1E3A8A] bg-blue-50 px-2 py-1 rounded">
                      {data.currentYear} / 4 Years
                    </span>
                  </div>
                </div>
                <ProgressBar
                  value={data.completedCredits}
                  max={data.totalCreditsRequired}
                  label="Total Credit Hours"
                  loading={loading}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Alerts & Advisor (Span 1) */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800">Notifications</h2>

            {data.isProbation && (
              <AlertCard
                type="warning"
                title="Academic Alert"
                message="Your CGPA is below 2.0. Please contact your advisor immediately."
                action={{ to: "/chat-with-advisor", text: "Contact Advisor" }}
              />
            )}

            {data.isProfileIncomplete && (
              <AlertCard
                type="info"
                title="Complete Your Profile"
                message="Please update your full name, phone number, and address to complete your student profile."
                action={{ to: "/student-profile", text: "Update Profile" }}
              />
            )}

            {/* Advisor Card - Custom Theme Styling */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg mt-4 group">
              <div className="absolute inset-0 bg-[#1E3A8A]"></div>
              {/* Decorative Pattern */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                  backgroundSize: "20px 20px",
                }}
              ></div>

              <div className="relative p-6 text-white">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/20 transition-all">
                  <User className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-lg font-bold mb-2">Need Guidance?</h3>
                <p className="text-blue-100 text-sm mb-6 leading-relaxed">
                  Unsure about your next steps? Your academic advisor is ready
                  to help you plan your path.
                </p>

                <Link
                  to="/chat-with-advisor"
                  className="w-full bg-white text-[#1E3A8A] py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors shadow-sm"
                >
                  Chat Now <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
