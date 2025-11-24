export const generateProgrammeIntakeCode = (programme, year, semester) => {
  // Split year from "2023/2024" to "23" and "24"
  const [startYear, endYear] = year.split("/").map((y) => y.slice(-2)); // ["23", "24"]

  // Convert semester to short form
  const semesterMap = {
    "Semester 1": "S1",
    "Semester 2": "S2",
    "Special Semester": "SS",
  };
  const shortSemester =
    semesterMap[semester] || semester.replace(/\s+/g, "").toUpperCase(); // fallback

  const programmeIntakeCode = `${programme.programme_code}-${startYear}-${endYear}-${shortSemester}`;
  return programmeIntakeCode;
};

