const express = require("express");
const router = express.Router();

const { checkRole, authenticate } = require("../middleware/authMiddleware");
const {
  addProgrammeIntake,
  getAllProgrammeIntakes,
  getProgrammeIntakeById,
  deleteProgrammeIntakeById,
  getProgrammeIntakeByCode,
  syncNumberOfStudentEnrolled,
} = require("../controllers/programmeIntakeController");

// Public routes (no auth required)

router.use(authenticate);

// Admin-only routes
router.use(checkRole(["admin"]));
router.get("/", getAllProgrammeIntakes);
router.get("/refresh", syncNumberOfStudentEnrolled);
router.get("/id/:id", getProgrammeIntakeById);
router.get("/:programme_intake_code", getProgrammeIntakeByCode);
router.post("/", addProgrammeIntake);
router.delete("/:id", deleteProgrammeIntakeById);

module.exports = router;
