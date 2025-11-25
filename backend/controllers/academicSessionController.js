const AcademicSession = require("../models/AcademicSession");
const { SEMESTER_1 , SEMESTER_2 } = require("../constants/semesters")

const addAcademicSession = async (req, res) => {
  try {
    const { year, semester, isCurrent, next, previous } = req.body;

    // Validate year format, for debugging in Postman only
    if (!/^\d{4}\/\d{4}$/.test(year?.trim())) {
      return res.status(400).json({
        message: 'Year must be in format "YYYY/YYYY"',
      });
    }

    // Check if session already exists, for debugging in Postman only
    const existingSession = await AcademicSession.findOne({ year, semester });
    if (existingSession) {
      return res.status(400).json({
        message: "Academic session already exists",
      });
    }

    // If this session is being marked as current, unset any existing current session
    if (isCurrent) {
      await AcademicSession.updateMany(
        { isCurrent: true },
        { $set: { isCurrent: false } }
      );
    }

    const newAcademicSession = new AcademicSession({
      year,
      semester,
      isCurrent,
      next: next ?? null,
      previous: previous ?? null,
    });
    const savedSession = await newAcademicSession.save();
    res.status(201).json(savedSession);
  } catch (error) {
    console.error("Error adding new academic session:", error);
    res.status(500).json({
      message: "Error adding academic session",
      error: error.message,
    });
  }
};

const getAllAcademicSessions = async (req, res) => {
  try {
    // Sort by year (descending) and semester (ascending)
    const sessions = await AcademicSession.find()
      .collation({ locale: "en_US", numericOrdering: true }) // Enable numeric sorting
      .sort({
        year: -1,
        semester: 1,
      });

    res.status(200).json(sessions);
  } catch (error) {
    console.error("Error fetching academic sessions:", error);
    res.status(500).json({
      message: "Error fetching academic sessions",
      error: error.message,
    });
  }
};

const getCurrentAcademicSession = async (req, res) => {
  try {
    const currentSession = await AcademicSession.findOne({ isCurrent: true });

    if (!currentSession) {
      return res
        .status(404)
        .json({ message: "No current academic session found" });
    }

    res.status(200).json(currentSession);
  } catch (error) {
    console.error("Error fetching current academic session:", error);
    res.status(500).json({
      message: "Error fetching current academic session",
      error: error.message,
    });
  }
};

const getAcademicSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    const academicSession = await AcademicSession.findById(id);

    if (!academicSession) {
      return res.status(404).json({ message: "Academic session not found" });
    }

    res.status(200).json(academicSession);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createNextAcademicSession = async (currentAcademicSession) => {
  if (!currentAcademicSession) throw new Error("Current academic session is required");

  // Extract current year and semester
  const [startYear, endYear] = currentAcademicSession.year.split("/").map(Number);
  const currentSemester = currentAcademicSession.semester;

  // Determine next semester and year
  let nextSemester = "";
  let nextStartYear = startYear
  let nextEndYear = endYear;

  if(currentSemester === SEMESTER_1){
    nextSemester = SEMESTER_2
  }else if(currentSemester === SEMESTER_2){
    nextSemester = SEMESTER_1
    nextStartYear  +=1
    nextEndYear  +=1
  }

  const nextYear = `${nextStartYear}/${nextEndYear}`;

  // Check if session already exists
  let nextSession = await AcademicSession.findOne({ year: nextYear, semester: nextSemester });
  if (!nextSession) {
    nextSession = await AcademicSession.create({
      year: nextYear,
      semester: nextSemester,
      previous: currentAcademicSession._id,
      next : null,
      isCurrent : false
    });

    // Link current session to next
    currentAcademicSession.next = nextSession._id;
    await currentAcademicSession.save();
  }

  return nextSession;
};

module.exports = {
  addAcademicSession,
  getAllAcademicSessions,
  getCurrentAcademicSession,
  getAcademicSessionById,
  createNextAcademicSession
};
