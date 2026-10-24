const app = require("./app");
const { jwtSecret, nodeEnv, port } = require("./config/env");
const { connectDatabase } = require("./config/database");

async function startServer() {
  try {
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }
    await connectDatabase();
    app.listen(port, () => {
      console.log(`Backend listening on port ${port} (${nodeEnv})`);
    });
  } catch (error) {
    console.error("Unable to start backend:", error.message);
    process.exitCode = 1;
  }
}

startServer();
