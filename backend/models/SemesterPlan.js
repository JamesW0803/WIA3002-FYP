const mongoose = require("mongoose");
require("./ProgrammePlan"); // Import the Programme_Plan model
require("./Course"); // Import the Programme_Plan model
require("./AcademicSession"); // Import the Programme_Plan model

const semesterPlanSchema = new mongoose.Schema(
  {
    programme_plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProgrammePlan",
    },
    academic_session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
    },
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
  },
  {
    timestamps: true,
    collection: "semester_plans",
  }
);

module.exports = mongoose.model("SemesterPlan", semesterPlanSchema);
