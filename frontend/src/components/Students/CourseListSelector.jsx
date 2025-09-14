import React, { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";

const CourseListSelector = ({
  selectedCode,
  selectedLabel = "",
  onChange,
  disabledCodes = [],
  targetSemester,
}) => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      if (searchTerm.length < 2) {
        setFilteredCourses([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await axiosClient.get("/courses", {
          params: {
            search: searchTerm.toLowerCase(),
          },
        });
        const formattedCourses = response.data.map((course) => ({
          code: course.course_code,
          name: course.course_name,
          credit: course.credit_hours,
          prerequisites: course.prerequisites || [],
          offered_semester: course.offered_semester || [],
        }));
        setCourses(formattedCourses);
      } catch (error) {
        console.error("Error searching courses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchCourses, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  useEffect(() => {
    if (courses.length > 0) {
      // Separate enabled and disabled courses
      const enabledCourses = courses.filter(
        (course) => !disabledCodes.includes(course.code)
      );
      const disabledCourses = courses.filter((course) =>
        disabledCodes.includes(course.code)
      );

      // Combine with disabled courses at the end
      const sortedCourses = [...enabledCourses, ...disabledCourses];
      setFilteredCourses(sortedCourses);
    }
  }, [courses, disabledCodes]);

  useEffect(() => {
    if (selectedCode) {
      const label = selectedLabel || selectedCode;
      setSearchTerm(label);
    } else {
      // when no selection, keep whatever the user is typing
    }
  }, [selectedCode, selectedLabel]);

  const handleSelectCourse = (course) => {
    if (disabledCodes.includes(course.code)) return;

    onChange(course.code);
    setSearchTerm(`${course.code} - ${course.name}`);
    setShowDropdown(false);
  };

  const isOfferedIn = (offeredArr = [], semNum) => {
    if (!semNum) return true;
    const norm = offeredArr.map((s) => String(s).toLowerCase());
    return (
      norm.includes(`semester ${semNum}`) ||
      norm.includes("both") ||
      norm.includes("all") ||
      norm.includes("any")
    );
  };

  const renderCourseItem = (course) => {
    const notOffered =
      targetSemester && !isOfferedIn(course.offered_semester, targetSemester);
    const isDisabled = disabledCodes.includes(course.code) || notOffered;
    const hasPrerequisites =
      course.prerequisites && course.prerequisites.length > 0;

    return (
      <div
        key={course.code}
        onClick={() => !isDisabled && handleSelectCourse(course)}
        className={`p-2 hover:bg-gray-100 cursor-pointer ${
          isDisabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="font-medium">
              {course.code} - {course.name} ({course.credit} credits)
            </div>
            {hasPrerequisites && (
              <div className="text-xs text-gray-500 mt-1">
                Prerequisites:{" "}
                {course.prerequisites.map((p) => p.course_code).join(", ")}
              </div>
            )}
            {course.offered_semester?.length > 0 && (
              <div className="text-[11px] text-gray-500 mt-1">
                Offered: {course.offered_semester.join(", ")}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        placeholder="Search courses by code or name..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        className="border rounded p-2 w-full"
      />

      {showDropdown &&
        (searchTerm.length > 0 || filteredCourses.length > 0) && (
          <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-60 overflow-auto">
            {isLoading ? (
              <div className="p-2 text-gray-500">Loading...</div>
            ) : filteredCourses.length === 0 ? (
              <div className="p-2 text-gray-500">
                {searchTerm.length < 2
                  ? "Type at least 2 characters"
                  : "No courses found"}
              </div>
            ) : (
              filteredCourses.map(renderCourseItem)
            )}
          </div>
        )}
    </div>
  );
};

export default CourseListSelector;
