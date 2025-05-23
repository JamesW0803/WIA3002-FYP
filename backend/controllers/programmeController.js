const Programme = require("../models/Programme");
const ProgrammeIntake = require("../models/ProgrammeIntake");

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

// Add programme intake (unchanged)
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

module.exports = {
  addProgramme,
  addProgrammeIntake,
  getAllProgrammes,
  getProgrammesByDepartment,
  getAllDepartments,
};
