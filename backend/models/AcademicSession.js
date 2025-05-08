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

academicSessionSchema.index({ year: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model("AcademicSession", academicSessionSchema);
