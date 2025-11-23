const CourseDetailField = ({ label, value, icon, editMode, onChange, multiline = false }) => (
  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
    <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
    <div className="flex items-start gap-3">
      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">{icon}</div>
      {multiline ? (
        editMode ? (
          <textarea
            value={value}
            onChange={onChange}
            rows={5}
            className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none text-gray-700"
          />
        ) : (
          <p className="text-gray-700 leading-relaxed">{value}</p>
        )
      ) : editMode ? (
        <input
          type="text"
          value={value}
          onChange={onChange}
          className="w-full px-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-gray-700 font-medium"
        />
      ) : (
        <p className="text-gray-900 font-medium">{value}</p>
      )}
    </div>
  </div>
);

export default CourseDetailField;
