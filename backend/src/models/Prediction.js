const mongoose = require("mongoose");

const { FEATURE_RULES } = require("../config/features");

const topResultSchema = new mongoose.Schema(
  {
    crop: {
      type: String,
      required: true,
      trim: true,
    },
    probability: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
  },
  { _id: false },
);

const soilAnalysisItemSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Low", "Optimal", "High"],
      required: true,
    },
    value: {
      type: Number,
    },
    range_low: {
      type: Number,
    },
    range_high: {
      type: Number,
    },
    change_needed: {
      type: Number,
      required: true,
    },
    suggestion: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const soilAnalysisCropSchema = new mongoose.Schema(
  {
    crop: {
      type: String,
      required: true,
      trim: true,
    },
    analysis: {
      type: Map,
      of: soilAnalysisItemSchema,
      required: true,
    },
  },
  { _id: false },
);

const economicsSchema = new mongoose.Schema(
  {
    crop: {
      type: String,
      required: true,
      trim: true,
    },
    revenue_rs_per_ha: {
      type: Number,
      required: true,
      min: 0,
    },
    cost_rs_per_ha: {
      type: Number,
      required: true,
      min: 0,
    },
    profit_rs_per_ha: {
      type: Number,
      required: true,
    },
    roi_percent: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const explanationSchema = new mongoose.Schema(
  {
    feature: {
      type: String,
      enum: ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    shap: {
      type: Number,
      required: true,
    },
    direction: {
      type: String,
      enum: ["supports", "opposes"],
      required: true,
    },
    sentence: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
);

// Top-level explanation metadata stored alongside the per-feature array
const explanationMetaSchema = new mongoose.Schema(
  {
    crop: { type: String, required: true, trim: true },
    probability: { type: Number, required: true, min: 0, max: 1 },
    base_value: { type: Number, required: true },
  },
  { _id: false },
);

const predictionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  N: {
    type: Number,
    required: true,
    min: FEATURE_RULES.N.min,
    max: FEATURE_RULES.N.max,
  },
  P: {
    type: Number,
    required: true,
    min: FEATURE_RULES.P.min,
    max: FEATURE_RULES.P.max,
  },
  K: {
    type: Number,
    required: true,
    min: FEATURE_RULES.K.min,
    max: FEATURE_RULES.K.max,
  },
  temperature: {
    type: Number,
    required: true,
    min: FEATURE_RULES.temperature.min,
    max: FEATURE_RULES.temperature.max,
  },
  humidity: {
    type: Number,
    required: true,
    min: FEATURE_RULES.humidity.min,
    max: FEATURE_RULES.humidity.max,
  },
  ph: {
    type: Number,
    required: true,
    min: FEATURE_RULES.ph.min,
    max: FEATURE_RULES.ph.max,
  },
  rainfall: {
    type: Number,
    required: true,
    min: FEATURE_RULES.rainfall.min,
    max: FEATURE_RULES.rainfall.max,
  },
  top5Results: {
    type: [topResultSchema],
    required: true,
    validate: {
      validator: (results) => results.length === 5,
      message: "Exactly five top results are required",
    },
  },
  soilAnalysis: {
    type: [soilAnalysisCropSchema],
    required: true,
    validate: {
      validator: (results) => results.length === 5,
      message: "Exactly five soil analyses are required",
    },
  },
  economics: {
    type: [economicsSchema],
    required: true,
    validate: {
      validator: (results) => results.length === 5,
      message: "Exactly five economics results are required",
    },
  },
  explanation: {
    type: [explanationSchema],
    required: true,
    validate: {
      validator: (explanation) => explanation.length === 7,
      message: "Exactly seven explanation features are required",
    },
  },
  explanationMeta: {
    type: explanationMetaSchema,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

predictionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Prediction", predictionSchema);
