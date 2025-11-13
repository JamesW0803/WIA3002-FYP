const mongoose = require("mongoose");

const academicProfileSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true, // one profile per student
    },
    entries: [
      {
        course: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Course",
          required: true,
        },
        year: Number,
        semester: Number,
        status: {
          type: String,
          enum: ["Passed", "Failed", "Ongoing"],
        },
        grade: String,
        isRetake: {
          type: Boolean,
          default: false,
        },
      },
    ],
    gaps: [
      {
        year: { type: Number, required: true },
        semester: { type: Number, default: null }, // null => gap year
      },
    ],
    completed_credit_hours: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AcademicProfile", academicProfileSchema);
