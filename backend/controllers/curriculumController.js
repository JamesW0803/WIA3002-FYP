const Curriculum = require("../models/Curriculum");

const getAllCurriculums = async (req, res) => {
  try {
    const data = await Curriculum.find().populate(
      "structure.courses",
      "course_code course_name credit_hours"
    );
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCurriculumByProgramme = async (req, res) => {
  try {
    const { programme } = req.params;
    const curriculum = await Curriculum.findOne({ programme }).populate(
      "structure.courses"
    );
    if (!curriculum) {
      return res.status(404).json({ message: "Curriculum not found" });
    }
    res.status(200).json(curriculum);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addCurriculum = async (req, res) => {
  try {
    const newCurriculum = new Curriculum(req.body);
    const saved = await newCurriculum.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getAllCurriculums,
  getCurriculumByProgramme,
  addCurriculum,
};
