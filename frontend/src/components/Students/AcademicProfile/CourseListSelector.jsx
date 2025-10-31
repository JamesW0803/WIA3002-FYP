import React, { useState, useEffect } from "react";
import axiosClient from "../../../api/axiosClient";

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
      const enabledCourses = courses.filter(
        (course) => !disabledCodes.includes(course.code)
      );
      const disabledCourses = courses.filter((course) =>
        disabledCodes.includes(course.code)
      );
      const sortedCourses = [...enabledCourses, ...disabledCourses];
      setFilteredCourses(sortedCourses);
    }
  }, [courses, disabledCodes]);

  useEffect(() => {
    if (selectedCode) {
      const label = selectedLabel || selectedCode;
      setSearchTerm(label);
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
        className={`p-3 border-b border-gray-100 last:border-b-0 transition-colors ${
          isDisabled
            ? "bg-gray-50 text-gray-400 cursor-not-allowed"
            : "hover:bg-blue-50 cursor-pointer bg-white"
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="font-medium text-sm text-gray-900">
              {course.code} - {course.name}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {course.credit} credits
            </div>
            {hasPrerequisites && (
              <div className="text-xs text-gray-500 mt-1">
                Prerequisites:{" "}
                {course.prerequisites.map((p) => p.course_code).join(", ")}
              </div>
            )}
            {course.offered_semester?.length > 0 && (
              <div className="text-xs text-blue-600 mt-1">
                Offered: {course.offered_semester.join(", ")}
              </div>
            )}
            {notOffered && (
              <div className="text-xs text-red-500 mt-1 font-medium">
                Not offered in Semester {targetSemester}
              </div>
            )}
            {disabledCodes.includes(course.code) && (
              <div className="text-xs text-red-500 mt-1 font-medium">
                Already taken
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
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-colors text-sm bg-white"
      />

      {showDropdown &&
        (searchTerm.length > 0 || filteredCourses.length > 0) && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-[#1E3A8A] border-t-transparent rounded-full animate-spin mr-2"></div>
                  Loading courses...
                </div>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchTerm.length < 2
                  ? "Type at least 2 characters to search"
                  : "No courses found"}
              </div>
            ) : (
              <div>
                <div className="p-2 bg-gray-50 border-b border-gray-200">
                  <div className="text-xs font-medium text-gray-600">
                    {filteredCourses.length} course
                    {filteredCourses.length !== 1 ? "s" : ""} found
                  </div>
                </div>
                {filteredCourses.map(renderCourseItem)}
              </div>
            )}
          </div>
        )}
    </div>
  );
};

export default CourseListSelector;
