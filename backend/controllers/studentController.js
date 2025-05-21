const Student = require("../models/Student");
const { formatStudents } = require("../utils/formatter/studentFormatter");

const getAllStudents = async (req, res) => {
    try{
        const students = await Student.find().populate("programme")
        const formattedStudents = formatStudents(students)
        res.status(200).json(formattedStudents)
    }catch(error){
        res.status(500).json({message: error.message})
        console.log("Error fetching students: ", error)
    }
}

module.exports = {
    getAllStudents,
}