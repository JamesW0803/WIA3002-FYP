const express = require("express");
const userRoutes = require("./userRoutes");
const courseRoutes = require("./courseRoutes");
const studentRoutes = require("./studentRoutes");
const curriculumRoutes = require("./curriculumRoutes");
const programmeRoutes = require("./programmeRoutes");
const academicSessionRoutes = require("./academicSessionRoutes");
const programmeIntakeRoutes = require("./programmeIntakeRoutes");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.use("/user", userRoutes);
router.use("/courses", authenticate, courseRoutes);
router.use("/students", authenticate, studentRoutes);
// router.use("/programmes", authenticate, programmeRoutes);
router.use("/programmes", programmeRoutes);
router.use("/programme-intakes", programmeIntakeRoutes)
router.use("/academic-sessions", academicSessionRoutes);
router.use("/curriculums", curriculumRoutes);

module.exports = router;
