const mongoose = require("mongoose");
const User = require("./User"); // Base model
require("./ProgrammePlan"); // Import the Programme_Plan model
require("./Programme")

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
  programme_plans: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProgrammePlan",
    },
  ],
});

const Student = User.discriminator("student", studentSchema);

module.exports = Student;
