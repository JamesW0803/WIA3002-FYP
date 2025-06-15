const Programme = require("../models/Programme");
const ProgrammeIntake = require("../models/ProgrammeIntake");
const { formatProgramme , formatProgrammes } = require("../utils/formatter/programmeFormatter");

// Helper function to validate department
const validateDepartment = (department) => {
  const decodedDepartment = decodeURIComponent(department);

  const validDepartments = [
    "Department of Software Engineering",
    "Department of Artificial Intelligence",
    "Department of Computer System and Technology",
    "Department of Information System",
    "Multimedia Unit",
  ];
  return validDepartments.includes(decodedDepartment);
};

// Add new programme (unchanged)
const addProgramme = async (req, res) => {
  try {
    const { programme_name, programme_code, description, faculty, department } =
      req.body;

    // Validate department
    if (!validateDepartment(department)) {
      return res.status(400).json({ error: "Invalid department specified" });
    }

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

// Get all programmes (with optional filtering)
const getAllProgrammes = async (req, res) => {
  try {
    const { department } = req.query;
    let query = {};

    if (department) {
      if (!validateDepartment(department)) {
        return res.status(400).json({ error: "Invalid department specified" });
      }
      query.department = department;
    }

    const programmes = await Programme.find(query);
    res.status(200).json(programmes);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log("Error fetching programmes: ", error);
  }
};

// Get programmes by department (new endpoint)
const getProgrammesByDepartment = async (req, res) => {
  try {
    let { department } = req.params;
    department = decodeURIComponent(department);

    if (!validateDepartment(department)) {
      return res.status(400).json({
        message: "Invalid department specified",
        received: department,
        validDepartments: [
          "Department of Software Engineering",
          "Department of Artificial Intelligence",
          "Department of Computer System and Technology",
          "Department of Information System",
          "Multimedia Unit",
        ],
      });
    }

    const programmes = await Programme.find({ department }).select(
      "_id programme_name programme_code"
    );

    res.json(programmes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all distinct departments (new endpoint)
const getAllDepartments = async (req, res) => {
  try {
    const departments = await Programme.distinct("department");
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getProgrammeByCode = async (req, res) => {
  try {
    const { programme_code } = req.params;

    const programme = await Programme.findOne({programme_code});

    if (!programme) {
      return res.status(404).json({ message: "Programme not found" });
    }

    const formattedProgramme = formatProgramme(programme)
    res.status(200).json(formattedProgramme);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteProgrammeByCode = async (req, res) => {
  try {
    const { programme_code } = req.params;

    const deletedProgramme = await Programme.findOneAndDelete({programme_code});

    if (!deletedProgramme) {
      return res.status(404).json({ message: "Programme not exist" });
    }

    res.status(200).json(deletedProgramme);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const editProgramme = async (req, res) => {
  const { programme_code } = req.params;
  const updatedData = req.body;

  try {
    const updatedProgramme = await Programme.findOneAndUpdate(
      { programme_code },        // filter
      updatedData,            // updated fields
      { new: true }           // return updated document
    );

    if (!updatedProgramme) {
      return res.status(404).json({ message: 'Programme not exist' });
    }

    res.status(200).json(updatedProgramme);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update programme', details: err.message });
  }
};

module.exports = {
  addProgramme,
  getAllProgrammes,
  getProgrammesByDepartment,
  getAllDepartments,
  getProgrammeByCode,
  editProgramme,
  deleteProgrammeByCode
};
