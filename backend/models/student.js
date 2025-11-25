const mongoose = require("mongoose");
const User = require("./User");
const { PROGRESS_STATUS } = require("../constants/progressStatus");
require("./ProgrammePlan");
require("./Programme");
require("./AcademicSession");
require("./ProgrammeIntake");

const studentSchema = new mongoose.Schema({
  fullName: {
    type: String,
    default: "",
  },
  matricNo: {
    type: String,
    required: true,
    unique: true,
  },
  faculty: {
    type: String,
    required: true,
    default: "Faculty of Computer Science and Information Technology",
  },
  department: {
    type: String,
    required: false,
  },
  programme: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Programme",
    required: false,
  },
  academicSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AcademicSession",
    required: false,
  },
  programme_intake: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProgrammeIntake",
    required: false,
  },
  semester: {
    type: String,
    required: false,
  },
  programme_plans: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProgrammePlan",
    },
  ],
  academic_plans: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentAcademicPlan",
    },
  ],
  address: {
    type: String,
    default: "",
  },
  profilePicture: {
    type: String,
    default: null,
  },
  profileColor: {
    type: String,
    default: "#1E3A8A",
  },
  isGraduated: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: PROGRESS_STATUS,
    default: PROGRESS_STATUS.UNKNOWN,
  },
  status_notes: {
    type: [String],
    required: false,
    default: [],
  },
});

const Student = User.discriminator("student", studentSchema);

module.exports = Student;
