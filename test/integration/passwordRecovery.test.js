const request = require('supertest');
const crypto = require('crypto');
const app = require('../../server');
const User = require('../../models/User');
// Test setup is handled by jest.config.js setupFilesAfterEnv

describe('Password Recovery Flow', () => {
  let agent;
  let testUser;

  // Database connection handled by test/setup.js

  beforeEach(async () => {
    // Database cleanup handled by test/setup.js afterEach hook
    agent = request.agent(app);
    
    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'oldPassword123',
      firstName: 'Test',
      lastName: 'User',
      isActive: true
    });
  });

  describe('Forgot Password', () => {
    test('should send reset email for valid user', async () => {
      const res = await agent
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('If an account exists');
      
      // Check that reset token was saved
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.passwordResetToken).toBeDefined();
      expect(updatedUser.passwordResetExpiry).toBeDefined();
      expect(updatedUser.passwordResetExpiry.getTime()).toBeGreaterThan(Date.now());
    });

    test('should return success even for non-existent email (prevent enumeration)', async () => {
      const res = await agent
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('If an account exists');
    });

    test('should validate email format', async () => {
      const res = await agent
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Reset Password', () => {
    let resetToken;

    beforeEach(async () => {
      // Generate reset token for user
      resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      
      testUser.passwordResetToken = resetTokenHash;
      testUser.passwordResetExpiry = Date.now() + 3600000; // 1 hour
      await testUser.save();
    });

    test('should reset password with valid token', async () => {
      const newPassword = 'newPassword123';
      
      const res = await agent
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Password has been reset successfully');
      expect(res.body.token).toBeDefined(); // Auth token
      expect(res.body.user).toBeDefined();
      
      // Verify password was changed
      const updatedUser = await User.findById(testUser._id);
      const isMatch = await updatedUser.comparePassword(newPassword);
      expect(isMatch).toBe(true);
      
      // Verify reset token was cleared
      expect(updatedUser.passwordResetToken).toBeUndefined();
      expect(updatedUser.passwordResetExpiry).toBeUndefined();
    });

    test('should reject invalid reset token', async () => {
      const res = await agent
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'newPassword123'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    test('should reject expired reset token', async () => {
      // Set token to expired
      testUser.passwordResetExpiry = Date.now() - 3600000; // 1 hour ago
      await testUser.save();
      
      const res = await agent
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'newPassword123'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
      expect(res.body.error.message).toContain('invalid or has expired');
    });

    test('should validate new password', async () => {
      const res = await agent
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: '123' // Too short
        });
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details[0].msg).toContain('at least 6 characters');
    });

    test('should allow login with new password after reset', async () => {
      // Reset password
      await agent
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'newPassword123'
        });
      
      // Try to login with new password
      const loginRes = await agent
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'newPassword123'
        });
      
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.token).toBeDefined();
    });
  });

  describe('Complete Flow', () => {
    test('should handle full password recovery flow', async () => {
      // 1. Request password reset
      const forgotRes = await agent
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });
      
      expect(forgotRes.status).toBe(200);
      
      // 2. Get reset token from database (in real app, this would come from email)
      const userWithToken = await User.findById(testUser._id);
      expect(userWithToken.passwordResetToken).toBeDefined();
      
      // Simulate getting the unhashed token from email
      // In real implementation, we'd extract this from the email sent
      const resetToken = 'simulated-token';
      const resetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      
      userWithToken.passwordResetToken = resetTokenHash;
      await userWithToken.save();
      
      // 3. Reset password with token
      const resetRes = await agent
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'brandNewPassword123'
        });
      
      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);
      
      // 4. Verify can login with new password
      const loginRes = await agent
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'brandNewPassword123'
        });
      
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
    });
  });
});