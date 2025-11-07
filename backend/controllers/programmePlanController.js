const Student = require("../models/Student");
const ProgrammePlan = require("../models/ProgrammePlan");

const getProgrammePlans = async (req, res) => {
  try {
    const student = await Student.findOne({
      email: "kennedy@gmail.com", //this is hardcoded, need further dev
    }).populate({
      path: "programme_plans",
      select: "semester_plans title",
      populate: {
        path: "semester_plans",
        select: "courses session",
        populate: {
          path: "courses",
          select: "course_code course_name",
        },
      },
    });

    res.status(200).json(student);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getProgrammePlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const programmePlan = await ProgrammePlan.findById(id).populate({
      path: "semester_plans",
      populate: [
        {path: "courses"},
        {path: "academic_session_id"}
      ]
    });
    res.status(200).json(programmePlan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getProgrammePlans,
  getProgrammePlanById
};
