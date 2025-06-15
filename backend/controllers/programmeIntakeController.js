const { formatProgrammeIntake , formatProgrammeIntakes } = require("../utils/formatter/programmeIntakeFormatter");

const ProgrammeIntake = require("../models/ProgrammeIntake");
const Programme = require("../models/Programme");
const AcademicSession = require("../models/AcademicSession");

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
      programme_code,
      year,
      semester,
      number_of_students_enrolled,
      graduation_rate,
      min_semester,
      max_semester
    } = req.body;

    const programme = await Programme.findOne({ programme_code });
    if (!programme) {
      return res.status(404).json({ message: "Programme not found" });
    }

    const academicSession = await AcademicSession.findOne({ year, semester });
    if (!academicSession) {
      return res.status(404).json({ message: "Academic session not found" });
    }

    const programme_intake_code = `${programme_code}-${year}-${semester}`;

    const newProgrameIntake = new ProgrammeIntake({
      programme_intake_code : generateProgrammeIntakeCode(programme, year, semester),
      programme_id : programme._id,
      academic_session_id : academicSession._id,
      number_of_students_enrolled : number_of_students_enrolled ?? 0,
      graduation_rate : graduation_rate ?? 0,
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

const generateProgrammeIntakeCode = ( programme, year, semester) => {
  // Split year from "2023/2024" to "23" and "24"
  const [startYear, endYear] = year.split("/").map((y) => y.slice(-2)); // ["23", "24"]

  // Convert semester to short form
  const semesterMap = {
    "Semester 1": "S1",
    "Semester 2": "S2",
    "Special Semester": "SS",
  };
  const shortSemester = semesterMap[semester] || semester.replace(/\s+/g, '').toUpperCase(); // fallback

  const programmeIntakeCode = `${programme.programme_code}-${startYear}-${endYear}-${shortSemester}`;
  return programmeIntakeCode
}


module.exports = {
  getAllProgrammeIntakes,
  addProgrammeIntake,
  getProgrammeIntakeById,
  deleteProgrammeIntakeById
};
