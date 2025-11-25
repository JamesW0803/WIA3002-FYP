const express = require("express");
const router = express.Router();

const { checkRole, authenticate } = require("../middleware/authMiddleware");
const {
  addProgrammeIntake,
  getAllProgrammeIntakes,
  getProgrammeIntakeById,
  deleteProgrammeIntakeById,
  getProgrammeIntakeByCode,
  updateProgrammeIntake,
  getGraduationRequirementsForStudent,
  getProgrammePlanMappingByCode,
  editProgrammeIntake
} = require("../controllers/programmeIntakeController");

// Public routes (no auth required)

router.use(authenticate);
router.get(
  "/student/:studentId/requirements",
  getGraduationRequirementsForStudent
);
router.get(
  "/programme-intakes/:programme_intake_code/programme-plan",
  getProgrammePlanMappingByCode
);

// Admin-only routes
router.use(checkRole(["admin"]));
router.get("/", getAllProgrammeIntakes);
router.get("/refresh", updateProgrammeIntake);
router.get("/id/:id", getProgrammeIntakeById);
router.get("/:programme_intake_code", getProgrammeIntakeByCode);
router.put("/:programme_intake_id", editProgrammeIntake);
router.post("/", addProgrammeIntake);
router.delete("/:id", deleteProgrammeIntakeById);

module.exports = router;
