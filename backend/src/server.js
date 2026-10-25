const app = require("./app");
const { nodeEnv, port, validateConfig } = require("./config/env");
const { connectDatabase, disconnectDatabase } = require("./config/database");

let server;

async function startServer() {
  try {
    validateConfig();
    await connectDatabase();
    server = app.listen(port, () => {
      console.log(`Backend listening on port ${port} (${nodeEnv})`);
    });
  } catch (error) {
    console.error("Unable to start backend:", error.message);
    process.exitCode = 1;
  }
}

// Stop accepting new requests, finish in-flight ones, then close MongoDB.
async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

startServer();
