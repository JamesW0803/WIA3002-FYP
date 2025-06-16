const mongoose = require("mongoose");
const User = require("./User");
require("./ProgrammePlan");
require("./Programme");
require("./AcademicSession");
require("./ProgrammeIntake");
require("./StudentAcademicPlan");

const studentSchema = new mongoose.Schema({
  faculty: {
    type: String,
    required: true,
    default: "Faculty of Computer Science and Information Technology",
  },
  department: {
    type: String,
    required: true,
  },
  programme: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Programme",
    required: true,
  },
  academicSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AcademicSession",
    required: true,
  },
  programme_intake: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProgrammeIntake",
    required: false,
  },
  semester: {
    type: String,
    required: true,
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
});

const Student = User.discriminator("student", studentSchema);

module.exports = Student;
