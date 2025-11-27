const PrerequisitesSession = ({ courses, formData, setFormData, editMode}) => {
  return (
  <div className="mt-8">
    <span className="font-semibold ml-1 mb-2 block">Prerequisites</span>
    {formData.prerequisites?.length === 0 && !editMode && (
      <p className="text-sm text-gray-500 ml-1">No prerequisites</p>
    )}

    {formData.prerequisites?.map((value, index) => {
        const course = courses.find(c => c.course_code === value);
        return (
            
      <div key={index} className="flex items-center gap-2 mb-2">
        {editMode ? (
          <>
            <select
              className="border border-gray-300 rounded-lg p-2 text-sm"
              value={value}
              onChange={(e) => {
                const updated = [...formData.prerequisites];
                updated[index] = e.target.value;
                setFormData({ ...formData, prerequisites: updated });
              }}
            >
              <option value="">-- Select --</option>
              {courses.map((c) => (
                <option key={c.course_code} value={c.course_code}>
                  {c.course_code} - {c.course_name}
              </option>
              ))}
            </select>
            <button
              className="text-red-500 text-sm"
              onClick={() => {
                const updated = formData.prerequisites.filter(
                  (_, i) => i !== index
                );
                setFormData({ ...formData, prerequisites: updated });
              }}
            >
              Remove
            </button>
          </>
        ) : (
          <p className="text-sm">
            {course.course_code} - {course.course_name }
          </p>
        )}
      </div>
    )
        
    })}

    {editMode && (
      <button
        className="text-blue-600 text-sm hover:underline"
        onClick={() =>
          setFormData({
            ...formData,
            prerequisites: [...formData.prerequisites, ""],
          })
        }
      >
        + Add another prerequisite
      </button>
    )}
  </div>
  )
}

export default PrerequisitesSession;