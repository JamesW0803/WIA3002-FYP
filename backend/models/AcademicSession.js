const mongoose = require("mongoose");
const { ALL_SEMESTERS } = require("../constants/semesters");

const academicSessionSchema = new mongoose.Schema(
  {
    year: {
      type: String, 
      required: true,
    },
    semester: {
        type: String, 
        required: true,
        enum: ALL_SEMESTERS
    },
  },
  {
    timestamps: true,
    collection: "academic_sessions",
  }
);

module.exports = mongoose.model("AcademicSession", academicSessionSchema);
