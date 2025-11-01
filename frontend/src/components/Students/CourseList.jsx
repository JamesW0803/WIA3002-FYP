import React from "react";
import { Button } from "../ui/button";
import { Trash2, CheckCircle2 } from "lucide-react";

const CourseList = ({
  courses,
  removeCourse,
  completedCourses = [],
  isViewMode = false,
}) => {
  return (
    <div className="space-y-2">
      {courses.map((course, index) => {
        const isCompleted = completedCourses.includes(course.code);
        return (
          <div
            key={index}
            className={`flex justify-between items-start sm:items-center gap-3 p-3 rounded-lg flex-wrap ${
              isCompleted
                ? "bg-green-50 border border-green-100"
                : "bg-gray-50 border border-gray-100"
            }`}
          >
            {/* left */}
            <div className="flex items-start gap-3 min-w-0">
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <div className="h-4 w-4 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {course.code}
                </div>
                <div className="text-sm text-gray-600 break-words">
                  {course.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {course.credit} credits
                </div>
              </div>
            </div>

            {/* right */}
            {!isViewMode && removeCourse && !isCompleted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCourse(index)}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 ml-auto"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CourseList;
