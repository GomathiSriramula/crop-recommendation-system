const express = require("express");

const {
  deleteHistoryItem,
  getHistoryItem,
  listHistory,
} = require("../controllers/historyController");
const { requireAuth } = require("../middleware/authMiddleware");
const { handleValidationErrors } = require("../middleware/validation");
const {
  historyIdValidation,
  historyPaginationValidation,
} = require("../middleware/validators");

const router = express.Router();

router.use(requireAuth);
router.get("/", historyPaginationValidation, handleValidationErrors, listHistory);
router.get("/:id", historyIdValidation, handleValidationErrors, getHistoryItem);
router.delete("/:id", historyIdValidation, handleValidationErrors, deleteHistoryItem);

module.exports = router;
