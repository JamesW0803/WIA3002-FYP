const mongoose = require("mongoose");
require("./SemesterPlan"); // Import the Semester_Plan model

const programmePlanSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    semester_plans: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Semester_Plan",
      },
    ],
  },
  {
    timestamps: true,
    collection: "programme_plans",
  }
);

module.exports = mongoose.model("Programme_Plan", programmePlanSchema);
