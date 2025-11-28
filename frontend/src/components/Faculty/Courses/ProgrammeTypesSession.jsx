import { READABLE_COURSE_TYPES } from "../../../constants/courseType";

const ProgrammeTypesSession = ({
  programmes,
  formData,
  setFormData,
  editMode,
  addCourse,
}) => {
  const configs = formData.typesByProgramme || [];

  const programmeOptions = (programmes || []).map((p) => ({
    label: `${p.programme_code} - ${p.programme_name}`,
    value: p.programme_code,
  }));

  // Build options from READABLE_COURSE_TYPES, but skip "Unknown Course Type"
  const typeOptions = Object.entries(READABLE_COURSE_TYPES)
    .filter(([, label]) => label !== "Unknown Course Type")
    .map(([value, label]) => ({
      value, // e.g. "programme_core"
      label, // e.g. "Programme Core Course"
    }));

  // ---- handlers ----
  const addProgrammeTypeConfig = () => {
    const current = formData.typesByProgramme || [];
    setFormData({
      ...formData,
      typesByProgramme: [
        ...current,
        { programme_code: "", type: "" }, // new empty config
      ],
    });
  };

  const removeProgrammeTypeConfig = (index) => {
    const current = formData.typesByProgramme || [];
    const updated = current.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      typesByProgramme: updated,
    });
  };

  const updateProgrammeCode = (index, programme_code) => {
    const current = formData.typesByProgramme || [];
    const updated = [...current];
    updated[index] = { ...updated[index], programme_code };
    setFormData({
      ...formData,
      typesByProgramme: updated,
    });
  };

  const updateProgrammeType = (index, type) => {
    const current = formData.typesByProgramme || [];
    const updated = [...current];
    updated[index] = { ...updated[index], type };
    setFormData({
      ...formData,
      typesByProgramme: updated,
    });
  };

  // If viewing (not editing) and nothing configured, hide the whole section
  if (!editMode && !addCourse && configs.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-gray-700 mb-2">
        Programme-specific course types
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Override this course type for specific programmes. For example, this
        course can be a Programme Elective in one programme and a Faculty
        Elective in another.
      </p>

      {configs.map((cfg, index) => (
        <div
          key={index}
          className="border rounded-xl p-4 mb-3 flex flex-col gap-3"
        >
          {/* Programme + type row */}
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Programme select / display */}
            <div className="w-full md:w-1/2">
              {editMode || addCourse ? (
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
                <p className="text-sm font-semibold text-gray-700">
                  {`${cfg.programme_code} - ${cfg.programme_name}` || "-"}
                </p>
              )}
            </div>

            {/* Type select / display */}
            <div className="w-full md:w-1/3">
              {editMode || addCourse ? (
                <select
                  className="border border-gray-300 rounded-lg p-2 w-full text-sm"
                  value={cfg.type || ""}
                  onChange={(e) => updateProgrammeType(index, e.target.value)}
                >
                  <option value="">-- Select type --</option>
                  {typeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm font-semibold text-gray-700">
                  {cfg.type ? (READABLE_COURSE_TYPES[cfg.type] || cfg.type) : "-"}
                </p>
              )}
            </div>

            {(editMode || addCourse) && (
              <button
                type="button"
                onClick={() => removeProgrammeTypeConfig(index)}
                className="text-red-500 text-xs hover:underline"
              >
                Remove programme type
              </button>
            )}
          </div>
        </div>
      ))}

      {(editMode || addCourse) && (
        <button
          type="button"
          onClick={addProgrammeTypeConfig}
          className="text-blue-600 text-sm hover:underline"
        >
          + Add programme-specific type
        </button>
      )}
    </div>
  );
};

export default ProgrammeTypesSession;
