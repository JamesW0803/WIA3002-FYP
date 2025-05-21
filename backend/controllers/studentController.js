const Student = require("../models/Student");

const getAllStudents = async (req, res) => {
    try{
        const students = await Student.find()
        res.status(200).json(students)
    }catch(error){
        res.status(500).json({message: error.message})
        console.log("Error fetching students: ", error)
    }
}

module.exports = {
    getAllStudents,
}