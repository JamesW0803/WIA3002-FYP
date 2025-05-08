const mongoose = require("mongoose");
require("./Programme");
require("./AcademicSession");
require("./ProgrammePlan")

const programmeAcademicSessionSchema = new mongoose.Schema(
  {
    programme_id: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Programme",
    },
    academic_session_id: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "AcademicSession",
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
    collection: "proramme_academic_sessions",
  }
);

module.exports = mongoose.model("ProgrammeAcademicSession", programmeAcademicSessionSchema);
