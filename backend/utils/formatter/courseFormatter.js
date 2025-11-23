const { READABLE_COURSE_TYPES } = require("../../constants/courseType");

const formatCourses = (courses) => {
  const formattedCourses = courses.map((course) => {
    return formatCourse(course);
  });

  return formattedCourses;
};

const formatCourse = (course) => {
  return {
    _id: course._id ?? "-",
    course_code: course.course_code ?? "-",
    course_name: course.course_name ?? "-",
    type: course.type ?? "-",
    credit_hours: course.credit_hours ?? "-",
    description: course.description ?? "-",
    prerequisites: course.prerequisites ?? [],
    faculty: course.faculty ?? "-",
    department: course.department ?? "-",
    offered_semester: course.offered_semester ?? "-",
    study_level: course.study_level ?? "-",
  };
};

module.exports = {
  formatCourses,
  formatCourse,
};
