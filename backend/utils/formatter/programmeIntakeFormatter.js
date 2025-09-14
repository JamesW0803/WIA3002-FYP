
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
      year: programmeIntake.academic_session_id?.year ?? null,
      semester: programmeIntake.academic_session_id?.semester ?? null,
      department: programmeIntake.programme_id?.department ?? null,
      faculty: programmeIntake.programme_id?.faculty ?? null,
      min_semester: programmeIntake.min_semester,
      max_semester: programmeIntake.max_semester,
      number_of_students_enrolled: programmeIntake.number_of_students_enrolled,
      graduation_rate: programmeIntake.graduation_rate,

      createdAt: programmeIntake.createdAt,
      updatedAt: programmeIntake.updatedAt,

      // Flatten programme_id
      programme_id: programmeIntake.programme_id?._id ?? null,
      programme_code: programmeIntake.programme_id?.programme_code ?? null,


      // Optionally include academic_session_id as well
      academic_session_id: programmeIntake.academic_session_id?._id ?? null,

      graduation_requirements : programmeIntake.graduation_requirements,
      programme_plan : programmeIntake.programme_plan
  };
};

module.exports = {
  formatProgrammeIntakes,
  formatProgrammeIntake,
};
