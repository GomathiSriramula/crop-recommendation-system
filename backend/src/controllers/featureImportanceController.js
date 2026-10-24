const axios = require("axios");

const { mlApiUrl } = require("../config/env");

const CACHE_TTL_MS = 60 * 60 * 1000;
let cachedFeatureImportance;
let cachedAt = 0;

async function featureImportance(req, res, next) {
  const now = Date.now();
  if (cachedFeatureImportance && now - cachedAt < CACHE_TTL_MS) {
    return res.json(cachedFeatureImportance);
  }

  try {
    const { data } = await axios.get(`${mlApiUrl}/feature-importance`, {
      timeout: 15000,
    });
    if (!data || !Array.isArray(data.features)) {
      return res.status(502).json({ error: "ML service returned invalid feature importance" });
    }

    cachedFeatureImportance = data;
    cachedAt = now;
    return res.json(data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response ? 502 : 503;
      return res.status(status).json({
        error: error.response
          ? "ML service returned an error"
          : "ML service is unavailable",
      });
    }
    return next(error);
  }
}

module.exports = { featureImportance };
