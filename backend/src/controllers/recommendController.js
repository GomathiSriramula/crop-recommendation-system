const Prediction = require("../models/Prediction");
const { FEATURE_NAMES, pickFeatures } = require("../config/features");
const { mlClient, mlErrorResponse } = require("../lib/mlClient");

function invalidExplanation(res) {
  return res.status(502).json({ error: "ML service returned an invalid explanation" });
}

async function recommend(req, res, next) {
  // Input was validated and converted to numbers by recommendationValidation.
  // Forward ONLY the model's features, never the raw request body.
  const input = pickFeatures(req.body);

  try {
    const { data } = await mlClient.post("/recommend", input);

    if (!data || !Array.isArray(data.recommendations) || data.recommendations.length === 0) {
      return res.status(502).json({ error: "ML service returned an invalid recommendation" });
    }
    if (
      !data.explanation
      || !Array.isArray(data.explanation.features)
      || data.explanation.features.length === 0
    ) {
      return invalidExplanation(res);
    }

    // Validate feature names BEFORE using them to read the input values.
    const receivedFeatureNames = data.explanation.features.map((item) => item.feature);
    if (
      !receivedFeatureNames.every((name) => FEATURE_NAMES.includes(name))
      || new Set(receivedFeatureNames).size !== receivedFeatureNames.length
    ) {
      return invalidExplanation(res);
    }

    const explanation = data.explanation.features.map((item) => ({
      feature: item.feature,
      value: input[item.feature],
      shap: item.contribution,
      direction: item.direction,
      sentence: item.sentence,
    }));
    if (
      explanation.some((item) => (
        typeof item.value !== "number"
        || typeof item.shap !== "number"
        || !["supports", "opposes"].includes(item.direction)
        || typeof item.sentence !== "string"
      ))
    ) {
      return invalidExplanation(res);
    }

    // The recommendation is still useful if saving fails, so do not throw it away:
    // return it with saved:false and let the client show a warning.
    let savedId = null;
    try {
      const prediction = await Prediction.create({
        user: req.user.sub,
        ...input,
        top5Results: data.recommendations.map(({ crop, probability }) => ({
          crop,
          probability,
        })),
        soilAnalysis: data.recommendations.map(({ crop, soil_analysis: analysis }) => ({
          crop,
          analysis,
        })),
        economics: data.recommendations.map(({ economics }) => economics),
        explanation,
        explanationMeta: {
          crop: data.explanation.crop,
          probability: data.explanation.probability,
          base_value: data.explanation.base_value,
        },
      });
      savedId = prediction._id.toString();
    } catch (saveError) {
      console.error("Unable to save prediction history:", saveError);
    }

    return res.status(200).json({
      ...data,
      inputs: input,
      id: savedId,
      saved: savedId !== null,
    });
  } catch (error) {
    const mapped = mlErrorResponse(error);
    if (mapped) {
      return res.status(mapped.status).json({ error: mapped.message });
    }
    return next(error);
  }
}

module.exports = { recommend };
