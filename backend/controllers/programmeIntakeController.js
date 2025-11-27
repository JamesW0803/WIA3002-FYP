const {
  formatProgrammeIntake,
  formatProgrammeIntakes,
} = require("../utils/formatter/programmeIntakeFormatter");
const {
  buildSemesterMappingFromProgrammePlan,
} = require("../utils/formatter/programmePlanToSemesterMapping");

const ProgrammeIntake = require("../models/ProgrammeIntake");
const Programme = require("../models/Programme");
const AcademicSession = require("../models/AcademicSession");
const SemesterPlan = require("../models/SemesterPlan");
const ProgrammePlan = require("../models/ProgrammePlan");
const Student = require("../models/Student");
const Course = require("../models/Course");
const {
  COURSE_TYPE_TO_CATEGORY,
} = require("../constants/graduationCategories");
const { editProgrammePlan } = require("./programmePlanController")
const { createNextAcademicSession } = require("./academicSessionController")
const { generateProgrammeIntakeCode } = require("../utils/formatter/programmeIntakeFormatter")

const getAllProgrammeIntakes = async (req, res) => {
  try {
    const programmeIntakes = await ProgrammeIntake.find()
      .populate("programme_id")
      .populate("academic_session_id");
    res.status(200).json(formatProgrammeIntakes(programmeIntakes));
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error fetching programme intakes: ", error);
  }
};

// Add programme intake (unchanged)
const addProgrammeIntake = async (req, res) => {
  try {
    const {
      programme_name,
      academic_session_id,
      number_of_students_enrolled,
      graduation_rate,
      min_semester,
      max_semester,
      graduation_requirements,
      programme_plan
    } = req.body;

    const courseList = Object.values(graduation_requirements).flat();
    const semesterPlans = programme_plan?.semester_plans
    const semesterPlanIds = []

    const programme = await Programme.findOne({ programme_name });
    if (!programme) {
      return res.status(404).json({ message: "Programme not found" });
    }

    const academicSession = await AcademicSession.findById(academic_session_id);
    if (!academicSession) {
      return res.status(404).json({ message: "Academic session not found" });
    }

    const programmePlan = await ProgrammePlan.create({
      title: `${programme.programme_code} Auto Plan (${academicSession.year})`,
    });

    let currentAcademicSession = academicSession
    for (let i = 0; i < semesterPlans?.length; i++) {
      const semesterPlan = await SemesterPlan.create({
        programme_plan_id : programmePlan._id,
        courses: semesterPlans[i].courses?.map(course => course._id),
        academic_session_id: currentAcademicSession, 
      });

      if(currentAcademicSession.next === null){
        const nextAcademicSession = await createNextAcademicSession(currentAcademicSession);
        currentAcademicSession = await AcademicSession.findById(nextAcademicSession._id)
      }else{
        currentAcademicSession = await AcademicSession.findById(currentAcademicSession.next)
      }
      semesterPlanIds.push(semesterPlan._id);
    }

    programmePlan.semester_plans = semesterPlanIds
    const savedProgrammePlan = await programmePlan.save()

    const required_course_ids = await Promise.all(
      courseList.map(async (course) => {
        const currentCourse = await Course.findOne({
          course_code: course.course_code,
        });
        return currentCourse?._id;
      })
    );

    const total_required_credits = courseList.reduce(
      (sum, course) => sum + (course.credits || 0),
      0
    );

    const newProgrameIntake = new ProgrammeIntake({
      programme_intake_code: generateProgrammeIntakeCode(
        programme,
        academicSession.year,
        academicSession.semester
      ),
      programme_id: programme._id,
      academic_session_id: academicSession._id,
      number_of_students_enrolled: number_of_students_enrolled ?? 0,
      graduation_rate: graduation_rate ?? 0,
      min_semester,
      max_semester,
      graduation_requirements: required_course_ids,
      programme_plan: savedProgrammePlan._id,
      total_credit_hours: total_required_credits,
    });

    const savedProgrameIntake = await newProgrameIntake.save();
    res.status(201).json(savedProgrameIntake);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error adding new academic session programme: ", error);
  }
};

const getProgrammeIntakeById = async (req, res) => {
  try {
    const { id } = req.params;

    const programmeIntake = await ProgrammeIntake.findById(id)
      .populate("graduation_requirements")
      .populate("programme_id")
      .populate("academic_session_id")
      .populate({
        path: "programme_plan",
        populate: {
          path: "semester_plans",
          populate: {
            path: "courses",
          },
        },
      });

    if (!programmeIntake) {
      return res.status(404).json({ message: "Programme intake not found" });
    }

    res.status(200).json(formatProgrammeIntake(programmeIntake));
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error fetching programme intake by ID:", error);
  }
};

const getProgrammeIntakeByCode = async (req, res) => {
  try {
    const { programme_intake_code } = req.params;

    const programmeIntake = await ProgrammeIntake.findOne({
      programme_intake_code,
    })
      .populate("graduation_requirements")
      .populate("programme_id")
      .populate("academic_session_id")
      .populate({
        path: "programme_plan",
        populate: {
          path: "semester_plans",
          populate: {
            path: "courses",
          },
        },
      });

    if (!programmeIntake) {
      return res.status(404).json({ message: "Programme intake not found" });
    }

    res.status(200).json(formatProgrammeIntake(programmeIntake));
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error fetching programme intake by ID:", error);
  }
};

const deleteProgrammeIntakeById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProgrammeIntake = await ProgrammeIntake.findOneAndDelete({
      programme_intake_code: id,
    });

    if (!deletedProgrammeIntake) {
      return res.status(404).json({ message: "Programme intake not found" });
    }

    res.status(200).json(formatProgrammeIntake(deletedProgrammeIntake));
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error deleting programme intake by ID:", error);
  }
};

const updateProgrammeIntake = async (req, res) => {
  try {
    const intakes = await ProgrammeIntake.find();

    // Recalculate student counts for each intake
    await Promise.all(
      intakes.map(async (intake) => {
        let update = false;
        const totalStudentsEnrolled = await Student.countDocuments({
          programme: intake.programme_id,
          academicSession: intake.academic_session_id,
        });

        const totalStudentsGraduated = await Student.countDocuments({
          programme: intake.programme_id,
          academicSession: intake.academic_session_id,
          isGraduated: true,
        });

        const graduaionRate =
          totalStudentsEnrolled > 0
            ? (totalStudentsGraduated / totalStudentsEnrolled) * 100
            : 0;

        // Only update if the count changed
        if (intake.number_of_students_enrolled !== totalStudentsEnrolled) {
          intake.number_of_students_enrolled = totalStudentsEnrolled;
          update = true;
        }

        // Only update if the graduation rate changed
        if (intake.graduation_rate !== graduaionRate) {
          intake.number_of_students_graduated = totalStudentsGraduated;
          intake.graduation_rate = graduaionRate;
          update = true;
        }

        if (update) {
          await intake.save();
        }
      })
    );

    res.status(200).json({ message: "Successfully refresh student counts" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to refresh student counts." });
  }
};

// Student
// Get graduation requirements for a given student, based on their intake
const getGraduationRequirementsForStudent = async (req, res) => {
  try {
    const { studentId } = req.params; // we'll call /programme-intakes/student/:studentId/requirements

    const student = await Student.findById(studentId)
      .populate("programme")
      .populate("academicSession")
      .populate("programme_intake");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // 1. Determine the correct intake for this student
    let intake = student.programme_intake;

    if (!intake && student.programme && student.academicSession) {
      // fallback: find by programme + academic session (year/semester like 2022/2023, Semester 1)
      intake = await ProgrammeIntake.findOne({
        programme_id: student.programme,
        academic_session_id: student.academicSession,
      });
    }

    if (!intake) {
      return res
        .status(404)
        .json({ message: "No programme intake found for this student" });
    }

    // 2. Populate graduation requirement courses
    intake = await ProgrammeIntake.findById(intake._id)
      .populate({
        path: "graduation_requirements",
        model: "Course",
        select: "course_code course_name credit_hours type",
      })
      .populate("academic_session_id")
      .populate("programme_id");

    const courses = intake.graduation_requirements || [];

    // 3. Group by category & sum required credits
    const requirementsByCategory = {};
    let totalRequiredCredits = 0;

    for (const course of courses) {
      const category = COURSE_TYPE_TO_CATEGORY[course.type];
      if (!category) continue;

      if (!requirementsByCategory[category]) {
        requirementsByCategory[category] = {
          requiredCredits: 0,
          courses: [],
        };
      }

      const cr = course.credit_hours || 0;
      requirementsByCategory[category].requiredCredits += cr;
      totalRequiredCredits += cr;

      requirementsByCategory[category].courses.push({
        _id: course._id,
        code: course.course_code,
        name: course.course_name,
        type: course.type,
        credit_hours: cr,
      });
    }

    return res.status(200).json({
      student: {
        _id: student._id,
        fullName: student.fullName,
      },
      intake: {
        _id: intake._id,
        programme_intake_code: intake.programme_intake_code,
        programme: {
          _id: intake.programme_id?._id,
          programme_code: intake.programme_id?.programme_code,
          programme_name: intake.programme_id?.programme_name,
        },
        academicSession: {
          _id: intake.academic_session_id?._id,
          year: intake.academic_session_id?.year, // e.g. "2022/2023"
          semester: intake.academic_session_id?.semester,
        },
      },
      totalRequiredCredits,
      requirementsByCategory,
    });
  } catch (error) {
    console.error("Error fetching graduation requirements: ", error);
    res.status(500).json({ message: error.message });
  }
};

// Student
const getProgrammePlanMappingByCode = async (req, res) => {
  try {
    const { programme_intake_code } = req.params;

    const intake = await ProgrammeIntake.findOne({ programme_intake_code })
      .populate("programme_id")
      .populate("academic_session_id")
      .populate({
        path: "programme_plan",
        populate: {
          path: "semester_plans",
          populate: [{ path: "courses" }, { path: "academic_session_id" }],
        },
      });

    if (!intake) {
      return res.status(404).json({ message: "Programme intake not found" });
    }

    if (!intake.programme_plan) {
      return res
        .status(404)
        .json({ message: "No programme plan attached to this intake" });
    }

    const semesterMapping = buildSemesterMappingFromProgrammePlan(
      intake.programme_plan
    );

    return res.status(200).json({
      programme_intake_code,
      programme: {
        _id: intake.programme_id?._id,
        programme_code: intake.programme_id?.programme_code,
        programme_name: intake.programme_id?.programme_name,
      },
      academicSession: {
        _id: intake.academic_session_id?._id,
        year: intake.academic_session_id?.year,
        semester: intake.academic_session_id?.semester,
      },
      semesterMapping,
    });
  } catch (error) {
    console.error("Error fetching programme plan mapping:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const editProgrammeIntake = async (req, res) => {
  const { programme_intake_id } = req.params;
  const updatedData = req.body;

  try {
    const academicSession = await AcademicSession.findById(updatedData.academic_session_id)
    const programme = await Programme.findOne({
      programme_name : updatedData.programme_name
    })

    if(!programme){
      return res.status(404).json({ message: "Invalid programme name" });
    }

    if(!academicSession){
      return res.status(404).json({ message: "Invalid academic session" });
    }

    await editProgrammePlan(updatedData.programme_plan, programme, academicSession);
    
    const updatedProgrammeIntake = await ProgrammeIntake.findByIdAndUpdate(
      programme_intake_id, // filter
      updatedData, // updated fields
      { new: true } // return updated document
    ).populate("graduation_requirements")
      .populate("programme_id")
      .populate("academic_session_id")
      .populate({
        path: "programme_plan",
        populate: {
          path: "semester_plans",
          populate: {
            path: "courses",
          },
        },
      });

    if (!updatedProgrammeIntake) {
      return res.status(404).json({ message: "Programme intake not exist" });
    }

    res.status(200).json(formatProgrammeIntake(updatedProgrammeIntake));
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update programme intake", details: err.message });
  }
};

module.exports = {
  getAllProgrammeIntakes,
  addProgrammeIntake,
  getProgrammeIntakeById,
  getProgrammeIntakeByCode,
  deleteProgrammeIntakeById,
  updateProgrammeIntake,
  getGraduationRequirementsForStudent,
  getProgrammePlanMappingByCode,
  editProgrammeIntake,
};
