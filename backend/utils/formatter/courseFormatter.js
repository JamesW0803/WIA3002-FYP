const mapPrereqArrayToCodes = (arr) => {
  if (!arr) return [];
  return arr
    .map((p) => {
      if (!p) return null;
      if (typeof p === "string") return p;
      if (p.course_code) return p.course_code;
      return null;
    })
    .filter(Boolean);
};

const formatCourse = (course) => {
  const prerequisitesCodes = mapPrereqArrayToCodes(course.prerequisites);

  const prerequisitesByProgramme = (course.prerequisitesByProgramme || []).map(
    (cfg) => ({
      programme_code:
        cfg.programme?.programme_code ?? cfg.programme_code ?? "-",
      programme_name: cfg.programme?.programme_name ?? cfg.programme_name ?? "",
      prerequisite_codes: mapPrereqArrayToCodes(cfg.prerequisites),
    })
  );

  const typesByProgramme = (course.typesByProgramme || []).map((cfg) => ({
    programme: cfg.programme?._id ?? cfg.programme ?? null,
    programme_code: cfg.programme?.programme_code ?? cfg.programme_code ?? "-",
    programme_name: cfg.programme?.programme_name ?? cfg.programme_name ?? "",
    type: cfg.type ?? "-",
  }));

  return {
    _id: course._id ?? "-",
    course_code: course.course_code ?? "-",
    course_name: course.course_name ?? "-",
    type: course.type ?? "-",
    credit_hours: course.credit_hours ?? "-",
    description: course.description ?? "-",

    prerequisites: prerequisitesCodes,
    prerequisitesByProgramme,
    typesByProgramme,

    faculty: course.faculty ?? "-",
    department: course.department ?? "No department assigned",
    offered_semester: course.offered_semester ?? "-",
    study_level: course.study_level ?? "-",
  };
};

const formatCourses = (courses) => courses.map((c) => formatCourse(c));

module.exports = {
  formatCourses,
  formatCourse,
};
