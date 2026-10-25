const axios = require("axios");

const { mlApiKey, mlApiUrl, mlTimeoutMs } = require("../config/env");

const mlClient = axios.create({
  baseURL: mlApiUrl,
  timeout: mlTimeoutMs,
  headers: mlApiKey ? { "X-API-Key": mlApiKey } : {},
});

// Translate an axios error from the ML service into { status, message } for the
// client, or return null if it is not an axios error (let the error handler deal with it).
function mlErrorResponse(error) {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return { status: 504, message: "The ML service took too long to respond" };
  }

  if (error.response) {
    const { status, data } = error.response;
    // 422 carries a useful, user-facing reason (e.g. "no counterfactual found").
    if (status === 422 && typeof data?.detail === "string") {
      return { status: 422, message: data.detail };
    }
    if (status === 504) {
      return { status: 504, message: "The ML service took too long to respond" };
    }
    return { status: 502, message: "ML service returned an error" };
  }

  return { status: 503, message: "ML service is unavailable" };
}

module.exports = { mlClient, mlErrorResponse };
