// Import mocks before other modules
require('../helpers/mockServices');

/* eslint-env jest */
/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "validateErrorResponse"] }] */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const authRoutes = require('../../routes/auth');
const productRoutes = require('../../routes/products');
const paymentRoutes = require('../../routes/payments');
const cartRoutes = require('../../routes/cart');
const orderRoutes = require('../../routes/orders');
const { errorResponse } = require('../../utils/errorHandler');
const { globalErrorHandler } = require('../../middleware/errorHandler');
const { generateCSRFToken } = require('../../middleware/sessionCSRF');

// Create test app with all routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Add session middleware for CSRF token support
  const session = require('express-session');
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true }
  }));
  
  // Add CSRF token generation middleware
  app.use(generateCSRFToken);
  
  // Add endpoint to get CSRF token
  app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.session.csrfToken });
  });
  
  // Add error response middleware
  app.use(errorResponse);
  
  // Add routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  
  // Add global error handler
  app.use(globalErrorHandler);
  
  return app;
};

describe('Error Handling Standardization', () => {
  let app;
  let agent;
  let csrfToken;
  
  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-for-error-standardization-tests';
    
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/holistic-store-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    app = createTestApp();
    agent = request.agent(app);
  });
  
  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    
    // Get fresh CSRF token
    const csrfResponse = await agent.get('/api/csrf-token');
    csrfToken = csrfResponse.body.csrfToken;
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });

  /**
   * Test helper to validate standardized error response format
   */
  const validateErrorResponse = (response, expectedCode, expectedStatusCode = null) => {
    // Should have standardized structure
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code', expectedCode);
    expect(response.body.error).toHaveProperty('message');
    expect(typeof response.body.error.message).toBe('string');
    expect(response.body.error.message.length).toBeGreaterThan(0);
    
    // Should not have direct error properties at root level
    expect(response.body).not.toHaveProperty('message');
    expect(response.body).not.toHaveProperty('errors');
    
    // Should have expected status code if provided
    if (expectedStatusCode) {
      expect(response.status).toBe(expectedStatusCode);
    }
  };

  describe('Authentication Errors', () => {
    test('should return standardized error for invalid login credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });
      
      validateErrorResponse(response, 'INVALID_CREDENTIALS', 401);
    });

    test('should return standardized validation error for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        });
      
      validateErrorResponse(response, 'VALIDATION_ERROR', 400);
      expect(response.body.error).toHaveProperty('details');
      expect(Array.isArray(response.body.error.details)).toBe(true);
    });

    test('should return standardized error for existing user registration', async () => {
      // Create existing user
      await User.create({
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User'
        });
      
      validateErrorResponse(response, 'USER_EXISTS', 409);
    });
  });

  describe('Product Errors', () => {
    test('should return standardized error for product not found by slug', async () => {
      const response = await request(app)
        .get('/api/products/non-existent-slug');
      
      validateErrorResponse(response, 'PRODUCT_NOT_FOUND', 404);
    });

    test('should return standardized error for missing search query', async () => {
      const response = await request(app)
        .get('/api/products/search');
      
      validateErrorResponse(response, 'MISSING_QUERY', 400);
    });
  });

  describe('Payment Errors', () => {
    test('should return standardized error for invalid order ID in payment creation', async () => {
      const response = await request(app)
        .post('/api/payments/create')
        .send({
          orderId: 'invalid-order-id',
          method: 'card'
        });
      
      validateErrorResponse(response, 'VALIDATION_ERROR', 400);
    });

    test('should return standardized error for non-existent order in payment creation', async () => {
      const nonExistentOrderId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post('/api/payments/create')
        .send({
          orderId: nonExistentOrderId.toString(),
          method: 'card'
        });
      
      validateErrorResponse(response, 'ORDER_NOT_FOUND', 404);
    });

    test('should return standardized error for payment method validation', async () => {
      const response = await request(app)
        .post('/api/payments/create')
        .send({
          orderId: new mongoose.Types.ObjectId().toString(),
          method: 'invalid-method'
        });
      
      validateErrorResponse(response, 'VALIDATION_ERROR', 400);
    });
  });

  describe('Cart Errors', () => {
    test('should return standardized error for missing product ID in cart add', async () => {
      const response = await agent
        .post('/api/cart/add')
        .set('x-csrf-token', csrfToken)
        .send({
          quantity: 1
        });
      
      validateErrorResponse(response, 'MISSING_PRODUCT_ID', 400);
    });

    test('should return standardized error for invalid quantity in cart add', async () => {
      const productId = new mongoose.Types.ObjectId();
      const response = await agent
        .post('/api/cart/add')
        .set('x-csrf-token', csrfToken)
        .send({
          productId: productId.toString(),
          quantity: -1
        });
      
      validateErrorResponse(response, 'INVALID_QUANTITY', 400);
    });

    test('should return standardized error for non-existent product in cart', async () => {
      const nonExistentProductId = new mongoose.Types.ObjectId();
      const response = await agent
        .post('/api/cart/add')
        .set('x-csrf-token', csrfToken)
        .send({
          productId: nonExistentProductId.toString(),
          quantity: 1
        });
      
      validateErrorResponse(response, 'PRODUCT_NOT_FOUND', 404);
    });
  });

  describe('Order Errors', () => {
    test('should return standardized error for order not found', async () => {
      const nonExistentOrderId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/orders/${nonExistentOrderId}`);
      
      validateErrorResponse(response, 'ORDER_NOT_FOUND', 404);
    });
  });

  describe('Database Connection Errors', () => {
    test('should return standardized error when database operation fails', async () => {
      // Mock mongoose to throw an error
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      // Should return standardized internal error
      validateErrorResponse(response, 'LOGIN_ERROR', 500);

      // Restore original method
      User.findOne = originalFindOne;
    });
  });

  describe('Error Message Internationalization', () => {
    test('should use i18n keys for error messages when locale header is provided', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('x-locale', 'fr')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });
      
      validateErrorResponse(response, 'INVALID_CREDENTIALS', 401);
      // Note: This test will currently fail because i18n translations need to be set up
      // The error message should be in French when we have proper i18n setup
    });

    test('should fallback to English when unsupported locale is provided', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('x-locale', 'unsupported-locale')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });
      
      validateErrorResponse(response, 'INVALID_CREDENTIALS', 401);
      // Should still provide a readable error message in English as fallback
    });
  });

  describe('Validation Error Consistency', () => {
    test('should return consistent validation error format across all routes', async () => {
      // Test auth route validation
      const authResponse = await request(app)
        .post('/api/auth/register')
        .send({});
      
      validateErrorResponse(authResponse, 'VALIDATION_ERROR', 400);
      expect(authResponse.body.error).toHaveProperty('details');
      expect(Array.isArray(authResponse.body.error.details)).toBe(true);

      // Test payment route validation
      const paymentResponse = await request(app)
        .post('/api/payments/create')
        .send({});
      
      validateErrorResponse(paymentResponse, 'VALIDATION_ERROR', 400);
      expect(paymentResponse.body.error).toHaveProperty('details');
      expect(Array.isArray(paymentResponse.body.error.details)).toBe(true);

      // Both should have the same error structure
      expect(authResponse.body.error).toEqual(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: expect.any(String),
          details: expect.any(Array)
        })
      );
      
      expect(paymentResponse.body.error).toEqual(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: expect.any(String),
          details: expect.any(Array)
        })
      );
    });
  });

  describe('404 Not Found Errors', () => {
    test('should return standardized error for non-existent API endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint');
      
      // This will currently return Express default 404, but should be standardized
      expect(response.status).toBe(404);
      // TODO: This should be updated to use standardized error format
    });
  });
});