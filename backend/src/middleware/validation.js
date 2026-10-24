const { validationResult } = require("express-validator");

function handleValidationErrors(req, _res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const error = new Error("Request validation failed");
  error.statusCode = 400;
  error.details = errors.array().map(({ type, path, msg, location }) => ({
    type,
    path,
    message: msg,
    location,
  }));
  return next(error);
}

module.exports = { handleValidationErrors };
