const mongoose = require("mongoose");
const { ALL_SEMESTERS } = require("../constants/semesters");

const academicSessionSchema = new mongoose.Schema(
  {
    year: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          // Validate format like "2022/2023"
          return (
            /^\d{4}\/\d{4}$/.test(v) &&
            parseInt(v.split("/")[1]) === parseInt(v.split("/")[0]) + 1
          );
        },
        message: (props) =>
          `${props.value} must be in format "YYYY/YYYY" and consecutive years (e.g., "2022/2023")`,
      },
    },
    semester: {
      type: String,
      required: true,
      enum: ALL_SEMESTERS,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    next: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "AcademicSession",
    },
    previous: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "AcademicSession",
    },
  },
  {
    timestamps: true,
    collection: "academic_sessions",
  }
);

academicSessionSchema.index({ year: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model("AcademicSession", academicSessionSchema);
