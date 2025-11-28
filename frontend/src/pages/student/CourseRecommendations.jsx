import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import generateCustomPlan from "../../utils/generateCustomPlan";
import getRemainingCourses from "../../utils/getRemainingCourses";
import { findNextSemesterToPlan } from "../../components/Students/AcademicPlanner/utils/planHelpers";
import { resolveDefaultPlanCourses } from "../../utils/defaultPlanResolver";
import {
  SPECIALIZATION_PREFIX,
  kiarSheLabel,
  getCourseDepartment,
  getPassedCodes,
  countSpecializationSlots,
  isFollowingDefaultSoFar,
  buildGapYearPlan,
  buildGapSemesterOrOutboundPlan,
  buildDefaultFollowingPlanWithGaps,
  convertPlannerMapToUI,
  getEffectiveTypeForProgrammeClient,
} from "../../utils/courseRecommendationsUtils";

const DEBUG_TAG = "[CourseRecommendations]";

const PLAN_MODES = [
  { value: "regular", label: "Regular" },
  { value: "lighter", label: "Lighter" },
  { value: "gapYear", label: "Gap Year" },
  { value: "gapSem", label: "Gap Semester" },
  { value: "outbound", label: "Outbound Programme" },
];

const CourseRecommendations = () => {
  const [generatedPlan, setGeneratedPlan] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [defaultPlan, setDefaultPlan] = useState([]);
  const [expandedYears, setExpandedYears] = useState({});

  const [semesterMappingFromServer, setSemesterMappingFromServer] =
    useState(null);
  const [planMode, setPlanMode] = useState("regular");
  const [selection, setSelection] = useState({ type: null, year: 1, sem: 1 });

  const [completedEntries, setCompletedEntries] = useState([]);
  const [remainingCourses, setRemainingCourses] = useState([]);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [prerequisiteDetails, setPrerequisiteDetails] = useState([]);
  const [courseModalOpen, setCourseModalOpen] = useState(false);

  const [gapModalOpen, setGapModalOpen] = useState(false);
  const [gapYears, setGapYears] = useState([]);
  const [gapSemesters, setGapSemesters] = useState([]);
  const [outboundSemesters, setOutboundSemesters] = useState([]);

  const [followsDefault, setFollowsDefault] = useState(true);
  const [planWarnings, setPlanWarnings] = useState([]);

  const [semesterMapping, setSemesterMapping] = useState({});

  const [studentProgrammeCode, setStudentProgrammeCode] = useState(null);
  const [studentProgrammeId, setStudentProgrammeId] = useState(null);
  const [studentDepartment, setStudentDepartment] = useState(null);

  const resetGaps = useCallback(() => {
    setGapYears([]);
    setGapSemesters([]);
    setOutboundSemesters([]);
  }, []);

  const clearPlanningState = useCallback(() => {
    setGeneratedPlan([]);
    setPlanWarnings([]);
    setSelectedCourse(null);
    setCourseModalOpen(false);
  }, []);

  const passedSet = useMemo(
    () => getPassedCodes(completedEntries),
    [completedEntries]
  );

  const specializationSlotsNeeded = useMemo(() => {
    if (!semesterMapping || !Object.keys(semesterMapping).length) return 0;

    const totalSlots = countSpecializationSlots(semesterMapping);
    const typeByCode = new Map(allCourses.map((c) => [c.course_code, c.type]));
    let passedElectives = 0;
    for (const code of passedSet) {
      if (typeByCode.get(code) === "programme_elective") passedElectives++;
    }
    return Math.max(0, totalSlots - passedElectives);
  }, [allCourses, passedSet, semesterMapping]);

  useEffect(() => {
    setFollowsDefault(
      isFollowingDefaultSoFar(completedEntries, allCourses, semesterMapping)
    );
  }, [completedEntries, allCourses, semesterMapping]);

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

        const allFetchedCourses = coursesRes.data || [];
        const profile = profileRes.data;

        const programmeCode =
          profile?.student?.programme?.programme_code ||
          profile?.student?.programme_code ||
          profile?.programme?.programme_code ||
          profile?.programme_code ||
          null;

        const programmeId =
          profile?.student?.programme?._id ||
          profile?.programme?._id ||
          profile?.programmeIntake?.programme_id ||
          null;

        const departmentName =
          profile?.student?.programme?.department ||
          profile?.student?.department ||
          profile?.programme?.department ||
          profile?.department ||
          null;

        setStudentProgrammeCode(programmeCode);
        setStudentProgrammeId(programmeId);
        setStudentDepartment(departmentName);

        setAllCourses(allFetchedCourses);
        setCompletedEntries(profileRes.data.entries || []);

        const programmeIntakeCode =
          profile.programme_intake_code ||
          profile.programmeIntake?.programme_intake_code;

        let mappingFromBackend = {};

        if (programmeIntakeCode) {
          try {
            const planRes = await axiosClient.get(
              `/programme-intakes/programme-intakes/${programmeIntakeCode}/programme-plan`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            mappingFromBackend = planRes.data?.semesterMapping || {};
          } catch (e) {
            // silently ignore or add a small error log if you really want
          }
        }

        setSemesterMapping(mappingFromBackend);

        const { years } = resolveDefaultPlanCourses(
          mappingFromBackend,
          allFetchedCourses,
          { electiveCreditHours: 3, electiveLabel: "Specialization Elective" }
        );
        setDefaultPlan(years);

        setExpandedYears((prev) => {
          const next = { ...prev };
          years.forEach((y) => {
            if (!(y.year in next)) next[y.year] = true;
          });
          return next;
        });

        // 🔽 NEW LOGIC: remaining courses based on faculty default plan
        // 🔽 NEW LOGIC: remaining courses based on faculty default plan
        let remaining;

        if (mappingFromBackend && Object.keys(mappingFromBackend).length > 0) {
          // Collect all course codes from the default plan (excluding placeholders)
          const defaultPlanCodeSet = new Set();

          Object.values(mappingFromBackend).forEach((sems) => {
            Object.values(sems).forEach((codes) => {
              (codes || []).forEach((code) => {
                if (
                  typeof code === "string" &&
                  !code.startsWith(SPECIALIZATION_PREFIX) && // ignore SPECIALIZATION_ placeholders
                  code !== "GAP YEAR" &&
                  code !== "GAP SEMESTER" &&
                  code !== "OUTBOUND"
                ) {
                  defaultPlanCodeSet.add(code);
                }
              });
            });
          });

          const defaultPlanCourses = allFetchedCourses.filter((c) =>
            defaultPlanCodeSet.has(c.course_code)
          );

          // ✅ Include ALL programme electives for this student (not yet passed)
          const passedSetLocal = getPassedCodes(profileRes.data.entries || []);

          const programmeElectiveCourses = allFetchedCourses.filter((c) => {
            const effectiveType = getEffectiveTypeForProgrammeClient(
              c,
              programmeCode,
              programmeId,
              departmentName
            );
            return (
              effectiveType === "programme_elective" &&
              !passedSetLocal.has(c.course_code)
            );
          });

          // Merge default-plan courses + programme electives, dedup by course_code
          const byCode = new Map();
          defaultPlanCourses.forEach((c) => byCode.set(c.course_code, c));
          programmeElectiveCourses.forEach((c) => {
            if (!byCode.has(c.course_code)) {
              byCode.set(c.course_code, c);
            }
          });

          const coursePool = Array.from(byCode.values());

          remaining = getRemainingCourses(coursePool, profileRes.data.entries);
        } else {
          // Fallback: no faculty plan mapping found, keep old behaviour
          remaining = getRemainingCourses(
            allFetchedCourses,
            profileRes.data.entries
          );
        }

        setRemainingCourses(remaining);
      } catch (err) {
        // optional: minimal error log
        console.error(`${DEBUG_TAG} Failed to fetch data`, err);
      }
    };

    fetchAllData();
  }, []);

  const fetchPrerequisiteDetails = (prereqs) => {
    try {
      const details = prereqs
        .map((pr) => {
          if (typeof pr === "object" && pr.course_code) {
            return {
              code: pr.course_code,
              name: pr.course_name,
              credits: pr.credit_hours,
            };
          }
          const course = allCourses.find((c) => c.course_code === pr);
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

  const handleCourseClick = (course) => {
    setSelectedCourse(course);
    if (
      course.prerequisites &&
      Array.isArray(course.prerequisites) &&
      course.prerequisites.length > 0
    ) {
      fetchPrerequisiteDetails(course.prerequisites);
    } else {
      setPrerequisiteDetails([]);
    }
    setCourseModalOpen(true);
  };

  const toggleYear = (year) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  const handleGeneratePlan = useCallback(
    async (overrides = {}) => {
      setGeneratedPlan([]);
      setPlanWarnings([]);

      const gy = overrides.gapYears ?? gapYears;
      const gs = overrides.gapSemesters ?? gapSemesters;
      const ob = overrides.outboundSemesters ?? outboundSemesters;
      const mode = overrides.planMode ?? planMode;

      try {
        const { year: y, semester: s } =
          findNextSemesterToPlan(completedEntries);

        if (mode === "gapYear") {
          const chosenYear = (gy && gy[0]) || 4;
          const { plan, warnings: extra } = buildGapYearPlan(
            y,
            s,
            allCourses,
            passedSet,
            {
              gapYear: chosenYear,
              maxElectivesToPlace: specializationSlotsNeeded,
            },
            semesterMapping
          );
          if (extra?.length) setPlanWarnings(extra);
          setGeneratedPlan(plan);
          return;
        }

        if (mode === "gapSem" || mode === "outbound") {
          const chosen = (mode === "gapSem" ? gs?.[0] : ob?.[0]) || {
            year: y,
            sem: s,
          };
          const cont = buildGapSemesterOrOutboundPlan(
            y,
            s,
            allCourses,
            passedSet,
            {
              year: chosen.year,
              sem: chosen.sem,
              type: mode,
              maxElectivesToPlace: specializationSlotsNeeded,
            },
            semesterMapping
          );
          if (mode === "outbound") {
            setPlanWarnings([
              "You selected an Outbound Programme semester. Please consult your Academic Advisor regarding credit transfer/recognition.",
            ]);
          }
          setGeneratedPlan(cont);
          return;
        }

        if (followsDefault && mode !== "lighter") {
          const cont = buildDefaultFollowingPlanWithGaps(
            y,
            s,
            allCourses,
            passedSet,
            {
              gapYears: gy,
              gapSemesters: gs,
              outboundSemesters: ob,
              maxElectivesToPlace: specializationSlotsNeeded,
            },
            semesterMapping
          );
          if ((ob?.length || 0) > 0) {
            setPlanWarnings([
              "You selected an Outbound Programme semester. Please consult your Academic Advisor regarding credit transfer/recognition.",
            ]);
          }
          setGeneratedPlan(cont);
          return;
        }

        // fallback/custom (lighter or non-default history)
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");
        const preferences = {
          lightweight: mode === "lighter",
          gapYears: gy,
          gapSemesters: gs,
          outboundSemesters: ob,
        };
        const res = await generateCustomPlan(userId, token, preferences);
        if (res?.success) {
          const uiPlan = convertPlannerMapToUI(res.plan, allCourses);
          setPlanWarnings(res.warnings || []);
          setGeneratedPlan(uiPlan);
        } else {
          const cont = buildDefaultFollowingPlanWithGaps(
            y,
            s,
            allCourses,
            passedSet,
            {
              gapYears: gy,
              gapSemesters: gs,
              outboundSemesters: ob,
              maxElectivesToPlace: specializationSlotsNeeded,
            },
            semesterMapping
          );
          setPlanWarnings([
            "Custom planner failed — showing default-follow continuation.",
          ]);
          setGeneratedPlan(cont);
        }
      } catch (err) {
        console.error("Error generating plan:", err);
      }
    },
    [
      gapYears,
      gapSemesters,
      outboundSemesters,
      planMode,
      completedEntries,
      allCourses,
      passedSet,
      specializationSlotsNeeded,
      followsDefault,
      semesterMapping,
    ]
  );

  const handlePlanModeChange = (mode) => {
    clearPlanningState();
    resetGaps();
    setPlanMode(mode);
    setSelection({
      type: ["gapYear", "gapSem", "outbound"].includes(mode) ? mode : null,
      year: 1,
      sem: 1,
    });
    if (["gapYear", "gapSem", "outbound"].includes(mode)) {
      setGapModalOpen(true);
    }
  };

  const adaptivePlanByYear = useMemo(() => {
    const grouped = generatedPlan.reduce((acc, semEntry) => {
      const { year } = semEntry;
      (acc[year] ||= []).push(semEntry);
      return acc;
    }, {});
    return Object.entries(grouped).map(([year, sems]) => [
      year,
      sems.sort((a, b) => {
        const A = a.sem === "-" ? 0 : Number(a.sem);
        const B = b.sem === "-" ? 0 : Number(b.sem);
        return A - B;
      }),
    ]);
  }, [generatedPlan]);

  const electiveOptions = useMemo(() => {
    const passed = getPassedCodes(completedEntries);
    if (!allCourses.length) return [];

    const result = allCourses
      .filter((c) => {
        const effectiveType = getEffectiveTypeForProgrammeClient(
          c,
          studentProgrammeCode,
          studentProgrammeId,
          studentDepartment
        );

        const passedAlready = passed.has(c.course_code);

        const keep = effectiveType === "programme_elective" && !passedAlready;

        return keep;
      })
      .map((c) => ({ code: c.course_code, name: c.course_name }));

    return result;
  }, [
    allCourses,
    completedEntries,
    studentProgrammeCode,
    studentProgrammeId,
    studentDepartment,
  ]);

  const isProgrammeElective = (course) => {
    const code = String(course?.course_code || "");

    // SPECIALIZATION placeholders are always considered programme electives
    if (code.startsWith(SPECIALIZATION_PREFIX)) {
      return true;
    }

    const effectiveType = getEffectiveTypeForProgrammeClient(
      course,
      studentProgrammeCode,
      studentProgrammeId,
      studentDepartment
    );

    // 1) First, if effective type says it's an elective, trust that
    if (effectiveType === "programme_elective") {
      return true;
    }

    // 2) Fallback: if the raw course.type is programme_elective, still treat it as elective
    if (course?.type === "programme_elective") {
      return true;
    }

    return false;
  };

  const CourseTitleText = ({ course }) => {
    const or = kiarSheLabel(course.course_code, passedSet);
    if (or) return <>{or}</>;

    if (course.course_code === "GAP_YEAR") return <>Gap Year (no courses)</>;
    if (course.course_code === "GAP_SEMESTER")
      return <>Gap Semester (no courses)</>;
    if (course.course_code === "OUTBOUND") return <>Outbound Programme</>;
    if (String(course.course_code).startsWith(SPECIALIZATION_PREFIX))
      return <>Programme Elective</>;

    return (
      <>
        {course.course_code}: {course.course_name}
      </>
    );
  };

  const ElectiveChooser = ({ course }) => {
    if (!isProgrammeElective(course)) return null;
    const list = electiveOptions.filter((o) => o.code !== course.course_code);
    return (
      <details className="mt-1">
        <summary className="text-xs text-blue-600 cursor-pointer">
          OR choose 1 of {list.length} programme electives
        </summary>
        <div className="mt-2 max-h-40 overflow-y-auto text-xs text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {list.map((opt) => (
            <div key={opt.code}>
              {opt.code}: {opt.name}
            </div>
          ))}
        </div>
        <div className="text-[11px] text-gray-500 mt-1">
          Requirement: take any 10 programme electives in total.
        </div>
      </details>
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

      {/* 1. Suggested Course Plan by Faculty */}
      {defaultPlan.length > 0 && (
        <div className="mt-6 w-full mb-8">
          {planWarnings.length > 0 && (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800">
              <ul className="list-disc pl-5 space-y-1">
                {planWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
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
                          {semester.courses.map((course, idx) => {
                            const orLabel = kiarSheLabel(
                              course.course_code,
                              passedSet
                            );
                            return (
                              <div
                                key={idx}
                                className="flex items-start p-3 bg-gray-50 rounded-lg border border-gray-100"
                              >
                                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-1">
                                  <Check className="w-3 h-3 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-[#1E3A8A]">
                                    <CourseTitleText course={course} />
                                  </h4>
                                  <ElectiveChooser course={course} />
                                  {!orLabel && (
                                    <>
                                      <div className="text-sm text-gray-600">
                                        {course.credit_hours} credits
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1 capitalize">
                                        {course.type.replace(/_/g, " ")}
                                      </div>
                                    </>
                                  )}
                                  {orLabel && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Choose either one (counts once).
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
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
              {remainingCourses.map((course, idx2) => (
                <Card
                  key={`${course.course_code}-${idx2}`}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleCourseClick(course)}
                >
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-semibold text-[#1E3A8A]">
                      <CourseTitleText course={course} />
                    </h4>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{course.credit_hours} credits</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                        {course.type.replace(/_/g, " ")}
                      </span>
                    </div>

                    {Array.isArray(course.prerequisites) &&
                      course.prerequisites.length > 0 && (
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Requires:</span> (
                          {course.prerequisites.length}) prerequisite
                          {course.prerequisites.length !== 1 ? "s" : ""}
                        </p>
                      )}

                    {Array.isArray(course.offered_semester) &&
                      course.offered_semester.length > 0 && (
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
              {followsDefault ? (
                <p className="text-xs text-gray-500 mt-2 mb-4">
                  You’re on track with the faculty’s default plan. Clicking{" "}
                  <span className="font-medium">Generate Course Plan</span> will
                  continue the default sequence from your next semester. Passed
                  courses are skipped, and specialization slots are filled with
                  programme electives you haven’t taken yet.
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-2 mb-4">
                  Your history differs from the original order, but I’ll still
                  follow the faculty’s default sequence from your next semester.
                  Passed courses are skipped, and specialization slots are
                  filled with programme electives you haven’t taken yet. In
                  “Lighter” mode we prefer ~16 credits / semester, but still try
                  to finish by Year 4 when feasible.
                </p>
              )}

              <div className="mt-4 space-y-2">
                {PLAN_MODES.map((opt) => (
                  <div key={opt.value} className="flex items-center">
                    <input
                      type="radio"
                      name="planMode"
                      value={opt.value}
                      checked={planMode === opt.value}
                      onChange={() => handlePlanModeChange(opt.value)}
                      className="h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label className="ml-2 text-sm text-gray-700">
                      {opt.label}
                    </label>
                  </div>
                ))}
              </div>

              {gapYears.length +
                gapSemesters.length +
                outboundSemesters.length >
                0 && (
                <div className="mt-3 text-xs text-gray-600 space-y-1">
                  {gapYears.length > 0 && (
                    <div>
                      Gap Year: {gapYears.map((y) => `Year ${y}`).join(", ")}
                    </div>
                  )}
                  {gapSemesters.length > 0 && (
                    <div>
                      Gap Semester:{" "}
                      {gapSemesters
                        .map(({ year, sem }) => `Y${year}S${sem}`)
                        .join(", ")}
                    </div>
                  )}
                  {outboundSemesters.length > 0 && (
                    <div>
                      Outbound:{" "}
                      {outboundSemesters
                        .map(({ year, sem }) => `Y${year}S${sem}`)
                        .join(", ")}
                    </div>
                  )}
                </div>
              )}
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
              {planMode === "regular"
                ? "Regular Workload"
                : planMode === "lighter"
                ? "Lighter Workload (soft preference)"
                : planMode === "gapYear"
                ? "With Gap Year"
                : planMode === "gapSem"
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
                              {courses.map((course, idx2) => {
                                const orLabel = kiarSheLabel(
                                  course.course_code,
                                  passedSet
                                );
                                return (
                                  <li
                                    key={`${course.course_code}-${idx2}`}
                                    className="flex items-start gap-3"
                                  >
                                    <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                      <Check className="w-3 h-3 text-blue-600" />
                                    </div>
                                    <div>
                                      <p className="font-medium">
                                        <CourseTitleText course={course} />
                                      </p>
                                      <ElectiveChooser course={course} />
                                      {!orLabel && (
                                        <div className="flex gap-4 text-sm text-gray-600">
                                          <span>
                                            {course.credit_hours} credits
                                          </span>
                                          <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded capitalize">
                                            {course.type.replace(/_/g, " ")}
                                          </span>
                                        </div>
                                      )}
                                      {orLabel && (
                                        <div className="text-xs text-gray-500">
                                          Choose either one (counts once).
                                        </div>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
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

      {/* Gap selection modal */}
      {gapModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
            <h4 className="font-semibold mb-4">
              {selection.type === "gapYear"
                ? "Select year to gap"
                : selection.type === "gapSem"
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

            {(selection.type === "gapSem" || selection.type === "outbound") && (
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
                  setPlanMode("regular");
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => {
                  clearPlanningState();
                  let nextGY = [];
                  let nextGS = [];
                  let nextOB = [];

                  if (selection.type === "gapYear") {
                    nextGY = [selection.year];
                    setGapYears(nextGY);
                  } else if (selection.type === "gapSem") {
                    nextGS = [{ year: selection.year, sem: selection.sem }];
                    setGapSemesters(nextGS);
                  } else if (selection.type === "outbound") {
                    nextOB = [{ year: selection.year, sem: selection.sem }];
                    setOutboundSemesters(nextOB);
                  }

                  const nextMode = selection.type;
                  setPlanMode(nextMode);
                  setSelection({ type: null, year: 1, sem: 1 });
                  setGapModalOpen(false);

                  handleGeneratePlan({
                    gapYears: nextGY,
                    gapSemesters: nextGS,
                    outboundSemesters: nextOB,
                    planMode: nextMode,
                  });
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course modal */}
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

              {prerequisiteDetails.length > 0 ? (
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
              ) : selectedCourse.prerequisites &&
                Array.isArray(selectedCourse.prerequisites) &&
                selectedCourse.prerequisites.length > 0 ? (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Prerequisites ({selectedCourse.prerequisites.length})
                  </h4>
                  <p className="text-gray-600">
                    Prerequisite details could not be loaded
                  </p>
                </div>
              ) : (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Prerequisites
                  </h4>
                  <p className="text-gray-600">No prerequisites required</p>
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
