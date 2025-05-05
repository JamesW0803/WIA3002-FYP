const Student = require("../models/Student");
const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const createUser = async (req, res) => {
  let newUser = null;
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    if (req.body.role === "student") {
      newUser = new Student({
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword,
        faculty: req.body.faculty,
        department: req.body.department,
        programme: req.body.programme,
      });
    } else if (req.body.role === "admin") {
      newUser = new Admin({
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword,
        access_level: req.body.access_level,
      });
    }

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({
      message: "Error creating user",
      error: err.message,
    });
  }
};

module.exports = {
  createUser,
};
