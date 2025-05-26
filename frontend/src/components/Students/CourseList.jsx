import React from "react";
import { Button } from "../ui/button";
import { Trash2 } from "lucide-react";

const CourseList = ({ courses, removeCourse, isViewMode = false }) => {
  return (
    <div className="space-y-2">
      {courses.map((course, index) => (
        <div
          key={index}
          className="flex justify-between items-center p-2 bg-gray-50 rounded"
        >
          <div>
            <span className="font-medium">{course.code}</span>
            <span className="text-gray-600 ml-2">{course.name}</span>
            <span className="text-gray-500 text-sm ml-2">
              ({course.credit} credits)
            </span>
          </div>
          {!isViewMode && removeCourse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeCourse(index)}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

export default CourseList;
