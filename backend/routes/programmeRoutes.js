const express = require("express");
const router = express.Router();

const { checkRole, authenticate } = require("../middleware/authMiddleware");
const {
  addProgramme,
  addProgrammeIntake,
  getAllProgrammes,
} = require("../controllers/programmeController");

router.use(authenticate);
// Public routes (no auth required)
router.get("/", getAllProgrammes);

// Admin-only routes
router.use(checkRole(["admin"]));
router.post("/", addProgramme);
router.post("/intake", addProgrammeIntake);

module.exports = router;
