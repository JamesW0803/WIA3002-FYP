export const validateCourseCode = (
  code,
  courses = [],
  addCourse = false,
  currentCode = null,
) => {
  if (!code) return "Course code is required";

  if(!addCourse){
    courses = courses.filter(c => c.course_code !== currentCode);
  }

  // Detect lowercase letters
  if (/[a-z]/.test(code)) {
    return "Course code letters must be uppercase (e.g. WIA1001)";
  }

  // Format: ABC1234
  const pattern = /^[A-Z]{3}\d{4}$/;
  if (!pattern.test(code)) {
    return "Course code must be 3 letters followed by 4 digits (e.g. WIA1001)";
  }

  if ( 
    courses.some(
      (c) => c.course_code === code
    )
  ) {
    return "Course code already exists";
  }

  return "";
};

export const validateCourseName = (
  courseName,
  courses = [],
  addCourse = false,
  currentCode
) => {
  if (!courseName) return "Course Name is required";

  if(!addCourse){
    courses = courses.filter(c => c.course_code !== currentCode);
  }

  if (
    courses.some(
      (c) => c.course_name === courseName
    )
  ) {
    return "Course name already exists";
  }

  return "";
};

export const validateCreditHours = (
  creditHours,
  courses = [],
  addCourse = false
) => {
  if (!creditHours) return "Credit Hours is required";

  return "";
};

export const validateCourseType = (
  courseType,
  courses = [],
  addCourse = false
) => {
  if (!courseType) return "Course Type is required";

  return "";
};

export const validateProgrammeCode = (code, programmes = [], addProgramme = false, currentProgrammeCode = null) => {
  if (!code) return "Programme code is required";

  if(!addProgramme){
    programmes = programmes.filter(p => p.programme_code !== currentProgrammeCode);
  }

  // Unique check
  if (programmes.some((p) => p.programme_code === code)) {
    return "Programme code already exists";
  }

  return "";
};

export const validateProgrammeName = (name, programmes = [], addProgramme = false, currentProgrammeCode = null) => {
  if (!name) return "Programme name is required";
  if(!addProgramme){
    programmes = programmes.filter(p => p.programme_code !== currentProgrammeCode);
  }

  // Unique check
  if (programmes.some((p) => p.programme_name === name)) {
    return "Programme name already exists";
  }

  return "";
};

export const validateIntakeProgramme = (name, intakes) => {
  if (!name) return "Programme  is required";

  return "";
};

export const validateIntakeSession = (session, intakes = []) => {
  if (!session) return "Session is required";

  return "";
};


export const validateIntakeCode = (code, intakes = [], addIntake = false, currentIntakeCode = null) => {

  if(!addIntake){
    intakes = intakes.filter(i => i.programme_intake_code !== currentIntakeCode);
  }

  // Unique check
  if (intakes.some((intake) => intake.programme_intake_code === code)) {
    return "A programme intake for this programme and session already exists";
  }

  return "";
};
