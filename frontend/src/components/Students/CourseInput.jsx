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

const CourseInput = ({
  onAdd,
  allCourses = [],
  completedCoursesByYear = {},
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Memoize the course status getter
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

  // Memoize the filtered courses
  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return [];

    // Filter courses that match search term
    const matchedCourses = allCourses.filter((course) => {
      if (!course?.code || !course?.name) return false;
      return (
        course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

    // Categorize courses
    const available = [];
    const failed = [];
    const taken = [];

    matchedCourses.forEach((course) => {
      const status = getCourseStatus(course.code);
      if (!status) {
        available.push(course);
      } else if (status === "Failed") {
        failed.push(course);
      } else {
        taken.push(course);
      }
    });

    return [...available, ...failed, ...taken];
  }, [searchTerm, allCourses, getCourseStatus]);

  // Close dropdown when clicking outside
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

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAdd = () => {
    if (!selectedCourse) return;
    onAdd(selectedCourse.code);
    setSearchTerm("");
    setSelectedCourse(null);
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />

          {showDropdown &&
            searchTerm &&
            inputRef.current &&
            ReactDOM.createPortal(
              <div
                ref={dropdownRef}
                className="absolute z-[9999] mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
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
                {filteredCourses.length > 0 ? (
                  <>
                    {/* Available courses */}
                    {filteredCourses
                      .filter((course) => !getCourseStatus(course.code))
                      .map((course) => (
                        <div
                          key={course.code}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            setSelectedCourse(course);
                            setSearchTerm(`${course.code} - ${course.name}`);
                            setShowDropdown(false);
                          }}
                        >
                          <div className="font-medium">{course.code}</div>
                          <div className="text-sm">{course.name}</div>
                          <div className="text-xs text-gray-500">
                            {course.credit || 0} credits
                          </div>
                        </div>
                      ))}

                    {/* Failed courses */}
                    {filteredCourses
                      .filter(
                        (course) => getCourseStatus(course.code) === "Failed"
                      )
                      .map((course) => (
                        <div
                          key={course.code}
                          className="p-2 hover:bg-gray-100 cursor-pointer bg-yellow-50"
                          onClick={() => {
                            setSelectedCourse(course);
                            setSearchTerm(`${course.code} - ${course.name}`);
                            setShowDropdown(false);
                          }}
                        >
                          <div className="font-medium">{course.code}</div>
                          <div className="text-sm">
                            {course.name}
                            <span className="text-yellow-600 ml-1">
                              (Failed - can retake)
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {course.credit || 0} credits
                          </div>
                        </div>
                      ))}

                    {/* Taken courses */}
                    {filteredCourses
                      .filter((course) => {
                        const status = getCourseStatus(course.code);
                        return status && status !== "Failed";
                      })
                      .map((course) => {
                        const status = getCourseStatus(course.code);
                        return (
                          <div
                            key={course.code}
                            className="p-2 opacity-50 cursor-not-allowed"
                            title={`Course already ${status.toLowerCase()}`}
                          >
                            <div className="font-medium">{course.code}</div>
                            <div className="text-sm">
                              {course.name}{" "}
                              <span
                                className={
                                  status === "Passed"
                                    ? "text-green-600"
                                    : "text-yellow-600"
                                }
                              >
                                ({status})
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {course.credit || 0} credits
                            </div>
                          </div>
                        );
                      })}
                  </>
                ) : (
                  <div className="p-2 text-sm text-gray-500">
                    {searchTerm
                      ? "No matching courses found"
                      : "Type to search courses"}
                  </div>
                )}
              </div>,
              document.body
            )}
        </div>
        <Button onClick={handleAdd} disabled={!selectedCourse}>
          Add
        </Button>
      </div>
    </div>
  );
};

export default CourseInput;
