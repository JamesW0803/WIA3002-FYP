const express = require("express");
const router = express.Router();
const {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  checkUsernameExists,
  checkEmailExists,
  getStudentProfile,
  updateStudentProfile,
  updateAdminById,
  upload,
  changePassword,
  getAdminByUsername,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

router.post("/", register);
router.post("/login", login);
router.post("/request-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.get("/check-username/:username", checkUsernameExists);
router.get("/check-email/:email", checkEmailExists);
router.get("/student-profile/:userId", getStudentProfile);
router.get("/admin/:username", getAdminByUsername);
router.put("/admin/:userId", updateAdminById);
router.put(
  "/student-profile/:userId",
  authenticate,
  upload.single("profilePic"),
  updateStudentProfile
);
router.put("/change-password", authenticate, changePassword);

module.exports = router;
