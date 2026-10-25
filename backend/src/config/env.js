const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Strict integer parsing: a typo fails loudly instead of silently using a default,
// and 0 is no longer swallowed by `|| default`.
function intFromEnv(name, fallback, { min = 1 } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${name} must be an integer >= ${min} (got "${raw}")`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || "development";

const config = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: intFromEnv("PORT", 5000),
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  mlApiUrl: process.env.ML_API_URL || "http://127.0.0.1:8000",
  mlApiKey: process.env.ML_API_KEY || "",
  mlTimeoutMs: intFromEnv("ML_TIMEOUT_MS", 20000),
  counterfactualTimeoutMs: intFromEnv("COUNTERFACTUAL_TIMEOUT_MS", 30000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  rateLimitWindowMs: intFromEnv("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  rateLimitMax: intFromEnv("RATE_LIMIT_MAX", 100),
  // Number of reverse proxies in front of the app (e.g. 1 behind Nginx/Render).
  // Required for correct per-user rate limiting behind a proxy.
  trustProxy: intFromEnv("TRUST_PROXY", 0, { min: 0 }),
};

// Called once from server.js so that importing the app (tests) does not need secrets.
function validateConfig() {
  const problems = [];

  if (!config.jwtSecret) {
    problems.push("JWT_SECRET is not configured");
  } else if (config.isProduction && config.jwtSecret.length < 32) {
    problems.push("JWT_SECRET must be at least 32 characters in production");
  }

  if (!config.mongoUri) {
    problems.push("MONGO_URI is not configured");
  }

  if (config.isProduction) {
    if (!process.env.ML_API_URL) {
      problems.push("ML_API_URL must be set explicitly in production");
    }
    if (!process.env.FRONTEND_ORIGIN) {
      problems.push("FRONTEND_ORIGIN must be set explicitly in production");
    }
  }

  if (problems.length) {
    throw new Error(`Invalid configuration:\n - ${problems.join("\n - ")}`);
  }
}

module.exports = { ...config, validateConfig };
