const express = require("express");

const { recommend } = require("../controllers/recommendController");
const { requireAuth } = require("../middleware/authMiddleware");
const { handleValidationErrors } = require("../middleware/validation");
const { recommendationValidation } = require("../middleware/validators");

const router = express.Router();

router.post(
  "/",
  requireAuth,
  recommendationValidation,
  handleValidationErrors,
  recommend,
);

module.exports = router;
