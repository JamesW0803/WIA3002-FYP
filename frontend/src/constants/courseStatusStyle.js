
const STATUS_COLORS = {
  Taken: "bg-blue-200 text-blue-800",
  Passed: "bg-green-200 text-green-800",
  Failed: "bg-red-200 text-red-800",
  Retake: "bg-yellow-200 text-yellow-800",
};

const CourseStatusBadge = ({ status }) => {
  const classes = STATUS_COLORS[status] || "bg-gray-200 text-gray-800";

  return (
    <span
      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${classes}`}
    >
      {status}
    </span>
  );
};

export default CourseStatusBadge;
