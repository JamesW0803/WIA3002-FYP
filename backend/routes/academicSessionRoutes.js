const express = require("express");
const router = express.Router();

const { checkRole, authenticate } = require("../middleware/authMiddleware");
const {
  addAcademicSession,
  getAllAcademicSessions,
  getCurrentAcademicSession,
  getAcademicSessionById,
} = require("../controllers/academicSessionController");

router.get("/", getAllAcademicSessions);

router.get("/current", authenticate, getCurrentAcademicSession);

router.use(authenticate);
router.use(checkRole(["admin"]));
router.post("/", addAcademicSession);
router.get("/:id", getAcademicSessionById);

module.exports = router;
