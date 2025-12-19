const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Student = require("./Student");

// sub schema
const semesterCourseSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    credit_at_time: { type: Number },
    course_code: { type: String },
    title_at_time: { type: String },
  },
  { _id: false }
);

const semesterSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  courses: [semesterCourseSchema],
  completed: {
    type: Boolean,
    default: false,
  },
  isGap: {
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
  isGapYear: {
    type: Boolean,
    default: false,
  },
});

const academicPlanSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
    },
    identifier: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
    },
    status : {
      type: Number,
      required: true,
      default: 1,
      enum: [1,2,3,4]
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
  try {
    let totalCredits = 0;
    let totalSemesters = 0;

    for (const y of this.years || []) {
      totalSemesters += (y.semesters || []).length;
      for (const s of y.semesters || []) {
        for (const c of s.courses || []) {
          totalCredits += Number(c.credit_at_time || 0); // <-- snapshot
        }
      }
    }

    this.credits = totalCredits;
    this.semesters = totalSemesters;
    next();
  } catch (e) {
    next(e);
  }
});

academicPlanSchema.post("save", async function (doc) {
  try {
    await Student.findByIdAndUpdate(doc.student, {
      $addToSet: { academic_plans: doc._id },
    });
  } catch (e) {
    console.error("Post-save hook failed to link plan to student:", e);
  }
});

academicPlanSchema.pre("remove", async function (next) {
  try {
    await Student.findByIdAndUpdate(this.student, {
      $pull: { academic_plans: this._id },
    });
    next();
  } catch (e) {
    next(e);
  }
});

// One default per student (enforced only when isDefault=true)
academicPlanSchema.index(
  { student: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

module.exports = mongoose.model("StudentAcademicPlan", academicPlanSchema);
