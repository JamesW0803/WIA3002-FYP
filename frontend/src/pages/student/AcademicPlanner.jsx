import React, { useState, useRef, useEffect } from "react";
import { Button } from "../../components/ui/button";
import ProgramPlansSection from "../../components/Students/AcademicPlanner/ProgramPlansSection";
import GPAPlannerSection from "../../components/Students/AcademicPlanner/GPAPlannerSection";
import PageHeader from "../../components/Students/PageHeader";
import { Plus, CheckCircle2, XCircle, LoaderCircle } from "lucide-react";
import {
  canAddNewPlan,
  findLastCompletedSemester,
  findNextSemesterToPlan,
  generateNewPlanFromStartingPoint,
} from "../../components/Students/AcademicPlanner/utils/planHelpers";
import axiosClient from "../../api/axiosClient";
import { AnimatePresence, motion } from "framer-motion";
import { normalizePlanForUI } from "../../utils/normalisePlan";
import { useAlert } from "../../components/ui/AlertProvider";
import {
  sliceFacultyMappingFrom,
  mappingToAcademicPlanYearsPayload,
  getPlanFirstSemesterPoint,
  isPlanStartingBefore,
} from "../../utils/defaultPlanBuilder";

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
  const [gapsByYear, setGapsByYear] = useState({});

  const { alert } = useAlert();

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
        const fetchedPlans = plansRes.data.data;
        // Filter out plans with status 4 AND isDefault false
        const filteredPlans = fetchedPlans.filter((plan) => {
          // We keep the plan UNLESS it satisfies both conditions (status 4 and !isDefault)
          return !(plan.status === 4 && plan.isDefault === false);
        });

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

        const gapMap = {};
        (profileData.gaps || []).forEach((gap) => {
          const yearKey = `Year ${gap.year}`;
          if (!gapMap[yearKey]) gapMap[yearKey] = { isGapYear: false };

          if (gap.semester == null) {
            // gap year => whole year is gap
            gapMap[yearKey].isGapYear = true;
          } else {
            const semKey = `Semester ${gap.semester}`;
            gapMap[yearKey][semKey] = true;
          }
        });

        Object.keys(gapMap).forEach((yearKey) => {
          if (!byYear[yearKey]) byYear[yearKey] = {};
          ["Semester 1", "Semester 2"].forEach((semKey) => {
            if (!byYear[yearKey][semKey]) {
              byYear[yearKey][semKey] = []; // empty but exists -> "No courses"
            }
          });
        });

        setCompletedCoursesByYear(byYear);
        setGapsByYear(gapMap);
        setCompletedCourses(
          profileData.entries.map((e) => e.course.course_code)
        );

        // After setting completed courses, determine where to start planning
        const nextToPlan = findNextSemesterToPlan(
          profileData.entries,
          profileData.gaps || []
        );

        setStartingPlanPoint(nextToPlan);

        const ensureCourseCatalogLoaded = async () => {
          if (allCourses && allCourses.length) return allCourses;

          const token = localStorage.getItem("token");
          if (!token) return [];

          const response = await axiosClient.get("/courses?minimal=true", {
            headers: { Authorization: `Bearer ${token}` },
          });

          // Use the SAME shape your app expects (code/name/credit)
          const validatedCourses = (response.data || []).map((course) => ({
            _id: course._id || course.id || course._doc?._id,
            code: course.code || course.course_code || "",
            name: course.name || course.course_name || "",
            credit: course.credit || course.credit_hours || 0,
            prerequisites: course.prerequisites || [],
            offered_semester: course.offered_semester || [],
          }));

          setAllCourses(validatedCourses);
          return validatedCourses;
        };

        // Ensure exactly 1 "Default Plan" exists and is aligned to nextToPlan
        const ensureDefaultPlan = async () => {
          const token = localStorage.getItem("token");
          const userId = localStorage.getItem("userId");
          if (!token || !userId) return;

          // use filteredPlans you already built in this effect :contentReference[oaicite:7]{index=7}
          const existing = filteredPlans || [];
          const existingDefault = existing.find((p) => p.isDefault);

          // fetch faculty mapping (same as CourseRecommendations) :contentReference[oaicite:8]{index=8}
          const programmeIntakeCode =
            profileData.programme_intake_code ||
            profileData.programmeIntake?.programme_intake_code;

          let mappingFromBackend = {};
          if (programmeIntakeCode) {
            try {
              const planRes = await axiosClient.get(
                `/programme-intakes/programme-intakes/${programmeIntakeCode}/programme-plan`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              mappingFromBackend = planRes.data?.semesterMapping || {};
            } catch (e) {
              mappingFromBackend = {};
            }
          }

          // If no mapping, don't auto-create (optional: you can still create an empty default)
          if (!Object.keys(mappingFromBackend).length) return;

          // Slice faculty mapping starting from student's next planning point
          const remainingMapping = sliceFacultyMappingFrom(
            mappingFromBackend,
            nextToPlan
          );

          // fetch course catalog for credits/titles
          const catalog = await ensureCourseCatalogLoaded();

          const yearsPayload = mappingToAcademicPlanYearsPayload(
            remainingMapping,
            catalog
          );

          // If mapping slice returns nothing (e.g. student already beyond mapping), skip
          if (!yearsPayload.length) return;

          // Case A: default exists → check alignment, update if outdated
          if (existingDefault) {
            const firstPoint = getPlanFirstSemesterPoint(existingDefault);
            const outdated = isPlanStartingBefore(firstPoint, nextToPlan);

            if (outdated) {
              // PUT updated years into the same default plan
              await axiosClient.put(
                `/academic-plans/plans/${
                  existingDefault._id || existingDefault.id
                }`,
                {
                  ...existingDefault,
                  name: "Default Plan",
                  years: yearsPayload,
                },
                { headers: { Authorization: `Bearer ${token}` } }
              );
            }
            return;
          }

          // Case B: no default exists
          // If already 2 plans and NO default exists, convert ONE plan into the Default Plan
          if (existing.length >= 2) {
            // Prefer a non-default, non-archived plan; otherwise just pick the first
            const candidate =
              existing.find((p) => p.isDefault !== true && p.status !== 4) ||
              existing.find((p) => p.isDefault !== true) ||
              existing[0];

            const candidateId = candidate?._id || candidate?.id;
            if (!candidateId) return;

            // Overwrite this plan into the faculty Default Plan (keeps plan count at 2)
            await axiosClient.put(
              `/academic-plans/plans/${candidateId}`,
              {
                ...candidate,
                name: "Default Plan",
                notes: "Faculty suggested course plan",
                years: yearsPayload,
                status: 1,
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            // Ensure it's marked as current/default
            await axiosClient.patch(
              `/academic-plans/plans/${candidateId}/set-default`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );

            return;
          }

          // Otherwise create a new "Default Plan"
          const createRes = await axiosClient.post(
            `/academic-plans/students/${userId}/plans`,
            {
              name: "Default Plan",
              notes: "Faculty suggested course plan",
              years: yearsPayload,
              status: 1,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const created = createRes.data?.data;
          if (created?._id) {
            // Make sure it's actually the default (needed when this is the 2nd plan) :contentReference[oaicite:9]{index=9}
            await axiosClient.patch(
              `/academic-plans/plans/${created._id}/set-default`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        };

        await ensureDefaultPlan();

        const refreshed = await axiosClient.get(
          `/academic-plans/students/${userId}/plans`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const refreshedPlans = (refreshed.data?.data || [])
          .filter((plan) => !(plan.status === 4 && plan.isDefault === false))
          .map(normalizePlanForUI)
          .filter((p) => p && (p.id || p._id))
          .map((p) => ({ ...p, id: p.id || p._id }));

        setProgramPlans(refreshedPlans);
      } catch (err) {
        console.error("Failed to fetch data", err);
      }
    };

    fetchAcademicProfileAndPlans();
  }, []);

  useEffect(() => {
    if (allCourses.length) return;
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
          _id: course._id || course.id || course._doc?._id,
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
  }, [allCourses.length]);

  const editSectionRef = useRef(null);
  const viewSectionRef = useRef(null);

  useEffect(() => {
    console.log("Starting plan point updated:", startingPlanPoint);
  }, [startingPlanPoint]);

  const startCreatePlan = () => {
    // Close other modes
    setViewingPlan(null);
    setEditingPlan(null);

    // Enforce max plans using your helper
    if (!canAddNewPlan(programPlans, tempPlans)) {
      alert("Max 2 plans allowed.", { title: "Maximum Plans Reached" });
      return;
    }

    const activePlans = (programPlans || [])
      .filter(Boolean)
      .filter((plan) => plan.id && !tempPlans.includes(plan.id));

    // Build new plan (UI-only)
    const newPlan = generateNewPlanFromStartingPoint(
      activePlans.length,
      startingPlanPoint
    );

    const tempId = `tmp-${Date.now()}`;
    const newPlanWithId = { ...newPlan, id: tempId };

    setUnsavedPlan(newPlanWithId);
    setIsCreatingNew(true);
    setEditingPlan(tempId);
    setTempPlans((prev) => [...prev, tempId]);

    scrollToEditSection();
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
              onClick={startCreatePlan}
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
              onClick={() => {
                // ensure modes are closed when leaving the section
                setViewingPlan(null);
                setEditingPlan(null);
                setIsCreatingNew(false);
                setUnsavedPlan(null);
                setActiveTab("gpa");
              }}
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
                    const gapInfo = gapsByYear[year] || {};
                    const isGapYear = !!gapInfo.isGapYear;
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
                          <h4 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                            {year}
                            {isGapYear && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                                Gap Year
                              </span>
                            )}
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
                                {["Semester 1", "Semester 2"].map((sem) => {
                                  const isGapSemester =
                                    isGapYear || gapInfo[sem] === true;
                                  const creditTotal =
                                    semesters[sem]?.reduce(
                                      (sum, c) => sum + c.credit,
                                      0
                                    ) || 0;

                                  return (
                                    <div key={sem}>
                                      <div className="flex justify-between items-center mb-2">
                                        <h5 className="text-md font-medium text-gray-600">
                                          {sem}
                                          {isGapSemester && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                                              Gap Semester
                                            </span>
                                          )}
                                        </h5>
                                        <span className="text-sm text-green-600 font-medium">
                                          {creditTotal} credits
                                        </span>
                                      </div>

                                      {semesters[sem]?.length ? (
                                        <div className="space-y-3">
                                          {semesters[sem].map(
                                            (course, index) => (
                                              <div
                                                key={index}
                                                className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-100"
                                              >
                                                <div
                                                  className={`p-2 rounded-full mr-3 ${getStatusColor(
                                                    course.status
                                                  )}`}
                                                >
                                                  {course.status ===
                                                  "Failed" ? (
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
                                                    {course.code} -{" "}
                                                    {course.name}
                                                  </div>
                                                  <div className="text-sm text-gray-600">
                                                    {course.credit} credits
                                                  </div>
                                                  <div className="text-xs text-gray-500 mt-1 capitalize">
                                                    {course.type.replace(
                                                      /_/g,
                                                      " "
                                                    )}
                                                    {course.isRetake && (
                                                      <span className="ml-2 inline-block bg-yellow-200 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded">
                                                        Retake
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-gray-400">
                                          {isGapSemester
                                            ? "No courses – recorded as a gap."
                                            : "No courses"}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
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
              onCreatePlan={startCreatePlan}
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
