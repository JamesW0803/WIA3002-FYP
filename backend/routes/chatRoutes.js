const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/authMiddleware");
const chatController = require("../controllers/chatController");

// Conversations
router.post("/conversations", authenticate, chatController.createConversation);
router.post(
  "/conversations/create-or-get",
  authenticate,
  chatController.createOrGetConversation
);
router.get("/conversations", authenticate, chatController.listConversations);
router.patch(
  "/conversations/:id/status",
  authenticate,
  chatController.updateConversationStatus
);
router.delete(
  "/conversations/:id",
  authenticate,
  chatController.deleteConversation
);

// Messages
router.get("/messages", authenticate, chatController.getMessages);

// Unread counts
router.get("/unread-counts", authenticate, chatController.getUnreadCounts);

router.get(
  "/conversations/:id",
  authenticate,
  chatController.getConversationById
);

// Upload URL (Azure)
router.post("/upload-url", authenticate, chatController.getUploadUrl);

// Admin-only “advise”
router.post(
  "/conversations/advise-on-course-plan",
  authenticate,
  chatController.adviseOnCoursePlan
);

router.post(
  "/conversations/review-request",
  authenticate,
  chatController.createReviewRequestConversation
);

module.exports = router;
