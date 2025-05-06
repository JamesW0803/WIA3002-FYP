const Student = require("../models/Student");

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

module.exports = {
  getProgrammePlans,
};
