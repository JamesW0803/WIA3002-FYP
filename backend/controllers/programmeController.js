const Programme = require("../models/Programme");
const ProgrammeIntake = require("../models/ProgrammeIntake");

const addProgramme = async (req, res) => {
  try {
    const { programme_name, programme_code, description, faculty, department } =
      req.body;
    const newProgramme = new Programme({
      programme_name,
      programme_code,
      description,
      faculty,
      department,
    });

    const savedProgramme = await newProgramme.save();
    res.status(201).json(savedProgramme);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error adding new programme: ", error);
  }
};

const addProgrammeIntake = async (req, res) => {
  try {
    const { programme_id, academic_session_id } = req.body;
    const newProgrameIntake = new ProgrammeIntake({
      programme_id,
      academic_session_id,
    });

    const savedProgrameIntake = await newProgrameIntake.save();
    res.status(201).json(savedProgrameIntake);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error adding new academic session programme: ", error);
  }
};

const getAllProgrammes = async (req, res) => {
  try {
    const programmes = await Programme.find({});
    res.status(200).json(programmes);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error fetching programmes: ", error);
  }
};

module.exports = {
  addProgramme,
  addProgrammeIntake,
  getAllProgrammes,
};
