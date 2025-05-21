import React, { useState, useEffect } from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

const CourseInput = ({ onAdd, allCourses, completedCourses }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCourses, setFilteredCourses] = useState([]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredCourses([]);
      return;
    }

    const filtered = allCourses.filter((course) => {
      const matchesCode = course.code
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesName = course.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesCode || matchesName;
    });

    setFilteredCourses(filtered);
  }, [searchTerm, allCourses]);

  const handleAdd = () => {
    if (!selectedCourse) return;
    onAdd(selectedCourse.code);
    setSearchTerm("");
    setSelectedCourse(null);
    setShowDropdown(false);
  };

  const isCourseAvailable = (course) => {
    return course.prerequisites.every((prereq) =>
      completedCourses.includes(prereq)
    );
  };

  return (
    <div className="space-y-2 relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          />

          {/* Dropdown Menu */}
          {showDropdown && searchTerm && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course) => (
                  <div
                    key={course.code}
                    className={`p-2 hover:bg-gray-100 cursor-pointer ${
                      !isCourseAvailable(course) ? "opacity-50" : ""
                    }`}
                    onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                    onClick={() => {
                      if (isCourseAvailable(course)) {
                        setSelectedCourse(course);
                        setSearchTerm(`${course.code} - ${course.name}`);
                        setShowDropdown(false);
                      }
                    }}
                  >
                    <div className="font-medium">{course.code}</div>
                    <div className="text-sm">{course.name}</div>
                    <div className="text-xs text-gray-500">
                      {course.credit} credits
                      {course.prerequisites.length > 0 && (
                        <span>
                          {" "}
                          • Requires: {course.prerequisites.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-2 text-sm text-gray-500">
                  {searchTerm ? "No courses found" : "Start typing to search"}
                </div>
              )}
            </div>
          )}
        </div>
        <Button onClick={handleAdd}>Add</Button>
      </div>

      {/* Selected Course Preview */}
      {selectedCourse && (
        <div className="p-2 bg-blue-50 rounded">
          <div className="font-medium">
            {selectedCourse.code} - {selectedCourse.name}
          </div>
          <div className="text-sm">
            {selectedCourse.credit} credits
            {selectedCourse.prerequisites.length > 0 && (
              <span>
                {" "}
                • Requires: {selectedCourse.prerequisites.join(", ")}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseInput;
