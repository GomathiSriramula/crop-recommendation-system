const Prediction = require("../models/Prediction");

// page/limit were already validated and converted to integers by
// historyPaginationValidation, so only the defaults are needed here.
function parsePagination(query) {
  const page = query.page || 1;
  const limit = query.limit || 10;
  return { page, limit, skip: (page - 1) * limit };
}

async function listHistory(req, res, next) {
  const pagination = parsePagination(req.query);

  try {
    const filter = { user: req.user.sub };
    const [items, total] = await Promise.all([
      Prediction.find(filter)
        // The list only needs a summary; full details come from /history/:id.
        .select("createdAt top5Results")
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
