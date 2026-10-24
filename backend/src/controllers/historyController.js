const mongoose = require("mongoose");

const Prediction = require("../models/Prediction");

function parsePagination(query) {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);

  if (
    !Number.isInteger(page)
    || page < 1
    || !Number.isInteger(limit)
    || limit < 1
    || limit > 100
  ) {
    return null;
  }

  return { page, limit, skip: (page - 1) * limit };
}

function validatePredictionId(id, res) {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid prediction id" });
    return false;
  }
  return true;
}

async function listHistory(req, res, next) {
  const pagination = parsePagination(req.query);
  if (!pagination) {
    return res.status(400).json({
      error: "page must be a positive integer and limit must be between 1 and 100",
    });
  }

  try {
    const filter = { user: req.user.sub };
    const [items, total] = await Promise.all([
      Prediction.find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Prediction.countDocuments(filter),
    ]);

    return res.json({
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getHistoryItem(req, res, next) {
  if (!validatePredictionId(req.params.id, res)) {
    return undefined;
  }

  try {
    const prediction = await Prediction.findOne({
      _id: req.params.id,
      user: req.user.sub,
    }).lean();

    if (!prediction) {
      return res.status(404).json({ error: "Prediction not found" });
    }
    return res.json(prediction);
  } catch (error) {
    return next(error);
  }
}

async function deleteHistoryItem(req, res, next) {
  if (!validatePredictionId(req.params.id, res)) {
    return undefined;
  }

  try {
    const prediction = await Prediction.findOneAndDelete({
      _id: req.params.id,
      user: req.user.sub,
    });

    if (!prediction) {
      return res.status(404).json({ error: "Prediction not found" });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = { listHistory, getHistoryItem, deleteHistoryItem };
