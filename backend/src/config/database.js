const mongoose = require("mongoose");

const { mongoUri } = require("./env");

async function connectDatabase() {
  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured");
  }

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
}

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDatabase, isDatabaseConnected };
