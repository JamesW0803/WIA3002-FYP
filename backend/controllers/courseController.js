const Course = require("../models/Course");
const { formatCourses } = require("../utils/formatter/courseFormatter");

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

    const courses = await Course.find(query);
    res.status(200).json(courses);
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

module.exports = {
  getAllCourses,
  addCourse,
};
