import React, { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent } from "../../components/ui/card";
import {
  BookOpenCheck,
  CheckCircle,
  Clock,
  GraduationCap,
  X,
  CheckCircle2,
} from "lucide-react";
import PageHeader from "../../components/Students/PageHeader";
import axiosClient from "../../api/axiosClient";

const CATEGORY_ORDER = [
  "Faculty Core",
  "Programme Core",
  "University Courses",
  "Faculty Electives",
  "Specialization Electives",
  "SHE Cluster",
];

const categoryMap = {
  faculty_core: "Faculty Core",
  programme_core: "Programme Core",
  university_language: "University Courses",
  university_cocurriculum: "University Courses",
  university_other: "University Courses",
  faculty_elective: "Faculty Electives",
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
    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5">
      <div
        className={`h-2 sm:h-2.5 rounded-full ${colors[color]} transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

const CollapsiblePanel = ({ open, onClose, depsKey, header, children }) => {
  const shellRef = useRef(null);
  const innerRef = useRef(null);
  const [maxH, setMaxH] = useState(0);

  // Handle opening and scrolling
  useEffect(() => {
    if (open && innerRef.current) {
      // Set the height first
      setMaxH(innerRef.current.scrollHeight);

      // Then scroll to the element with smooth animation
      const scrollTimer = setTimeout(() => {
        if (shellRef.current) {
          shellRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest",
          });
        }
      }, 100); // Wait for the height transition to start

      return () => clearTimeout(scrollTimer);
    } else {
      setMaxH(0);
    }
  }, [open, depsKey]);

  if (!open) return null;

  return (
    <div
      ref={shellRef}
      className="overflow-hidden transition-all ease-out duration-300 scroll-margin-fix"
      style={{ maxHeight: maxH }}
    >
      <div
        ref={innerRef}
        className="bg-white border border-gray-200 rounded-lg shadow-sm px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-6"
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          {header}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 focus:ring-2 focus:ring-blue-400"
            aria-label="Close details"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const ProgressTracker = () => {
  const [entries, setEntries] = useState([]);
  const [coursesMap, setCoursesMap] = useState({});
  const [completedByCategory, setCompletedByCategory] = useState({});
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const [selectedCat, setSelectedCat] = useState(null);

  const [studentProgramme, setStudentProgramme] = useState({
    id: null,
    code: null,
    name: null,
  });

  const [studentProgrammeId, setStudentProgrammeId] = useState(null);
  const [coursesByCode, setCoursesByCode] = useState({});

  const getEffectiveType = (course, programme) => {
    if (!course) return null;

    const typesConfig = course.typesByProgramme;

    if (Array.isArray(typesConfig) && typesConfig.length > 0) {
      if (!programme?.id && !programme?.code && !programme?.name) return null;

      const match = typesConfig.find((cfg) => {
        const p = cfg.programme;

        const pId = p?._id ?? p;
        const pCode = p?.programme_code ?? p;
        const pName = p?.programme_name ?? p;

        return (
          (programme?.id && String(pId) === String(programme.id)) ||
          (programme?.code && String(pCode) === String(programme.code)) ||
          (programme?.name && String(pName) === String(programme.name))
        );
      });

      return match?.type ?? null; // keep your "no fallback if overrides exist" rule
    }

    return course.type ?? null;
  };

  const [creditRequirements, setCreditRequirements] = useState(
    CATEGORY_ORDER.reduce((acc, cat) => {
      acc[cat] = 0;
      return acc;
    }, {})
  );

  // ---- data loads
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

  useEffect(() => {
    const fetchCourses = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await axiosClient.get("/courses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const map = {};
        const fullMap = {};

        res.data.forEach((course) => {
          const code = course.course_code || course.code;
          map[code] = course.credit_hours || course.credit || 0;

          fullMap[code] = course;
        });

        setCoursesMap(map);
        setCoursesByCode(fullMap);
      } catch (err) {
        console.error("Failed to load courses", err);
      }
    };
    fetchCourses();
  }, []);

  // Load graduation requirements for the logged-in student's intake
  useEffect(() => {
    const fetchRequirements = async () => {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      if (!token || !userId) return;

      try {
        const res = await axiosClient.get(
          `/programme-intakes/student/${userId}/requirements`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Get student's programme ID to use for type resolution
        const programmeId = res.data?.intake?.programme?._id;
        if (programmeId) {
          setStudentProgrammeId(programmeId);
        }

        const programme = res.data?.intake?.programme;

        setStudentProgramme({
          id: programme?._id ?? null,
          code: programme?.programme_code ?? null,
          name: programme?.programme_name ?? null,
        });

        const { requirementsByCategory } = res.data || {};

        if (requirementsByCategory) {
          const newReqs = CATEGORY_ORDER.reduce((acc, cat) => {
            acc[cat] = requirementsByCategory[cat]?.requiredCredits ?? 0;
            return acc;
          }, {});
          setCreditRequirements(newReqs);
        }
      } catch (err) {
        console.error("Failed to load graduation requirements", err);
      }
    };

    fetchRequirements();
  }, []);

  // Calculate completed credits per category
  useEffect(() => {
    const counts = Object.keys(creditRequirements).reduce((acc, cat) => {
      acc[cat] = 0;
      return acc;
    }, {});

    entries.forEach((entry) => {
      if (entry.status !== "Passed") return;

      const code = entry.course.course_code;
      const courseFull = coursesByCode[code] || entry.course;

      const effectiveType = getEffectiveType(courseFull, studentProgramme);

      const cat = categoryMap[effectiveType];
      const cr = coursesMap[code] || 0;

      counts[cat] += cr;
    });

    setCompletedByCategory(counts);
    setUpdatedAt(new Date());
  }, [
    entries,
    coursesMap,
    coursesByCode,
    studentProgrammeId, // Re-run when programme ID is loaded
    creditRequirements,
  ]);

  const creditsEarned = Object.values(completedByCategory).reduce(
    (s, v) => s + v,
    0
  );
  const totalCreditsRequired = Object.values(creditRequirements).reduce(
    (s, v) => s + v,
    0
  );
  const totalPercentage = Math.round(
    (creditsEarned / totalCreditsRequired) * 100
  );
  const remainingCredits = totalCreditsRequired - creditsEarned;

  const categoryIcons = {
    "Faculty Core": <BookOpenCheck className="w-5 h-5 sm:w-6 sm:h-6" />,
    "Programme Core": <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />,
    "University Courses": <BookOpenCheck className="w-5 h-5 sm:w-6 sm:h-6" />,
    "Faculty Electives": <BookOpenCheck className="w-5 h-5 sm:w-6 sm:h-6" />,
    "Specialization Electives": (
      <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
    ),
    "SHE Cluster": <BookOpenCheck className="w-5 h-5 sm:w-6 sm:h-6" />,
  };
  const colors = ["blue", "emerald", "violet", "amber", "rose"];

  // Derived list (memoized for lightness)
  const filteredCourses = useMemo(() => {
    if (!selectedCat) return [];
    const list = entries.filter((e) => {
      if (e.status !== "Passed") return false;

      const code = e.course.course_code;
      const courseFull = coursesByCode[code] || e.course;
      const effectiveType = getEffectiveType(courseFull, studentProgrammeId);

      return categoryMap[effectiveType] === selectedCat;
    });
    // unique by course_code, with credit lookup
    const seen = new Set();
    const out = [];
    for (const entry of list) {
      const code = entry.course.course_code;
      if (seen.has(code)) continue;
      seen.add(code);
      out.push({
        code,
        name: entry.course.course_name,
        status: entry.status,
        isRetake: entry.isRetake,
        credit: coursesMap[code] || 0,
      });
    }
    return out;
  }, [entries, coursesMap, coursesByCode, selectedCat, studentProgrammeId]);

  const open = !!selectedCat;

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Progress Tracker"
        subtitle="Plan your path to graduation and see how your credits stack up."
        actions={
          <div className="text-xs sm:text-sm text-gray-600 bg-gray-100 rounded-full px-3 py-1">
            Last updated: {updatedAt.toLocaleDateString()}
          </div>
        }
      />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        {/* Overall Progress */}
        <Card className="mb-6 sm:mb-8 border border-gray-200 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <GraduationCap className="w-5 h-5" />
                  <h3 className="text-base sm:text-lg font-semibold">
                    Overall Progress
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-500">
                  Track your journey towards graduation
                </p>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between text-xs sm:text-sm">
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
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">
                    {totalPercentage}% complete
                  </span>
                  <span className="text-gray-600">
                    {remainingCredits} credits remaining
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    <span className="text-xs sm:text-sm font-medium">
                      Completed
                    </span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold mt-1">
                    {creditsEarned}
                  </p>
                </div>
                <div className="bg-amber-50 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                    <span className="text-xs sm:text-sm font-medium">
                      Remaining
                    </span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold mt-1">
                    {remainingCredits}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category grid */}
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
          By Category
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 mb-2">
          {Object.keys(creditRequirements).map((cat, index) => {
            const completed = completedByCategory[cat] || 0;
            const total = creditRequirements[cat];
            const percent =
              total > 0
                ? Math.min(100, Math.round((completed / total) * 100))
                : 0;
            const color = colors[index % colors.length];

            return (
              <Card
                key={cat}
                className="transition-shadow focus-within:ring-2 focus-within:ring-blue-400"
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setSelectedCat(cat)} // OPEN = set a category
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedCat(cat);
                  }}
                  aria-pressed={selectedCat === cat}
                >
                  <CardContent className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-full">
                        {categoryIcons[cat]}
                      </div>
                      <h4 className="font-medium text-gray-800 text-sm sm:text-base">
                        {cat}
                      </h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">
                          {completed} / {total} credits
                        </span>
                      </div>
                      <ProgressBar percentage={percent} color={color} />
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-gray-600">
                          {percent}% complete
                        </span>
                        <span className="text-gray-600">
                          {Math.max(total - completed, 0)} remaining
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </button>
              </Card>
            );
          })}
        </div>

        {/* Details panel — open iff a category is selected */}
        <CollapsiblePanel
          open={open}
          onClose={() => setSelectedCat(null)} // CLOSE = clear the category
          depsKey={`${selectedCat ?? ""}:${filteredCourses.length}`}
          header={
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-50 text-blue-700">
                <BookOpenCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-semibold">
                  {selectedCat || ""} — Courses Taken
                </h4>
                <p className="text-xs sm:text-sm text-gray-500">
                  Passed courses are shown below with credits and status.
                </p>
              </div>
            </div>
          }
        >
          {filteredCourses.length ? (
            <ul className="mt-4 sm:mt-5 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {filteredCourses.map((c) => (
                <li
                  key={c.code}
                  className="group relative rounded-lg border border-gray-200 bg-gray-50 hover:bg-white transition-colors"
                >
                  <div className="p-3 sm:p-4 flex items-start gap-3">
                    <div className="mt-1">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold text-gray-900 text-sm sm:text-base">
                          {c.code}
                        </span>
                        <span className="hidden sm:inline text-gray-400">
                          —
                        </span>
                        <span className="text-gray-800 text-sm sm:text-base line-clamp-2 group-hover:line-clamp-none">
                          {c.name}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {c.credit} credits
                        </span>
                        <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Passed
                        </span>
                        {c.isRetake && (
                          <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Retaken
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs sm:text-sm text-gray-500 mt-4">
              No passed courses in this category yet.
            </p>
          )}
        </CollapsiblePanel>
      </main>
    </div>
  );
};

export default ProgressTracker;
