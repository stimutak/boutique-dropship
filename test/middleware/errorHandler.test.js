const request = require('supertest');
const express = require('express');
const { AppError, globalErrorHandler, catchAsync } = require('../../middleware/errorHandler');

describe('Error Handling Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('AppError', () => {
    test('should create operational error with correct properties', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error.status).toBe('fail');
    });

    test('should create server error with correct status', () => {
      const error = new AppError('Server error', 500, 'SERVER_ERROR');
      
      expect(error.status).toBe('error');
    });
  });

  describe('catchAsync', () => {
    test('should catch async errors and pass to next', async () => {
      const asyncRoute = catchAsync(async (req, res, next) => {
        throw new Error('Async error');
      });

      app.get('/test', asyncRoute);
      app.use(globalErrorHandler);

      const response = await request(app)
        .get('/test')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Something went wrong!');
    });

    test('should handle successful async operations', async () => {
      const asyncRoute = catchAsync(async (req, res, next) => {
        res.json({ success: true, message: 'Success' });
      });

      app.get('/test', asyncRoute);

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Success');
    });
  });

  describe('globalErrorHandler', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    test('should handle operational errors in production', async () => {
      process.env.NODE_ENV = 'production';
      
      app.get('/test', (req, res, next) => {
        next(new AppError('Operational error', 400, 'TEST_ERROR'));
      });
      app.use(globalErrorHandler);

      const response = await request(app)
        .get('/test')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TEST_ERROR');
      expect(response.body.error.message).toBe('Operational error');
      expect(response.body.error.stack).toBeUndefined();
    });

    test('should handle non-operational errors in production', async () => {
      process.env.NODE_ENV = 'production';
      
      app.get('/test', (req, res, next) => {
        const error = new Error('Programming error');
        error.isOperational = false;
        next(error);
      });
      app.use(globalErrorHandler);

      const response = await request(app)
        .get('/test')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(response.body.error.message).toBe('Something went wrong!');
    });

    test('should include stack trace in development', async () => {
      process.env.NODE_ENV = 'development';
      
      app.get('/test', (req, res, next) => {
        next(new AppError('Dev error', 400, 'DEV_ERROR'));
      });
      app.use(globalErrorHandler);

      const response = await request(app)
        .get('/test')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.stack).toBeDefined();
    });

    test('should handle JWT errors', async () => {
      process.env.NODE_ENV = 'production';
      
      app.get('/test', (req, res, next) => {
        const error = new Error('jwt malformed');
        error.name = 'JsonWebTokenError';
        next(error);
      });
      app.use(globalErrorHandler);

      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    test('should handle expired JWT errors', async () => {
      process.env.NODE_ENV = 'production';
      
      app.get('/test', (req, res, next) => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        next(error);
      });
      app.use(globalErrorHandler);

      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    test('should handle validation errors', async () => {
      process.env.NODE_ENV = 'production';
      
      app.get('/test', (req, res, next) => {
        const error = new Error('Validation failed');
        error.name = 'ValidationError';
        error.errors = {
          email: { message: 'Email is required' },
          password: { message: 'Password is too short' }
        };
        next(error);
      });
      app.use(globalErrorHandler);

      const response = await request(app)
        .get('/test')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Email is required');
    });
  });
});