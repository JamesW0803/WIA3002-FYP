const express = require("express");
const router = express.Router();
const { getProgrammePlans } = require("../controllers/programmePlanController");
const { getAllStudents, getStudentByName } = require("../controllers/studentController");
const { checkRole } = require("../middleware/authMiddleware");


router.use(checkRole(["student", "admin"]))

router.get("/programme-plans", getProgrammePlans);
router.get("/", getAllStudents);
router.get("/:student_name", getStudentByName)

module.exports = router;
