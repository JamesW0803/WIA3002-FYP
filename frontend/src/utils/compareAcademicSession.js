export const compareAcademicSessions = (target, current) => {
  if (!target || !current) {
    throw new Error("Both target and current academic sessions are required");
  }

  const getStartYear = (yearStr) => {
    // "2024/2025" -> 2024
    return parseInt(yearStr.split("/")[0], 10);
  };

  const semesterOrder = {
    // adjust if ALL_SEMESTERS order changes
    "Semester 1": 1,
    "Semester 2": 2,
  };

  const targetYear = getStartYear(target.year);
  const currentYear = getStartYear(current.year);

  // 1️⃣ Compare by year
  if (targetYear > currentYear) {
    return { isAfter: true, isBefore: false, isSame: false };
  }

  if (targetYear < currentYear) {
    return { isAfter: false, isBefore: true, isSame: false };
  }

  // 2️⃣ Same year → compare semester
  const targetSemesterOrder = semesterOrder[target.semester];
  const currentSemesterOrder = semesterOrder[current.semester];

  if (targetSemesterOrder > currentSemesterOrder) {
    return { isAfter: true, isBefore: false, isSame: false };
  }

  if (targetSemesterOrder < currentSemesterOrder) {
    return { isAfter: false, isBefore: true, isSame: false };
  }

  // 3️⃣ Exactly the same session
  return { isAfter: false, isBefore: false, isSame: true };
};
