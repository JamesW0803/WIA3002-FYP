const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const semesterSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  courses: [
    {
      code: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      credit: {
        type: Number,
        required: true,
      },
      prerequisites: {
        type: [String],
        default: [],
      },
      offered_semester: {
        type: [String],
        default: [],
      },
    },
  ],
  completed: {
    type: Boolean,
    default: false,
  },
});

const yearSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
  },
  semesters: [semesterSchema],
});

const academicPlanSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    identifier: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    created: {
      type: Date,
      default: Date.now,
    },
    semesters: {
      type: Number,
      required: true,
    },
    credits: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: "",
    },
    years: [yearSchema],
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "academic_plans",
  }
);

// Calculate total credits before saving
academicPlanSchema.pre("save", function (next) {
  this.credits = this.years.reduce((total, year) => {
    return year.semesters.reduce((semTotal, semester) => {
      const semesterCredits = semester.courses.reduce(
        (courseTotal, course) => courseTotal + (course.credit || 0),
        0
      );
      return semTotal + semesterCredits;
    }, total);
  }, 0);
  next();
});

academicPlanSchema.post("save", async function (doc) {
  await mongoose.model("Student").findByIdAndUpdate(doc.student, {
    $addToSet: { academic_plans: doc._id },
  });
});

academicPlanSchema.pre("remove", async function (next) {
  await mongoose.model("Student").findByIdAndUpdate(this.student, {
    $pull: { academic_plans: this._id },
  });
  next();
});

module.exports = mongoose.model("StudentAcademicPlan", academicPlanSchema);
