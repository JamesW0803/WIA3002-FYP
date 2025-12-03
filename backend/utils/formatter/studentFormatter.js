const { PROGRESS_STATUS } = require("../../constants/progressStatus");
const AcademicSession = require("../../models/AcademicSession");
const ProgrammeIntake = require("../../models/ProgrammeIntake");
const StudentAcademicProfile = require("../../models/StudentAcademicProfile");

const formatStudents = async (students) => {
  const [sessions, programmeIntakes, profiles, currentAcademicSession] =
    await Promise.all([
      AcademicSession.find(),
      ProgrammeIntake.find(),
      StudentAcademicProfile.find(),
      getCurrentAcademicSession(),
    ]);

  const sessionMap = Object.fromEntries(
    sessions.map((s) => [s._id.toString(), s])
  );
  const intakeMap = Object.fromEntries(
    programmeIntakes.map((i) => [
      `${i.programme_id}_${i.academic_session_id}`,
      i,
    ])
  );
  const profileMap = Object.fromEntries(
    profiles.map((p) => [p.student.toString(), p])
  );

  const formattedStudents = await Promise.all(
    students.map((student) =>
      formatStudent(student, {
        sessionMap,
        intakeMap,
        profileMap,
        currentAcademicSession,
      })
    )
  );
  return formattedStudents;
};

const formatStudent = async (
  student,
  { sessionMap, intakeMap, profileMap, currentAcademicSession }
) => {
  const programme = student.programme ? student.programme : "-";
  const department = programme.department ?? "-";
  const faculty = programme.faculty ?? "-";

  const academicSessionEnrolled =
    sessionMap[student.academicSession?.toString()];
  const programmeIntake =
    intakeMap[`${student.programme._id}_${student.academicSession}`];
  const studentAcademicProfile = profileMap[student._id.toString()];
  const expectedGraduationSession =
    getExpectedGraduation(programmeIntake, sessionMap) ?? null;

  let expectedGraduation = "-";
  if (expectedGraduationSession && expectedGraduationSession.year) {
    const yearStr = expectedGraduationSession.year.toString();
    // only substring if it's long enough
    expectedGraduation = yearStr.length > 5 ? yearStr.substring(5) : yearStr;
  }

  return {
    _id: student._id,
    username: student.username ?? "-",
    matric_no: student.matricNo ?? "-",
    programme_name: programme.programme_name ?? "-",
    department: department,
    faculty: faculty,
    is_graduated: student.isGraduated ? student.isGraduated : false,

    intakeSession: academicSessionEnrolled
      ? `${academicSessionEnrolled.year} ${academicSessionEnrolled.semester}`
      : "-",
    currentSemester:
      getStudentCurrentSemester(
        academicSessionEnrolled,
        currentAcademicSession,
        sessionMap
      ) ?? "-",
    expectedGraduation,
    progress: calculateStudentProgressPercentage(
      studentAcademicProfile?.completed_credit_hours ?? 0,
      programmeIntake?.total_credit_hours ?? 0
    ),
    status: {
      status: student.status,
      status_notes: student.status_notes,
    },
    programme_intake_id: programmeIntake ? programmeIntake._id : null,
    role: student.role ?? "-",
    profilePicture: student.profilePicture ?? "-",
    profileColor: student.profileColor ?? "-",
    email: student.email ?? "-",
  };
};

const getStudentCurrentSemester = (
  academicSessionEnrolled,
  currentAcademicSession,
  sessionMap
) => {
  if (!academicSessionEnrolled || !currentAcademicSession) return "-";

  let semesters = 1;
  let hold = academicSessionEnrolled;

  while (hold._id.toString() !== currentAcademicSession._id.toString()) {
    semesters += 1;
    hold = sessionMap ? sessionMap[hold.next.toString()] : null;
    if (hold == null) {
      break;
    }
  }

  const year = Math.ceil(semesters / 2);
  const semester = semesters % 2 === 0 ? 2 : 1;

  return "Year " + year + " Semester " + semester;
};

const getExpectedGraduation = (programmeIntake, sessionMap) => {
  if (!programmeIntake) return null;

  const minSemester = programmeIntake.min_semester || 0;

  let expectedGraduationSession =
    sessionMap[programmeIntake.academic_session_id?.toString()];
  if (!expectedGraduationSession) return null;

  for (let i = 1; i < minSemester; i++) {
    if (expectedGraduationSession.next == null) {
      break;
    }
    expectedGraduationSession =
      sessionMap[expectedGraduationSession.next.toString()];
    if (!expectedGraduationSession) break;
  }

  return expectedGraduationSession;
};

const calculateStudentProgressPercentage = (
  completed_credit_hours,
  total_required_credit_hours
) => {
  if (!total_required_credit_hours || total_required_credit_hours <= 0) {
    return 0;
  }
  const percentage =
    (completed_credit_hours / total_required_credit_hours) * 100;
  return percentage.toFixed(2);
};

//current status calculation didnt include current semester registered courses
const computeStudentStatus = (
  min_semester,
  max_semester,
  semesters_passed,
  remaining_credit_hours
) => {
  let status = PROGRESS_STATUS.UNKNOWN;
  const status_notes = [];
  const remaining_On_Track_Semesters = min_semester - semesters_passed;
  const remaining_Delayed_Semesters = max_semester - semesters_passed;

  if (remaining_On_Track_Semesters * 21 >= remaining_credit_hours) {
    // student graduate as planned in the proramme intake
    status = PROGRESS_STATUS.ON_TRACK;
  } else if (remaining_Delayed_Semesters * 21 >= remaining_credit_hours) {
    // student graduate later than planned in the proramme intake but still within max semester
    status = PROGRESS_STATUS.DELAYED;
    status_notes.push(
      "Student graduate later than planned in the proramme intake but still within max semester"
    );
  } else {
    // student unable to graduate within max semester, need intervention
    status = PROGRESS_STATUS.AT_RISK;
    status_notes.push(
      "Student unable to graduate within max semester, need intervention"
    );
  }

  return { status, status_notes };
};

const getProgressStatus = async (programmeIntake, academicProfile) => {
  if (!programmeIntake) {
    return {
      status: PROGRESS_STATUS.UNKNOWN,
      status_notes: [
        "No programme intake found for this student; progress cannot be computed yet.",
      ],
    };
  }

  const currentAcademicSession = await getCurrentAcademicSession();
  const sessions = await AcademicSession.find();
  const sessionMap = Object.fromEntries(
    sessions.map((s) => [s._id.toString(), s])
  );

  const {
    min_semester,
    max_semester,
    total_credit_hours,
    academic_session_id,
  } = programmeIntake;

  if (!academic_session_id || !min_semester || !max_semester) {
    return {
      status: PROGRESS_STATUS.UNKNOWN,
      status_notes: [
        "Programme intake is missing min/max semester or academic session; progress cannot be computed.",
      ],
    };
  }

  const required_credits = total_credit_hours || 0;
  const completed_credits = academicProfile?.completed_credit_hours || 0;

  let semesters_passed = 0;
  let hold = sessionMap[academic_session_id.toString()];

  if (!hold) {
    return {
      status: PROGRESS_STATUS.UNKNOWN,
      status_notes: [
        "Starting academic session for this intake is not found; progress cannot be computed.",
      ],
    };
  }

  while (
    hold &&
    hold._id.toString() !== currentAcademicSession._id.toString()
  ) {
    semesters_passed += 1;
    hold = hold.next ? sessionMap[hold.next.toString()] : null;
  }

  const statusObj = computeStudentStatus(
    min_semester,
    max_semester,
    semesters_passed,
    required_credits - completed_credits
  );

  return { status: statusObj.status, status_notes: statusObj.status_notes };
};

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
  getCurrentAcademicSession,
  getProgressStatus,
};
