const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authRoutes = require('../routes/auth');
const { i18nMiddleware } = require('../utils/i18n');
const { errorResponse } = require('../utils/errorHandler');
const { globalErrorHandler } = require('../middleware/errorHandler');

// Mock the validateCSRFToken middleware
jest.mock('../middleware/sessionCSRF', () => ({
  validateCSRFToken: (req, res, next) => next()
}));

describe('Auth Routes Error Standardization', () => {
  let app;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test-boutique', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(i18nMiddleware);
    app.use(errorResponse);
    
    // Mock session for CSRF
    app.use((req, res, next) => {
      req.session = { csrfToken: 'test-token' };
      next();
    });
    
    app.use('/api/auth', authRoutes);
    app.use(globalErrorHandler);

    // Clear users collection
    await User.deleteMany({});
  });

  describe('Registration errors', () => {
    test('should return validation error with proper format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // Too short
          firstName: '',
          lastName: ''
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: expect.any(Array)
        }
      });

      // Check specific validation errors
      const emailError = response.body.error.details.find(d => d.field === 'email');
      expect(emailError).toBeDefined();
      expect(emailError.message).toContain('email');

      const passwordError = response.body.error.details.find(d => d.field === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError.message).toContain('at least');
    });

    test('should return USER_EXISTS error in Spanish', async () => {
      // Create existing user
      await User.create({
        email: 'existing@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'Test',
        lastName: 'User'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .set('x-locale', 'es')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User'
        })
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'Ya existe un usuario con este correo electrónico'
        }
      });
    });

    test('should return USER_EXISTS error in Arabic', async () => {
      // Create existing user
      await User.create({
        email: 'existing@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'Test',
        lastName: 'User'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .set('x-locale', 'ar')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User'
        })
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'يوجد مستخدم بهذا البريد الإلكتروني بالفعل'
        }
      });
    });
  });

  describe('Login errors', () => {
    test('should return INVALID_CREDENTIALS error', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    });

    test('should return INVALID_CREDENTIALS error in French', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('x-locale', 'fr')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email ou mot de passe invalide'
        }
      });
    });

    test('should return error for disabled account', async () => {
      // Create disabled user
      await User.create({
        email: 'disabled@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'Test',
        lastName: 'User',
        isActive: false
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'disabled@example.com',
          password: 'password123'
        })
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: expect.any(String)
        }
      });
    });
  });

  describe('Password reset errors', () => {
    test('should return validation error for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'not-an-email'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: expect.stringContaining('email')
            })
          ])
        }
      });
    });

    test('should return error for invalid reset token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'newpassword123'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_RESET_TOKEN',
          message: expect.any(String)
        }
      });
    });
  });

  describe('Profile update errors', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      // Create test user
      testUser = await User.create({
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'Test',
        lastName: 'User'
      });

      // Mock authentication
      app.use((req, res, next) => {
        req.user = testUser;
        next();
      });
    });

    test('should return validation error for invalid profile data', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({
          firstName: '', // Empty name
          email: 'invalid-email' // Invalid email
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: expect.any(Array)
        }
      });
    });

    test('should return USER_EXISTS error when email is taken', async () => {
      // Create another user with target email
      await User.create({
        email: 'taken@example.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'Another',
        lastName: 'User'
      });

      const response = await request(app)
        .put('/api/auth/profile')
        .send({
          email: 'taken@example.com'
        })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'EMAIL_IN_USE',
          message: expect.any(String)
        }
      });
    });
  });

  describe('RTL language support in errors', () => {
    test('should return Hebrew error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('x-locale', 'he')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpass'
        })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'אימייל או סיסמה לא תקינים'
        }
      });
    });

    test('should handle Arabic validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('x-locale', 'ar')
        .send({
          email: 'test@example.com',
          password: '123', // Too short
          firstName: 'Test',
          lastName: 'User'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'بيانات الإدخال غير صالحة'
        }
      });
    });
  });
});