const Course = require("../models/Course");
const { formatCourses , formatCourse } = require("../utils/formatter/courseFormatter");

const getAllCourses = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { course_code: { $regex: search, $options: "i" } },
          { course_name: { $regex: search, $options: "i" } },
        ],
      };
    }

    const courses = await Course.find(query).populate("prerequisites");
    const formattedCourses = formatCourses(courses)
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
    } = req.body;

    const newCourse = new Course({
      course_code,
      course_name,
      type,
      credit_hours,
      description,
      prerequisites,
      faculty,
      department,
      offered_semester,
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

    const course = await Course.findOne({course_code}).populate("prerequisites");

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

    const deletedCourse = await Course.findOneAndDelete({course_code});

    if (!deletedCourse) {
      return res.status(404).json({ message: "Course not exist" });
    }

    const formattedCourse = formatCourse(deletedCourse); 
    res.status(200).json();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllCourses,
  getCourseByCode,
  addCourse,
  deleteCourseByCode
};
