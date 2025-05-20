import React from "react";

// To-do: Fetch this list from the database
const CourseListSelector = ({
  courses,
  selectedCode,
  onChange,
  disabledCodes = [],
}) => {
  return (
    <select
      value={selectedCode}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded p-2 w-full"
    >
      <option value="">Select Course</option>
      {courses.map((course) => (
        <option
          key={course.code}
          value={course.code}
          disabled={disabledCodes.includes(course.code)}
        >
          {course.code}
        </option>
      ))}
    </select>
  );
};

export default CourseListSelector;
