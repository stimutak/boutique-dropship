// Test setup utilities for Docker environment
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';
process.env.FRONTEND_URL = 'http://localhost:3001';

// Helper to create test users
async function createTestUser(userData = {}) {
  const defaultData = {
    email: userData.email || 'test@example.com',
    password: userData.password || 'Password123!',
    firstName: userData.firstName || 'Test',
    lastName: userData.lastName || 'User',
    isAdmin: userData.isAdmin || false,
    isActive: true,
    emailPreferences: {
      orderConfirmations: true,
      marketingEmails: false,
      newsletterSubscription: false
    }
  };

  const user = new User(defaultData);
  await user.save();
  return user;
}

// Helper to generate test tokens
function generateTestToken(userData = {}) {
  const payload = {
    id: userData.id || 'test-user-id',
    email: userData.email || 'test@example.com',
    isAdmin: userData.isAdmin || false
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// Helper to create admin user and token
async function createAdminUserWithToken() {
  const adminUser = await createTestUser({
    email: 'admin@test.com',
    isAdmin: true,
    firstName: 'Admin',
    lastName: 'User'
  });

  const token = generateTestToken({
    id: adminUser._id.toString(),
    email: adminUser.email,
    isAdmin: true
  });

  return { user: adminUser, token };
}

// Helper to create regular user and token
async function createRegularUserWithToken() {
  const user = await createTestUser({
    email: 'user@test.com',
    isAdmin: false,
    firstName: 'Regular',
    lastName: 'User'
  });

  const token = generateTestToken({
    id: user._id.toString(),
    email: user.email,
    isAdmin: false
  });

  return { user, token };
}

module.exports = {
  createTestUser,
  generateTestToken,
  createAdminUserWithToken,
  createRegularUserWithToken
};