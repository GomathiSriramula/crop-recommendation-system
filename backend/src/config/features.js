// Single source of truth for the model's input ranges (the min/max of the training
// data). Used by the validators and the Prediction schema. Keep the frontend
// (src/lib/featureRules.js) and the ML service (Pydantic model) in sync with this.
const FEATURE_RULES = {
    N: { min: 0, max: 140 },
    P: { min: 5, max: 145 },
    K: { min: 5, max: 205 },
    temperature: { min: 8.8, max: 43.7 },
    humidity: { min: 14.2, max: 100 },
    ph: { min: 3.5, max: 9.94 },
    rainfall: { min: 20.2, max: 298.6 },
};

const FEATURE_NAMES = Object.keys(FEATURE_RULES);

function pickFeatures(source) {
    return Object.fromEntries(FEATURE_NAMES.map((name) => [name, source[name]]));
}

module.exports = { FEATURE_RULES, FEATURE_NAMES, pickFeatures };
