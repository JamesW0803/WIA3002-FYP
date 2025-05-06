const Student = require("../models/Student");
const Admin = require("../models/Admin");
const User = require("../models/User");
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

const loginUser = async (req, res) => {
  const { identifier, password, role } = req.body;

  try {
    let user;
    if (identifier.includes("@")) {
      // Treat as email
      user = await User.findOne({ email: identifier, role });
    } else {
      // Treat as username
      user = await User.findOne({ name: identifier, role });
    }

    if (!user || user.role !== role) {
      return res.status(401).json({ message: "Invalid credentials or role" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Optionally return user details
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

module.exports = {
  createUser,
  loginUser,
};
