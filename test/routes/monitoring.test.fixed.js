const request = require('supertest');
const app = require('../../server');
const { createAdminUserWithToken, createRegularUserWithToken } = require('../helpers/testSetup');
const User = require('../../models/User');

// Mock only external services, not mongoose or models
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('../../utils/errorRecovery', () => ({
  getCircuitBreakerStatus: jest.fn(() => ({
    payment: { state: 'closed', failures: 0 },
    email: { state: 'closed', failures: 0 }
  }))
}));

describe('Monitoring Routes', () => {
  let adminToken;
  let regularUserToken;
  let adminUser;
  let regularUser;

  beforeEach(async () => {
    // Clear users collection
    await User.deleteMany({});
    
    // Create test users with proper tokens
    const adminData = await createAdminUserWithToken();
    adminToken = adminData.token;
    adminUser = adminData.user;

    const userData = await createRegularUserWithToken();
    regularUserToken = userData.token;
    regularUser = userData.user;
  });

  afterEach(async () => {
    // Clean up
    await User.deleteMany({});
  });

  describe('GET /api/monitoring/health', () => {
    it('should return basic health check without authentication', async () => {
      const response = await request(app)
        .get('/api/monitoring/health')
        .expect(200);
      
      expect(response.body.status).toBe('OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should return consistent response format', async () => {
      const response = await request(app)
        .get('/api/monitoring/health')
        .expect(200);
      
      expect(response.body).toMatchObject({
        status: 'OK',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String)
      });
    });
  });

  describe('GET /api/monitoring/status', () => {
    it('should return detailed status for admin users', async () => {
      const response = await request(app)
        .get('/api/monitoring/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data).toHaveProperty('environment');
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get('/api/monitoring/status')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/monitoring/status')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      // Accept either error code as both are valid
      expect(['NO_TOKEN', 'AUTHENTICATION_REQUIRED']).toContain(response.body.error.code);
    });
  });

  describe('GET /api/monitoring/metrics', () => {
    it('should return system metrics for admin users', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('cpu');
      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data).toHaveProperty('disk');
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(['NO_TOKEN', 'AUTHENTICATION_REQUIRED']).toContain(response.body.error.code);
    });
  });

  describe('GET /api/monitoring/logs', () => {
    it('should return logs for admin users', async () => {
      const response = await request(app)
        .get('/api/monitoring/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logs');
      expect(Array.isArray(response.body.data.logs)).toBe(true);
    });

    it('should support filtering logs by level', async () => {
      const response = await request(app)
        .get('/api/monitoring/logs')
        .query({ level: 'error', limit: 50 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logs');
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get('/api/monitoring/logs')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/api/monitoring/logs')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(['NO_TOKEN', 'AUTHENTICATION_REQUIRED']).toContain(response.body.error.code);
    });
  });
});