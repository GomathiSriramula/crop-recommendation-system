const express = require("express");
const { rateLimit } = require("express-rate-limit");

const { currentUser, login, register } = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");
const { handleValidationErrors } = require("../middleware/validation");
const { loginValidation, registerValidation } = require("../middleware/validators");

const router = express.Router();
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later" },
});

router.post("/register", authRateLimit, registerValidation, handleValidationErrors, register);
router.post("/login", authRateLimit, loginValidation, handleValidationErrors, login);
router.get("/me", requireAuth, currentUser);

module.exports = router;
