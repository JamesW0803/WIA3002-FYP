const formatProgrammeIntakes = (programmeIntakes) => {
  const formattedProgrammeIntakes = programmeIntakes.map((programmeIntake) => {
    return formatProgrammeIntake(programmeIntake);
  });

  return formattedProgrammeIntakes;
};

const formatProgrammeIntake = (programmeIntake) => {
  return {
    _id: programmeIntake._id,
    programme_intake_code: programmeIntake.programme_intake_code,
    programme_name: programmeIntake.programme_id?.programme_name ?? null,
    academic_session_id: programmeIntake.academic_session_id?._id ?? null,
    academic_session: programmeIntake.academic_session_id ?? null,
    year: programmeIntake.academic_session_id?.year ?? null,
    semester: programmeIntake.academic_session_id?.semester ?? null,
    department: programmeIntake.programme_id?.department ?? null,
    faculty: programmeIntake.programme_id?.faculty ?? null,
    min_semester: programmeIntake.min_semester,
    max_semester: programmeIntake.max_semester,
    number_of_students_enrolled: programmeIntake.number_of_students_enrolled,
    number_of_students_graduated: programmeIntake.number_of_students_graduated,
    graduation_rate: programmeIntake.graduation_rate,
    total_credit_hours: programmeIntake.total_credit_hours,

    createdAt: programmeIntake.createdAt,
    updatedAt: programmeIntake.updatedAt,

    // Flatten programme_id
    programme_id: programmeIntake.programme_id?._id ?? null,
    programme_code: programmeIntake.programme_id?.programme_code ?? null,

    graduation_requirements: programmeIntake.graduation_requirements,
    programme_plan: programmeIntake.programme_plan,
  };
};

const generateProgrammeIntakeCode = (programme, year, semester) => {
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

module.exports = {
  formatProgrammeIntakes,
  formatProgrammeIntake,
  generateProgrammeIntakeCode
};
