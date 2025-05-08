import React from "react";

const CourseStatusSelector = ({ status, onChange }) => {
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded p-2 w-full"
    >
      <option value="">Set Status</option>
      <option value="passed">Passed</option>
      <option value="failed">Failed</option>
      <option value="current">Currently Taking</option>
    </select>
  );
};

export default CourseStatusSelector;
