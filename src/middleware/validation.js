const { body, param, query, validationResult } = require('express-validator');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('first_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required and must be less than 100 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required and must be less than 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateUserUpdate = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be less than 100 characters'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  handleValidationErrors
];

// Garden validation rules
const validateGarden = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Garden name is required and must be less than 255 characters'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must be less than 255 characters'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('size_sqft')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Size must be a positive integer'),
  body('established_date')
    .optional()
    .isISO8601()
    .withMessage('Valid date is required'),
  handleValidationErrors
];

// Plot validation rules
const validatePlot = [
  body('plot_number')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Plot number is required and must be less than 20 characters'),
  body('size_sqft')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Size must be a positive number'),
  body('location_x')
    .optional()
    .isFloat()
    .withMessage('Location X must be a number'),
  body('location_y')
    .optional()
    .isFloat()
    .withMessage('Location Y must be a number'),
  body('soil_type')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Soil type must be less than 50 characters'),
  body('sun_exposure')
    .optional()
    .isIn(['full_sun', 'partial_sun', 'partial_shade', 'full_shade'])
    .withMessage('Sun exposure must be one of: full_sun, partial_sun, partial_shade, full_shade'),
  body('rental_fee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Rental fee must be a positive number'),
  handleValidationErrors
];

// Plant validation rules
const validatePlant = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Plant name is required and must be less than 255 characters'),
  body('variety')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Variety must be less than 255 characters'),
  body('plant_type')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Plant type must be less than 50 characters'),
  body('planted_date')
    .optional()
    .isISO8601()
    .withMessage('Valid planted date is required'),
  body('expected_harvest_date')
    .optional()
    .isISO8601()
    .withMessage('Valid expected harvest date is required'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('spacing_inches')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Spacing must be a positive number'),
  body('depth_inches')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Depth must be a positive number'),
  handleValidationErrors
];

// Growth log validation rules
const validateGrowthLog = [
  body('log_date')
    .isISO8601()
    .withMessage('Valid log date is required'),
  body('height_inches')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Height must be a positive number'),
  body('width_inches')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Width must be a positive number'),
  body('health_status')
    .optional()
    .isIn(['excellent', 'good', 'fair', 'poor', 'dead'])
    .withMessage('Health status must be one of: excellent, good, fair, poor, dead'),
  handleValidationErrors
];

// Harvest validation rules
const validateHarvest = [
  body('harvest_date')
    .isISO8601()
    .withMessage('Valid harvest date is required'),
  body('quantity')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a positive number'),
  body('unit')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Unit must be less than 20 characters'),
  body('quality_rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Quality rating must be between 1 and 5'),
  handleValidationErrors
];

// Watering schedule validation rules
const validateWateringSchedule = [
  body('frequency_days')
    .isInt({ min: 1, max: 365 })
    .withMessage('Frequency must be between 1 and 365 days'),
  body('time_of_day')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format'),
  body('duration_minutes')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Duration must be between 1 and 1440 minutes'),
  body('water_amount_gallons')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Water amount must be a positive number'),
  handleValidationErrors
];

// ID parameter validation
const validateId = [
  param('id').isInt({ min: 1 }).withMessage('Valid ID is required'),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validateGarden,
  validatePlot,
  validatePlant,
  validateGrowthLog,
  validateHarvest,
  validateWateringSchedule,
  validateId,
  validatePagination,
  handleValidationErrors
};