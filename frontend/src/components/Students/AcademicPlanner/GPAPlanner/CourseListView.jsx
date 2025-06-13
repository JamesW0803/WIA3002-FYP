import React from "react";

const CourseListView = ({ courses }) => (
  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
    <h3 className="font-medium text-lg text-[#1E3A8A] mb-4">Planned Courses</h3>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Course
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Credits
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Expected Grade
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {courses.map((course, index) => (
            <tr key={index}>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {course.name || "Untitled Course"}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {course.credit}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {course.grade}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default CourseListView;
