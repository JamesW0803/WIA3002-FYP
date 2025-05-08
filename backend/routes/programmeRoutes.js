const express = require("express");
const router = express.Router();

const { checkRole } = require("../middleware/authMiddleware");
const { addProgramme, addProgrammeIntake } = require("../controllers/programmeController");

router.use(checkRole(["admin"]));

router.post("/", addProgramme);
router.post("/intake", addProgrammeIntake);

module.exports = router;