const CourseInfoCard = ({ icon, label, value, editMode, onChange, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
  };

  return (
    <div className={`${colorClasses[color]} rounded-xl p-5 border`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          {icon}
        </div>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      {editMode ? (
        <input
          type="text"
          value={value}
          onChange={onChange}
          className="w-full text-2xl font-bold bg-white px-3 py-2 rounded-lg border-2 border-current/20 focus:border-current focus:outline-none"
        />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
    </div>
  );
};

export default CourseInfoCard;