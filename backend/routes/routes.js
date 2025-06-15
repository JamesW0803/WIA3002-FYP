const express = require("express");
const router = express.Router();
const userRoutes = require("./userRoutes");
const courseRoutes = require("./courseRoutes");
const studentRoutes = require("./studentRoutes");
const curriculumRoutes = require("./curriculumRoutes");
const programmeRoutes = require("./programmeRoutes");
const academicSessionRoutes = require("./academicSessionRoutes");
const programmeIntakeRoutes = require("./programmeIntakeRoutes");
const academicProfileRoutes = require("./academicProfileRoutes");
const studentAcademicPlanRoutes = require("./studentAcademicPlanRoutes");
const { authenticate } = require("../middleware/authMiddleware");

// Mount routes
router.use("/user", userRoutes);
router.use("/courses", authenticate, courseRoutes);
router.use("/students", authenticate, studentRoutes);
router.use("/programmes", programmeRoutes);
router.use("/programme-intakes", programmeIntakeRoutes);
router.use("/academic-sessions", academicSessionRoutes);
router.use("/curriculums", curriculumRoutes);
router.use("/academic-profile", authenticate, academicProfileRoutes);
router.use("/academic-plans", studentAcademicPlanRoutes);

module.exports = router;
