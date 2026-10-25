const { body, param, query } = require("express-validator");

const { FEATURE_RULES } = require("../config/features");

// bcrypt only uses the first 72 BYTES of a password; longer ones would silently
// be truncated, so reject them instead.
const MAX_PASSWORD_BYTES = 72;

const predictionFields = Object.entries(FEATURE_RULES).map(([name, { min, max }]) => (
  body(name)
    .isFloat({ min, max })
    .withMessage(`${name} must be a number between ${min} and ${max}`)
    .toFloat()
));

const registerValidation = [
  body("name")
    .isString().withMessage("Name is required")
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage("Name must be 2-100 characters"),
  body("email")
    .isEmail().withMessage("Enter a valid email address")
    // Do not strip dots / +tags: that would merge different people's addresses.
    .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }),
  body("password")
    .isString().withMessage("Password is required")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .custom((value) => {
      if (Buffer.byteLength(value, "utf8") > MAX_PASSWORD_BYTES) {
        throw new Error(`Password must be at most ${MAX_PASSWORD_BYTES} bytes`);
      }
      return true;
    }),
];

const loginValidation = [
  body("email")
    .isEmail().withMessage("Enter a valid email address")
    .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }),
  body("password")
    .isString().withMessage("Password is required")
    .notEmpty().withMessage("Password is required")
    .isLength({ max: 128 }).withMessage("Password is too long"),
];

const recommendationValidation = [...predictionFields];

const counterfactualValidation = [
  ...predictionFields,
  body("target_crop")
    .isString().withMessage("target_crop is required")
    .trim()
    .matches(/^[a-zA-Z ]{1,50}$/).withMessage("target_crop must be a crop name"),
];

const historyPaginationValidation = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be a positive integer").toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100").toInt(),
];

const historyIdValidation = [
  param("id").isMongoId().withMessage("Invalid prediction id"),
];

module.exports = {
  counterfactualValidation,
  historyIdValidation,
  historyPaginationValidation,
  loginValidation,
  recommendationValidation,
  registerValidation,
};
