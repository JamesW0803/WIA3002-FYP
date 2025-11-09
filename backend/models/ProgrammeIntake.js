const mongoose = require("mongoose");
require("./Programme");
require("./AcademicSession");
require("./ProgrammePlan")
require("./Course")

const programmeIntake = new mongoose.Schema(
  {
    programme_intake_code: {
      type: String,
      required: true,
      unique: true,
    },
    programme_id: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Programme",
      required: true,
    },
    academic_session_id: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "AcademicSession",
        required: true,
    },
    total_credit_hours: {
      type: Number,
      required: true,
    },
    programme_plan: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "ProgrammePlan",
    },
    number_of_students_enrolled: {
      type: Number,
      default: 0,
    },
    graduation_rate: {
      type: Number,
      default: 0,
    },
    min_semester: {
      type: Number,
      default: 7,
    },
    max_semester: {
      type: Number,
      default: 11,
    },
    graduation_requirements: {
        type: [mongoose.Schema.Types.ObjectId], 
        ref: "Course",
        required: true,
    },

  },
  {
    timestamps: true,
    collection: "programme_intakes",
  }
);

programmeIntake.index({ programme_id: 1, academic_session_id: 1 }, { unique: true });

module.exports = mongoose.model("ProgrammeIntake", programmeIntake);
