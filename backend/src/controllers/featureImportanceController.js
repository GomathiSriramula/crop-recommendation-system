const { mlClient, mlErrorResponse } = require("../lib/mlClient");

const CACHE_TTL_MS = 60 * 60 * 1000;
let cachedFeatureImportance;
let cachedAt = 0;

async function featureImportance(req, res, next) {
  const now = Date.now();
  if (cachedFeatureImportance && now - cachedAt < CACHE_TTL_MS) {
    return res.json(cachedFeatureImportance);
  }

  try {
    const { data } = await mlClient.get("/feature-importance");
    if (!data || !Array.isArray(data.features)) {
      return res.status(502).json({ error: "ML service returned invalid feature importance" });
    }

    cachedFeatureImportance = data;
    cachedAt = now;
    return res.json(data);
  } catch (error) {
    const mapped = mlErrorResponse(error);
    if (mapped) {
      return res.status(mapped.status).json({ error: mapped.message });
    }
    return next(error);
  }
}

module.exports = { featureImportance };
