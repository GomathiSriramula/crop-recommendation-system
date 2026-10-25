const { isDatabaseConnected } = require("../config/database");
const { mlClient } = require("../lib/mlClient");

async function isMlServiceUp() {
  try {
    await mlClient.get("/health", { timeout: 2000 });
    return true;
  } catch (error) {
    return false;
  }
}

// 503 only when the database is down. An unreachable ML service reports
// "degraded" (still HTTP 200) so the API itself is not marked dead.
async function getHealth(_req, res) {
  const databaseConnected = isDatabaseConnected();
  const mlUp = await isMlServiceUp();

  let status = "ok";
  if (!databaseConnected) {
    status = "degraded";
  } else if (!mlUp) {
    status = "degraded";
  }

  res.status(databaseConnected ? 200 : 503).json({
    status,
    service: "soil-crop-backend",
    database: databaseConnected ? "connected" : "disconnected",
    mlService: mlUp ? "up" : "down",
  });
}

module.exports = { getHealth };
