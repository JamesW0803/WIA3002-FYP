const mongoose = require("mongoose");
const { ALL_SEMESTERS } = require("../constants/semesters");
const { COURSE_TYPES, UNKNOWN } = require("../constants/courseType");

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
    type: {
      type: String,
      enum: COURSE_TYPES,
      required: true,
    },
    credit_hours: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    prerequisitesByProgramme: [
      {
        programme: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Programme",
          required: true,
        },
        prerequisites: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
          },
        ],
      },
    ],
    typesByProgramme: [
      {
        programme: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Programme",
          required: true,
        },
        type: {
          type: String,
          enum: COURSE_TYPES,
          required: true,
        },
      },
    ],
    faculty: {
      type: String,
      default: "Faculty of Computer Science and Information Technology",
    },
    department: {
      type: String,
    },
    offered_semester: {
      type: [String],
      enum: ALL_SEMESTERS,
    },
    study_level: {
      type: Number,
      enum: [0, 1, 2, 3],
    },
  },
  {
    timestamps: true,
    collection: "courses",
  }
);

module.exports = mongoose.model("Course", courseSchema);
