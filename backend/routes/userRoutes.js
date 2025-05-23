const express = require("express");
const router = express.Router();
const {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  checkUsernameExists,
  checkEmailExists,
} = require("../controllers/authController");

router.post("/", register);
router.post("/login", login);
router.post("/request-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.get("/check-username/:username", checkUsernameExists);
router.get("/check-email/:email", checkEmailExists);

module.exports = router;
