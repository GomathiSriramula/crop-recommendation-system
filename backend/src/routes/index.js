const express = require("express");
const authRoutes = require("./authRoutes");
const featureImportanceRoutes = require("./featureImportanceRoutes");
const healthRoutes = require("./healthRoutes");
const historyRoutes = require("./historyRoutes");
const recommendRoutes = require("./recommendRoutes");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/feature-importance", featureImportanceRoutes);
router.use("/history", historyRoutes);
router.use("/recommend", recommendRoutes);

module.exports = router;
