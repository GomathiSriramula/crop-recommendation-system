function notFound(req, res) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const response = {
    error: statusCode === 500 ? "Internal server error" : error.message,
  };

  if (error.details) {
    response.details = error.details;
  }

  if (statusCode === 500) {
    console.error(error);
  }

  res.status(statusCode).json(response);
}

module.exports = { notFound, errorHandler };
