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
const path = require("path");
const multer = require("multer");

const { BlobServiceClient } = require("@azure/storage-blob");
const upload = multer({ storage: multer.memoryStorage() });

const checkUsernameExists = async (username) => {
  const user = await User.findOne({ username });
  return !!user;
};

const checkEmailExists = async (email) => {
  const user = await User.findOne({ email });
  return !!user;
};

// authController.js
const register = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    // wrap all of steps 2–4 in a withTransaction so it retries on transient errors
    let newUserDoc;
    await session.withTransaction(async () => {
      // 2a) username clash?
      if (await User.findOne({ username: req.body.name }).session(session)) {
        throw new Error("USERNAME_EXISTS");
      }
      // 2b) email clash?
      if (await User.findOne({ email: req.body.email }).session(session)) {
        throw new Error("EMAIL_EXISTS");
      }

      // 3) hash
      const hashed = await bcrypt.hash(req.body.password, saltRounds);

      // 4) discriminator
      if (req.body.role === "student") {
        newUserDoc = new Student({
          username: req.body.name,
          email: req.body.email,
          password: hashed,
          role: "student", // discriminatorKey
          contact: req.body.contact,
          faculty: req.body.faculty,
          department: req.body.department,
          programme: req.body.programme,
          academicSession: req.body.academicSession,
          semester: req.body.semester,
        });
      } else if (req.body.role === "admin") {
        newUserDoc = new Admin({
          username: req.body.name,
          email: req.body.email,
          password: hashed,
          role: "admin", // discriminatorKey
          contact: req.body.contact,
          access_level: req.body.access_level,
        });
      } else {
        throw new Error("INVALID_ROLE");
      }

      await newUserDoc.save({ session });
    });

    // committed successfully
    res.status(201).json({ message: "Registration successful" });
  } catch (err) {
    // map our thrown errors to nice responses
    if (err.message === "USERNAME_EXISTS") {
      return res
        .status(400)
        .json({ message: "Username already exists", field: "username" });
    }
    if (err.message === "EMAIL_EXISTS") {
      return res
        .status(400)
        .json({ message: "Email already exists", field: "email" });
    }
    if (err.message === "INVALID_ROLE") {
      return res.status(400).json({ message: "Invalid role" });
    }

    console.error("Registration error:", err);
    res.status(500).json({ message: "Error registering", error: err.message });
  } finally {
    session.endSession();
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

const getStudentProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const student = await Student.findById(userId)
      // pull in the programme’s human‐readable field
      .populate({ path: "programme", select: "programme_name" })
      // pull in _both_ year and semester from the session
      .populate({ path: "academicSession", select: "year semester" });

    if (!student) return res.status(404).json({ message: "Student not found" });

    res.status(200).json({
      fullName: student.fullName,
      email: student.email,
      phone: student.contact,
      address: student.address,
      department: student.department,
      programme: student.programme ? student.programme.programme_name : "-",
      intakeYear: student.academicSession?.year || null,
      intakeSemester: student.academicSession?.semester || null,
      // (you can still keep the formatted string if you like)
      intake: student.academicSession
        ? `${student.academicSession.year} – ${student.academicSession.semester}`
        : "-",
      username: student.username,
      profileColor: student.profileColor,
      profilePicture: student.profilePicture,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch student profile", error });
  }
};

const updateStudentProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { fullName, phone, address, profileColor, removeProfilePic } =
      req.body;
    const update = {
      fullName,
      contact: phone,
      address,
      profileColor,
    };

    if (removeProfilePic === "true") {
      update.profilePicture = null;
    }

    if (req.file) {
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING
      );
      const containerClient = blobServiceClient.getContainerClient(
        process.env.AZURE_STORAGE_CONTAINER_NAME
      );

      // you could nest by userId for organization
      const blobName = `profilePics/${userId}/${Date.now()}_${
        req.file.originalname
      }`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // uploadData takes the buffer from multer
      await blockBlobClient.uploadData(req.file.buffer, {
        blobHTTPHeaders: { blobContentType: req.file.mimetype },
      });

      // the URL of the blob is public (if your container is public)
      update.profilePicture = blockBlobClient.url;
    }

    const student = await Student.findByIdAndUpdate(userId, update, {
      new: true,
    });

    if (!student) return res.status(404).json({ message: "Student not found" });

    res.json({
      name: student.username,
      email: student.email,
      phone: student.contact,
      address: student.address,
      profileColor: student.profileColor,
      profilePicture: student.profilePicture,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating profile", error: err });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user.user_id; // set by your `authenticate` middleware
    const { currentPassword, newPassword } = req.body;

    // 1. Fetch the user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // 3. Reject if newPassword === old password
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res
        .status(400)
        .json({ message: "New password must be different from old password" });
    }

    // 4. Hash & save the new password
    user.password = await bcrypt.hash(newPassword, saltRounds);
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Error changing password:", err);
    res.status(500).json({ message: "Error changing password" });
  }
};

module.exports = {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  checkUsernameExists,
  checkEmailExists,
  getStudentProfile,
  updateStudentProfile,
  upload,
  changePassword,
};
