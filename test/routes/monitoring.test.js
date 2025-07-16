const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock the logger and errorRecovery utilities
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../utils/errorRecovery', () => ({
  getCircuitBreakerStatus: jest.fn(() => ({
    payment: { state: 'closed', failures: 0 },
    email: { state: 'closed', failures: 0 }
  }))
}));

// Mock mongoose
jest.mock('mongoose', () => ({
  connection: {
    readyState: 1,
    host: 'localhost',
    port: 27017,
    name: 'test-db',
    db: {
      admin: () => ({
        ping: () => Promise.resolve()
      }),
      listCollections: () => ({
        toArray: () => Promise.resolve([
          { name: 'users' },
          { name: 'products' }
        ])
      }),
      collection: (name) => ({
        stats: () => Promise.resolve({
          count: 10,
          size: 1024,
          avgObjSize: 102
        })
      })
    }
  }
}));

const { logger } = require('../../utils/logger');
const { getCircuitBreakerStatus } = require('../../utils/errorRecovery');

describe('Monitoring Routes', () => {
  let app;
  let adminToken;
  let regularUserToken;
  
  beforeAll(() => {
    // Set JWT secret for testing
    process.env.JWT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';
    
    // Create test tokens
    adminToken = jwt.sign(
      { userId: 'admin-user-id' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    regularUserToken = jwt.sign(
      { userId: 'regular-user-id' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create test app with mocked auth middleware
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        req.user = null;
        return next();
      }
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.userId === 'admin-user-id') {
          req.user = { 
            _id: 'admin-user-id', 
            email: 'admin@test.com', 
            isAdmin: true 
          };
        } else if (decoded.userId === 'regular-user-id') {
          req.user = { 
            _id: 'regular-user-id', 
            email: 'user@test.com', 
            isAdmin: false 
          };
        } else {
          req.user = null;
        }
        next();
      } catch (error) {
        req.user = null;
        next();
      }
    });
    
    app.use('/api/monitoring', require('../../routes/monitoring'));
  });
  
  describe('GET /api/monitoring/health', () => {
    it('should return basic health check without authentication', async () => {
      const response = await request(app)
        .get('/api/monitoring/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment', 'test');
      expect(typeof response.body.uptime).toBe('number');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
    
    it('should return consistent response format', async () => {
      const response = await request(app)
        .get('/api/monitoring/health')
        .expect(200);
      
      const requiredFields = ['status', 'timestamp', 'uptime', 'environment'];
      requiredFields.forEach(field => {
        expect(response.body).toHaveProperty(field);
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
      expect(response.body.data).toHaveProperty('environment', 'test');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data).toHaveProperty('circuitBreakers');
      expect(response.body.data).toHaveProperty('services');
      
      // Verify memory object structure
      expect(response.body.data.memory).toHaveProperty('rss');
      expect(response.body.data.memory).toHaveProperty('heapTotal');
      expect(response.body.data.memory).toHaveProperty('heapUsed');
      
      // Verify database status structure
      expect(response.body.data.database).toHaveProperty('state');
      
      // Verify services structure
      expect(response.body.data.services).toHaveProperty('payment');
      expect(response.body.data.services).toHaveProperty('email');
      
      // Verify logging was called
      expect(logger.info).toHaveBeenCalledWith('System status requested', {
        requestedBy: 'admin@test.com',
        timestamp: response.body.data.timestamp
      });
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
      expect(response.body.error.code).toBe('NO_TOKEN');
    });
    
    it('should handle errors gracefully', async () => {
      // Mock mongoose connection to throw error
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', {
        get: () => { throw new Error('Database connection error'); },
        configurable: true
      });
      
      const response = await request(app)
        .get('/api/monitoring/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STATUS_ERROR');
      expect(response.body.error.message).toBe('Unable to retrieve system status');
      
      // Verify error logging
      expect(logger.error).toHaveBeenCalledWith('Error getting system status:', {
        error: expect.any(String),
        requestedBy: 'admin@test.com'
      });
      
      // Restore original property
      Object.defineProperty(mongoose.connection, 'readyState', {
        get: () => originalReadyState,
        configurable: true
      });
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
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('database');
      expect(response.body.data).toHaveProperty('errors');
      
      // Verify system metrics structure
      expect(response.body.data.system).toHaveProperty('uptime');
      expect(response.body.data.system).toHaveProperty('memory');
      expect(response.body.data.system).toHaveProperty('cpu');
      
      // Verify database metrics structure
      expect(response.body.data.database).toHaveProperty('connections');
      expect(response.body.data.database).toHaveProperty('collections');
      
      // Verify error metrics structure
      expect(response.body.data.errors).toHaveProperty('note');
      expect(response.body.data.errors).toHaveProperty('last24Hours');
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
      expect(response.body.error.code).toBe('NO_TOKEN');
    });
    
    it('should handle collection stats errors gracefully', async () => {
      // Mock database error
      const originalDb = mongoose.connection.db;
      mongoose.connection.db = {
        listCollections: () => ({
          toArray: () => Promise.reject(new Error('Database error'))
        })
      };
      
      const response = await request(app)
        .get('/api/monitoring/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.database.collections).toHaveProperty('error');
      
      // Restore original database
      mongoose.connection.db = originalDb;
    });
  });
  
  describe('GET /api/monitoring/logs', () => {
    it('should return logs endpoint for admin users', async () => {
      const response = await request(app)
        .get('/api/monitoring/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('level', 'info');
      expect(response.body.data).toHaveProperty('limit', 100);
      expect(response.body.data).toHaveProperty('note');
    });
    
    it('should accept query parameters', async () => {
      const response = await request(app)
        .get('/api/monitoring/logs')
        .query({ level: 'error', limit: 50 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.level).toBe('error');
      expect(response.body.data.limit).toBe(50);
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
      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });
  
  describe('Circuit Breaker Integration', () => {
    it('should include circuit breaker status in system status', async () => {
      const mockCircuitBreakerStatus = {
        payment: { state: 'open', failures: 5 },
        email: { state: 'half-open', failures: 2 }
      };
      
      getCircuitBreakerStatus.mockReturnValue(mockCircuitBreakerStatus);
      
      const response = await request(app)
        .get('/api/monitoring/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.data.circuitBreakers).toEqual(mockCircuitBreakerStatus);
      expect(getCircuitBreakerStatus).toHaveBeenCalled();
    });
  });
  
  describe('Database Status Validation', () => {
    it('should handle different database connection states', async () => {
      // Test connected state
      const response = await request(app)
        .get('/api/monitoring/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.data.database.state).toBe('connected');
      expect(response.body.data.database).toHaveProperty('host');
      expect(response.body.data.database).toHaveProperty('port');
      expect(response.body.data.database).toHaveProperty('name');
    });
  });
  
  describe('Error Handling and Logging', () => {
    it('should log errors with proper context', async () => {
      // Force an error by mocking a function to throw
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = () => { throw new Error('Memory error'); };
      
      const response = await request(app)
        .get('/api/monitoring/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Error getting system status:', {
        error: expect.any(String),
        requestedBy: 'admin@test.com'
      });
      
      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });
  
  describe('Response Format Consistency', () => {
    it('should maintain consistent success response format', async () => {
      const endpoints = [
        { path: '/api/monitoring/status', auth: true },
        { path: '/api/monitoring/metrics', auth: true },
        { path: '/api/monitoring/logs', auth: true }
      ];
      
      for (const endpoint of endpoints) {
        const request_builder = request(app).get(endpoint.path);
        
        if (endpoint.auth) {
          request_builder.set('Authorization', `Bearer ${adminToken}`);
        }
        
        const response = await request_builder.expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(typeof response.body.data).toBe('object');
      }
    });
    
    it('should maintain consistent error response format', async () => {
      const response = await request(app)
        .get('/api/monitoring/status')
        .expect(401);
      
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });
});