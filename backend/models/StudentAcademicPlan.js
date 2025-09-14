const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Student = require("./Student");

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
// Calculate total credits before saving
academicPlanSchema.pre("save", function (next) {
  try {
    let totalCredits = 0;
    let totalSemesters = 0;

    for (const y of this.years || []) {
      totalSemesters += (y.semesters || []).length;
      for (const s of y.semesters || []) {
        for (const c of s.courses || []) {
          totalCredits += Number(c.credit || 0);
        }
      }
    }

    this.credits = totalCredits;
    // if client sent an explicit semesters count, trust recompute instead
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
