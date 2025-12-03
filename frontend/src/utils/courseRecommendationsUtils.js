export const SPECIALIZATION_PREFIX = "SPECIALIZATION_";
export const SHE4_CODE = "SHE4444";
export const KIAR_CODE = "GQX0056";

export const isOfferedInSemester = (course, semNum) => {
  const arr = course?.offered_semester;
  if (!Array.isArray(arr) || arr.length === 0) return true;
  return arr.includes(`Semester ${semNum}`);
};

export const getPassedCodes = (entries) => {
  const s = new Set();
  for (const e of entries || []) {
    if (e.status === "Passed" && e.course?.course_code) {
      s.add(e.course.course_code);
    }
  }
  return s;
};

export const countSpecializationSlots = (mapping) =>
  Object.values(mapping).reduce(
    (acc, sems) =>
      acc +
      Object.values(sems)
        .flat()
        .filter((c) => String(c).startsWith(SPECIALIZATION_PREFIX)).length,
    0
  );

export const flattenDefaultToYS = (mapping) => {
  const out = {};
  Object.entries(mapping || {}).forEach(([year, sems]) => {
    const y = +year.replace("Year ", "");
    Object.entries(sems).forEach(([semName, codes]) => {
      const s = +semName.replace("Semester ", "");
      out[`Y${y}S${s}`] = codes.slice();
    });
  });
  return out;
};

export const getEffectiveTypeForProgrammeClient = (
  course,
  programmeCode,
  programmeId,
  studentDepartment
) => {
  if (!course) return null;

  const rawType = course.type;
  const dept = course.department || null;
  const configs = Array.isArray(course.typesByProgramme)
    ? course.typesByProgramme
    : [];

  const isKnownDepartment =
    dept && dept !== "Unknown" && dept !== "N/A" && dept !== "NA";

  const programmeIdStr = programmeId ? String(programmeId) : null;

  const matchesStudentProgramme = (cfg) => {
    if (!cfg || !cfg.programme) return false;
    const p = cfg.programme;

    // CASE 1: programme is an ObjectId or already a string
    if (typeof p === "string" || typeof p === "number") {
      if (programmeIdStr && String(p) === programmeIdStr) return true;
    }

    // CASE 2: programme is a populated object { _id, programme_code, ... }
    if (typeof p === "object") {
      if (programmeIdStr && p._id && String(p._id) === programmeIdStr) {
        return true;
      }
      if (programmeCode && p.programme_code === programmeCode) {
        return true;
      }
    }

    return false;
  };

  const cfgForStudent = configs.find(matchesStudentProgramme) || null;

  // -------- PROGRAMME ELECTIVES ONLY (your rules) --------
  if (rawType === "programme_elective") {
    // CASE A: department known → only that department can see it as an elective
    if (isKnownDepartment) {
      if (studentDepartment && studentDepartment === dept) {
        return "programme_elective";
      }
      return "non_elective_for_this_programme";
    }

    // CASE B: department unknown → only listed programmes see it as elective
    if (!cfgForStudent || cfgForStudent.type !== "programme_elective") {
      return "non_elective_for_this_programme";
    }
    return "programme_elective";
  }

  // -------- Other course types (core, uni, etc.) --------
  if (cfgForStudent && cfgForStudent.type && cfgForStudent.type !== rawType) {
    return cfgForStudent.type;
  }

  return rawType;
};

export const isFollowingDefaultSoFar = (
  entries,
  allCourses,
  mapping,
  { programmeCode, programmeId, studentDepartment } = {}
) => {
  if (!entries?.length) return true;
  if (!mapping || !Object.keys(mapping).length) return true;

  const defaultYS = flattenDefaultToYS(mapping);
  const takenByYS = {};
  const typeByCode = new Map(
    allCourses.map((c) => [
      c.course_code,
      getEffectiveTypeForProgrammeClient(
        c,
        programmeCode,
        programmeId,
        studentDepartment
      ),
    ])
  );

  for (const e of entries) {
    const code = e.course?.course_code;
    if (!code || !e.year || !e.semester) continue;
    const k = `Y${e.year}S${e.semester}`;
    if (!takenByYS[k]) takenByYS[k] = [];
    takenByYS[k].push(code);
  }

  for (const [ys, takenList] of Object.entries(takenByYS)) {
    const expected = (defaultYS[ys] || []).slice();
    const expectedSet = new Set(
      expected.filter((c) => !String(c).startsWith(SPECIALIZATION_PREFIX))
    );
    const specCount = expected.filter((c) =>
      String(c).startsWith(SPECIALIZATION_PREFIX)
    ).length;

    let studentElectives = 0;
    for (const code of takenList) {
      if (typeByCode.get(code) === "programme_elective") studentElectives++;
    }

    const takenSet = new Set(
      takenList.filter((c) => typeByCode.get(c) !== "programme_elective")
    );

    for (const need of expectedSet) {
      if (!takenSet.has(need)) return false;
    }
    if (studentElectives < specCount) return false;
    for (const code of takenSet) {
      if (!expectedSet.has(code)) return false;
    }
  }
  return true;
};

export const getDefaultPlanAlignment = (
  entries,
  allCourses,
  mapping,
  { programmeCode, programmeId, studentDepartment } = {}
) => {
  const result = {
    followsDefault: true,
    divergences: [],
  };

  if (!entries?.length) return result;
  if (!mapping || !Object.keys(mapping).length) return result;

  const defaultYS = flattenDefaultToYS(mapping);
  const takenByYS = {};
  const typeByCode = new Map(
    allCourses.map((c) => [
      c.course_code,
      getEffectiveTypeForProgrammeClient(
        c,
        programmeCode,
        programmeId,
        studentDepartment
      ),
    ])
  );

  // group taken courses by Y/S
  for (const e of entries) {
    const code = e.course?.course_code;
    if (!code || !e.year || !e.semester) continue;
    const k = `Y${e.year}S${e.semester}`;
    if (!takenByYS[k]) takenByYS[k] = [];
    takenByYS[k].push(code);
  }

  for (const [ys, takenList] of Object.entries(takenByYS)) {
    const expected = (defaultYS[ys] || []).slice();

    const expectedNonElectives = expected.filter(
      (c) => !String(c).startsWith(SPECIALIZATION_PREFIX)
    );
    const expectedSet = new Set(expectedNonElectives);

    const expectedSpecCount = expected.filter((c) =>
      String(c).startsWith(SPECIALIZATION_PREFIX)
    ).length;

    let takenSpecCount = 0;
    for (const code of takenList) {
      if (typeByCode.get(code) === "programme_elective") takenSpecCount++;
    }

    const takenNonElectives = takenList.filter(
      (c) => typeByCode.get(c) !== "programme_elective"
    );
    const takenSet = new Set(takenNonElectives);

    const missing = expectedNonElectives.filter((c) => !takenSet.has(c));
    const extra = takenNonElectives.filter((c) => !expectedSet.has(c));

    const specShortfall = expectedSpecCount - takenSpecCount;

    if (missing.length || extra.length || specShortfall > 0) {
      result.followsDefault = false;
      result.divergences.push({
        ys,
        missing,
        extra,
        expectedNonElectives,
        takenNonElectives,
        expectedSpecCount,
        takenSpecCount,
        specShortfall,
      });
    }
  }

  return result;
};

export const kiarSheLabel = (code, passedSet) => {
  const tookSHE4 = passedSet.has(SHE4_CODE);
  const tookKIAR = passedSet.has(KIAR_CODE);
  const isKIAR = code === KIAR_CODE;
  const isSHE4 = code === SHE4_CODE;
  if ((isKIAR || isSHE4) && !(tookSHE4 || tookKIAR)) {
    return `${isKIAR ? "GQX0056 (KIAR)" : "SHE4444 (SHE Cluster 4)"} OR ${
      isKIAR ? "SHE4444 (SHE Cluster 4)" : "GQX0056 (KIAR)"
    }`;
  }
  return null;
};

export const getCourseDepartment = (course) => {
  const rawDept = course?.department || null;

  // 1) If we already have a concrete department, trust it.
  if (
    rawDept &&
    rawDept !== "Unknown" &&
    rawDept !== "N/A" &&
    rawDept !== "NA"
  ) {
    return rawDept;
  }

  // 2) Department is missing / 'Unknown' → try to infer from `typesByProgramme`.
  const cfgs = Array.isArray(course?.typesByProgramme)
    ? course.typesByProgramme
    : [];

  if (cfgs.length > 0) {
    for (const cfg of cfgs) {
      const prog = cfg?.programme;
      if (prog && typeof prog === "object") {
        const inferredDept =
          prog.department ||
          prog.department_name ||
          prog.dept ||
          prog.deptName ||
          null;

        if (inferredDept) {
          return inferredDept;
        }
      }
    }
  }

  // 3) Still nothing → treat as no department (shared / truly global).
  return null;
};
