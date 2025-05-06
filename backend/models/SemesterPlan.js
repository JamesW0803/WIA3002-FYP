const mongoose = require("mongoose");
require("./ProgrammePlan"); // Import the Programme_Plan model
require("./Course"); // Import the Programme_Plan model

const semesterPlanSchema = new mongoose.Schema(
  {
    programme_plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Programme_Plan",
    },
    session: {
      type: String,
      required: true,
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

module.exports = mongoose.model("Semester_Plan", semesterPlanSchema);
