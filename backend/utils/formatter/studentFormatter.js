const { PROGRESS_STATUS } = require("../../constants/progressStatus");
const AcademicSession = require("../../models/AcademicSession");
const ProgrammeIntake = require("../../models/ProgrammeIntake");
const StudentAcademicProfile = require("../../models/StudentAcademicProfile");

const formatStudents = async (students) => {
    const [ sessions, programmeIntakes, profiles, currentAcademicSession] = await Promise.all([
        AcademicSession.find(),
        ProgrammeIntake.find(),
        StudentAcademicProfile.find(),
        getCurrentAcademicSession()
    ]);

    const sessionMap = Object.fromEntries(sessions.map(s => [s._id.toString(), s]));
    const intakeMap = Object.fromEntries(
      programmeIntakes.map(i => [`${i.programme_id}_${i.academic_session_id}`, i])
    );
    const profileMap = Object.fromEntries(profiles.map(p => [p.student.toString(), p]));

    const formattedStudents = await Promise.all(
        students.map( student => formatStudent(student, {
            sessionMap,
            intakeMap,
            profileMap,
            currentAcademicSession
        }) )
    );
    return formattedStudents;
};


const formatStudent = async (student, {
    sessionMap,
    intakeMap,
    profileMap,
    currentAcademicSession
}) => {
    const programme = student.programme ? student.programme : "-";
    const department = programme.department ?? "-"
    const faculty = programme.faculty ?? "-"
    
    const academicSessionEnrolled = sessionMap[student.academicSession?.toString()];
    const programmeIntake = intakeMap[`${student.programme._id}_${student.academicSession}`];
    const studentAcademicProfile = profileMap[student._id.toString()];
    const expectedGraduationSession = getExpectedGraduation(programmeIntake, sessionMap) ?? "-";
    const studentProgress = calculateStudentProgress( programmeIntake , studentAcademicProfile, sessionMap, currentAcademicSession) ?? 0;
 
    return {
        _id: student._id,
        username : student.username ?? "-",
        programme_name : programme.programme_name ?? "-",
        department: department,
        faculty: faculty,
        is_graduated : student.isGraduated? student.isGraduated : false,

        intakeSession : `${academicSessionEnrolled.year} ${academicSessionEnrolled.semester}`,
        currentSemester : getStudentCurrentSemester(academicSessionEnrolled, currentAcademicSession, sessionMap) ?? "-",
        expectedGraduation : expectedGraduationSession ? (expectedGraduationSession.year).substring(5) : "-",
        progress : studentProgress.percentage,
        status : studentProgress.status ,
        programme_intake_id : programmeIntake ? programmeIntake._id : null
    }
}

const getStudentCurrentSemester = ( academicSessionEnrolled, currentAcademicSession, sessionMap) => {
    if (!academicSessionEnrolled || !currentAcademicSession) return "-";

    let semesters = 1;
    let hold = academicSessionEnrolled;

    while (hold._id.toString() !== currentAcademicSession._id.toString()){
        semesters +=1;
        hold = sessionMap ? sessionMap[hold.next.toString()] : null;
        if( hold == null){
            break;
        }
    }

    const year = Math.ceil(semesters / 2);
    const semester = semesters % 2 === 0 ? 2 : 1;

    return "Year " + year + " Semester " + semester;
}

const getExpectedGraduation = ( programmeIntake , sessionMap) => {
    const minSemester = programmeIntake ? programmeIntake.min_semester : 0;

    let expectedGraduationSession = sessionMap[programmeIntake.academic_session_id.toString()];
    for(let i=1; i< minSemester; i++){
        if(expectedGraduationSession.next == null){
            break;
        }
        expectedGraduationSession = sessionMap[expectedGraduationSession.next.toString()];
    };

    return expectedGraduationSession;

}

const calculateStudentProgress = ( programmeIntake , studentAcademicProfile, sessionMap, currentAcademicSession ) => {
    const min_semester = programmeIntake.min_semester;
    const max_semester = programmeIntake.max_semester;
    const required_credits = programmeIntake.total_credit_hours;
    const completed_credits = studentAcademicProfile?.completed_credit_hours || 0;

    let progressPercentage = 0;
    let semesters_passed = 0;
    let hold = sessionMap[programmeIntake.academic_session_id.toString()];
    let status = PROGRESS_STATUS.UNKNOWN;
    
    while (hold._id.toString() !== currentAcademicSession._id.toString()){
        semesters_passed +=1;
        hold = sessionMap[hold.next.toString()];
        if (!hold) break;
    }

    progressPercentage = ((completed_credits / required_credits) * 100).toFixed(2);
    status = calculateStudentStatus( min_semester, max_semester, semesters_passed, required_credits - completed_credits );

    return { percentage : progressPercentage , status };
}

//current status calculation didnt include current semester registered courses
const calculateStudentStatus = ( min_semester, max_semester, semesters_passed, remaining_credit_hours ) => {
    const remaining_On_Track_Semesters = min_semester - semesters_passed;
    const remaining_Delayed_Semesters = max_semester - semesters_passed;

    if( remaining_On_Track_Semesters * 21 >= remaining_credit_hours ){
        return PROGRESS_STATUS.ON_TRACK; // student graduate as planned in the proramme intake
    }else if( remaining_Delayed_Semesters * 21 >= remaining_credit_hours ){
        return PROGRESS_STATUS.DELAYED; // student graduate later than planned in the proramme intake but still within max semester
    }else{
        return PROGRESS_STATUS.AT_RISK; // student unable to graduate within max semester, need intervention
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
    formatStudent,
    getCurrentAcademicSession
};