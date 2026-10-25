function notFound(req, res) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function resolveStatus(error) {
  if (error.type === "entity.parse.failed") {
    return { statusCode: 400, message: "Request body is not valid JSON" };
  }
  if (error.type === "entity.too.large") {
    return { statusCode: 413, message: "Request body is too large" };
  }
  if (error.name === "CastError") {
    return { statusCode: 400, message: "Invalid identifier" };
  }
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  return { statusCode, message: error.message };
}

function errorHandler(error, _req, res, _next) {
  const { statusCode, message } = resolveStatus(error);
  const response = {
    error: statusCode >= 500 ? "Internal server error" : message,
  };

  if (error.details) {
    response.details = error.details;
  }

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json(response);
}

module.exports = { notFound, errorHandler };
