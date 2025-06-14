const { formatProgrammeIntake , formatProgrammeIntakes } = require("../utils/formatter/programmeIntakeFormatter");

const ProgrammeIntake = require("../models/ProgrammeIntake");

const getAllProgrammeIntakes = async (req, res) => {
  try {
    const programmeIntakes = await ProgrammeIntake.find().populate("programme_id").populate("academic_session_id");
    res.status(200).json(formatProgrammeIntakes(programmeIntakes));
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error fetching programme intakes: ", error);
  }
};

// Add programme intake (unchanged)
const addProgrammeIntake = async (req, res) => {
  try {
    const {
      programme_intake_code,
      programme_id, 
      academic_session_id,
      number_of_students_enrolled,
      graduation_rate,
      min_semester,
      max_semester
    } = req.body;
    const newProgrameIntake = new ProgrammeIntake({
      programme_intake_code,
      programme_id,
      academic_session_id,
      number_of_students_enrolled,
      graduation_rate,
      min_semester,
      max_semester
    });

    const savedProgrameIntake = await newProgrameIntake.save();
    res.status(201).json(savedProgrameIntake);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error adding new academic session programme: ", error);
  }
};

const getProgrammeIntakeById = async (req, res) => {
  try {
    const { id } = req.params;

    const programmeIntake = await ProgrammeIntake.findOne({programme_intake_code : id})
      .populate("programme_id")
      .populate("academic_session_id");

    if (!programmeIntake) {
      return res.status(404).json({ message: "Programme intake not found" });
    }

    res.status(200).json(formatProgrammeIntake(programmeIntake));
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error fetching programme intake by ID:", error);
  }
};

const deleteProgrammeIntakeById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProgrammeIntake = await ProgrammeIntake.findOneAndDelete({programme_intake_code : id})

    if (!deletedProgrammeIntake) {
      return res.status(404).json({ message: "Programme intake not found" });
    }

    res.status(200).json(formatProgrammeIntake(deletedProgrammeIntake));
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error deleting programme intake by ID:", error);
  }
};


module.exports = {
  getAllProgrammeIntakes,
  addProgrammeIntake,
  getProgrammeIntakeById,
  deleteProgrammeIntakeById
};
