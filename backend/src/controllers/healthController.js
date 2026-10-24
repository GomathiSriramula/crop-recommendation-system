const { isDatabaseConnected } = require("../config/database");

function getHealth(_req, res) {
  const databaseConnected = isDatabaseConnected();
  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? "ok" : "degraded",
    service: "soil-crop-backend",
    database: databaseConnected ? "connected" : "disconnected",
  });
}

module.exports = { getHealth };
