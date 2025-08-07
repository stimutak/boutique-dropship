const request = require('supertest');
const express = require('express');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const authRoutes = require('../../routes/auth');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
};

describe('Email Preferences Endpoints', () => {
  let app;
  let testUser;
  let authToken;

  beforeEach(async () => {
    app = createTestApp();
    await User.deleteMany({});

    testUser = new User({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      preferences: {
        emailPreferences: {
          orderConfirmations: true,
          paymentReceipts: true,
          orderUpdates: false,
          promotionalEmails: false,
          welcomeEmails: true
        }
      }
    });
    await testUser.save();

    authToken = jwt.sign(
      { userId: testUser._id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('GET /api/auth/email-preferences', () => {
    it('should return user email preferences when authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/email-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        preferences: {
          orderConfirmations: true,
          paymentReceipts: true,
          orderUpdates: false,
          promotionalEmails: false,
          welcomeEmails: true
        }
      });
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/email-preferences')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('PUT /api/auth/email-preferences', () => {
    it('should update email preferences successfully', async () => {
      const newPreferences = {
        orderConfirmations: false,
        paymentReceipts: true,
        orderUpdates: true,
        promotionalEmails: true,
        welcomeEmails: false
      };

      const response = await request(app)
        .put('/api/auth/email-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emailPreferences: newPreferences })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Email preferences updated successfully',
        preferences: newPreferences
      });
    });

    it('should return 400 when emailPreferences is missing', async () => {
      const response = await request(app)
        .put('/api/auth/email-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_PREFERENCES',
          message: 'Valid email preferences object is required'
        }
      });
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .put('/api/auth/email-preferences')
        .send({ emailPreferences: { orderConfirmations: false } })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('Additional Edge Cases', () => {
    it('should return 400 with invalid preference keys', async () => {
      const invalidPreferences = {
        orderConfirmations: true,
        invalidKey: true,
        anotherInvalidKey: false
      };

      const response = await request(app)
        .put('/api/auth/email-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emailPreferences: invalidPreferences })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_PREFERENCE_KEYS',
          message: 'Invalid preference keys: invalidKey, anotherInvalidKey'
        }
      });
    });

    it('should return 400 when emailPreferences is not an object', async () => {
      const response = await request(app)
        .put('/api/auth/email-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emailPreferences: 'invalid' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_PREFERENCES',
          message: 'Valid email preferences object is required'
        }
      });
    });

    it('should update partial preferences', async () => {
      const partialPreferences = {
        promotionalEmails: true,
        orderUpdates: true
      };

      const response = await request(app)
        .put('/api/auth/email-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emailPreferences: partialPreferences })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.preferences.promotionalEmails).toBe(true);
      expect(response.body.preferences.orderUpdates).toBe(true);
      // Other preferences should remain unchanged
      expect(response.body.preferences.orderConfirmations).toBe(true);
      expect(response.body.preferences.paymentReceipts).toBe(true);
      expect(response.body.preferences.welcomeEmails).toBe(true);
    });

    it('should handle empty preferences object', async () => {
      const response = await request(app)
        .put('/api/auth/email-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emailPreferences: {} });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Email preferences updated successfully'
      );
      // Original preferences should remain unchanged
      expect(response.body.preferences.orderConfirmations).toBe(true);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/email-preferences')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });
});
