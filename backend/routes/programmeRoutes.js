const express = require("express");
const router = express.Router();

const { checkRole, authenticate } = require("../middleware/authMiddleware");
const {
  addProgramme,
  addProgrammeIntake,
  getAllProgrammes,
  getAllDepartments,
  getProgrammesByDepartment,
} = require("../controllers/programmeController");

// Public routes (no auth required)
router.get("/", getAllProgrammes);
router.get("/departments", getAllDepartments);
router.get("/by-department/:department", getProgrammesByDepartment);

router.use(authenticate);
// Admin-only routes
router.use(checkRole(["admin"]));
router.post("/", addProgramme);
router.post("/intake", addProgrammeIntake);

module.exports = router;
