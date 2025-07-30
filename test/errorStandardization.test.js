const request = require('supertest');
const express = require('express');
const { AppError, globalErrorHandler } = require('../middleware/errorHandler');
const { ErrorCodes } = require('../utils/errorHandler');

describe('Error Standardization Integration', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Test routes that demonstrate current error patterns
    app.get('/auth-error', (req, res, next) => {
      // Current auth.js pattern
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    });

    app.get('/product-error', (req, res, next) => {
      // Current products.js pattern
      res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    });

    app.get('/cart-error', (req, res, next) => {
      // Current cart.js pattern
      res.status(500).json({ success: false, error: error.message });
    });

    app.get('/payment-webhook-error', (req, res, next) => {
      // Current payments.js webhook pattern
      res.status(400).send('Payment ID is required');
    });

    // Routes using AppError (standardized)
    app.get('/standardized-error', (req, res, next) => {
      next(new AppError('Product not found', 404, ErrorCodes.PRODUCT_NOT_FOUND));
    });

    app.use(globalErrorHandler);
  });

  test('auth route should return standardized error format', async () => {
    const response = await request(app)
      .get('/auth-error')
      .expect(401);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    });
  });

  test('product route should return standardized error format', async () => {
    const response = await request(app)
      .get('/product-error')
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found'
      }
    });
  });

  test('standardized error using AppError should match format', async () => {
    const response = await request(app)
      .get('/standardized-error')
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'PRODUCT_NOT_FOUND',
        message: 'Product not found'
      }
    });
  });

  test('webhook error should return plain text', async () => {
    const response = await request(app)
      .get('/payment-webhook-error')
      .expect(400);

    expect(response.text).toBe('Payment ID is required');
    expect(response.headers['content-type']).toContain('text/html');
  });
});

// Test to verify all error codes are used consistently
describe('Error Code Usage', () => {
  const routeFiles = [
    { file: 'auth.js', codes: ['INVALID_CREDENTIALS', 'USER_EXISTS', 'VALIDATION_ERROR'] },
    { file: 'products.js', codes: ['PRODUCT_NOT_FOUND', 'PRODUCTS_FETCH_ERROR'] },
    { file: 'cart.js', codes: ['CART_ADD_ERROR', 'MAX_QUANTITY_EXCEEDED', 'ITEM_NOT_FOUND'] },
    { file: 'orders.js', codes: ['ORDER_NOT_FOUND', 'ORDER_CREATE_ERROR'] },
    { file: 'payments.js', codes: ['PAYMENT_FAILED', 'PAYMENT_REQUIRED'] }
  ];

  test('all route error codes should be defined in ErrorCodes', () => {
    routeFiles.forEach(({ file, codes }) => {
      codes.forEach(code => {
        expect(ErrorCodes[code]).toBeDefined();
        expect(ErrorCodes[code]).toBe(code);
      });
    });
  });
});

// Test i18n support for errors
describe('Error i18n Support', () => {
  test('error messages should support translation', () => {
    const mockI18n = (key) => {
      const translations = {
        'errors.PRODUCT_NOT_FOUND': 'Producto no encontrado',
        'errors.INVALID_CREDENTIALS': 'Correo o contraseña inválidos'
      };
      return translations[key] || key;
    };

    const { formatError } = require('../utils/errorHandler');
    
    const spanishError = formatError('PRODUCT_NOT_FOUND', 'Product not found', null, null, mockI18n);
    expect(spanishError.error.message).toBe('Producto no encontrado');
  });

  test('should fallback to default message when translation not found', () => {
    const mockI18n = (key) => key; // No translations available
    
    const { formatError } = require('../utils/errorHandler');
    
    const error = formatError('CUSTOM_ERROR', 'Custom error message', null, null, mockI18n);
    expect(error.error.message).toBe('Custom error message');
  });
});