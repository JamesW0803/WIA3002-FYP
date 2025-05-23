const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
const Student = require("../models/Student");
const Admin = require("../models/Admin");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const jwt = require("jsonwebtoken");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");

const checkUsernameExists = async (username) => {
  const user = await User.findOne({ username });
  return !!user;
};

const checkEmailExists = async (email) => {
  const user = await User.findOne({ email });
  return !!user;
};

const register = async (req, res) => {
  let newUser = null;
  try {
    // Check if username already exists
    const usernameExists = await checkUsernameExists(req.body.name);
    if (usernameExists) {
      return res.status(400).json({
        message: "Username already exists",
        field: "username",
      });
    }

    // Check if email already exists
    const emailExists = await checkEmailExists(req.body.email);
    if (emailExists) {
      return res.status(400).json({
        message: "Email already exists",
        field: "email",
      });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    if (req.body.role === "student") {
      newUser = new Student({
        username: req.body.name,
        email: req.body.email,
        password: hashedPassword,
        faculty: req.body.faculty,
        department: req.body.department,
        programme: mongoose.Types.ObjectId.createFromHexString(
          req.body.programme
        ),
        contact: req.body.contact,
      });
    } else if (req.body.role === "admin") {
      newUser = new Admin({
        username: req.body.name,
        email: req.body.email,
        password: hashedPassword,
        contact: req.body.contact,
        access_level: req.body.access_level,
      });
    }

    const savedUser = await newUser.save();

    // Create corresponding User document
    const user = new User({
      username: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      role: req.body.role,
      userId: savedUser._id, // Reference to either Student or Admin
    });
    await user.save();

    res.status(201).json(savedUser);
  } catch (err) {
    console.error("Validation error:", err.message);
    res.status(500).json({
      message: "Error registering",
      error: err.message,
    });
  }
};

const login = async (req, res) => {
  const { identifier, password, role } = req.body;

  try {
    let user;
    if (identifier.includes("@")) {
      // Treat as email
      user = await User.findOne({ email: identifier, role });
    } else {
      // Treat as username
      user = await User.findOne({ username: identifier, role });
    }

    if (!user || user.role !== role) {
      return res.status(401).json({ message: "Invalid credentials or role" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const payload = {
      user_id: user.id,
      role: user.role,
    };

    const token = generateToken(payload, "1h");
    // Optionally return user details
    res
      .status(200)
      .json({ token, user: { username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;
    await sendEmail(email, {
      subject: "Password Reset",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link will expire in 15 minutes.</p>`,
    });

    res.status(200).json({ message: "Reset link sent" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error sending reset link", error: error.message });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.status(200).json({ message: "Password updated" });
  } catch (err) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }
};

module.exports = {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  checkUsernameExists,
  checkEmailExists,
};
