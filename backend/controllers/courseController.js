const Course = require('../models/Course');


const getAllCourses = async (req, res) => {
    let courses = null;
    try{
        courses = await Course.find();
    }finally{
        res.status(200).json(courses);
    }
}

const addCourse = async (req, res) => {
  console.log(req.body);
    try {
      // Create a new Course object from the request body
      const newCourse = new Course({
        course_name: req.body.course_name,
        course_code: req.body.course_code,
        description: req.body.description,
        credit_hours: req.body.credit_hours,
      });
  
      // Save the new course to MongoDB
      const savedCourse = await newCourse.save();
  
      // Respond with the saved course
      res.status(201).json(savedCourse);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getAllCourses,
    addCourse,
}