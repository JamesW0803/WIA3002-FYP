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
} = require("../controllers/authController");

router.post("/", register);
router.post("/login", login);
router.post("/request-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.get("/check-username/:username", checkUsernameExists);
router.get("/check-email/:email", checkEmailExists);
router.get("/student-profile/:userId", getStudentProfile);

module.exports = router;
