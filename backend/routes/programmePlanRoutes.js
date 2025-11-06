const express = require("express");
const router = express.Router();

const { checkRole, authenticate } = require("../middleware/authMiddleware");
const {
    getProgrammePlans,
    getProgrammePlanById
} = require("../controllers/programmePlanController");

// Public routes (no auth required)

router.use(authenticate);

// Admin-only routes
router.use(checkRole(["admin"]));
router.get("/:id", getProgrammePlanById);
router.get("/", getProgrammePlans);

module.exports = router;
