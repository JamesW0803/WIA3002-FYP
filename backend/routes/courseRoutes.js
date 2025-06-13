const express = require("express");
const router = express.Router();
const { checkRole } = require("../middleware/authMiddleware");
const { 
    getAllCourses, 
    addCourse, 
    getCourseByCode, 
    deleteCourseByCode 
} = require("../controllers/courseController");

router.use(checkRole(["student", "admin"]));

router.get("/", getAllCourses);
router.get("/:course_code", getCourseByCode)
router.delete("/:course_code", deleteCourseByCode)
router.post("/", addCourse);

module.exports = router;
