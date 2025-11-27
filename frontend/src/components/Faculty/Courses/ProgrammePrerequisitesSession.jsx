const ProgrammePrerequisitesSession = ({
  programmes,
  courses,
  formData,
  setFormData,
  editMode,
  addCourse,
}) => {
  const configs = formData.prerequisitesByProgramme || [];

  const programmeOptions = (programmes || []).map((p) => ({
    label: `${p.programme_code} - ${p.programme_name}`,
    value: p.programme_code,
  }));

  const courseOptions = (courses || []).map((course) => ({
    label: `${course.course_code} ${course.course_name}`,
    value: course.course_code,
  }));

  // handlers
  const addProgrammeConfig = () => {
    const current = formData.prerequisitesByProgramme || [];
    setFormData({
      ...formData,
      prerequisitesByProgramme: [
        ...current,
        { programme_code: "", prerequisite_codes: [""] },
      ],
    });
  };

  const removeProgrammeConfig = (index) => {
    const current = formData.prerequisitesByProgramme || [];
    const updated = current.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      prerequisitesByProgramme: updated,
    });
  };

  const updateProgrammeCode = (index, programme_code) => {
    const current = formData.prerequisitesByProgramme || [];
    const updated = [...current];
    updated[index] = { ...updated[index], programme_code };
    setFormData({
      ...formData,
      prerequisitesByProgramme: updated,
    });
  };

  const addProgrammePrereq = (index) => {
    const current = formData.prerequisitesByProgramme || [];
    const updated = [...current];
    const cfg = updated[index] || {
      programme_code: "",
      prerequisite_codes: [],
    };
    updated[index] = {
      ...cfg,
      prerequisite_codes: [...(cfg.prerequisite_codes || []), ""],
    };
    setFormData({
      ...formData,
      prerequisitesByProgramme: updated,
    });
  };

  const updateProgrammePrereq = (index, prereqIndex, value) => {
    const current = formData.prerequisitesByProgramme || [];
    const updated = [...current];
    const cfg = updated[index];
    const prereqs = [...(cfg.prerequisite_codes || [])];
    prereqs[prereqIndex] = value;
    updated[index] = { ...cfg, prerequisite_codes: prereqs };
    setFormData({
      ...formData,
      prerequisitesByProgramme: updated,
    });
  };

  const removeProgrammePrereq = (index, prereqIndex) => {
    const current = formData.prerequisitesByProgramme || [];
    const updated = [...current];
    const cfg = updated[index];
    const prereqs = (cfg.prerequisite_codes || []).filter(
      (_, i) => i !== prereqIndex
    );
    updated[index] = { ...cfg, prerequisite_codes: prereqs };
    setFormData({
      ...formData,
      prerequisitesByProgramme: updated,
    });
  };

  // If viewing (not editing) and nothing configured, hide the whole section
  if (!editMode && !addCourse && configs.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-gray-700 mb-2">
        Programme-specific prerequisites
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        These override the global prerequisites for the selected programme.
      </p>

      {configs.map((cfg, index) => (
        <div
          key={index}
          className="border rounded-xl p-4 mb-3 flex flex-col gap-3"
        >
          {/* Programme row */}
          <div className="flex items-center gap-4">
            <div className="w-1/2">
              {(editMode || addCourse) ? (
                <select
                  className="border border-gray-300 rounded-lg p-2 w-full text-sm"
                  value={cfg.programme_code || ""}
                  onChange={(e) => updateProgrammeCode(index, e.target.value)}
                >
                  <option value="">-- Select programme --</option>
                  {programmeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm font-semibold text-gray-900">
                  {cfg.programme_code || "-"}
                </p>
              )}
            </div>

            {(editMode || addCourse) && (
              <button
                type="button"
                onClick={() => removeProgrammeConfig(index)}
                className="text-red-500 text-xs hover:underline"
              >
                Remove programme config
              </button>
            )}
          </div>

          {/* Prereqs for this programme */}
          <div className="flex flex-col gap-2">
            {(editMode || addCourse) ? (
              (cfg.prerequisite_codes || []).map((value, pIndex) => (
                <div key={pIndex} className="flex flex-row items-center gap-3">
                  <div className="w-1/2">
                    <select
                      className="border border-gray-300 rounded-lg p-2 w-full text-sm"
                      value={value}
                      onChange={(e) =>
                        updateProgrammePrereq(index, pIndex, e.target.value)
                      }
                    >
                      <option value="">-- Select course --</option>
                      {courseOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProgrammePrereq(index, pIndex)}
                    className="text-red-500 text-xs hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-700">
                {(cfg.prerequisite_codes || []).length > 0
                  ? cfg.prerequisite_codes.join(", ")
                  : "-"}
              </p>
            )}

            {(editMode || addCourse) && (
              <button
                type="button"
                onClick={() => addProgrammePrereq(index)}
                className="text-blue-600 text-xs hover:underline mt-1"
              >
                + Add another prerequisite for this programme
              </button>
            )}
          </div>
        </div>
      ))}

      {(editMode || addCourse) && (
        <button
          type="button"
          onClick={addProgrammeConfig}
          className="text-blue-600 text-sm hover:underline"
        >
          + Add programme-specific prerequisites
        </button>
      )}
    </div>
  );
};

export default ProgrammePrerequisitesSession;
