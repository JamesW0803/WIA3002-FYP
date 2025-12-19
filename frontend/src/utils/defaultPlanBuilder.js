const getSemIndex = (y, s) => (Number(y) - 1) * 2 + (Number(s) - 1);

export const sliceFacultyMappingFrom = (mapping, startPoint) => {
  if (!mapping || !Object.keys(mapping).length) return {};

  const startIndex = getSemIndex(startPoint.year, startPoint.semester);

  const allYearNums = Object.keys(mapping).map((k) =>
    parseInt(String(k).replace("Year ", ""), 10)
  );
  if (!allYearNums.length) return {};

  const maxMapYear = Math.max(...allYearNums);
  const result = {};

  for (let y = Number(startPoint.year); y <= maxMapYear; y++) {
    const yKey = `Year ${y}`;
    const sems = mapping[yKey] || {};
    for (let s = 1; s <= 2; s++) {
      const sKey = `Semester ${s}`;
      const codes = sems[sKey];
      if (!codes || !codes.length) continue;

      const idx = getSemIndex(y, s);
      if (idx < startIndex) continue;

      if (!result[yKey]) result[yKey] = {};
      result[yKey][sKey] = codes.slice();
    }
  }

  return result;
};

export const mappingToAcademicPlanYearsPayload = (
  remainingMapping,
  courseCatalog = []
) => {
  const byCode = new Map();
  (courseCatalog || []).forEach((c) => {
    const code = c.course_code || c.code;
    if (code) byCode.set(code, c);
  });

  const yearKeys = Object.keys(remainingMapping).sort(
    (a, b) =>
      parseInt(a.replace("Year ", ""), 10) -
      parseInt(b.replace("Year ", ""), 10)
  );

  return yearKeys.map((yKey) => {
    const yearNum = parseInt(yKey.replace("Year ", ""), 10);
    const semsObj = remainingMapping[yKey] || {};

    const semesters = [1, 2]
      .map((s) => {
        const sKey = `Semester ${s}`;
        const codes = semsObj[sKey] || [];
        if (!codes.length) return null;

        // OPTIONAL: handle special tokens if your mapping uses them
        const isGap =
          codes.includes("GAP SEMESTER") || codes.includes("OUTBOUND");
        const filteredCodes = codes.filter(
          (c) =>
            typeof c === "string" && !["GAP SEMESTER", "OUTBOUND"].includes(c)
        );

        return {
          id: s,
          name: `Year ${yearNum} - Semester ${s}`,
          isGap,
          courses: filteredCodes.map((code) => {
            const found = byCode.get(code);
            return {
              // backend hydrateCourseRefs can resolve `course` by `course_code` :contentReference[oaicite:3]{index=3}
              course_code: code,
              credit_at_time: found?.credit_hours ?? found?.credit ?? 0,
              title_at_time: found?.course_name ?? found?.name ?? "",
            };
          }),
        };
      })
      .filter(Boolean);

    return {
      year: yearNum,
      isGapYear: false,
      semesters,
    };
  });
};

// find first real semester in plan (used to check "aligned start")
export const getPlanFirstSemesterPoint = (plan) => {
  const semesterIndex = (year, sem) =>
    (Number(year) - 1) * 2 + (Number(sem) - 1);
  const extractSemesterNumber = (name = "") => {
    const parts = String(name).split(" ");
    const semStr = parts[3];
    const semNum = parseInt(semStr, 10);
    return Number.isNaN(semNum) ? 1 : semNum;
  };

  let best = null;
  let minIdx = Infinity;

  (plan.years || []).forEach((y) => {
    (y.semesters || []).forEach((s) => {
      const hasCourses = Array.isArray(s.courses) && s.courses.length > 0;
      if (!hasCourses || s.isGap) return;

      const semNum = extractSemesterNumber(s.name);
      const idx = semesterIndex(y.year, semNum);

      if (idx < minIdx) {
        minIdx = idx;
        best = { year: y.year, semester: semNum };
      }
    });
  });

  return best;
};

export const isPlanStartingBefore = (planPoint, startPoint) => {
  const idx = (p) => (Number(p.year) - 1) * 2 + (Number(p.semester) - 1);
  if (!planPoint) return false;
  return idx(planPoint) < idx(startPoint);
};
