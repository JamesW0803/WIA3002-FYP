const { COURSE_TYPES } = require("../constants/courseType");

function getEffectiveTypeForProgramme(course, programmeId) {
  if (!programmeId) return course.type;

  const specific = (course.typesByProgramme || []).find((cfg) =>
    cfg.programme.equals
      ? cfg.programme.equals(programmeId)
      : cfg.programme.toString() === programmeId.toString()
  );

  return specific?.type || course.type;
}

module.exports = {
  getEffectiveTypeForProgramme,
};
