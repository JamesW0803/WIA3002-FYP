const mongoose = require("mongoose");

const curriculumSchema = new mongoose.Schema(
  {
    programme: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    faculty: {
      type: String,
      required: true,
      default: "Faculty of Computer Science and Information Technology",
    },
    structure: [
      {
        semester: {
          type: Number,
          required: true,
        },
        courses: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
    collection: "curriculums",
  }
);

module.exports = mongoose.model("Curriculum", curriculumSchema);
