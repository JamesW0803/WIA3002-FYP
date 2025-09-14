const mongoose = require("mongoose");
const User = require("./User");
require("./ProgrammePlan");
require("./Programme");
require("./AcademicSession");
require("./ProgrammeIntake");
require("./StudentAcademicPlan");

const studentSchema = new mongoose.Schema({
  fullName: {
    type: String,
    default: "",
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
});

const Student = User.discriminator("student", studentSchema);

module.exports = Student;
