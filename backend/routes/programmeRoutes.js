const express = require("express");
const router = express.Router();

const { checkRole, authenticate } = require("../middleware/authMiddleware");
const {
  addProgramme,
  addProgrammeIntake,
  getAllProgrammes,
} = require("../controllers/programmeController");

// Public routes (no auth required)
router.get("/getAllProgrammes", getAllProgrammes);

// Admin-only routes
router.use(authenticate);
router.use(checkRole(["admin"]));
router.post("/", addProgramme);
router.post("/intake", addProgrammeIntake);

module.exports = router;
