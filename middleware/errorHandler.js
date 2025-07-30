const { logger } = require('../utils/logger');
const { getErrorMessage } = require('../utils/i18n');

// Custom error class for application errors
class AppError extends Error {
  constructor(message, statusCode, code = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.defaultMessage = message; // Store original message

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handling for different error types
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'INVALID_ID');
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400, 'DUPLICATE_FIELD');
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400, 'VALIDATION_ERROR');
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401, 'INVALID_TOKEN');

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401, 'TOKEN_EXPIRED');

// Send error response in development
const sendErrorDev = (err, req, res) => {
  // Log error details
  logger.error('Error in development:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Get locale from request
  const locale = req.locale || req.headers['x-locale'] || 'en';
  
  // Get translated message if code is provided
  let translatedMessage = err.message;
  if (err.code) {
    translatedMessage = getErrorMessage(err.code, locale, err.defaultMessage || err.message);
  }

  return res.status(err.statusCode).json({
    success: false,
    error: {
      code: err.code,
      message: translatedMessage,
      originalMessage: err.message, // Show original message in dev
      locale: locale, // Show which locale was used
      stack: err.stack,
      details: err
    }
  });
};

// Send error response in production
const sendErrorProd = (err, req, res) => {
  // Log error details
  logger.error('Production error:', {
    error: err.message,
    code: err.code,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    statusCode: err.statusCode
  });

  // Get locale from request
  const locale = req.locale || req.headers['x-locale'] || 'en';

  // Operational, trusted error: send message to client
  if (err.isOperational) {
    // Try to get translated message if code is provided
    let message = err.message;
    if (err.code) {
      message = getErrorMessage(err.code, locale, err.defaultMessage || err.message);
    }

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: message
      }
    });
  }

  // Programming or other unknown error: don't leak error details
  logger.error('Unknown error:', {
    error: err,
    stack: err.stack
  });

  // Get translated message for internal error
  const internalErrorMessage = getErrorMessage('INTERNAL_ERROR', locale, 'Something went wrong!');

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: internalErrorMessage
    }
  });
};

// Global error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

// Async error wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    error: err.message,
    stack: err.stack,
    promise: promise
  });
  
  // Close server gracefully
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', {
    error: err.message,
    stack: err.stack
  });
  
  // Close server gracefully
  process.exit(1);
});

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync
};