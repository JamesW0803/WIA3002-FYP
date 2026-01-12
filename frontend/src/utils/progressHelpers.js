//for testing purpose, adapted from ProgressTracker.jsx
export const getEffectiveType = (course, programme) => {
  if (!course) return null;

  const typesConfig = course.typesByProgramme;

  // Rule: If overrides exist, we MUST find a match or return null (no fallback)
  if (Array.isArray(typesConfig) && typesConfig.length > 0) {
    if (!programme?.id && !programme?.code && !programme?.name) return null;

    const match = typesConfig.find((cfg) => {
      const p = cfg.programme;
      const pId = p?._id ?? p;
      const pCode = p?.programme_code ?? p;
      const pName = p?.programme_name ?? p;

      return (
        (programme?.id && String(pId) === String(programme.id)) ||
        (programme?.code && String(pCode) === String(programme.code)) ||
        (programme?.name && String(pName) === String(programme.name))
      );
    });

    return match?.type ?? null;
  }

  // Default fallback if no overrides are defined
  return course.type ?? null;
};

/**
 * TC-STU-CP-09: Logic to calculate progress percentage
 */
export const calculateProgress = (creditsEarned, totalCreditsRequired) => {
  if (!totalCreditsRequired || totalCreditsRequired === 0) return 0;

  const percentage = (creditsEarned / totalCreditsRequired) * 100;
  return Math.round(percentage);
};

/**
 * TC-STU-CP-09: Logic to sum earned credits from entries
 */
export const calculateEarnedCredits = (entries, coursesMap) => {
  return entries.reduce((acc, entry) => {
    if (entry.status !== "Passed") return acc;
    const code = entry.course?.course_code || entry.course?.code;
    return acc + (coursesMap[code] || 0);
  }, 0);
};
