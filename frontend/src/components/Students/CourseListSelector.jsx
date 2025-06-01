import React, { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";

const CourseListSelector = ({ selectedCode, onChange, disabledCodes = [] }) => {
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

  const handleSelectCourse = (course) => {
    if (disabledCodes.includes(course.code)) return;

    onChange(course.code);
    setSearchTerm(`${course.code} - ${course.name}`);
    setShowDropdown(false);
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
              filteredCourses.map((course) => {
                const isDisabled = disabledCodes.includes(course.code);
                return (
                  <div
                    key={course.code}
                    className={`p-2 ${
                      isDisabled
                        ? "opacity-50 text-gray-400 pointer-events-none"
                        : "hover:bg-gray-100 cursor-pointer"
                    }`}
                    onClick={() => handleSelectCourse(course)}
                  >
                    <div className="flex justify-between items-center">
                      <span>
                        {course.code} - {course.name} ({course.credit} credits)
                      </span>
                      {isDisabled && (
                        <span className="text-xs text-gray-500 ml-2">
                          (Already added)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
    </div>
  );
};

export default CourseListSelector;
