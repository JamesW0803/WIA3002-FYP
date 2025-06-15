const Student = require("../models/Student");
const ProgrammeIntake = require("../models/ProgrammeIntake");
const AcademicSession = require("../models/AcademicSession");
const { formatStudents, formatStudent } = require("../utils/formatter/studentFormatter");

const getAllStudents = async (req, res) => {
    try{
        const students = await Student.find().populate("programme")
        
        const formattedStudents = await formatStudents(students)
        res.status(200).json(formattedStudents)
    }catch(error){
        res.status(500).json({message: error.message})
        console.log("Error fetching students: ", error)
    }
}

const getStudentByName = async (req, res) => {
  try {
    const { student_name } = req.params;

    const student = await Student.findOne({ username : student_name }).populate("programme").populate("programme_intake");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const formattedStudent = await formatStudent(student); 
    res.status(200).json(formattedStudent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
    getAllStudents,
    getStudentByName
}