const express = require("express");
const router = express.Router();
const { getAllCourses, addCourse } = require("../controllers/courseController");
const { checkRole } = require("../middleware/authMiddleware");

router.use(checkRole(["student", "admin"]));

router.get("/", getAllCourses);
router.post("/", addCourse);

module.exports = router;
