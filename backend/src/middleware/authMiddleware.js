const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { jwtSecret } = require("../config/env");

async function requireAuth(req, res, next) {
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

  let payload;
  try {
    // Pin the algorithm so a token signed with a different one is rejected.
    payload = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] });
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired authentication token" });
  }

  try {
    // A deleted account must not keep working until its token expires.
    const accountExists = await User.exists({ _id: payload.sub });
    if (!accountExists) {
      return res.status(401).json({ error: "User account no longer exists" });
    }
  } catch (error) {
    return next(error);
  }

  req.user = payload;
  return next();
}

module.exports = { requireAuth };
