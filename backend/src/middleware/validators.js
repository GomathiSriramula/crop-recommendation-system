const { body, param, query } = require("express-validator");

const predictionFields = [
  body("N").isFloat({ min: 0, max: 140 }).toFloat(),
  body("P").isFloat({ min: 5, max: 145 }).toFloat(),
  body("K").isFloat({ min: 5, max: 205 }).toFloat(),
  body("temperature").isFloat({ min: 8.8, max: 43.7 }).toFloat(),
  body("humidity").isFloat({ min: 14.2, max: 100 }).toFloat(),
  body("ph").isFloat({ min: 3.5, max: 9.94 }).toFloat(),
  body("rainfall").isFloat({ min: 20.2, max: 298.6 }).toFloat(),
];

const registerValidation = [
  body("name").isString().trim().isLength({ min: 2, max: 100 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 8, max: 128 }),
];

const loginValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").isString().notEmpty(),
];

const recommendationValidation = [...predictionFields];

const historyPaginationValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

const historyIdValidation = [
  param("id").isMongoId(),
];

module.exports = {
  historyIdValidation,
  historyPaginationValidation,
  loginValidation,
  recommendationValidation,
  registerValidation,
};
