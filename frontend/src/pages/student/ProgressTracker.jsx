import React from "react";
import { Card, CardContent } from "../../components/ui/card";
import { BookOpenCheck, CheckCircle, Clock, GraduationCap } from "lucide-react";

const progressData = {
  totalCreditsRequired: 130,
  creditsEarned: 84,
  categories: [
    {
      name: "Faculty Core",
      total: 30,
      completed: 24,
      icon: <BookOpenCheck className="w-5 h-5" />,
    },
    {
      name: "Programme Core",
      total: 40,
      completed: 32,
      icon: <GraduationCap className="w-5 h-5" />,
    },
    {
      name: "University Courses",
      total: 20,
      completed: 14,
      icon: <BookOpenCheck className="w-5 h-5" />,
    },
    {
      name: "Specialization Electives",
      total: 30,
      completed: 10,
      icon: <GraduationCap className="w-5 h-5" />,
    },
    {
      name: "SHE Cluster",
      total: 10,
      completed: 4,
      icon: <BookOpenCheck className="w-5 h-5" />,
    },
  ],
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
  const totalPercentage = Math.round(
    (progressData.creditsEarned / progressData.totalCreditsRequired) * 100
  );
  const remainingCredits =
    progressData.totalCreditsRequired - progressData.creditsEarned;

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-[#1E3A8A]">Progress Tracker</h2>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString()}
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
                  {progressData.creditsEarned} /{" "}
                  {progressData.totalCreditsRequired} credits
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
                <p className="text-xl font-bold mt-1">
                  {progressData.creditsEarned}
                </p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {progressData.categories.map((cat, index) => {
          const percent = Math.round((cat.completed / cat.total) * 100);
          const colors = ["blue", "emerald", "violet", "amber", "rose"];

          return (
            <Card key={cat.name} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-full">{cat.icon}</div>
                  <h4 className="font-medium text-gray-800">{cat.name}</h4>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">
                      {cat.completed} / {cat.total} credits
                    </span>
                  </div>
                  <ProgressBar
                    percentage={percent}
                    color={colors[index % colors.length]}
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{percent}% complete</span>
                    <span className="text-gray-600">
                      {cat.total - cat.completed} remaining
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressTracker;
