const crypto = require('crypto');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { body, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');

// CSRF Protection Middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for API key authenticated requests
  if (req.headers['x-api-key']) {
    return next();
  }

  // Skip CSRF for webhooks and health checks
  if (req.path.includes('/webhook') || req.path.includes('/health')) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  // If no session exists yet, it's likely a first request - be lenient
  if (!req.session) {
    logger.warn('No session found for CSRF check', { path: req.path });
    return next();
  }

  if (!token || !sessionToken || token !== sessionToken) {
    logger.error('CSRF token mismatch', {
      provided: token ? 'yes' : 'no',
      session: sessionToken ? 'yes' : 'no',
      match: token === sessionToken,
      path: req.path
    });
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISMATCH',
        message: 'Invalid CSRF token'
      }
    });
  }

  next();
};

// Generate CSRF token
const generateCSRFToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  next();
};

// API Key Authentication
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'API_KEY_REQUIRED',
        message: 'API key is required for cross-site integration'
      }
    });
  }

  // Validate API key (in production, store these securely)
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key'
      }
    });
  }

  req.apiKeyAuth = true;
  next();
};

// Enhanced Rate Limiting
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message
      }
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Different rate limits for different endpoints
// More forgiving limits for development while still providing protection
const rateLimits = {
  // General API rate limit - increased for development
  general: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    500, // 500 requests per window (was 100)
    'Too many requests, please try again later'
  ),
  
  // Authentication endpoints - more forgiving for dev/testing
  auth: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    50, // 50 requests per window (was 10)
    'Too many authentication attempts, please try again later'
  ),
  
  // Payment endpoints rate limit - slightly increased
  payment: createRateLimit(
    60 * 60 * 1000, // 1 hour
    50, // 50 requests per hour (was 20)
    'Too many payment requests, please try again later'
  ),
  
  // Admin endpoints rate limit - increased
  admin: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    200, // 200 requests per window (was 50)
    'Too many admin requests, please try again later'
  ),
  
  // Cross-site integration rate limit - increased
  integration: createRateLimit(
    60 * 1000, // 1 minute
    100, // 100 requests per minute (was 30)
    'Too many integration requests, please try again later'
  )
};

// Slow down middleware for brute force protection
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 5, // allow 5 requests per windowMs without delay
  delayMs: () => 500, // add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // max delay of 20 seconds
  validate: { delayMs: false } // disable warning
});

// Input sanitization middleware
const sanitizeInput = [
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      logger.warn('Sanitized input detected', { key, method: req.method, path: req.path });
    }
  })
];

// Common validation rules
const validationRules = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  name: body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
  
  phone: body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  address: body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address must not exceed 200 characters'),
  
  price: body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  quantity: body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer')
};

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value
        }))
      }
    });
  }
  
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Additional security headers beyond helmet
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

module.exports = {
  csrfProtection,
  generateCSRFToken,
  apiKeyAuth,
  rateLimits,
  speedLimiter,
  sanitizeInput,
  validationRules,
  handleValidationErrors,
  securityHeaders
};