import React from "react";
import CourseItem from "./CourseItem";

const CourseList = ({ courses, removeCourse }) => {
  return (
    <div className="space-y-2">
      {courses.map((course, index) => (
        <CourseItem
          key={index}
          course={course}
          index={index}
          removeCourse={removeCourse}
        />
      ))}
    </div>
  );
};

export default CourseList;
