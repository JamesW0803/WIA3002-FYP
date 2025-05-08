const AcademicSession = require('../models/AcademicSession');

const addAcademicSession = async (req, res) => {
    try {
        const { year , semester } = req.body;
        const newAcademicSession = new AcademicSession({ year, semester });
        const savedSession = await newAcademicSession.save();
        res.status(201).json(savedSession);
    }catch(error){
        res.status(500).json({ message: "Error adding academic session", error });
        console.log("Error adding new academic session: ", error)
    }
}

module.exports = {
    addAcademicSession,
}