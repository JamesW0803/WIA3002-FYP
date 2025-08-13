const Course = require("../models/Course");
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

    const courses = await Course.find(query).populate({
      path: "prerequisites",
      select: "course_code course_name credit_hours", // Only include necessary fields
    });

    // Return minimal data if requested (for dropdowns, etc.)
    if (minimal === "true") {
      const minimalCourses = courses.map((course) => ({
        code: course.course_code,
        name: course.course_name,
        credit: course.credit_hours,
        prerequisites: course.prerequisites.map((p) => p.course_code),
      }));
      return res.status(200).json(minimalCourses);
    }

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
      prerequisites,
      faculty,
      department,
      offered_semester,
      study_level
    } = req.body;

    let prerequisitesCourseIds = [];

    if (prerequisites?.length > 0) {
      const prerequisiteCourses = await Promise.all(
        prerequisites.map((code) =>
          Course.findOne({ course_code: code })
        )
      );

      // Check for invalid prerequisite course codes
      if (prerequisiteCourses.includes(null)) {
        return res.status(400).json({ error: "One or more prerequisite course codes are invalid." });
      }

      prerequisitesCourseIds = prerequisiteCourses.map(course => course._id);
    }

    const newCourse = new Course({
      course_code,
      course_name,
      type,
      credit_hours,
      description,
      prerequisites : prerequisitesCourseIds,
      faculty,
      department,
      offered_semester,
      study_level
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

    const course = await Course.findOne({ course_code }).populate(
      "prerequisites"
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
  const updatedData = req.body;

  try {
    if (updatedData.prerequisites.length > 0) {
      const prereqCourse = await Course.findOne({
        course_code: updatedData.prerequisites[0],
      });
      if (!prereqCourse) {
        return res
          .status(400)
          .json({ message: "Invalid prerequisite course code" });
      }
      updatedData.prerequisites = [prereqCourse._id];
    }

    const updatedCourse = await Course.findOneAndUpdate(
      { course_code }, // filter
      updatedData, // updated fields
      { new: true } // return updated document
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not exist" });
    }

    res.status(200).json(updatedCourse);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update course", details: err.message });
  }
};

const checkCoursePrerequisites = async (req, res) => {
  try {
    const { courseCode, studentId } = req.params;
    const { year, semester } = req.query;

    // 1. Get the course with prerequisites
    const course = await Course.findOne({ course_code: courseCode }).populate({
      path: "prerequisites",
      select: "course_code course_name",
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // 2. Get student's academic profile
    const profile = await AcademicProfile.findOne({
      student: studentId,
    }).populate("entries.course");

    const isRetake = profile?.entries?.some(
      (entry) =>
        entry.course.course_code === courseCode && entry.status === "Failed"
    );

    if (isRetake) {
      return res.status(200).json({
        hasPrerequisites: course.prerequisites.length > 0,
        unmetPrerequisites: [],
        allPrerequisitesMet: true,
        requiredCourses: course.prerequisites.map((p) => p.course_code),
      });
    }

    // 3. Check prerequisites
    const unmetPrerequisites = (course.prerequisites || []).filter((prereq) => {
      return !profile?.entries?.some(
        (entry) =>
          entry.status === "Passed" &&
          entry.course.course_code === prereq.course_code &&
          (year
            ? entry.year < year ||
              (entry.year === year && entry.semester < semester)
            : true)
      );
    });

    res.status(200).json({
      hasPrerequisites: course.prerequisites.length > 0,
      unmetPrerequisites: unmetPrerequisites.map((p) => p.course_code),
      allPrerequisitesMet: unmetPrerequisites.length === 0,
      requiredCourses: course.prerequisites,
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
