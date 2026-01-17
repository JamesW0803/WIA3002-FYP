const Student = require("../models/student");
const ProgrammeIntake = require("../models/ProgrammeIntake");
const AcademicSession = require("../models/AcademicSession");
const StudentAcademicProfile = require("../models/StudentAcademicProfile");
const {
  getCurrentAcademicSession,
  getProgressStatus,
} = require("../utils/formatter/studentFormatter");

const {
  formatStudents,
  formatStudent,
} = require("../utils/formatter/studentFormatter");

const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find().populate("programme");

    const formattedStudents = await formatStudents(students);
    res.status(200).json(formattedStudents);
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.log("Error fetching students: ", error);
  }
};

const getStudentByName = async (req, res) => {
  try {
    const { student_name } = req.params;

    const [sessions, programmeIntakes, profiles, currentAcademicSession] =
      await Promise.all([
        AcademicSession.find(),
        ProgrammeIntake.find(),
        StudentAcademicProfile.find(),
        getCurrentAcademicSession(),
      ]);

    const sessionMap = Object.fromEntries(
      sessions.map((s) => [s._id.toString(), s]),
    );
    const intakeMap = Object.fromEntries(
      programmeIntakes.map((i) => [
        `${i.programme_id}_${i.academic_session_id}`,
        i,
      ]),
    );
    const profileMap = Object.fromEntries(
      profiles.map((p) => [p.student.toString(), p]),
    );
    const student = await Student.findOne({ username: student_name }).populate(
      "programme",
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const formattedStudent = await formatStudent(student, {
      sessionMap,
      intakeMap,
      profileMap,
      currentAcademicSession,
    });
    const academicProfile = await StudentAcademicProfile.findOne({
      student: student._id,
    }).populate("entries.course");
    formattedStudent.academicProfile = academicProfile;

    res.status(200).json(formattedStudent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateStudentProgressStatus = async (studentId, profile) => {
  let update = false;
  const student = await Student.findById(studentId);
  const programmeIntake = await ProgrammeIntake.findOne({
    programme_id: student.programme,
    academic_session_id: student.academicSession,
  });
  const latestProgressStatus = await getProgressStatus(
    programmeIntake,
    profile,
  );

  if (student.status !== latestProgressStatus.status) {
    student.status = latestProgressStatus.status;
    update = true;
  }

  const mergedStatusNotes = [
    ...new Set([...student.status_notes, ...latestProgressStatus.status_notes]),
  ];
  if (mergedStatusNotes.length !== student.status_notes) {
    student.status_notes = mergedStatusNotes;
    update = true;
  }

  if (update) {
    await student.save();
    return "Updated successfully";
  } else return "No update required";
};

module.exports = {
  getAllStudents,
  getStudentByName,
  updateStudentProgressStatus,
};
