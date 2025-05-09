const CourseStatusSelector = ({ status, onChange, allowedStatuses = [] }) => {
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded p-2 w-full"
    >
      <option value="">Select Status</option>
      {allowedStatuses.includes("Passed") && (
        <option value="Passed">Passed</option>
      )}
      {allowedStatuses.includes("Failed") && (
        <option value="Failed">Failed</option>
      )}
      {allowedStatuses.includes("Ongoing") && (
        <option value="Ongoing">Ongoing</option>
      )}
    </select>
  );
};

export default CourseStatusSelector;
