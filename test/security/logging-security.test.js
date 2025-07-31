/**
 * @jest-environment node
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Mock console methods to capture logs
let consoleLogSpy, consoleWarnSpy, consoleErrorSpy;
let loggedMessages = [];

// Helper to capture all console output
const captureConsoleOutput = () => {
  loggedMessages = [];
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args) => {
    loggedMessages.push({ type: 'log', message: args.join(' ') });
  });
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => {
    loggedMessages.push({ type: 'warn', message: args.join(' ') });
  });
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
    loggedMessages.push({ type: 'error', message: args.join(' ') });
  });
};

const restoreConsole = () => {
  if (consoleLogSpy) consoleLogSpy.mockRestore();
  if (consoleWarnSpy) consoleWarnSpy.mockRestore();
  if (consoleErrorSpy) consoleErrorSpy.mockRestore();
  loggedMessages = [];
};

// Mock environment variables
const originalEnv = process.env;

describe('Logging Security Tests', () => {
  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    captureConsoleOutput();
  });

  afterEach(() => {
    restoreConsole();
    process.env = originalEnv;
  });

  describe('Environment Details Logging Security', () => {
    test('should not log JWT_SECRET length in production', () => {
      // Set production environment
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a'.repeat(32); // 32 character secret

      // Clear require cache to force re-evaluation
      delete require.cache[require.resolve('../../server.js')];
      
      // This should fail initially because server.js logs JWT_SECRET length
      try {
        require('../../server.js');
      } catch (error) {
        // Ignore server startup errors, we just want to test logging
      }

      // Check that no JWT_SECRET details were logged
      const jwtSecretLogs = loggedMessages.filter(log => 
        log.message.includes('JWT_SECRET length') || 
        log.message.includes('JWT_SECRET exists')
      );

      // This test should FAIL initially - we expect JWT_SECRET details to be logged
      expect(jwtSecretLogs).toHaveLength(0);
    });

    test('should not log environment details in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '5001';
      process.env.JWT_SECRET = 'a'.repeat(32);

      delete require.cache[require.resolve('../../server.js')];
      
      try {
        require('../../server.js');
      } catch (error) {
        // Ignore server startup errors
      }

      // Check that no environment details were logged
      const envLogs = loggedMessages.filter(log => 
        log.message.includes('Environment variables loaded') ||
        log.message.includes('NODE_ENV:') ||
        log.message.includes('PORT:')
      );

      // This test should FAIL initially
      expect(envLogs).toHaveLength(0);
    });

    test('should allow development logging but not in production', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'a'.repeat(32);

      delete require.cache[require.resolve('../../server.js')];
      
      try {
        require('../../server.js');
      } catch (error) {
        // Ignore server startup errors
      }

      // In development, some logging is acceptable but should not include secrets
      const secretLogs = loggedMessages.filter(log => 
        log.message.includes(process.env.JWT_SECRET) // Should never log actual secret
      );

      expect(secretLogs).toHaveLength(0);
    });
  });

  describe('Session ID Logging Security', () => {
    let app, mockCart, mockUser;

    beforeEach(() => {
      // Mock dependencies
      jest.resetModules();
      
      // Mock models
      mockCart = {
        findOneAndUpdate: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        deleteMany: jest.fn(),
        deleteOne: jest.fn(),
        save: jest.fn()
      };

      mockUser = {
        findById: jest.fn(),
        save: jest.fn()
      };

      // Mock the models
      jest.doMock('../../models/Cart', () => mockCart);
      jest.doMock('../../models/User', () => mockUser);
      jest.doMock('../../models/Product', () => ({}));

      // Mock middleware
      jest.doMock('../../middleware/auth', () => ({
        authenticateToken: (req, res, next) => next()
      }));
      jest.doMock('../../middleware/sessionCSRF', () => ({
        validateCSRFToken: (req, res, next) => next()
      }));

      // Mock utilities
      jest.doMock('../../utils/currency', () => ({
        getCurrencyForLocale: jest.fn().mockReturnValue('USD'),
        formatPrice: jest.fn().mockReturnValue('$10.00')
      }));
      jest.doMock('../../utils/errorHandler', () => ({
        ErrorCodes: { NOT_GUEST_USER: 'NOT_GUEST_USER' }
      }));

      app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        res.error = (status, code, message) => res.status(status).json({ error: { code, message } });
        next();
      });
    });

    test('should not log full session IDs in production', async () => {
      process.env.NODE_ENV = 'production';
      
      // Mock cart creation
      const testSessionId = 'guest_1234567890_abcdefghi';
      mockCart.findOneAndUpdate.mockResolvedValue({
        sessionId: testSessionId,
        items: [],
        save: jest.fn()
      });

      const cartRouter = require('../../routes/cart');
      app.use('/cart', cartRouter);

      const response = await request(app)
        .get('/cart')
        .set('x-guest-session-id', testSessionId);

      // Check that full session ID was not logged
      const sessionIdLogs = loggedMessages.filter(log => 
        log.message.includes(testSessionId)
      );

      // This test should FAIL initially - we expect full session IDs to be logged
      expect(sessionIdLogs).toHaveLength(0);
    });

    test('should not log sensitive session information during cart operations in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const testSessionId = 'guest_1234567890_abcdefghi';
      
      // Mock cart operations
      mockCart.deleteMany.mockResolvedValue({ deletedCount: 1 });
      mockCart.save = jest.fn().mockResolvedValue(true);

      const cartRouter = require('../../routes/cart');
      app.use('/cart', cartRouter);

      // Test cart clearing
      await request(app)
        .delete('/cart/clear')
        .set('x-guest-session-id', testSessionId);

      // Check for sensitive session information in logs
      const sensitiveLogs = loggedMessages.filter(log => 
        log.message.includes('guest_') || 
        log.message.includes('session') ||
        log.message.includes('cart(s) for')
      );

      // This test should FAIL initially
      expect(sensitiveLogs).toHaveLength(0);
    });

    test('should mask session IDs in development logging', async () => {
      process.env.NODE_ENV = 'development';
      
      const testSessionId = 'guest_1234567890_abcdefghi';
      
      mockCart.findOneAndUpdate.mockResolvedValue({
        sessionId: testSessionId,
        items: [],
        save: jest.fn()
      });

      const cartRouter = require('../../routes/cart');
      app.use('/cart', cartRouter);

      await request(app)
        .get('/cart')
        .set('x-guest-session-id', testSessionId);

      // In development, we should have logs but session IDs should be masked
      const fullSessionIdLogs = loggedMessages.filter(log => 
        log.message.includes(testSessionId) // Full session ID should not appear
      );

      // Even in development, full session IDs should be masked
      expect(fullSessionIdLogs).toHaveLength(0);

      // But we should have some masked logging
      const maskedLogs = loggedMessages.filter(log => 
        log.message.includes('guest_***') || 
        log.message.includes('***') ||
        (log.message.includes('session') && !log.message.includes(testSessionId))
      );

      // We should have masked logging in development
      expect(maskedLogs.length).toBeGreaterThan(0);
    });

    test('should not log session details during reset operations in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const oldSessionId = 'guest_old_session_id';
      
      mockCart.deleteMany.mockResolvedValue({ deletedCount: 1 });

      const cartRouter = require('../../routes/cart');
      app.use('/cart', cartRouter);

      await request(app)
        .post('/cart/reset-guest-session')
        .set('x-guest-session-id', oldSessionId);

      // Check for any session ID information in logs
      const sessionLogs = loggedMessages.filter(log => 
        log.message.includes('guest_') ||
        log.message.includes('session') ||
        log.message.includes('old_session') ||
        log.message.includes('Deleted')
      );

      // This test should FAIL initially
      expect(sessionLogs).toHaveLength(0);
    });
  });

  describe('Utility Functions for Secure Logging', () => {
    test('should have a utility function to mask sensitive session IDs', () => {
      // This test will initially fail because the utility doesn't exist yet
      const { maskSessionId } = require('../../utils/secureLogging');
      
      const testSessionId = 'guest_1234567890_abcdefghi';
      const masked = maskSessionId(testSessionId);
      
      // Should mask the middle part but keep prefix and suffix
      expect(masked).toBe('guest_***_ghi');
      expect(masked).not.toContain('1234567890');
      expect(masked).not.toContain('abcdef');
    });

    test('should have environment-aware logging helper', () => {
      // This test will initially fail because the utility doesn't exist yet
      const { secureLog } = require('../../utils/secureLogging');
      
      process.env.NODE_ENV = 'production';
      
      // Should not log in production
      secureLog('test message', { sessionId: 'guest_123_abc' });
      
      const productionLogs = loggedMessages.filter(log => 
        log.message.includes('test message')
      );
      
      expect(productionLogs).toHaveLength(0);
    });
  });
});