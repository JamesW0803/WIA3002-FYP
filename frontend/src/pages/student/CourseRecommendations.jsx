import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  BookOpenCheck,
  Calendar,
  Check,
  Info,
  Lightbulb,
  NotebookPen,
} from "lucide-react";
import axiosClient from "../../api/axiosClient";
import getRemainingCourses from "../../utils/getRemainingCourses";
import { resolveDefaultPlanCourses } from "../../utils/defaultPlanResolver";
import {
  SPECIALIZATION_PREFIX,
  kiarSheLabel,
  getPassedCodes,
  getDefaultPlanAlignment,
  getEffectiveTypeForProgrammeClient,
} from "../../utils/courseRecommendationsUtils";
import generateCustomPlan from "../../utils/generateCustomPlan";
import { useAlert } from "../../components/ui/AlertProvider";
import { useNavigate } from "react-router-dom";

const DEBUG_TAG = "[CourseRecommendations]";

const PLAN_MODES = [
  { value: "regular", label: "Regular" },
  { value: "lighter", label: "Lighter" },
  { value: "gapYear", label: "Gap Year" },
  { value: "gapSem", label: "Gap Semester" },
  { value: "outbound", label: "Outbound Programme" },
];

// same indexing as generateCustomPlan
const getSemIndex = (y, s) => (y - 1) * 2 + (s - 1);

// figure out the *next* semester after the last recorded entry
const getNextSemesterAfterLastEntry = (entries) => {
  let maxYear = 0;
  let maxSem = 0;

  for (const e of entries || []) {
    if (!e.year || !e.semester) continue;
    if (e.year > maxYear || (e.year === maxYear && e.semester > maxSem)) {
      maxYear = e.year;
      maxSem = e.semester;
    }
  }

  if (maxYear === 0) {
    return { startYear: 1, startSem: 1 };
  }

  if (maxSem === 2) {
    return { startYear: maxYear + 1, startSem: 1 };
  }
  return { startYear: maxYear, startSem: 2 };
};

// build “remaining default plan” from faculty mapping
const buildRemainingDefaultPlan = (mapping, entries) => {
  if (!mapping || !Object.keys(mapping).length) return {};

  const { startYear, startSem } = getNextSemesterAfterLastEntry(entries);
  const startIndex = getSemIndex(startYear, startSem);

  const result = {};
  const allYearNums = Object.keys(mapping).map((k) =>
    parseInt(k.replace("Year ", ""), 10)
  );
  if (!allYearNums.length) return {};
  const maxMapYear = Math.max(...allYearNums);

  for (let y = startYear; y <= maxMapYear; y++) {
    const yKey = `Year ${y}`;
    const sems = mapping[yKey] || {};
    for (let s = 1; s <= 2; s++) {
      const sKey = `Semester ${s}`;
      const codes = sems[sKey];
      if (!codes || !codes.length) continue;
      const idx = getSemIndex(y, s);
      if (idx < startIndex) continue;
      if (!result[yKey]) result[yKey] = {};
      result[yKey][sKey] = codes.slice();
    }
  }

  return result;
};

const getGapYearOptions = (entries, semesterMapping) => {
  const { startYear } = getNextSemesterAfterLastEntry(entries);

  // Prefer mapping max year if available, else allow next ~2 years
  const allYearNums = Object.keys(semesterMapping || {}).map((k) =>
    parseInt(String(k).replace("Year ", ""), 10)
  );
  const maxMapYear = allYearNums.length
    ? Math.max(...allYearNums)
    : startYear + 2;

  const opts = [];
  for (let y = startYear; y <= maxMapYear; y++) opts.push(y);

  return opts;
};

const applyGapYearToPlanMap = (planMap, gapYear) => {
  if (!planMap || !Object.keys(planMap).length || !gapYear) return planMap;

  // flatten all semesters into linear index -> codes
  const flat = new Map(); // semIndex -> codes[]
  let minIdx = Infinity;
  let maxIdx = -Infinity;

  Object.entries(planMap).forEach(([yKey, sems]) => {
    const y = parseInt(String(yKey).replace("Year ", ""), 10);
    Object.entries(sems || {}).forEach(([sKey, codes]) => {
      const s = parseInt(String(sKey).replace("Semester ", ""), 10);
      const idx = getSemIndex(y, s);
      flat.set(idx, (codes || []).slice());
      minIdx = Math.min(minIdx, idx);
      maxIdx = Math.max(maxIdx, idx);
    });
  });

  if (!isFinite(minIdx)) return planMap;

  const gapStartIdx = getSemIndex(gapYear, 1);

  // rebuild with shifting
  const shifted = new Map();

  for (const [idx, codes] of flat.entries()) {
    if (idx < gapStartIdx) {
      shifted.set(idx, codes);
    } else {
      shifted.set(idx + 2, codes); // push 1 year = 2 semesters
    }
  }

  // insert the gap year (both semesters)
  shifted.set(getSemIndex(gapYear, 1), ["GAP YEAR"]);
  shifted.set(getSemIndex(gapYear, 2), ["GAP YEAR"]);

  // convert back to {Year X:{Semester Y:[...]}}
  const out = {};
  const indices = Array.from(shifted.keys()).sort((a, b) => a - b);

  for (const idx of indices) {
    const y = Math.floor(idx / 2) + 1;
    const s = (idx % 2) + 1;
    const yKey = `Year ${y}`;
    const sKey = `Semester ${s}`;
    if (!out[yKey]) out[yKey] = {};
    out[yKey][sKey] = shifted.get(idx);
  }

  return out;
};

// build a list of future semester options (starting from next sem after last entry)
const getFutureSemesterOptions = (entries, semesterMapping) => {
  const { startYear, startSem } = getNextSemesterAfterLastEntry(entries);
  const startIndex = getSemIndex(startYear, startSem);

  const allYearNums = Object.keys(semesterMapping || {}).map((k) =>
    parseInt(String(k).replace("Year ", ""), 10)
  );
  const maxMapYear = allYearNums.length
    ? Math.max(...allYearNums)
    : startYear + 2;

  const opts = [];
  for (let y = startYear; y <= maxMapYear; y++) {
    for (let s = 1; s <= 2; s++) {
      const idx = getSemIndex(y, s);
      if (idx < startIndex) continue;
      opts.push({ year: y, sem: s });
    }
  }
  return opts;
};

// shift everything from breakIdx forward by +1 semester, insert placeholder at breakIdx
const applyOneSemesterBreakToPlanMap = (planMap, breakChoice, placeholder) => {
  if (!planMap || !Object.keys(planMap).length) return planMap;
  if (!breakChoice?.year || !breakChoice?.sem) return planMap;

  const flat = new Map(); // idx -> codes[]
  let minIdx = Infinity;

  Object.entries(planMap).forEach(([yKey, sems]) => {
    const y = parseInt(String(yKey).replace("Year ", ""), 10);
    Object.entries(sems || {}).forEach(([sKey, codes]) => {
      const s = parseInt(String(sKey).replace("Semester ", ""), 10);
      const idx = getSemIndex(y, s);
      flat.set(idx, (codes || []).slice());
      minIdx = Math.min(minIdx, idx);
    });
  });

  if (!isFinite(minIdx)) return planMap;

  const breakIdx = getSemIndex(breakChoice.year, breakChoice.sem);
  const shifted = new Map();

  for (const [idx, codes] of flat.entries()) {
    if (idx < breakIdx) shifted.set(idx, codes);
    else shifted.set(idx + 1, codes); // push by 1 semester
  }

  // insert the "empty" semester
  shifted.set(breakIdx, [placeholder]);

  // convert back
  const out = {};
  const indices = Array.from(shifted.keys()).sort((a, b) => a - b);

  for (const idx of indices) {
    const y = Math.floor(idx / 2) + 1;
    const s = (idx % 2) + 1;
    const yKey = `Year ${y}`;
    const sKey = `Semester ${s}`;
    if (!out[yKey]) out[yKey] = {};
    out[yKey][sKey] = shifted.get(idx);
  }

  return out;
};

const CourseRecommendations = () => {
  const [allCourses, setAllCourses] = useState([]);
  const [defaultPlan, setDefaultPlan] = useState([]);
  const [expandedYears, setExpandedYears] = useState({});

  const [planMode, setPlanMode] = useState("regular");

  const [completedEntries, setCompletedEntries] = useState([]);
  const [remainingCourses, setRemainingCourses] = useState([]);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [prerequisiteDetails, setPrerequisiteDetails] = useState([]);
  const [courseModalOpen, setCourseModalOpen] = useState(false);

  const [followsDefault, setFollowsDefault] = useState(true);

  const [semesterMapping, setSemesterMapping] = useState({});

  const [studentProgrammeCode, setStudentProgrammeCode] = useState(null);
  const [studentProgrammeId, setStudentProgrammeId] = useState(null);
  const [studentDepartment, setStudentDepartment] = useState(null);

  // generated plan state
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [planError, setPlanError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [savePlanError, setSavePlanError] = useState(null);
  const [planName, setPlanName] = useState("My Generated Plan");
  const [planNotes, setPlanNotes] = useState("");

  const [gapYearModalOpen, setGapYearModalOpen] = useState(false);
  const [selectedGapYear, setSelectedGapYear] = useState(null);

  const [gapSemModalOpen, setGapSemModalOpen] = useState(false);
  const [selectedGapSem, setSelectedGapSem] = useState(null);

  const [outboundModalOpen, setOutboundModalOpen] = useState(false);
  const [selectedOutboundSem, setSelectedOutboundSem] = useState(null);

  const navigate = useNavigate();
  const { confirm, alert } = useAlert();

  const passedSet = useMemo(
    () => getPassedCodes(completedEntries),
    [completedEntries]
  );

  const courseMap = useMemo(() => {
    const m = new Map();
    for (const c of allCourses || []) {
      if (c?.course_code) m.set(c.course_code, c);
    }
    return m;
  }, [allCourses]);

  const getReadableTypeForStudent = (course) => {
    const effectiveType = getEffectiveTypeForProgrammeClient(
      course,
      studentProgrammeCode,
      studentProgrammeId,
      studentDepartment
    );

    const t = effectiveType || course.type || "";
    if (!t) return "";
    return t.replace(/_/g, " ");
  };

  // turn { "Year X": { "Semester Y": [codes...] } } into display structure
  const buildDisplayPlan = (plan) => {
    if (!plan || !Object.keys(plan).length) return [];

    const yearKeys = Object.keys(plan).sort(
      (a, b) =>
        parseInt(a.replace("Year ", ""), 10) -
        parseInt(b.replace("Year ", ""), 10)
    );

    return yearKeys.map((yKey) => {
      const yearNum = parseInt(yKey.replace("Year ", ""), 10);
      const semsObj = plan[yKey] || {};
      const semKeys = Object.keys(semsObj).sort(
        (a, b) =>
          parseInt(a.replace("Semester ", ""), 10) -
          parseInt(b.replace("Semester ", ""), 10)
      );

      const semesters = semKeys.map((sKey) => {
        const codes = semsObj[sKey] || [];
        const courses = codes.map((code) => {
          // map special placeholders to pseudo-courses
          if (code === "GAP YEAR" || code === "GAP_YEAR") {
            return {
              course_code: "GAP_YEAR",
              course_name: "Gap Year (no courses)",
              type: "info",
              credit_hours: 0,
            };
          }
          if (code === "GAP SEMESTER" || code === "GAP_SEMESTER") {
            return {
              course_code: "GAP_SEMESTER",
              course_name: "Gap Semester (no courses)",
              type: "info",
              credit_hours: 0,
            };
          }
          if (code === "OUTBOUND") {
            return {
              course_code: "OUTBOUND",
              course_name: "Outbound Programme",
              type: "info",
              credit_hours: 0,
            };
          }
          if (String(code).startsWith(SPECIALIZATION_PREFIX)) {
            // programme elective “slot”
            return {
              course_code: code,
              course_name: "Programme Elective",
              type: "programme_elective",
              credit_hours: 3, // matches electiveCreditHours in resolveDefaultPlanCourses
            };
          }
          const existing = courseMap.get(code);
          if (existing) return existing;
          return {
            course_code: code,
            course_name: "Unknown Course",
            type: "unknown",
            credit_hours: 0,
          };
        });

        const totalCredits = courses.reduce(
          (sum, c) => sum + (c.credit_hours || 0),
          0
        );

        return {
          name: sKey,
          courses,
          totalCredits,
        };
      });

      return {
        year: yearNum,
        label: yKey,
        semesters,
      };
    });
  };

  // map radio selection → preferences for generateCustomPlan
  const mapPlanModeToPreferences = () => {
    const { startYear, startSem } =
      getNextSemesterAfterLastEntry(completedEntries);

    if (planMode === "gapYear") {
      return {
        gapYears: [startYear],
      };
    }
    if (planMode === "gapSem") {
      return {
        gapSemesters: [{ year: startYear, sem: startSem }],
      };
    }
    if (planMode === "outbound") {
      return {
        outboundSemesters: [{ year: startYear, sem: startSem }],
      };
    }
    if (planMode === "lighter") {
      return {
        creditProfile: "lighter",
        // optional explicit numbers (you can tweak these):
        softCreditLimit: 15,
        hardCreditLimit: 18,
      };
    }
    return { creditProfile: "regular" };
  };

  const handlePlanModeChange = (mode) => {
    setPlanMode(mode);
    if (mode !== "gapYear") {
      setSelectedGapYear(null);
      setGapYearModalOpen(false);
    }
    if (mode !== "gapSem") {
      setSelectedGapSem(null);
      setGapSemModalOpen(false);
    }
    if (mode !== "outbound") {
      setSelectedOutboundSem(null);
      setOutboundModalOpen(false);
    }
  };

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

        // Remaining courses based on faculty default plan + electives
        let remaining;

        if (mappingFromBackend && Object.keys(mappingFromBackend).length > 0) {
          const defaultPlanCodeSet = new Set();

          Object.values(mappingFromBackend).forEach((sems) => {
            Object.values(sems).forEach((codes) => {
              (codes || []).forEach((code) => {
                if (
                  typeof code === "string" &&
                  !code.startsWith(SPECIALIZATION_PREFIX) &&
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
        console.error(`${DEBUG_TAG} Failed to fetch data`, err);
      }
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    if (
      !allCourses.length ||
      !semesterMapping ||
      !Object.keys(semesterMapping).length
    ) {
      setFollowsDefault(true);
      return;
    }

    const alignment = getDefaultPlanAlignment(
      completedEntries,
      allCourses,
      semesterMapping,
      {
        programmeCode: studentProgrammeCode,
        programmeId: studentProgrammeId,
        studentDepartment,
      }
    );

    setFollowsDefault(alignment.followsDefault);
  }, [
    completedEntries,
    allCourses,
    semesterMapping,
    studentProgrammeCode,
    studentProgrammeId,
    studentDepartment,
  ]);

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

  const handleSaveGeneratedPlan = async () => {
    try {
      setSavePlanError?.(null); // optional if you still keep inline error UI

      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      if (!token || !userId) {
        alert("Missing token or user ID. Please log in again.", {
          title: "Not logged in",
        });
        return;
      }

      if (!generatedPlan?.years?.length) {
        alert("Please generate a course plan first.", {
          title: "Nothing to save",
        });
        return;
      }

      setIsSavingPlan(true);

      const plansRes = await axiosClient.get(
        `/academic-plans/students/${userId}/plans`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const currentCount =
        plansRes.data?.count ??
        plansRes.data?.data?.length ??
        plansRes.data?.plans?.length ??
        0;

      if (currentCount >= 3) {
        alert(
          "You already have 3 academic plans. Please delete an existing plan in Academic Planner before saving a new one.",
          {
            title: "Maximum Plans Reached",
          }
        );
        return;
      }

      const yearsPayload = transformGeneratedPlanToAcademicPlanPayload(
        generatedPlan.years
      );

      const payload = {
        name: planName?.trim() || "My Generated Plan",
        notes: planNotes || "",
        years: yearsPayload,
      };

      const res = await axiosClient.post(
        `/academic-plans/students/${userId}/plans`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.data?.success) {
        alert(res.data?.message || "Failed to save plan.", {
          title: "Save Failed",
        });
        return;
      }

      const go = await confirm(
        "Your plan has been saved. Do you want to navigate to Academic Planner now?",
        {
          title: "Plan Saved",
          confirmText: "Go",
          cancelText: "Stay",
        }
      );

      if (go) {
        navigate("/academic-planner");
      }
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to save plan.";

      // backend safety net (in case count changed)
      if (msg.toLowerCase().includes("up to 3")) {
        alert(msg, { title: "Maximum Plans Reached" });
        return;
      }

      alert(msg, { title: "Save Failed" });
    } finally {
      setIsSavingPlan(false);
    }
  };

  const toggleYear = (year) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  const programmeElectiveOptions = useMemo(() => {
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

  const facultyElectiveOptions = useMemo(() => {
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

        const keep = effectiveType === "faculty_elective" && !passedAlready;

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

  const isProgrammeElectiveCourse = (course) => {
    const code = String(course?.course_code || "");

    // SPECIALIZATION_ slot = programme elective placeholder
    if (code.startsWith(SPECIALIZATION_PREFIX)) {
      return true;
    }

    const effectiveType = getEffectiveTypeForProgrammeClient(
      course,
      studentProgrammeCode,
      studentProgrammeId,
      studentDepartment
    );

    return effectiveType === "programme_elective";
  };

  const isFacultyElectiveCourse = (course) => {
    const effectiveType = getEffectiveTypeForProgrammeClient(
      course,
      studentProgrammeCode,
      studentProgrammeId,
      studentDepartment
    );

    return effectiveType === "faculty_elective";
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

  const ProgrammeElectiveChooser = ({ course }) => {
    if (!isProgrammeElectiveCourse(course)) return null;

    const list = programmeElectiveOptions.filter(
      (o) => o.code !== course.course_code
    );

    if (!list.length) return null;

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
          Requirement: take the required number of programme electives for your
          programme.
        </div>
      </details>
    );
  };

  const FacultyElectiveChooser = ({ course }) => {
    if (!isFacultyElectiveCourse(course)) return null;

    const list = facultyElectiveOptions.filter(
      (o) => o.code !== course.course_code
    );

    if (!list.length) return null;

    return (
      <details className="mt-1">
        <summary className="text-xs text-blue-600 cursor-pointer">
          OR choose 1 of {list.length} faculty electives
        </summary>
        <div className="mt-2 max-h-40 overflow-y-auto text-xs text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {list.map((opt) => (
            <div key={opt.code}>
              {opt.code}: {opt.name}
            </div>
          ))}
        </div>
        <div className="text-[11px] text-gray-500 mt-1">
          Requirement: take the required number of faculty electives for your
          programme.
        </div>
      </details>
    );
  };

  const handleGeneratePlan = async () => {
    try {
      setPlanError(null);
      setIsGenerating(true);
      setGeneratedPlan(null);

      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      if (!token || !userId) {
        setPlanError("Missing authentication token or user ID.");
        return;
      }

      // ---- GAP YEAR FLOW ----
      if (planMode === "gapYear" && !selectedGapYear) {
        // Open modal instead of generating
        setGapYearModalOpen(true);
        return;
      }

      if (planMode === "gapSem" && !selectedGapSem) {
        setGapSemModalOpen(true);
        return;
      }

      if (planMode === "outbound" && !selectedOutboundSem) {
        setOutboundModalOpen(true);
        return;
      }

      const hasMapping =
        semesterMapping && Object.keys(semesterMapping).length > 0;

      // Generate base plan using REGULAR logic first
      // (ignore gapYear in preferences; we apply it afterwards)
      const basePreferences =
        planMode === "lighter"
          ? mapPlanModeToPreferences()
          : { creditProfile: "regular" };

      // CASE 1: following default → build remaining default
      if (hasMapping && followsDefault) {
        let remainingDefault = buildRemainingDefaultPlan(
          semesterMapping,
          completedEntries
        );

        // Apply gap year if selected
        if (planMode === "gapYear" && selectedGapYear) {
          remainingDefault = applyGapYearToPlanMap(
            remainingDefault,
            selectedGapYear
          );
        }

        if (planMode === "gapSem" && selectedGapSem) {
          remainingDefault = applyOneSemesterBreakToPlanMap(
            remainingDefault,
            selectedGapSem,
            "GAP SEMESTER"
          );
        }

        if (planMode === "outbound" && selectedOutboundSem) {
          remainingDefault = applyOneSemesterBreakToPlanMap(
            remainingDefault,
            selectedOutboundSem,
            "OUTBOUND"
          );
        }

        const years = buildDisplayPlan(remainingDefault);

        setGeneratedPlan({
          source: "default",
          years,
          warnings: [],
        });
        return;
      }

      // CASE 2: diverged → generate custom plan (regular or lighter)
      const result = await generateCustomPlan(
        userId,
        token,
        basePreferences,
        semesterMapping
      );

      if (!result.success) {
        setPlanError(result.warnings?.[0] || "Failed to generate custom plan.");
        setGeneratedPlan(null);
        return;
      }

      let planMap = result.plan;

      if (planMode === "gapYear" && selectedGapYear) {
        planMap = applyGapYearToPlanMap(planMap, selectedGapYear);
      }

      if (planMode === "gapSem" && selectedGapSem) {
        planMap = applyOneSemesterBreakToPlanMap(
          planMap,
          selectedGapSem,
          "GAP SEMESTER"
        );
      }

      if (planMode === "outbound" && selectedOutboundSem) {
        planMap = applyOneSemesterBreakToPlanMap(
          planMap,
          selectedOutboundSem,
          "OUTBOUND"
        );
      }

      const years = buildDisplayPlan(planMap);

      setGeneratedPlan({
        source: "custom",
        years,
        warnings: result.warnings || [],
      });
    } catch (err) {
      console.error("[CourseRecommendations] Generate plan error", err);
      setPlanError("Unexpected error while generating plan.");
      setGeneratedPlan(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const transformGeneratedPlanToAcademicPlanPayload = (generatedPlanYears) => {
    return generatedPlanYears.map((y, yIndex) => ({
      year: y.year || yIndex + 1,
      isGapYear: false,
      semesters: (y.semesters || []).map((s, sIndex) => {
        const hasGapYear = s.courses?.some((c) => c.course_code === "GAP_YEAR");
        const hasGapSem = s.courses?.some(
          (c) => c.course_code === "GAP_SEMESTER"
        );
        const hasOutbound = s.courses?.some(
          (c) => c.course_code === "OUTBOUND"
        );

        const isSpecial = hasGapYear || hasGapSem || hasOutbound;

        const displayName = hasOutbound
          ? "Outbound Programme"
          : hasGapYear
          ? "Gap Year (no courses)"
          : hasGapSem
          ? "Gap Semester (no courses)"
          : s.name; // "Semester 1", "Semester 2"

        return {
          id: sIndex + 1,
          name: displayName,
          completed: false,
          isGap: !!isSpecial, // << key fix
          courses: (s.courses || [])
            .filter((c) => {
              const code = String(c.course_code || "");
              return (
                code &&
                code !== "GAP_YEAR" &&
                code !== "GAP_SEMESTER" &&
                code !== "OUTBOUND" &&
                !code.startsWith(SPECIALIZATION_PREFIX)
              );
            })
            .map((c) => ({
              course_code: c.course_code,
              credit_at_time: c.credit_hours || 0,
              title_at_time: c.course_name || "",
            })),
        };
      }),
    }));
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
            This page shows your faculty’s suggested plan and the courses you
            still need to complete.
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

                  {isExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
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
                              // 🔍 Always rehydrate from courseMap if possible
                              const fullCourse =
                                courseMap.get(course.course_code) || course;

                              const orLabel = kiarSheLabel(
                                fullCourse.course_code,
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
                                      <CourseTitleText course={fullCourse} />
                                    </h4>

                                    <ProgrammeElectiveChooser
                                      course={fullCourse}
                                    />
                                    <FacultyElectiveChooser
                                      course={fullCourse}
                                    />

                                    {!orLabel && (
                                      <>
                                        <div className="text-sm text-gray-600">
                                          {fullCourse.credit_hours} credits
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 capitalize">
                                          {getReadableTypeForStudent(
                                            fullCourse
                                          )}
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
                  )}
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
                        {getReadableTypeForStudent(course)}
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
                  Planning Strategy
                </h4>
                <p className="text-sm text-blue-700">
                  Choose a planning mode and click{" "}
                  <span className="font-semibold">Generate Course Plan</span>.
                  If you’re still following the default sequence, we’ll show you
                  the remaining semesters of that plan. Otherwise, we’ll build a
                  custom plan that respects prerequisites, internship, and
                  project rules.
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
                  Based on your completed courses, you’re currently following
                  the faculty’s default course sequence.
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-2 mb-4">
                  Your history differs from the original default order, so a
                  custom plan will be generated based on your remaining courses.
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
            </div>

            {planError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {planError}
              </div>
            )}

            <div className="flex justify-center">
              <Button
                className="bg-[#1E3A8A] text-white px-8 py-3"
                onClick={handleGeneratePlan}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Generate Course Plan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Generated Plan (either remaining default or custom) */}
      {generatedPlan &&
        generatedPlan.years &&
        generatedPlan.years.length > 0 && (
          <div className="mb-8">
            <div className="bg-white border rounded-md p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <NotebookPen className="w-5 h-5 text-gray-600" />
                Generated Course Plan
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                {generatedPlan.source === "default"
                  ? "You are following the default sequence. This shows the remaining semesters from the faculty’s suggested plan."
                  : "Your history diverges from the default sequence. This custom plan respects prerequisites and the WIA3001 / WIA3002 / WIA3003 rules."}
              </p>

              {generatedPlan.warnings && generatedPlan.warnings.length > 0 && (
                <div className="mb-4 text-xs text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-md px-3 py-2">
                  {generatedPlan.warnings.map((w, i) => (
                    <div key={i}>• {w}</div>
                  ))}
                </div>
              )}

              {generatedPlan.years.map((yearObj, yearIndex) => (
                <div
                  key={yearIndex}
                  className={`pt-6 ${
                    yearIndex !== 0 ? "border-t-2 border-gray-300 mt-4" : ""
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xl font-semibold text-gray-800">
                      {yearObj.label}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
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
                                  <ProgrammeElectiveChooser course={course} />
                                  <FacultyElectiveChooser course={course} />
                                  {!orLabel && (
                                    <>
                                      <div className="text-sm text-gray-600">
                                        {course.credit_hours} credits
                                      </div>
                                      {getReadableTypeForStudent(course) && (
                                        <div className="text-xs text-gray-500 mt-1 capitalize">
                                          {getReadableTypeForStudent(course)}
                                        </div>
                                      )}
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
              ))}
              <div className="mt-4 p-4 bg-gray-50 border rounded-md space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-600">Plan name</label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">
                      Notes (optional)
                    </label>
                    <input
                      className="w-full border rounded px-3 py-2"
                      value={planNotes}
                      onChange={(e) => setPlanNotes(e.target.value)}
                    />
                  </div>
                </div>

                {savePlanError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                    {savePlanError}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    className="bg-[#1E3A8A] text-white"
                    onClick={handleSaveGeneratedPlan}
                    disabled={isSavingPlan}
                  >
                    {isSavingPlan ? "Saving..." : "Save as Plan"}
                  </Button>
                </div>
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
      {gapYearModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-[#1E3A8A]">Gap Year</h3>
                <button
                  onClick={() => setGapYearModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="text-sm text-gray-700 bg-yellow-50 border border-yellow-100 rounded-md p-3">
                Taking a gap year will delay your graduation. Your plan will be
                shifted by 1 year after the selected gap year.
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Choose which year to take a gap year (future years only):
                </p>

                <div className="space-y-2">
                  {getGapYearOptions(completedEntries, semesterMapping).map(
                    (y) => (
                      <label
                        key={y}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <input
                          type="radio"
                          name="gapYearChoice"
                          checked={selectedGapYear === y}
                          onChange={() => setSelectedGapYear(y)}
                        />
                        Year {y}
                      </label>
                    )
                  )}
                </div>

                {!getGapYearOptions(completedEntries, semesterMapping)
                  .length && (
                  <p className="text-xs text-gray-500">
                    No available future years to gap.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGapYearModalOpen(false);
                    setSelectedGapYear(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#1E3A8A] text-white"
                  disabled={!selectedGapYear}
                  onClick={() => {
                    setGapYearModalOpen(false);
                    // now generate using the selected year
                    handleGeneratePlan();
                  }}
                >
                  Confirm & Generate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {gapSemModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-[#1E3A8A]">
                  Gap Semester
                </h3>
                <button
                  onClick={() => setGapSemModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="text-sm text-gray-700 bg-yellow-50 border border-yellow-100 rounded-md p-3">
                Taking a gap semester may delay your graduation. Courses in and
                after the selected semester will be shifted forward by 1
                semester.
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Choose which semester to take a gap (future semesters only):
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {getFutureSemesterOptions(
                    completedEntries,
                    semesterMapping
                  ).map((opt) => {
                    const key = `Y${opt.year}S${opt.sem}`;
                    const checked =
                      selectedGapSem?.year === opt.year &&
                      selectedGapSem?.sem === opt.sem;

                    return (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <input
                          type="radio"
                          name="gapSemChoice"
                          checked={checked}
                          onChange={() => setSelectedGapSem(opt)}
                        />
                        Year {opt.year} Semester {opt.sem}
                      </label>
                    );
                  })}
                </div>

                {!getFutureSemesterOptions(completedEntries, semesterMapping)
                  .length && (
                  <p className="text-xs text-gray-500 mt-2">
                    No available future semesters to gap.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGapSemModalOpen(false);
                    setSelectedGapSem(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#1E3A8A] text-white"
                  disabled={!selectedGapSem}
                  onClick={() => {
                    setGapSemModalOpen(false);
                    handleGeneratePlan();
                  }}
                >
                  Confirm & Generate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {outboundModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-[#1E3A8A]">
                  Outbound Programme
                </h3>
                <button
                  onClick={() => setOutboundModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="text-sm text-gray-700 bg-yellow-50 border border-yellow-100 rounded-md p-3">
                Doing an outbound programme will reserve one semester. Courses
                in and after the selected semester will be shifted forward by 1
                semester.
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Choose which semester to go outbound (future semesters only):
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {getFutureSemesterOptions(
                    completedEntries,
                    semesterMapping
                  ).map((opt) => {
                    const key = `Y${opt.year}S${opt.sem}`;
                    const checked =
                      selectedOutboundSem?.year === opt.year &&
                      selectedOutboundSem?.sem === opt.sem;

                    return (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <input
                          type="radio"
                          name="outboundChoice"
                          checked={checked}
                          onChange={() => setSelectedOutboundSem(opt)}
                        />
                        Year {opt.year} Semester {opt.sem}
                      </label>
                    );
                  })}
                </div>

                {!getFutureSemesterOptions(completedEntries, semesterMapping)
                  .length && (
                  <p className="text-xs text-gray-500 mt-2">
                    No available future semesters to choose.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOutboundModalOpen(false);
                    setSelectedOutboundSem(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#1E3A8A] text-white"
                  disabled={!selectedOutboundSem}
                  onClick={() => {
                    setOutboundModalOpen(false);
                    handleGeneratePlan();
                  }}
                >
                  Confirm & Generate
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
