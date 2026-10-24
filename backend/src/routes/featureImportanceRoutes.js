const express = require("express");

const { featureImportance } = require("../controllers/featureImportanceController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", requireAuth, featureImportance);

module.exports = router;
