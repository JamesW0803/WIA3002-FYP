const { PROGRESS_STATUS } = require("../../constants/progressStatus");

const formatStudents = (students) => {
    const formattedStudents = students.map( (student) => {
        return formatStudent(student)
    })

    return formattedStudents;
}

const formatStudent = (student) => {
    const programme = student.programme ? student.programme : "-";
    return {
        username : student.username ?? "-",
        programme : programme.programme_name ?? "-",
        currentSemester : student.currentSemester ?? "-",
        expectedGraduation : student.expectedGraduation ?? "-",
        progress : student.progress ?? 0,
        status : student.status ?? PROGRESS_STATUS.UNKNOWN ,
    }
}

module.exports = {
    formatStudents,
    formatStudent
};