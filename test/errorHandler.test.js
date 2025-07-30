const { describe, it, expect, beforeEach } = require('@jest/globals');
const { formatError, createValidationError, ErrorCodes } = require('../utils/errorHandler');

describe('Error Handler Utilities', () => {
  describe('formatError', () => {
    it('should format error with code and message', () => {
      const result = formatError('USER_NOT_FOUND', 'User not found');
      
      expect(result).toEqual({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    });

    it('should include field when provided', () => {
      const result = formatError('INVALID_EMAIL', 'Invalid email format', 'email');
      
      expect(result).toEqual({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Invalid email format',
          field: 'email'
        }
      });
    });

    it('should handle additional data', () => {
      const result = formatError('VALIDATION_ERROR', 'Validation failed', null, {
        details: [{ field: 'email', message: 'Required' }]
      });
      
      expect(result).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [{ field: 'email', message: 'Required' }]
        }
      });
    });
  });

  describe('createValidationError', () => {
    it('should format express-validator errors', () => {
      const validationErrors = {
        array: () => [
          { msg: 'Invalid email', param: 'email', location: 'body' },
          { msg: 'Password too short', param: 'password', location: 'body' }
        ]
      };

      const result = createValidationError(validationErrors);
      
      expect(result).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: [
            { field: 'email', message: 'Invalid email', location: 'body' },
            { field: 'password', message: 'Password too short', location: 'body' }
          ]
        }
      });
    });

    it('should handle empty validation errors', () => {
      const validationErrors = {
        array: () => []
      };

      const result = createValidationError(validationErrors);
      
      expect(result).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: []
        }
      });
    });
  });

  describe('ErrorCodes', () => {
    it('should contain common error codes', () => {
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });

    it('should contain authentication error codes', () => {
      expect(ErrorCodes.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
      expect(ErrorCodes.USER_EXISTS).toBe('USER_EXISTS');
      expect(ErrorCodes.TOKEN_INVALID).toBe('TOKEN_INVALID');
      expect(ErrorCodes.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
    });

    it('should contain product error codes', () => {
      expect(ErrorCodes.PRODUCT_NOT_FOUND).toBe('PRODUCT_NOT_FOUND');
      expect(ErrorCodes.INVALID_PRODUCT_ID).toBe('INVALID_PRODUCT_ID');
      expect(ErrorCodes.PRODUCTS_FETCH_ERROR).toBe('PRODUCTS_FETCH_ERROR');
    });

    it('should contain cart error codes', () => {
      expect(ErrorCodes.CART_ADD_ERROR).toBe('CART_ADD_ERROR');
      expect(ErrorCodes.CART_UPDATE_ERROR).toBe('CART_UPDATE_ERROR');
      expect(ErrorCodes.ITEM_NOT_FOUND).toBe('ITEM_NOT_FOUND');
      expect(ErrorCodes.MAX_QUANTITY_EXCEEDED).toBe('MAX_QUANTITY_EXCEEDED');
    });

    it('should contain order error codes', () => {
      expect(ErrorCodes.ORDER_NOT_FOUND).toBe('ORDER_NOT_FOUND');
      expect(ErrorCodes.ORDER_CREATE_ERROR).toBe('ORDER_CREATE_ERROR');
      expect(ErrorCodes.INVALID_ORDER_STATUS).toBe('INVALID_ORDER_STATUS');
    });

    it('should contain payment error codes', () => {
      expect(ErrorCodes.PAYMENT_FAILED).toBe('PAYMENT_FAILED');
      expect(ErrorCodes.PAYMENT_METHOD_INVALID).toBe('PAYMENT_METHOD_INVALID');
      expect(ErrorCodes.INSUFFICIENT_FUNDS).toBe('INSUFFICIENT_FUNDS');
    });
  });

  describe('i18n support', () => {
    it('should use i18n key when available', () => {
      // Mock i18n function
      const mockI18n = (key) => {
        const translations = {
          'errors.USER_NOT_FOUND': 'User not found',
          'errors.INVALID_EMAIL': 'Invalid email format'
        };
        return translations[key] || key;
      };

      const result = formatError('USER_NOT_FOUND', 'User not found', null, null, mockI18n);
      expect(result.error.message).toBe('User not found');
    });

    it('should fallback to provided message when i18n key not found', () => {
      const mockI18n = (key) => key; // Return key when not found
      
      const result = formatError('CUSTOM_ERROR', 'Custom error message', null, null, mockI18n);
      expect(result.error.message).toBe('Custom error message');
    });
  });
});

describe('Error Response Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {
        'x-locale': 'en'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should add error helper methods to response object', () => {
    const { errorResponse } = require('../utils/errorHandler');
    
    errorResponse(req, res, next);
    
    expect(typeof res.error).toBe('function');
    expect(typeof res.validationError).toBe('function');
    expect(next).toHaveBeenCalled();
  });

  it('should send formatted error with status code', () => {
    const { errorResponse } = require('../utils/errorHandler');
    
    errorResponse(req, res, next);
    res.error(404, 'USER_NOT_FOUND', 'User not found');
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }
    });
  });

  it('should handle validation errors', () => {
    const { errorResponse } = require('../utils/errorHandler');
    
    errorResponse(req, res, next);
    
    const validationErrors = {
      array: () => [
        { msg: 'Invalid email', param: 'email', location: 'body' }
      ]
    };
    
    res.validationError(validationErrors);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: [
          { field: 'email', message: 'Invalid email', location: 'body' }
        ]
      }
    });
  });
});

// Test for specific route error patterns
describe('Route Error Patterns', () => {
  it('should handle auth route errors consistently', () => {
    const error = formatError('INVALID_CREDENTIALS', 'Invalid email or password');
    expect(error).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    });
  });

  it('should handle product route errors consistently', () => {
    const error = formatError('PRODUCT_NOT_FOUND', 'Product not found');
    expect(error).toMatchObject({
      success: false,
      error: {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found'
      }
    });
  });

  it('should handle cart route errors consistently', () => {
    const error = formatError('MAX_QUANTITY_EXCEEDED', 'Cannot exceed maximum quantity of 99');
    expect(error).toMatchObject({
      success: false,
      error: {
        code: 'MAX_QUANTITY_EXCEEDED',
        message: 'Cannot exceed maximum quantity of 99'
      }
    });
  });

  it('should handle payment webhook errors with plain text', () => {
    // Webhooks often need plain text responses
    const { webhookError } = require('../utils/errorHandler');
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    
    webhookError(res, 400, 'Payment ID is required');
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Payment ID is required');
  });
});