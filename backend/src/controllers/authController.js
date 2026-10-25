const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { jwtExpiresIn, jwtSecret } = require("../config/env");

const BCRYPT_ROUNDS = 12;
// Compared against when the email is unknown, so "no such user" takes as long as
// "wrong password" and response time cannot be used to discover registered emails.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

function createToken(user) {
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ sub: user._id.toString(), email: user.email }, jwtSecret, {
    algorithm: "HS256",
    expiresIn: jwtExpiresIn,
  });
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
  };
}

// Input has already been validated and normalised by the express-validator chain.
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: passwordHash,
    });

    return res.status(201).json({
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Email is already registered" });
    }
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
    const passwordMatches = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.json({
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

async function currentUser(req, res, next) {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(401).json({ error: "User account no longer exists" });
    }
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

module.exports = { register, login, currentUser };
