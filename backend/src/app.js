const cors = require("cors");
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const helmet = require("helmet");
const morgan = require("morgan");

const {
  frontendOrigin,
  isProduction,
  nodeEnv,
  rateLimitMax,
  rateLimitWindowMs,
  trustProxy,
} = require("./config/env");
const routes = require("./routes");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

// Behind Nginx/Render/Heroku, trust the proxy so req.ip is the real client and the
// rate limiter does not treat every user as one shared IP.
if (trustProxy > 0) {
  app.set("trust proxy", trustProxy);
}

app.use(helmet());
// The API uses Bearer tokens (not cookies), so credentials mode is not needed.
app.use(cors({ origin: frontendOrigin }));
if (nodeEnv !== "test") {
  app.use(morgan(isProduction ? "combined" : "dev"));
}
// Rate-limit BEFORE parsing bodies so abusive requests are rejected cheaply.
app.use(rateLimit({
  windowMs: rateLimitWindowMs,
  limit: rateLimitMax,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
}));
app.use(express.json({ limit: "10kb" }));

app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
