const mongoose = require("mongoose");

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
      // {
      //   type: mongoose.Schema.Types.ObjectId,
      //   ref: "Course",
      // },
      {
        type: String,
      },
      // need further dev
    ],
    department: {
      type: String,
    },
    type: {
      type: String,
      enum: [
        "faculty_core",
        "programme_core",
        "specialization_elective",
        "university_language",
        "university_cocurriculum",
        "university_other",
        "she_cluster_1",
        "she_cluster_2",
        "she_cluster_3",
        "she_cluster_4",
      ],
      required: true,
    },
    she_cluster: {
      type: Number,
      enum: [1, 2, 3, 4],
      required: function () {
        return this.type?.startsWith("she_cluster"); //only need to provide the cluster number if the course is a SHE course
      },
    },
    special_semester_only: {
      type: Boolean,
      default: false,
    },
    is_mandatory_for_graduation: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "courses",
  }
);

module.exports = mongoose.model("Course", courseSchema);
