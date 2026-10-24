const jwt = require("jsonwebtoken");

const { jwtSecret } = require("../config/env");

function requireAuth(req, res, next) {
  const authorization = req.get("authorization");
  const token = authorization && authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication token is required" });
  }

  if (!jwtSecret) {
    return next(new Error("JWT_SECRET is not configured"));
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired authentication token" });
  }
}

module.exports = { requireAuth };
