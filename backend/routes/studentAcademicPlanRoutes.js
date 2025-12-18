const express = require("express");
const router = express.Router();
const academicPlanController = require("../controllers/studentAcademicPlanController");
const { authenticate } = require("../middleware/authMiddleware");

// Apply auth middleware to all routes
router.use(authenticate);

// 1. Create a plan & list all for a student:
router.post("/students/:studentId/plans", academicPlanController.createPlan);
router.get("/students/:studentId/plans", academicPlanController.getUserPlans);

// 2. Operations on a single plan by its own identifier:
router.get("/plans/:planId", academicPlanController.getPlanById);
router.put("/plans/:planId", academicPlanController.updatePlan);
router.patch("/plans/:planId/status", academicPlanController.updatePlanStatus);
router.delete("/plans/:planId", academicPlanController.deletePlan);
router.patch(
  "/plans/:planId/set-default",
  academicPlanController.setDefaultPlan
);

module.exports = router;
