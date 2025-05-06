const express = require("express");
const router = express.Router();
const { getAllCourses, addCourse } = require("../controllers/courseController");

router.get("/", getAllCourses);
router.post("/", addCourse);

module.exports = router;
