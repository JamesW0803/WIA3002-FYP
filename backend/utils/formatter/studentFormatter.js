const { PROGRESS_STATUS } = require("../../constants/progressStatus");
const AcademicSession = require("../../models/AcademicSession");
const ProgrammeIntake = require("../../models/ProgrammeIntake");
const StudentAcademicProfile = require("../../models/StudentAcademicProfile");
const Course = require("../../models/Course");

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
    
    const currentAcademicSession = await getCurrentAcademicSession();
    const academicSessionEnrolled = await AcademicSession.findById(student.academicSession);
    const programmeIntake = await ProgrammeIntake.findOne({
        programme_id: student.programme._id,
        academic_session_id: academicSessionEnrolled._id
    });
    const studentAcademicProfile = await StudentAcademicProfile.findOne({ student: student._id });
    const expectedGraduationSession = await getExpectedGraduation(programmeIntake) ?? "-";
    const studentProgress = await calculateStudentProgress( programmeIntake , studentAcademicProfile ) ?? 0;
 
    return {
        username : student.username ?? "-",
        programme_name : programme.programme_name ?? "-",
        department: department,
        faculty: faculty,

        currentSemester : await getStudentCurrentSemester(academicSessionEnrolled, currentAcademicSession) ?? "-",
        expectedGraduation : expectedGraduationSession ? (expectedGraduationSession.year).substring(5) : "-",
        progress : studentProgress.percentage,
        status : studentProgress.status ,
        programme_intake_id : programmeIntake ? programmeIntake._id : null
    }
}

const getStudentCurrentSemester = async ( academicSessionEnrolled, currentAcademicSession ) => {
    let semesters = 1;
    let hold = academicSessionEnrolled;

    while (hold._id.toString() !== currentAcademicSession._id.toString()){
        semesters +=1;
        const nextSession = await AcademicSession.findById(hold.next);
        hold = nextSession;
    }

    const year = Math.ceil(semesters / 2);
    const semester = semesters % 2 === 0 ? 2 : 1;

    return "Year " + year + " Semester " + semester;
}

const getExpectedGraduation = async ( programmeIntake ) => {
    const minSemester = programmeIntake ? programmeIntake.min_semester : 0;

    let expectedGraduationSession = await AcademicSession.findById(programmeIntake.academic_session_id);
    for(let i=1; i< minSemester; i++){
        if(expectedGraduationSession.next == null){
            break;
        }
        expectedGraduationSession = await AcademicSession.findById(expectedGraduationSession.next) ;
    };

    return expectedGraduationSession;

}

const calculateStudentProgress = async ( programmeIntake , studentAcademicProfile ) => {
    const graduation_requirements = programmeIntake.graduation_requirements;
    const min_semester = programmeIntake.min_semester;
    const max_semester = programmeIntake.max_semester;
    const currentAcademicSession = await getCurrentAcademicSession();
    let required_credits = 0;
    let completed_credits = 0;
    let progressPercentage = 0;
    let semesters_passed = 0;
    let hold = await AcademicSession.findById(programmeIntake.academic_session_id);
    let status = PROGRESS_STATUS.UNKNOWN;
    
    for (const course_id of graduation_requirements) {
        const course = await Course.findById(course_id);
        required_credits += course.credit_hours;
    }

    if(studentAcademicProfile && studentAcademicProfile.entries){
        for(const completedCourseObj of studentAcademicProfile.entries){
            const course = await Course.findById(completedCourseObj.course);
            if(completedCourseObj.status === "Passed"){ // current condition didnt check if a student passed a course multiple times
                completed_credits += course.credit_hours;
            }
        }
    }

    while (hold._id.toString() !== currentAcademicSession._id.toString()){
        semesters_passed +=1;
        const nextSession = await AcademicSession.findById(hold.next);
        hold = nextSession;
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
    formatStudent
};