const mongoose = require("mongoose");

const { mongoUri } = require("./env");

let listenersRegistered = false;

function registerListeners() {
  // Register once, even if connectDatabase() is called again (tests, reconnects).
  if (listenersRegistered) {
    return;
  }
  listenersRegistered = true;

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });
}

async function connectDatabase() {
  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured");
  }

  registerListeners();
  // Fail fast (5 s) instead of waiting ~30 s when MongoDB is unreachable.
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log("MongoDB connected");
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDatabase, disconnectDatabase, isDatabaseConnected };
