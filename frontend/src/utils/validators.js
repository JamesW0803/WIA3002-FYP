export const validateCourseCode = (
  code,
  courses = [],
) => {
  if (!code) return "Course code is required";

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
) => {
  if (!courseName) return "Course Name is required";

  if (
    courses.some(
      (c) => c.course_name === courseName
    )
  ) {
    return "Course name already exists";
  }

  return "";
};

export const validateProgrammeCode = (code, programmes = []) => {
  if (!code) return "Programme code is required";

  // Unique check
  if (programmes.some((p) => p.programme_code === code)) {
    return "Programme code already exists";
  }

  return "";
};

export const validateProgrammeName = (name, programmes = []) => {
  if (!name) return "Programme name is required";

  // Unique check
  if (programmes.some((p) => p.programme_name === name)) {
    return "Programme name already exists";
  }

  return "";
};
