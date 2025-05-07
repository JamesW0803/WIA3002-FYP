const express = require("express");
const router = express.Router();
const { getProgrammePlans } = require("../controllers/programmePlanController");
const { checkRole } = require("../middleware/authMiddleware");


router.use(checkRole(["student"]))

router.get("/programme-plans", getProgrammePlans);

module.exports = router;
