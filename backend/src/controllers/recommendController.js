const axios = require("axios");

const Prediction = require("../models/Prediction");
const { mlApiUrl } = require("../config/env");

const FEATURE_RULES = {
  N: [0, 140],
  P: [5, 145],
  K: [5, 205],
  temperature: [8.8, 43.7],
  humidity: [14.2, 100],
  ph: [3.5, 9.94],
  rainfall: [20.2, 298.6],
};
const EXPLANATION_FEATURES = Object.keys(FEATURE_RULES);

function validateInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object";
  }

  for (const [field, [minimum, maximum]] of Object.entries(FEATURE_RULES)) {
    const value = body[field];
    if (
      typeof value !== "number"
      || !Number.isFinite(value)
      || value < minimum
      || value > maximum
    ) {
      return `${field} must be a number between ${minimum} and ${maximum}`;
    }
  }
  return null;
}

async function recommend(req, res, next) {
  const validationError = validateInput(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const { data } = await axios.post(`${mlApiUrl}/recommend`, req.body, {
      timeout: 15000,
    });
    if (!data || !Array.isArray(data.recommendations) || data.recommendations.length !== 5) {
      return res.status(502).json({ error: "ML service returned an invalid recommendation" });
    }
    if (
      !data.explanation
      || !Array.isArray(data.explanation.features)
      || data.explanation.features.length !== EXPLANATION_FEATURES.length
    ) {
      return res.status(502).json({ error: "ML service returned an invalid explanation" });
    }

    const explanation = data.explanation.features.map((item) => ({
      feature: item.feature,
      value: req.body[item.feature],
      shap: item.contribution,
      direction: item.direction,
      sentence: item.sentence,
    }));
    if (
      explanation.some((item) => (
        !EXPLANATION_FEATURES.includes(item.feature)
        || typeof item.value !== "number"
        || typeof item.shap !== "number"
        || !["supports", "opposes"].includes(item.direction)
        || typeof item.sentence !== "string"
      ))
      || new Set(explanation.map((item) => item.feature)).size !== EXPLANATION_FEATURES.length
    ) {
      return res.status(502).json({ error: "ML service returned an invalid explanation" });
    }

    const prediction = await Prediction.create({
      user: req.user.sub,
      N: req.body.N,
      P: req.body.P,
      K: req.body.K,
      temperature: req.body.temperature,
      humidity: req.body.humidity,
      ph: req.body.ph,
      rainfall: req.body.rainfall,
      top5Results: data.recommendations.map(({ crop, probability }) => ({
        crop,
        probability,
      })),
      soilAnalysis: data.recommendations.map(({ crop, soil_analysis }) => ({
        crop,
        analysis: soil_analysis,
      })),
      economics: data.recommendations.map(({ economics }) => economics),
      explanation,
    });

    return res.status(200).json(data);
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

module.exports = { recommend };
