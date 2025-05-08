const mongoose = require("mongoose");
const { ALL_SEMESTERS } = require("../constants/semesters");
const { COURSE_TYPES } = require("../constants/courseType");

const courseSchema = new mongoose.Schema(
  {
    course_code: {
      type: String,
      required: true,
      unique: true,
      match: /^[A-Z]{3}\d{4}$/,
    },
    course_name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    credit_hours: {
      type: Number,
      required: true,
    },
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    faculty: {
      type: String,
      default: "Faculty of Computer Science and Engineering"
    },
    department: {
      type: String,
    },
    type: {
      type: String,
      enum: COURSE_TYPES,
      required: true,
    },
    offered_semester: {
      type: String,
      enum: ALL_SEMESTERS
    }
  },
  {
    timestamps: true,
    collection: "courses",
  }
);

module.exports = mongoose.model("Course", courseSchema);
