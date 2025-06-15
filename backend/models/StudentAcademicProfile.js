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
  },
  { timestamps: true }
);

module.exports = mongoose.model("AcademicProfile", academicProfileSchema);
