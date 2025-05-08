const mongoose = require("mongoose");
require("./SemesterPlan"); 
require("./ProgrammeIntake"); 
require("./Student");

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
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "ownerModel",
    },
    ownerModel: {
      type: String,
      required: true,
      enum: ["Student", "ProgrameIntake"]
    }
  },
  {
    timestamps: true,
    collection: "programme_plans",
  }
);

module.exports = mongoose.model("ProgrammePlan", programmePlanSchema);
