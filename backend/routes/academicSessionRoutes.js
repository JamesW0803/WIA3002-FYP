const express = require("express");
const router = express.Router();

const { checkRole, authenticate } = require("../middleware/authMiddleware");
const {
  addAcademicSession,
  getAllAcademicSessions,
} = require("../controllers/academicSessionController");

router.get("/", getAllAcademicSessions);

router.use(authenticate);
router.use(checkRole(["admin"]));
router.post("/", addAcademicSession);

module.exports = router;
