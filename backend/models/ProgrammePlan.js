const mongoose = require("mongoose");
require("./SemesterPlan");
require("./ProgrammeIntake");
require("./student");

const programmePlanSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    semester_plans: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SemesterPlan",
      },
    ],
  },
  {
    timestamps: true,
    collection: "programme_plans",
  },
);

module.exports = mongoose.model("ProgrammePlan", programmePlanSchema);
