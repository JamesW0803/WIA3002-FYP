const buildSemesterMappingFromProgrammePlan = (programmePlan) => {
  if (!programmePlan || !Array.isArray(programmePlan.semester_plans)) {
    return {};
  }

  // sort semester_plans by academic_session (if present) then by createdAt
  const sorted = [...programmePlan.semester_plans].sort((a, b) => {
    const getKey = (sp) => {
      const session = sp.academic_session_id;
      if (!session) return Number(new Date(sp.createdAt || 0));

      // session.year is like "2023/2024"
      const [startYearStr] = String(session.year || "0").split("/");
      const startYear = parseInt(startYearStr, 10) || 0;

      let semOrder = 3;
      if (session.semester === "Semester 1") semOrder = 1;
      else if (session.semester === "Semester 2") semOrder = 2;

      return startYear * 10 + semOrder;
    };

    return getKey(a) - getKey(b);
  });

  const mapping = {};

  sorted.forEach((semPlan, index) => {
    const yearIndex = Math.floor(index / 2) + 1; // every 2 semesters = 1 year
    const semIndex = (index % 2) + 1; // 1 or 2

    const yearKey = `Year ${yearIndex}`;
    const semKey = `Semester ${semIndex}`;

    if (!mapping[yearKey]) mapping[yearKey] = {};
    if (!mapping[yearKey][semKey]) mapping[yearKey][semKey] = [];

    const codes = (semPlan.courses || []).map((c) => c.course_code);
    mapping[yearKey][semKey].push(...codes);
  });

  return mapping;
};

module.exports = { buildSemesterMappingFromProgrammePlan };
