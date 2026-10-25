const express = require("express");
const { rateLimit } = require("express-rate-limit");

const { counterfactual } = require("../controllers/counterfactualController");
const { requireAuth } = require("../middleware/authMiddleware");
const { handleValidationErrors } = require("../middleware/validation");
const { counterfactualValidation } = require("../middleware/validators");

const router = express.Router();

// Counterfactual search is the most expensive ML call, so limit it harder.
const counterfactualRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many counterfactual requests, please slow down" },
});

router.post(
    "/",
    requireAuth,
    counterfactualRateLimit,
    counterfactualValidation,
    handleValidationErrors,
    counterfactual,
);

module.exports = router;
