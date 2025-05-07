const Course = require("../models/Course");

const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find();
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addCourse = async (req, res) => {
  try {
    const {
      course_name,
      course_code,
      description,
      credit_hours,
      prerequisites,
      department,
      type,
      she_cluster,
      special_semester_only,
      is_mandatory_for_graduation,
    } = req.body;

    const newCourse = new Course({
      course_name,
      course_code,
      description,
      credit_hours,
      prerequisites,
      department,
      type,
      she_cluster,
      special_semester_only,
      is_mandatory_for_graduation,
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
