const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const User = require('../../models/User');
const authRoutes = require('../../routes/auth');

// Mock email service
jest.mock('../../utils/emailService', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' })
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Email Preferences Routes', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Clear database - the global setup handles this, but we'll be explicit
    await User.deleteMany({});

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      preferences: {
        emailPreferences: {
          orderConfirmations: true,
          paymentReceipts: true,
          orderUpdates: true,
          promotionalEmails: false,
          welcomeEmails: true
        }
      }
    });

    // Generate auth token
    const jwt = require('jsonwebtoken');
    process.env.JWT_SECRET = 'test-secret';
    authToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET);
  });

  describe('GET /api/auth/email-preferences', () => {
    it('should get user email preferences', async () => {
      const response = await request(app)
        .get('/api/auth/email-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.preferences).toEqual({
        orderConfirmations: true,
        paymentReceipts: true,
        orderUpdates: true,
        promotionalEmails: false,
        welcomeEmails: true
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/auth/email-preferences')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    it('should handle invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/email-preferences')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('PUT /api/auth/email-preferences', () => {
    it('should update email preferences successfully', async () => {
      const newPreferences = {
        orderConfirmations: false,
        paymentReceipts: true,
        orderUpdates: false,
        promotionalEmails: true,
        welcomeEmails: true
      };

      const response = await request(app)
        .put('/api/auth/email-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emailPreferences: newPreferences })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Email preferences updated successfully');
      expect(response.body.preferences).toEqual(newPreferences);

      // Verify database was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.preferences.emailPreferences.orderConfirmations).toBe(false);
      expect(updatedUser.preferences.emailPreferences.promotionalEmails).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/auth/email-preferences')
        .send({ emailPreferences: { orderConfirmations: false } })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate email preferences object', async () => {
      const response = await request(app)
        .put('/api/auth/email-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emailPreferences: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PREFERENCES');
    });

    it('should reject invalid preference keys', async () => {
      const response = await request(app)
        .put('/api/auth/email-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          emailPreferences: { 
            orderConfirmations: true,
            invalidKey: true 
          } 
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PREFERENCE_KEYS');
      expect(response.body.error.message).toContain('invalidKey');
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        orderConfirmations: false,
        promotionalEmails: true
      };

      const response = await request(app)
        .put('/api/auth/email-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emailPreferences: partialUpdate })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify only specified preferences were updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.preferences.emailPreferences.orderConfirmations).toBe(false);
      expect(updatedUser.preferences.emailPreferences.promotionalEmails).toBe(true);
      expect(updatedUser.preferences.emailPreferences.paymentReceipts).toBe(true); // unchanged
      expect(updatedUser.preferences.emailPreferences.orderUpdates).toBe(true); // unchanged
    });
  });

  describe('User.wantsEmail method', () => {
    it('should return false when notifications are disabled', async () => {
      testUser.preferences.notifications = false;
      await testUser.save();

      expect(testUser.wantsEmail('orderConfirmations')).toBe(false);
    });

    it('should return true when notifications are enabled and specific preference is true', async () => {
      expect(testUser.wantsEmail('orderConfirmations')).toBe(true);
    });

    it('should return false when specific preference is false', async () => {
      expect(testUser.wantsEmail('promotionalEmails')).toBe(false);
    });

    it('should return true for undefined preferences (default behavior)', async () => {
      expect(testUser.wantsEmail('nonExistentPreference')).toBe(true);
    });
  });

  describe('User.updateEmailPreferences method', () => {
    it('should update email preferences and save user', async () => {
      const newPreferences = {
        orderConfirmations: false,
        promotionalEmails: true
      };

      await testUser.updateEmailPreferences(newPreferences);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.preferences.emailPreferences.orderConfirmations).toBe(false);
      expect(updatedUser.preferences.emailPreferences.promotionalEmails).toBe(true);
      expect(updatedUser.preferences.emailPreferences.paymentReceipts).toBe(true); // unchanged
    });
  });
});