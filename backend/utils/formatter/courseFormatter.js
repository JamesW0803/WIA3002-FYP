const { READABLE_COURSE_TYPES } = require("../../constants/courseType");

const formatCourses = (courses) => {
    const formattedCourses = courses.map( (course) => {
        return formatCourse(course)
    })

    return formattedCourses;
}

const formatCourse = (course) => {
    return {
        course_code : course.course_code ?? "-",
        course_name : course.course_name ?? "-",
        type : READABLE_COURSE_TYPES[course.type] ?? READABLE_COURSE_TYPES.UNKNOWN,
        credit_hours : course.credit_hours ?? "-",
        description : course.description ?? "-",
        prerequisites : course.prerequisites ?? [],
        faculty : course.faculty ?? "-",
        department : course.department ?? "-",
        offered_semester : course.offered_semester ?? "-"
    }
}

module.exports = {
    formatCourses,
    formatCourse
};