const express = require("express");
const router = express.Router();
const {
  saveAcademicProfile,
  getAcademicProfile,
  getStudentIntakeInfo,
} = require("../controllers/studentAcademicProfileController");
const { authenticate, checkRole } = require("../middleware/authMiddleware");

// Ensure only students can access
router.use(authenticate);
router.use(checkRole(["student"]));

router.get("/student-profile/:id", getStudentIntakeInfo);

// Save or update academic profile
router.post("/:id", saveAcademicProfile);

// Optional: fetch saved academic profile
router.get("/:id", getAcademicProfile);

module.exports = router;
