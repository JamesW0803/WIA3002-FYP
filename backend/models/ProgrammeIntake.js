const mongoose = require("mongoose");
require("./Programme");
require("./AcademicSession");
require("./ProgrammePlan")

const programmeIntake = new mongoose.Schema(
  {
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
    programme_plan: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "ProgrammePlan",
    },
    number_of_students_enrolled: {
      type: Number,
      default: 0,
    }
  },
  {
    timestamps: true,
    collection: "programme_intakes",
  }
);

programmeIntake.index({ programme_id: 1, academic_session_id: 1 }, { unique: true });

module.exports = mongoose.model("ProgrammeIntake", programmeIntake);
