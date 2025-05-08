const express = require("express");
const router = express.Router();

const { checkRole } = require("../middleware/authMiddleware");
const { addAcademicSession } = require("../controllers/academicSessionController");

router.use(checkRole(["admin"]));

router.post("/", addAcademicSession);

module.exports = router;