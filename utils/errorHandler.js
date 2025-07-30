/**
 * Standardized error handling utilities for the Holistic Boutique API
 * Following CLAUDE.md constraints:
 * - Keep it simple - no event emitters or complex patterns
 * - Support internationalization for all error messages
 * - Use existing patterns from the codebase
 */

// Standard error codes used across the application
const ErrorCodes = {
  // Common errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_EXISTS: 'USER_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  REGISTRATION_ERROR: 'REGISTRATION_ERROR',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  LOGIN_ERROR: 'LOGIN_ERROR',
  FORGOT_PASSWORD_ERROR: 'FORGOT_PASSWORD_ERROR',
  RESET_PASSWORD_ERROR: 'RESET_PASSWORD_ERROR',
  INVALID_RESET_TOKEN: 'INVALID_RESET_TOKEN',
  VERIFICATION_ERROR: 'VERIFICATION_ERROR',
  PROFILE_FETCH_ERROR: 'PROFILE_FETCH_ERROR',
  PROFILE_UPDATE_ERROR: 'PROFILE_UPDATE_ERROR',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  EMAIL_IN_USE: 'EMAIL_IN_USE',
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  PASSWORD_CHANGE_ERROR: 'PASSWORD_CHANGE_ERROR',
  LOGOUT_ERROR: 'LOGOUT_ERROR',
  ADDRESS_ADD_ERROR: 'ADDRESS_ADD_ERROR',
  ADDRESS_UPDATE_ERROR: 'ADDRESS_UPDATE_ERROR',
  ADDRESS_DELETE_ERROR: 'ADDRESS_DELETE_ERROR',
  ADDRESS_NOT_FOUND: 'ADDRESS_NOT_FOUND',
  ADDRESS_DEFAULT_ERROR: 'ADDRESS_DEFAULT_ERROR',
  MISSING_TOKEN: 'MISSING_TOKEN',
  TOKEN_REFRESH_ERROR: 'TOKEN_REFRESH_ERROR',
  
  // Product errors
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  INVALID_PRODUCT_ID: 'INVALID_PRODUCT_ID',
  PRODUCTS_FETCH_ERROR: 'PRODUCTS_FETCH_ERROR',
  PRODUCT_CREATION_ERROR: 'PRODUCT_CREATION_ERROR',
  PRODUCT_UPDATE_ERROR: 'PRODUCT_UPDATE_ERROR',
  PRODUCT_DELETE_ERROR: 'PRODUCT_DELETE_ERROR',
  SEARCH_ERROR: 'SEARCH_ERROR',
  CATEGORIES_ERROR: 'CATEGORIES_ERROR',
  FILTERS_ERROR: 'FILTERS_ERROR',
  RECOMMENDATIONS_ERROR: 'RECOMMENDATIONS_ERROR',
  MISSING_QUERY: 'MISSING_QUERY',
  
  // Cart errors
  CART_ADD_ERROR: 'CART_ADD_ERROR',
  CART_UPDATE_ERROR: 'CART_UPDATE_ERROR',
  CART_REMOVE_ERROR: 'CART_REMOVE_ERROR',
  CART_CLEAR_ERROR: 'CART_CLEAR_ERROR',
  CART_MERGE_ERROR: 'CART_MERGE_ERROR',
  CART_FETCH_ERROR: 'CART_FETCH_ERROR',
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  MAX_QUANTITY_EXCEEDED: 'MAX_QUANTITY_EXCEEDED',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  MISSING_PRODUCT_ID: 'MISSING_PRODUCT_ID',
  NOT_GUEST_USER: 'NOT_GUEST_USER',
  RESET_SESSION_ERROR: 'RESET_SESSION_ERROR',
  
  // Order errors
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_CREATE_ERROR: 'ORDER_CREATE_ERROR',
  ORDER_UPDATE_ERROR: 'ORDER_UPDATE_ERROR',
  ORDER_CANCEL_ERROR: 'ORDER_CANCEL_ERROR',
  INVALID_ORDER_STATUS: 'INVALID_ORDER_STATUS',
  EMPTY_CART: 'EMPTY_CART',
  
  // Payment errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_METHOD_INVALID: 'PAYMENT_METHOD_INVALID',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PAYMENT_CREATE_ERROR: 'PAYMENT_CREATE_ERROR',
  PAYMENT_STATUS_ERROR: 'PAYMENT_STATUS_ERROR',
  
  // Integration errors
  MOLLIE_ERROR: 'MOLLIE_ERROR',
  WHOLESALER_ERROR: 'WHOLESALER_ERROR',
  EMAIL_ERROR: 'EMAIL_ERROR'
};

/**
 * Format error response in standardized format
 * @param {string} code - Error code from ErrorCodes
 * @param {string} message - Default error message (used if i18n key not found)
 * @param {string} field - Optional field name for validation errors
 * @param {object} additionalData - Additional data to include in error
 * @param {function} i18n - Optional i18n function for translation
 * @returns {object} Formatted error response
 */
function formatError(code, message, field = null, additionalData = null, i18n = null) {
  const error = {
    code,
    message
  };

  // Try to use i18n if available
  if (i18n && typeof i18n === 'function') {
    // The i18n function already handles the error code lookup
    const translatedMessage = i18n(code, message);
    error.message = translatedMessage;
  }

  if (field) {
    error.field = field;
  }

  if (additionalData) {
    Object.assign(error, additionalData);
  }

  return {
    success: false,
    error
  };
}

/**
 * Create validation error from express-validator result
 * @param {object} validationResult - Express validator result object
 * @returns {object} Formatted validation error
 */
function createValidationError(validationResult) {
  const errors = validationResult.array();
  
  return {
    success: false,
    error: {
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Invalid input data',
      details: errors.map(err => ({
        field: err.param || err.path,
        message: err.msg,
        location: err.location
      }))
    }
  };
}

/**
 * Express middleware to add error response helpers
 * Adds methods to res object for consistent error responses
 */
function errorResponse(req, res, next) {
  // Get i18n function if available (will be added when we implement backend i18n)
  const i18n = req.i18n || null;

  /**
   * Send standardized error response
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - Error code from ErrorCodes
   * @param {string} message - Error message
   * @param {string} field - Optional field name
   * @param {object} additionalData - Additional error data
   */
  res.error = function(statusCode, errorCode, message, field = null, additionalData = null) {
    const errorData = formatError(errorCode, message, field, additionalData, req.i18n);
    return this.status(statusCode).json(errorData);
  };

  /**
   * Send validation error response
   * @param {object} validationErrors - Express validator errors
   */
  res.validationError = function(validationErrors) {
    const errorData = createValidationError(validationErrors);
    // Apply i18n to the validation error message
    if (req.i18n && errorData.error) {
      errorData.error.message = req.i18n(ErrorCodes.VALIDATION_ERROR, errorData.error.message);
    }
    return this.status(400).json(errorData);
  };

  next();
}

/**
 * Special handler for webhook endpoints that need plain text responses
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 */
function webhookError(res, statusCode, message) {
  return res.status(statusCode).send(message);
}

module.exports = {
  ErrorCodes,
  formatError,
  createValidationError,
  errorResponse,
  webhookError
};