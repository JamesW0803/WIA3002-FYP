import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import ReactDOM from "react-dom";
import { validateCourseAddition } from "./AcademicPlanner/utils/planHelpers";

const CourseInput = ({
  onAdd,
  allCourses = [],
  completedCoursesByYear = {},
  semester,
  ongoingCourses = new Set(),
  passedCourses,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = () =>
      setIsMobile(window.matchMedia("(max-width: 640px)").matches);
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const getCourseStatus = useCallback(
    (courseCode) => {
      const attempts = [];
      for (const year in completedCoursesByYear) {
        for (const semester in completedCoursesByYear[year]) {
          const courseEntry = completedCoursesByYear[year][semester].find(
            (c) => c.code === courseCode
          );
          if (courseEntry) {
            attempts.push({
              status: courseEntry.status,
              year: parseInt(year.replace("Year ", "")),
              semester: parseInt(semester.replace("Semester ", "")),
            });
          }
        }
      }
      if (attempts.length === 0) return null;
      attempts.sort((a, b) =>
        a.year !== b.year ? b.year - a.year : b.semester - a.semester
      );
      return attempts[0].status;
    },
    [completedCoursesByYear]
  );

  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const matched = allCourses.filter((course) => {
      if (!course?.code || !course?.name) return false;
      return (
        course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    const available = [];
    const failed = [];
    const taken = [];
    matched.forEach((course) => {
      const status = getCourseStatus(course.code);
      if (!status) available.push(course);
      else if (status === "Failed") failed.push(course);
      else taken.push(course);
    });
    return [...available, ...failed, ...taken];
  }, [searchTerm, allCourses, getCourseStatus]);

  const enrichedCourses = useMemo(() => {
    if (!semester) return [];
    return filteredCourses.map((course) => {
      const completedArray = Array.isArray(passedCourses)
        ? passedCourses
        : Array.from(passedCourses || []);
      const { isValid, message } = validateCourseAddition(
        course,
        semester,
        allCourses,
        completedArray
      );
      return { ...course, _canAdd: isValid, _reason: message };
    });
  }, [filteredCourses, semester, allCourses, passedCourses]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        inputRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    if (!isMobile) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && showDropdown) {
      const originalStyle = document.body.style.overflow;
      const originalTouch = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      return () => {
        document.body.style.overflow = originalStyle;
        document.body.style.touchAction = originalTouch;
      };
    }
  }, [isMobile, showDropdown]);

  const handlePick = (course) => {
    if (!course._canAdd) return;
    setSelectedCourse(course);
    setSearchTerm(`${course.code} - ${course.name}`);
    setShowDropdown(false);
  };

  const handleAdd = () => {
    if (!selectedCourse) return;
    const validation = validateCourseAddition(
      selectedCourse,
      semester,
      allCourses,
      passedCourses
    );
    if (!validation.isValid) {
      alert(`Cannot add course: ${validation.message}`);
      return;
    }
    onAdd(selectedCourse.code);
    setSearchTerm("");
    setSelectedCourse(null);
    setShowDropdown(false);
  };

  const list = (
    <div
      ref={dropdownRef}
      className={`bg-white border border-gray-200 rounded-t-2xl sm:rounded-md shadow-xl max-h-[65vh] sm:max-h-60 overflow-y-auto`}
    >
      {enrichedCourses.length > 0 ? (
        <div className="divide-y">
          {enrichedCourses.map((course) => {
            const disabled = !course._canAdd;
            const status = getCourseStatus(course.code);
            const failed = status === "Failed";
            const taken = status && status !== "Failed";
            return (
              <div
                key={course.code}
                className={`p-3 cursor-pointer ${
                  disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-50"
                } ${failed ? "bg-yellow-50" : ""} ${taken ? "bg-gray-50" : ""}`}
                onClick={() => !disabled && handlePick(course)}
              >
                <div className="font-medium">{course.code}</div>
                <div className="text-sm">
                  {course.name}
                  {failed && (
                    <span className="text-yellow-700 ml-1">
                      (Failed – can retake)
                    </span>
                  )}
                  {taken && (
                    <span className="text-gray-600 ml-1">({status})</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {course.credit || 0} credits
                </div>
                {disabled && course._reason && (
                  <div className="text-xs text-red-500 mt-1">
                    {course._reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-3 text-sm text-gray-500">
          {searchTerm ? "No matching courses found" : "Type to search courses"}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            placeholder="Search courses…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />

          {/* Desktop/Tablet dropdown (portal near input) */}
          {!isMobile &&
            showDropdown &&
            searchTerm &&
            inputRef.current &&
            ReactDOM.createPortal(
              <div
                className="absolute z-[9999] mt-1"
                style={{
                  position: "absolute",
                  width: inputRef.current.offsetWidth,
                  left: inputRef.current.getBoundingClientRect().left + "px",
                  top:
                    inputRef.current.getBoundingClientRect().bottom +
                    window.scrollY +
                    "px",
                }}
              >
                {list}
              </div>,
              document.body
            )}
        </div>

        <Button onClick={handleAdd} disabled={!selectedCourse}>
          Add
        </Button>
      </div>

      {/* Mobile bottom sheet */}
      {isMobile &&
        showDropdown &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[10000] flex flex-col">
            {/* backdrop */}
            <div
              className="flex-1 bg-black/40"
              onClick={() => setShowDropdown(false)}
            />

            {/* sheet */}
            <div className="bg-white rounded-t-2xl shadow-2xl p-3">
              <div className="h-1.5 w-10 bg-gray-300 rounded-full mx-auto mb-3" />

              {/* ✅ real input living INSIDE the sheet */}
              <div className="mb-3">
                <Input
                  // separate ref so we can focus when the sheet opens
                  autoFocus
                  placeholder="Search courses…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* your results list */}
              {list}

              <div className="pt-3 pb-safe">
                <Button
                  className="w-full"
                  disabled={!selectedCourse}
                  onClick={handleAdd}
                >
                  Add Selected Course
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CourseInput;
