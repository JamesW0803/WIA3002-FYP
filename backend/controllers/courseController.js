const Course = require("../models/Course");
const Programme = require("../models/Programme");
const {
  formatCourses,
  formatCourse,
} = require("../utils/formatter/courseFormatter");
const AcademicProfile = require("../models/StudentAcademicProfile");

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

    if (minimal === "true") {
      // leave this minimal block as-is; it doesn’t need programme-specific info
      const mini = await Course.find(query)
        .select(
          "course_code course_name credit_hours prerequisites offered_semester"
        )
        .populate({ path: "prerequisites", select: "course_code" });

      const minimalCourses = mini.map((course) => ({
        _id: course._id,
        code: course.course_code,
        name: course.course_name,
        credit: course.credit_hours,
        prerequisites: (course.prerequisites || []).map((p) => p.course_code),
        offered_semester: course.offered_semester,
      }));
      return res.status(200).json(minimalCourses);
    }

    const courses = await Course.find(query)
      .populate({
        path: "prerequisites",
        select: "course_code course_name credit_hours offered_semester",
      })
      .populate({
        path: "prerequisitesByProgramme.programme",
        select: "programme_name programme_code",
      })
      .populate({
        path: "prerequisitesByProgramme.prerequisites",
        select: "course_code course_name credit_hours",
      });

    const formattedCourses = formatCourses(courses);
    res.status(200).json(formattedCourses);
  } catch (error) {
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
      prerequisitesByProgramme = [], // 👈 accept it
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

    // ----- 3. Create course -----
    const newCourse = new Course({
      course_code,
      course_name,
      type,
      credit_hours,
      description,
      prerequisites: prerequisitesCourseIds,
      prerequisitesByProgramme: prereqsByProgrammeDocs, // 👈 save it
      faculty,
      department,
      offered_semester,
      study_level,
    });

    const savedCourse = await newCourse.save();
    res.status(201).json(savedCourse);
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
      );

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

    // ----- 3. Build update payload -----
    const updatedData = {
      ...rest,
      prerequisites: prereqCourses,
      prerequisitesByProgramme: prereqsByProgrammeDocs,
    };

    const updatedCourse = await Course.findOneAndUpdate(
      { course_code },
      updatedData,
      { new: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not exist" });
    }

    res.status(200).json(updatedCourse);
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
    const { year, semester } = req.query;

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
    const isRetake = profile.entries?.some(
      (entry) =>
        entry.course.course_code === courseCode && entry.status === "Failed"
    );

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

        const beforeCurrentSem = year
          ? entry.year < year ||
            (entry.year === year && entry.semester < semester)
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
