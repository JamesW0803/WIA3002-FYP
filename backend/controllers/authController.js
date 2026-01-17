const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
const Student = require("../models/student");
const Admin = require("../models/admin");
const ProgrammeIntake = require("../models/ProgrammeIntake");
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

const usernameExists = async (username) => {
  const user = await User.findOne({ username });
  return !!user;
};

const emailExists = async (email) => {
  const user = await User.findOne({ email });
  return !!user;
};

const checkUsernameExists = async (req, res) => {
  try {
    const username = req.params.username;
    const exists = await usernameExists(username);
    return res.json({ exists });
  } catch (err) {
    console.error("Error checking username:", err);
    return res.status(500).json({ message: "Error checking username" });
  }
};

const checkEmailExists = async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email || "")
      .trim()
      .toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ exists: false, message: "Invalid email format" });
    }

    const exists = await emailExists(email);
    return res.json({ exists });
  } catch (err) {
    console.error("Error checking email:", err);
    return res.status(500).json({ message: "Error checking email" });
  }
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

      const matricNo = req.body.email.split("@")[0];
      // 2c) matric no clash?
      if (await User.findOne({ matricNo: matricNo }).session(session)) {
        throw new Error("MATRIC_NO_EXISTS");
      }

      // 3) hash
      const hashed = await bcrypt.hash(req.body.password, saltRounds);

      // 4) discriminator
      if (req.body.role === "student") {
        const intake = await ProgrammeIntake.findOne({
          programme_id: req.body.programme,
          academic_session_id: req.body.academicSession,
        }).session(session);
        newUserDoc = new Student({
          username: req.body.name,
          matricNo: matricNo,
          email: req.body.email,
          password: hashed,
          role: "student", // discriminatorKey
          contact: req.body.contact,
          faculty: req.body.faculty,
          department: req.body.department,
          programme: req.body.programme,
          academicSession: req.body.academicSession,
          semester: req.body.semester,
          programme_intake: intake?._id || null,
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
    if (err.message === "MATRIC_NO_EXISTS") {
      return res
        .status(400)
        .json({ message: "Matric number already exists", field: "matricNo" });
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
      ...(user.role === "admin" && { access_level: user.access_level }),
    };

    const token = generateToken(payload, "1h");
    // Optionally return user details
    res.status(200).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        access_level: user.access_level,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const emailNormalized = (email || "").trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(emailNormalized)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Basic validation
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: emailNormalized });

    // Security choice:
    // Option 1 (recommended): ALWAYS return 200 to avoid email enumeration
    // Option 2: return 404 (your current behavior)
    if (!user) {
      return res
        .status(200)
        .json({ message: "If the email exists, a reset link has been sent." });
    }

    const token = jwt.sign(
      { id: user._id.toString(), purpose: "password_reset" },
      process.env.RESET_PASSWORD_SECRET,
      { expiresIn: "15m" },
    );

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;

    await sendEmail(email, {
      subject: "Password Reset",
      html: `
        <p>You requested to reset your password.</p>
        <p>Click the link below to reset it (expires in 15 minutes):</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>If you didn’t request this, you can ignore this email.</p>
      `,
    });

    return res
      .status(200)
      .json({ message: "If the email exists, a reset link has been sent." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error sending reset link" });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    if (!token || !password) {
      return res
        .status(400)
        .json({ message: "Token and password are required" });
    }

    // (Optional) enforce password strength on backend too
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const decoded = jwt.verify(token, process.env.RESET_PASSWORD_SECRET);

    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({ message: "Invalid token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    return res.status(200).json({ message: "Password updated" });
  } catch (err) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }
};

const getAdminByUsername = async (req, res) => {
  try {
    const username = req.params.username;
    const admin = await Admin.findOne({ username });

    if (!admin) return res.status(404).json({ message: "Admin not found" });

    res.status(200).json({
      email: admin.email,
      contact: admin.contact,
      username: admin.username,
      access_level: admin.access_level,
      role: "admin",
      createdAt: admin.createdAt,
      profileColor: admin.profileColor,
      profilePicture: admin.profilePicture,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch admin profile", error });
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
      intake: student.academicSession
        ? `${student.academicSession.year} – ${student.academicSession.semester}`
        : "-",
      username: student.username,
      matricNo: student.matricNo,
      profileColor: student.profileColor,
      profilePicture: student.profilePicture,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch student profile", error });
  }
};

const updateAdminById = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { username, contact } = req.body;
    const update = { username, contact };

    const admin = await Admin.findByIdAndUpdate(userId, update, {
      new: true,
    });

    if (!admin) return res.status(404).json({ message: "Admin not found" });

    res.json({
      username: admin.username,
      contact: admin.contact,
      email: admin.email,
      access_level: admin.access_level,
      role: "admin",
      createdAt: admin.createdAt,
      profileColor: admin.profileColor,
      profilePicture: admin.profilePicture,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating profile", error: err });
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
        process.env.AZURE_STORAGE_CONNECTION_STRING,
      );
      const containerClient = blobServiceClient.getContainerClient(
        process.env.AZURE_STORAGE_CONTAINER_NAME,
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
  getAdminByUsername,
  updateStudentProfile,
  updateAdminById,
  upload,
  changePassword,
};
