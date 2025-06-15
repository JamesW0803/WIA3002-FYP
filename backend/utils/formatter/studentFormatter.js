const { PROGRESS_STATUS } = require("../../constants/progressStatus");
const AcademicSession = require("../../models/AcademicSession");

const formatStudents = async (students) => {
    const formattedStudents = await Promise.all(
        students.map(async (student) => {
            return await formatStudent(student);
        })
    );
    return formattedStudents;
};


const formatStudent = async (student) => {
    const programme = student.programme ? student.programme : "-";
    const department = programme.department ?? "-"
    const faculty = programme.faculty ?? "-"
    
    const currentSession = await getCurrentAcademicSession();
    const programme_intake = student.programme_intake
 
    return {
        username : student.username ?? "-",
        programme_name : programme.programme_name ?? "-",
        department: department,
        faculty: faculty,

        currentSemester : student.currentSemester ?? "-",
        expectedGraduation : student.expectedGraduation ?? "-",
        progress : student.progress ?? 0,
        status : student.status ?? PROGRESS_STATUS.UNKNOWN ,
        programme_intake
    }
}


const getCurrentAcademicSession = async () => {
  const currentSession = await AcademicSession.findOne({ isCurrent: true });
  if (!currentSession) {
    throw new Error("No current academic session found");
  }
  return currentSession;
};

module.exports = {
    formatStudents,
    formatStudent
};