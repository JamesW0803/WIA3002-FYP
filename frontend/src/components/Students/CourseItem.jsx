import React from "react";
import { Button } from "../../components/ui/button";

const CourseItem = ({ course, index, removeCourse }) => {
  return (
    <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
      <div>
        <span className="font-medium">{course.code}</span> - {course.name}
        <span className="ml-2 text-sm text-gray-600">
          {course.credit} credits
        </span>
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => removeCourse(index)}
      >
        Remove
      </Button>
    </div>
  );
};

export default CourseItem;
