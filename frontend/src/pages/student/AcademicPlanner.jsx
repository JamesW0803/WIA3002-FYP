import React, { useState, useRef, useEffect } from "react";
import { Button } from "../../components/ui/button";
import ProgramPlansSection from "../../components/Students/AcademicPlanner/ProgramPlansSection";
import GPAPlannerSection from "../../components/Students/AcademicPlanner/GPAPlannerSection";
import PageHeader from "../../components/Students/PageHeader";
import { Plus, CheckCircle2, XCircle, LoaderCircle } from "lucide-react";
import {
  canAddNewPlan,
  findLastCompletedSemester,
  generateNewPlanFromStartingPoint,
} from "../../components/Students/AcademicPlanner/utils/planHelpers";
import axiosClient from "../../api/axiosClient";
import { AnimatePresence, motion } from "framer-motion";

const AcademicPlanner = () => {
  const [activeTab, setActiveTab] = useState("program");
  const [editingPlan, setEditingPlan] = useState(null);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [tempPlans, setTempPlans] = useState([]);
  const [unsavedPlan, setUnsavedPlan] = useState(null);
  const [completedCourses, setCompletedCourses] = useState([]);
  const [completedCoursesByYear, setCompletedCoursesByYear] = useState({});
  const [collapsedYears, setCollapsedYears] = useState({});
  const [startingPlanPoint, setStartingPlanPoint] = useState({
    year: 1,
    semester: 1,
  });
  const [programPlans, setProgramPlans] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState(null);

  useEffect(() => {
    const fetchAcademicProfileAndPlans = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const userId = localStorage.getItem("userId");

        const [profileRes, plansRes] = await Promise.all([
          axiosClient.get(`/academic-profile/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axiosClient.get(`/academic-plans/students/${userId}/plans`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const profileData = profileRes.data;
        const plansData = plansRes.data;

        // Group courses by year -> semester
        const byYear = {};
        profileData.entries.forEach((entry) => {
          const yearKey = `Year ${entry.year}`;
          const semKey = `Semester ${entry.semester}`;

          if (!byYear[yearKey]) byYear[yearKey] = {};
          if (!byYear[yearKey][semKey]) byYear[yearKey][semKey] = [];

          byYear[yearKey][semKey].push({
            code: entry.course.course_code,
            name: entry.course.course_name,
            credit: entry.course.credit_hours,
            grade: entry.grade,
            status: entry.status,
            isRetake: entry.isRetake,
            type: entry.course.type,
          });
        });

        setCompletedCoursesByYear(byYear);
        setCompletedCourses(
          profileData.entries.map((e) => e.course.course_code)
        );

        // After setting completed courses, determine where to start planning

        const lastCompleted = findLastCompletedSemester(profileData.entries);
        setStartingPlanPoint(lastCompleted);

        if (plansData.success && plansData.data.length > 0) {
          // Map backend _id to id for frontend compatibility
          const plansWithIds = plansData.data.map((plan) => ({
            ...plan,
            id: plan.identifier,
          }));
          setProgramPlans(plansWithIds);
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
      }
    };

    fetchAcademicProfileAndPlans();
  }, []);

  useEffect(() => {
    // In your useEffect for fetching courses:
    const fetchCourses = async () => {
      try {
        setCoursesLoading(true);
        setCoursesError(null);
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await axiosClient.get("/courses?minimal=true", {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Validate and transform the courses data
        const validatedCourses = response.data.map((course) => ({
          _id: course._id,
          code: course.code || course.course_code || "",
          name: course.name || course.course_name || "",
          credit: course.credit || course.credit_hours || 0,
          prerequisites: course.prerequisites || [], // Already in code format from backend
          offered_semester: course.offered_semester || [],
        }));

        console.log("Fetched courses:", validatedCourses); // Debug log
        setAllCourses(validatedCourses);
      } catch (err) {
        console.error("Failed to fetch courses", err);
        setCoursesError("Failed to load courses. Please try again later.");
        setAllCourses([]); // Set empty array on error
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const editSectionRef = useRef(null);
  const viewSectionRef = useRef(null);

  useEffect(() => {
    console.log("Starting plan point updated:", startingPlanPoint);
  }, [startingPlanPoint]);

  const addPlan = async () => {
    const activePlans = programPlans.filter(
      (plan) => !tempPlans.includes(plan.id)
    );

    if (!canAddNewPlan(programPlans, tempPlans)) {
      alert("Max 3 plans allowed.");
      return;
    }

    const userId = localStorage.getItem("userId");

    try {
      const newPlanData = generateNewPlanFromStartingPoint(
        activePlans.length,
        startingPlanPoint
      );

      const token = localStorage.getItem("token");
      const response = await axiosClient.post(
        `/academic-plans/students/${userId}/plans`,
        newPlanData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const savedPlan = response.data.data;
      setProgramPlans([
        ...programPlans,
        { ...savedPlan, id: savedPlan.identifier },
      ]);
      setEditingPlan(savedPlan.identifier);
      setTempPlans([...tempPlans, savedPlan.identifier]);
      setIsCreatingNew(true);
      setUnsavedPlan(savedPlan);
      scrollToEditSection();
    } catch (error) {
      console.error("Error creating new plan", error);
      alert("Failed to create plan.");
    }
  };

  const scrollToEditSection = () => {
    setTimeout(() => {
      editSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const scrollToViewSection = () => {
    setTimeout(() => {
      viewSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Failed":
        return "bg-red-100 text-red-800";
      case "Ongoing":
        return "bg-yellow-100 text-yellow-800";
      case "Passed":
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const toggleYearCollapse = (year) => {
    setCollapsedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <PageHeader
        title="Academic Planner"
        subtitle="Plan your academic journey"
        actions={
          activeTab === "program" ? (
            <Button
              variant="defaultWithIcon"
              onClick={addPlan}
              // Hide on mobile, show from sm and up
              className="hidden sm:inline-flex"
            >
              <Plus className="w-4 h-4" />
              Create New Program Plan
            </Button>
          ) : null
        }
      />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg max-w-md overflow-x-auto no-scrollbar">
            <Button
              variant={activeTab === "program" ? "default" : "ghost"}
              className={`flex-1 whitespace-nowrap ${
                activeTab !== "program" ? "hover:bg-gray-50 text-gray-700" : ""
              }`}
              onClick={() => setActiveTab("program")}
            >
              Program Plans
            </Button>
            <Button
              variant={activeTab === "gpa" ? "default" : "ghost"}
              className={`flex-1 whitespace-nowrap ${
                activeTab !== "gpa" ? "hover:bg-gray-50 text-gray-700" : ""
              }`}
              onClick={() => setActiveTab("gpa")}
            >
              GPA Forecasts
            </Button>
          </div>
        </div>
        {activeTab === "program" ? (
          <>
            <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-gray-800">
                  Completed Courses
                </h3>
              </div>
              <div className="space-y-6 p-4">
                {Object.entries(completedCoursesByYear).map(
                  ([year, semesters], index) => {
                    const isCollapsed = collapsedYears[year];
                    return (
                      <div
                        key={year}
                        className={`pt-6 ${
                          index !== 0 ? "border-t-2 border-gray-300 mt-4" : ""
                        }`}
                      >
                        {/* Year Header Toggle */}
                        <div
                          onClick={() => toggleYearCollapse(year)}
                          className="flex justify-between items-center cursor-pointer mb-3"
                        >
                          <h4 className="text-lg font-semibold text-gray-700">
                            {year}
                          </h4>
                          <span className="text-sm text-blue-600 hover:underline">
                            {isCollapsed ? "Show" : "Hide"}
                          </span>
                        </div>

                        <AnimatePresence initial={false}>
                          {!isCollapsed && (
                            <motion.div
                              key="content"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{
                                duration: 0.3,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              style={{ overflow: "hidden" }}
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
                                {["Semester 1", "Semester 2"].map((sem) => (
                                  <div key={sem}>
                                    <div className="flex justify-between items-center mb-2">
                                      <h5 className="text-md font-medium text-gray-600">
                                        {sem}
                                      </h5>
                                      <span className="text-sm text-green-600 font-medium">
                                        {semesters[sem]?.reduce(
                                          (sum, c) => sum + c.credit,
                                          0
                                        ) || 0}{" "}
                                        credits
                                      </span>
                                    </div>

                                    {semesters[sem]?.length ? (
                                      <div className="space-y-3">
                                        {semesters[sem].map((course, index) => (
                                          <div
                                            key={index}
                                            className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-100"
                                          >
                                            <div
                                              className={`p-2 rounded-full mr-3 ${getStatusColor(
                                                course.status
                                              )}`}
                                            >
                                              {course.status === "Failed" ? (
                                                <XCircle className="h-4 w-4 text-red-600" />
                                              ) : course.status ===
                                                "Ongoing" ? (
                                                <LoaderCircle className="h-4 w-4 text-yellow-600 animate-spin" />
                                              ) : (
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                              )}
                                            </div>
                                            <div>
                                              <div className="font-medium text-gray-900">
                                                {course.code} - {course.name}
                                              </div>
                                              <div className="text-sm text-gray-600">
                                                {course.credit} credits
                                              </div>
                                              <div className="text-xs text-gray-500 mt-1 capitalize">
                                                {course.type.replace(/_/g, " ")}
                                                {course.isRetake && (
                                                  <span className="ml-2 inline-block bg-yellow-200 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded">
                                                    Retake
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-400">
                                        No courses
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            <ProgramPlansSection
              startingPlanPoint={startingPlanPoint}
              allCourses={allCourses}
              completedCourses={completedCourses}
              completedCoursesByYear={completedCoursesByYear}
              programPlans={programPlans}
              setProgramPlans={setProgramPlans}
              tempPlans={tempPlans}
              setTempPlans={setTempPlans}
              editingPlan={editingPlan}
              setEditingPlan={setEditingPlan}
              viewingPlan={viewingPlan}
              setViewingPlan={setViewingPlan}
              isCreatingNew={isCreatingNew}
              setIsCreatingNew={setIsCreatingNew}
              unsavedPlan={unsavedPlan}
              setUnsavedPlan={setUnsavedPlan}
              editSectionRef={editSectionRef}
              viewSectionRef={viewSectionRef}
              scrollToEditSection={scrollToEditSection}
              scrollToViewSection={scrollToViewSection}
            />
          </>
        ) : (
          <GPAPlannerSection
            completedCoursesByYear={completedCoursesByYear}
            programPlans={programPlans}
          />
        )}
      </div>
    </div>
  );
};

export default AcademicPlanner;
