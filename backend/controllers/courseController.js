const Course = require("../models/Course");
const Programme = require("../models/Programme");
const {
  formatCourses,
  formatCourse,
} = require("../utils/formatter/courseFormatter");
const AcademicProfile = require("../models/StudentAcademicProfile");
const { COURSE_TYPES } = require("../constants/courseType");

const getAllCourses = async (req, res) => {
  try {
    const { search, minimal } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { course_code: { $regex: search, $options: "i" } },
          { course_name: { $regex: search, $options: "i" } },
        ],
      };
    }

    // ==== PROGRAMME-AWARE MINIMAL RESPONSE FOR PLANNER ====
    if (minimal === "true") {
      let studentProgrammeId = null;

      if (req.user && req.user.role === "student") {
        const profile = await AcademicProfile.findOne({
          student: req.user.user_id,
        })
          .populate({
            path: "student",
            populate: {
              path: "programme",
              model: "Programme",
            },
          })
          .select("student");

        studentProgrammeId = profile?.student?.programme?._id || null;
      }

      const mini = await Course.find(query)
        .select(
          "course_code course_name credit_hours prerequisites offered_semester prerequisitesByProgramme"
        )
        .populate({
          path: "prerequisites",
          select: "course_code",
        })
        .populate({
          path: "prerequisitesByProgramme.prerequisites",
          select: "course_code",
        });

      const minimalCourses = mini.map((course) => {
        let effectivePrereqs = course.prerequisites || [];

        if (studentProgrammeId) {
          const cfg = (course.prerequisitesByProgramme || []).find((p) =>
            p.programme.equals
              ? p.programme.equals(studentProgrammeId)
              : p.programme.toString() === studentProgrammeId.toString()
          );

          if (cfg && Array.isArray(cfg.prerequisites)) {
            effectivePrereqs = cfg.prerequisites;
          }
        }

        return {
          _id: course._id,
          code: course.course_code,
          name: course.course_name,
          credit: course.credit_hours,
          prerequisites: (effectivePrereqs || []).map((p) => p.course_code),
          offered_semester: course.offered_semester,
        };
      });

      return res.status(200).json(minimalCourses);
    }

    // ==== FULL (NON-MINIMAL) RESPONSE ====
    const courses = await Course.find(query)
      .populate(
        "prerequisites",
        "course_code course_name credit_hours offered_semester"
      )
      .populate(
        "prerequisitesByProgramme.programme",
        "programme_name programme_code"
      )
      .populate(
        "prerequisitesByProgramme.prerequisites",
        "course_code course_name credit_hours"
      )
      .populate("typesByProgramme.programme", "programme_name programme_code");

    const formattedCourses = formatCourses(courses);
    return res.status(200).json(formattedCourses);
  } catch (error) {
    console.error("getAllCourses error:", error);
    res.status(500).json({ message: error.message });
  }
};

const addCourse = async (req, res) => {
  try {
    const {
      course_code,
      course_name,
      type,
      credit_hours,
      description,
      prerequisites = [],
      prerequisitesByProgramme = [],
      typesByProgramme = [],
      faculty,
      department,
      offered_semester,
      study_level,
    } = req.body;

    // ----- 1. Global prerequisites (codes -> ObjectIds) -----
    const cleanedPrerequisiteCodes = (prerequisites || []).filter(Boolean);
    let prerequisitesCourseIds = [];

    if (cleanedPrerequisiteCodes.length > 0) {
      const prerequisiteCourses = await Promise.all(
        cleanedPrerequisiteCodes.map((code) =>
          Course.findOne({ course_code: code })
        )
      );

      if (prerequisiteCourses.some((c) => !c)) {
        return res.status(400).json({
          error: "One or more prerequisite course codes are invalid.",
        });
      }

      prerequisitesCourseIds = prerequisiteCourses.map((course) => course._id);
    }

    // ----- 2. Programme-specific prerequisites -----
    const prereqsByProgrammeDocs = [];

    for (const cfg of prerequisitesByProgramme || []) {
      const programmeCode = cfg.programme_code;
      const prereqCodes = (cfg.prerequisite_codes || []).filter(Boolean);

      if (!programmeCode || prereqCodes.length === 0) continue;

      // find programme by code
      const programme = await Programme.findOne({
        programme_code: programmeCode,
      });
      if (!programme) {
        return res.status(400).json({
          error: `Invalid programme code in prerequisites: ${programmeCode}`,
        });
      }

      // find all prerequisite courses by code
      const prereqCourseDocs = await Promise.all(
        prereqCodes.map((code) => Course.findOne({ course_code: code }))
      );

      if (prereqCourseDocs.some((c) => !c)) {
        return res.status(400).json({
          error:
            "One or more programme-specific prerequisite course codes are invalid.",
        });
      }

      prereqsByProgrammeDocs.push({
        programme: programme._id,
        prerequisites: prereqCourseDocs.map((c) => c._id),
      });
    }

    // ----- 3. Programme-specific types (NEW) -----
    const typesByProgrammeDocs = [];

    for (const cfg of typesByProgramme || []) {
      const { programme_code, type: programmeType } = cfg;
      if (!programme_code || !programmeType) continue;

      // validate type
      if (!COURSE_TYPES.includes(programmeType)) {
        return res.status(400).json({
          error: `Invalid course type '${programmeType}' for programme ${programme_code}`,
        });
      }

      // find programme
      const programme = await Programme.findOne({
        programme_code: programme_code,
      });

      if (!programme) {
        return res.status(400).json({
          error: `Invalid programme code in typesByProgramme: ${programme_code}`,
        });
      }

      typesByProgrammeDocs.push({
        programme: programme._id,
        type: programmeType,
      });
    }

    // ----- 4. Create course -----
    const newCourse = new Course({
      course_code,
      course_name,
      type,
      credit_hours,
      description,
      prerequisites: prerequisitesCourseIds,
      prerequisitesByProgramme: prereqsByProgrammeDocs,
      typesByProgramme: typesByProgrammeDocs,
      faculty,
      department,
      offered_semester,
      study_level,
    });

    const savedCourse = await newCourse.save();

    // Re-fetch with populations + format so frontend always
    // gets programme_code + prerequisite_codes, etc.
    const populated = await Course.findById(savedCourse._id)
      .populate(
        "prerequisites",
        "course_code course_name credit_hours offered_semester"
      )
      .populate(
        "prerequisitesByProgramme.programme",
        "programme_name programme_code"
      )
      .populate(
        "prerequisitesByProgramme.prerequisites",
        "course_code course_name credit_hours"
      )
      .populate("typesByProgramme.programme", "programme_name programme_code");

    const formatted = formatCourse(populated);
    res.status(201).json(formatted);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Course code already exists." });
    }
    res.status(400).json({ error: error.message });
  }
};

const getCourseByCode = async (req, res) => {
  try {
    const { course_code } = req.params;

    const course = await Course.findOne({ course_code })
      .populate("prerequisites")
      .populate(
        "prerequisitesByProgramme.programme",
        "programme_name programme_code"
      )
      .populate(
        "prerequisitesByProgramme.prerequisites",
        "course_code course_name"
      )
      .populate("typesByProgramme.programme", "programme_name programme_code");

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const formattedCourse = formatCourse(course);
    res.status(200).json(formattedCourse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCourseByCode = async (req, res) => {
  try {
    const { course_code } = req.params;

    const deletedCourse = await Course.findOneAndDelete({ course_code });

    if (!deletedCourse) {
      return res.status(404).json({ message: "Course not exist" });
    }

    const formattedCourse = formatCourse(deletedCourse);
    res.status(200).json();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const editCourse = async (req, res) => {
  const { course_code } = req.params;

  // destructure explicitly so we can transform fields
  const {
    prerequisites = [],
    prerequisitesByProgramme = [],
    typesByProgramme = [],
    ...rest
  } = req.body;

  try {
    // ----- 1. Global prerequisites (codes -> ObjectIds) -----
    const prereqCourses = [];
    for (const code of prerequisites || []) {
      if (!code) continue;
      const prereqCourse = await Course.findOne({ course_code: code });

      if (!prereqCourse) {
        return res
          .status(400)
          .json({ message: `Invalid prerequisite course code: ${code}` });
      }
      prereqCourses.push(prereqCourse._id);
    }

    // ----- 2. Programme-specific prerequisites -----
    const prereqsByProgrammeDocs = [];

    for (const cfg of prerequisitesByProgramme || []) {
      const programmeCode = cfg.programme_code;
      const prereqCodes = (cfg.prerequisite_codes || []).filter(Boolean);

      if (!programmeCode || prereqCodes.length === 0) continue;

      const programme = await Programme.findOne({
        programme_code: programmeCode,
      });
      if (!programme) {
        return res
          .status(400)
          .json({ message: `Invalid programme code: ${programmeCode}` });
      }

      const prereqCourseDocs = await Promise.all(
        prereqCodes.map((code) => Course.findOne({ course_code: code }))
      );

      if (prereqCourseDocs.some((c) => !c)) {
        return res.status(400).json({
          message:
            "One or more programme-specific prerequisite course codes are invalid.",
        });
      }

      prereqsByProgrammeDocs.push({
        programme: programme._id,
        prerequisites: prereqCourseDocs.map((c) => c._id),
      });
    }

    // 3. Programme-specific types
    const typesByProgrammeDocs = [];

    for (const cfg of typesByProgramme || []) {
      const { programme_code, type: programmeType } = cfg;
      if (!programme_code || !programmeType) continue;

      if (!COURSE_TYPES.includes(programmeType)) {
        return res.status(400).json({
          message: `Invalid course type '${programmeType}' for programme ${programme_code}`,
        });
      }

      const programme = await Programme.findOne({
        programme_code: programme_code,
      });

      if (!programme) {
        return res.status(400).json({
          message: `Invalid programme code in typesByProgramme: ${programme_code}`,
        });
      }

      typesByProgrammeDocs.push({
        programme: programme._id,
        type: programmeType,
      });
    }

    // ----- 4. Build update payload -----
    const updatedData = {
      ...rest,
      prerequisites: prereqCourses,
      prerequisitesByProgramme: prereqsByProgrammeDocs,
      typesByProgramme: typesByProgrammeDocs,
    };

    const updatedCourse = await Course.findOneAndUpdate(
      { course_code },
      updatedData,
      { new: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not exist" });
    }

    // populate + format before sending to frontend
    const populated = await Course.findById(updatedCourse._id)
      .populate(
        "prerequisites",
        "course_code course_name credit_hours offered_semester"
      )
      .populate(
        "prerequisitesByProgramme.programme",
        "programme_name programme_code"
      )
      .populate(
        "prerequisitesByProgramme.prerequisites",
        "course_code course_name credit_hours"
      )
      .populate("typesByProgramme.programme", "programme_name programme_code");

    const formatted = formatCourse(populated);
    res.status(200).json(formatted);
  } catch (err) {
    res.status(500).json({
      error: "Failed to update course",
      details: err.message,
    });
  }
};

const checkCoursePrerequisites = async (req, res) => {
  try {
    const { courseCode, studentId } = req.params;
    let { year, semester } = req.query;

    // normalise to numbers if present
    const yearNum = year !== undefined ? Number(year) : undefined;
    const semNum = semester !== undefined ? Number(semester) : undefined;

    // 1. Get course with all prerequisite info
    const course = await Course.findOne({ course_code: courseCode })
      .populate("prerequisites", "course_code course_name")
      .populate(
        "prerequisitesByProgramme.prerequisites",
        "course_code course_name"
      );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // 2. Get student's academic profile + student + student's programme
    const profile = await AcademicProfile.findOne({ student: studentId })
      .populate({
        path: "student",
        populate: {
          path: "programme", // Student.programme -> Programme doc
          model: "Programme",
        },
      })
      .populate("entries.course");

    if (!profile) {
      return res.status(404).json({ message: "Academic profile not found" });
    }

    const studentProgrammeId = profile.student?.programme?._id;

    // 3. Choose applicable prerequisites
    let applicablePrereqs = [];

    if (studentProgrammeId) {
      const programmeConfig = (course.prerequisitesByProgramme || []).find(
        (p) => p.programme.toString() === studentProgrammeId.toString()
      );

      if (programmeConfig) {
        // use programme-specific prerequisites
        applicablePrereqs = programmeConfig.prerequisites || [];
      } else {
        // fall back to global prerequisites
        applicablePrereqs = course.prerequisites || [];
      }
    } else {
      // no programme on student → fallback to global
      applicablePrereqs = course.prerequisites || [];
    }

    // 4. Retake: if student already failed this course, allow without prereq check
    const isRetake = profile.entries?.some((entry) => {
      if (entry.course.course_code !== courseCode) return false;

      if (entry.status === "Failed") return true;

      if (
        entry.status === "Passed" &&
        entry.grade &&
        entry.grade !== "A" &&
        entry.grade !== "A+"
      ) {
        return true; // passed but below A / A+
      }

      return false;
    });

    if (isRetake) {
      return res.status(200).json({
        hasPrerequisites: applicablePrereqs.length > 0,
        unmetPrerequisites: [],
        allPrerequisitesMet: true,
        requiredCourses: applicablePrereqs.map((p) => p.course_code),
      });
    }

    // 5. Check which prerequisites are unmet
    const unmetPrerequisites = (applicablePrereqs || []).filter((prereq) => {
      return !profile.entries?.some((entry) => {
        const passed = entry.status === "Passed";
        const sameCourse = entry.course.course_code === prereq.course_code;

        const beforeCurrentSem = yearNum
          ? Number(entry.year) < yearNum ||
            (Number(entry.year) === yearNum && Number(entry.semester) < semNum)
          : true;

        return passed && sameCourse && beforeCurrentSem;
      });
    });

    res.status(200).json({
      hasPrerequisites: applicablePrereqs.length > 0,
      unmetPrerequisites: unmetPrerequisites.map((p) => p.course_code),
      allPrerequisitesMet: unmetPrerequisites.length === 0,
      requiredCourses: applicablePrereqs.map((p) => p.course_code),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllCourses,
  getCourseByCode,
  addCourse,
  deleteCourseByCode,
  editCourse,
  checkCoursePrerequisites,
};
