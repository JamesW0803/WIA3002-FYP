const express = require("express");
const router = express.Router();
const {
  getAllCurriculums,
  getCurriculumByProgramme,
  addCurriculum,
} = require("../controllers/curriculumController");

router.get("/", getAllCurriculums);
router.get("/:programme", getCurriculumByProgramme);
router.post("/", addCurriculum);

module.exports = router;
