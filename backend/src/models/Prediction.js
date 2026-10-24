const mongoose = require("mongoose");

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

const predictionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  N: {
    type: Number,
    required: true,
    min: 0,
    max: 140,
  },
  P: {
    type: Number,
    required: true,
    min: 5,
    max: 145,
  },
  K: {
    type: Number,
    required: true,
    min: 5,
    max: 205,
  },
  temperature: {
    type: Number,
    required: true,
    min: 8.8,
    max: 43.7,
  },
  humidity: {
    type: Number,
    required: true,
    min: 14.2,
    max: 100,
  },
  ph: {
    type: Number,
    required: true,
    min: 3.5,
    max: 9.94,
  },
  rainfall: {
    type: Number,
    required: true,
    min: 20.2,
    max: 298.6,
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
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

predictionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Prediction", predictionSchema);
