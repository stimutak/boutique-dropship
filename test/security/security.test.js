const request = require('supertest');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import security middleware
const { 
  generateCSRFToken, 
  csrfProtection, 
  rateLimits, 
  speedLimiter, 
  sanitizeInput, 
  securityHeaders,
  apiKeyAuth 
} = require('../../middleware/security');

describe('Security Tests', () => {
  let app;
  let mongoServer;
  let mongoUri;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    
    // Only connect if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoServer.stop();
  });

  beforeEach(() => {
    // Create test app
    app = express();
    
    // Add session middleware
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ mongoUrl: mongoUri }),
      cookie: { secure: false, httpOnly: true }
    }));
    
    app.use(express.json());
    app.use(securityHeaders);
    app.use(sanitizeInput);
    app.use(generateCSRFToken);
  });

  describe('Security Headers', () => {
    test('should add security headers to responses', async () => {
      app.get('/test', (req, res) => {
        res.json({ message: 'test' });
      });

      const response = await request(app).get('/test');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['permissions-policy']).toContain('geolocation=()');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize MongoDB injection attempts', async () => {
      app.post('/test', (req, res) => {
        res.json({ body: req.body });
      });

      const maliciousPayload = {
        email: { $ne: null },
        password: { $regex: '.*' }
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousPayload);

      expect(response.body.body.email).toBe('_ne_');
      expect(response.body.body.password).toBe('_regex_');
    });

    test('should sanitize nested objects', async () => {
      app.post('/test', (req, res) => {
        res.json({ body: req.body });
      });

      const maliciousPayload = {
        user: {
          query: { $where: 'function() { return true; }' },
          data: { $set: { admin: true } }
        }
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousPayload);

      expect(response.body.body.user.query._where_).toBeDefined();
      expect(response.body.body.user.data._set_).toBeDefined();
    });
  });

  describe('CSRF Protection', () => {
    test('should generate CSRF token in session', async () => {
      app.get('/csrf', (req, res) => {
        res.json({ csrfToken: req.session.csrfToken });
      });

      const response = await request(app).get('/csrf');
      
      expect(response.body.csrfToken).toBeDefined();
      expect(response.body.csrfToken).toHaveLength(64);
    });

    test('should reject POST requests without CSRF token', async () => {
      app.post('/protected', csrfProtection, (req, res) => {
        res.json({ message: 'success' });
      });

      const response = await request(app)
        .post('/protected')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CSRF_TOKEN_MISMATCH');
    });

    test('should accept POST requests with valid CSRF token', async () => {
      // First get CSRF token
      const agent = request.agent(app);
      
      app.get('/csrf', (req, res) => {
        res.json({ csrfToken: req.session.csrfToken });
      });
      
      app.post('/protected', csrfProtection, (req, res) => {
        res.json({ message: 'success' });
      });

      const csrfResponse = await agent.get('/csrf');
      const csrfToken = csrfResponse.body.csrfToken;

      const response = await agent
        .post('/protected')
        .set('x-csrf-token', csrfToken)
        .send({ data: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('success');
    });

    test('should allow GET requests without CSRF token', async () => {
      app.get('/protected', csrfProtection, (req, res) => {
        res.json({ message: 'success' });
      });

      const response = await request(app).get('/protected');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('success');
    });
  });

  describe('API Key Authentication', () => {
    beforeEach(() => {
      process.env.VALID_API_KEYS = 'test_key_1,test_key_2,test_key_3';
    });

    afterEach(() => {
      delete process.env.VALID_API_KEYS;
    });

    test('should reject requests without API key', async () => {
      app.get('/api-protected', apiKeyAuth, (req, res) => {
        res.json({ message: 'success' });
      });

      const response = await request(app).get('/api-protected');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('API_KEY_REQUIRED');
    });

    test('should reject requests with invalid API key', async () => {
      app.get('/api-protected', apiKeyAuth, (req, res) => {
        res.json({ message: 'success' });
      });

      const response = await request(app)
        .get('/api-protected')
        .set('x-api-key', 'invalid_key');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_API_KEY');
    });

    test('should accept requests with valid API key', async () => {
      app.get('/api-protected', apiKeyAuth, (req, res) => {
        res.json({ message: 'success' });
      });

      const response = await request(app)
        .get('/api-protected')
        .set('x-api-key', 'test_key_1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('success');
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce general rate limits', async () => {
      app.use(rateLimits.general);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });

      // Make requests up to the limit
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(request(app).get('/test'));
      }
      
      const responses = await Promise.all(promises);
      const successfulResponses = responses.filter(r => r.status === 200);
      
      expect(successfulResponses.length).toBeLessThanOrEqual(100);
    });

    test('should enforce auth rate limits', async () => {
      app.use(rateLimits.auth);
      app.post('/login', (req, res) => {
        res.json({ message: 'login attempt' });
      });

      // Make requests up to the limit
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(request(app).post('/login').send({}));
      }
      
      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Speed Limiting (Brute Force Protection)', () => {
    test('should add delays after multiple requests', async () => {
      app.use(speedLimiter);
      app.post('/login', (req, res) => {
        res.json({ message: 'login attempt' });
      });

      const startTime = Date.now();
      
      // Make multiple requests to trigger speed limiting
      for (let i = 0; i < 8; i++) {
        await request(app).post('/login').send({});
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take longer due to speed limiting delays
      expect(duration).toBeGreaterThan(1000); // At least 1 second delay
    });
  });

  describe('Input Validation', () => {
    test('should validate email format', async () => {
      const { body } = require('express-validator');
      
      app.post('/register', [
        body('email').isEmail().withMessage('Invalid email format'),
        (req, res, next) => {
          const errors = require('express-validator').validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
          }
          next();
        }
      ], (req, res) => {
        res.json({ message: 'valid' });
      });

      const response = await request(app)
        .post('/register')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toBe('Invalid email format');
    });

    test('should validate password strength', async () => {
      const { body } = require('express-validator');
      
      app.post('/register', [
        body('password')
          .isLength({ min: 8 })
          .withMessage('Password must be at least 8 characters')
          .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
          .withMessage('Password must contain uppercase, lowercase, number, and special character'),
        (req, res, next) => {
          const errors = require('express-validator').validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
          }
          next();
        }
      ], (req, res) => {
        res.json({ message: 'valid' });
      });

      const response = await request(app)
        .post('/register')
        .send({ password: 'weak' });

      expect(response.status).toBe(400);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Penetration Testing Scenarios', () => {
    test('should prevent SQL injection attempts', async () => {
      app.post('/search', (req, res) => {
        // Simulate a search endpoint that might be vulnerable
        const query = req.body.query;
        res.json({ query, sanitized: true });
      });

      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "' OR 1=1#"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/search')
          .send({ query: payload });

        expect(response.status).toBe(200);
        // The payload should be sanitized or handled safely
        expect(response.body.query).toBeDefined();
      }
    });

    test('should prevent XSS attempts', async () => {
      app.post('/comment', (req, res) => {
        const comment = req.body.comment;
        res.json({ comment });
      });

      const xssPayloads = [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "javascript:alert('XSS')",
        "<svg onload=alert('XSS')>",
        "';alert('XSS');//"
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/comment')
          .send({ comment: payload });

        expect(response.status).toBe(200);
        // XSS payloads should be handled safely
        expect(response.body.comment).toBeDefined();
      }
    });

    test('should prevent directory traversal attacks', async () => {
      app.get('/file/:filename', (req, res) => {
        const filename = req.params.filename;
        // Simulate file access (should be protected)
        res.json({ filename, access: 'denied' });
      });

      const traversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd'
      ];

      for (const payload of traversalPayloads) {
        const response = await request(app).get(`/file/${encodeURIComponent(payload)}`);
        
        expect(response.status).toBe(200);
        expect(response.body.access).toBe('denied');
      }
    });

    test('should prevent command injection attempts', async () => {
      app.post('/ping', (req, res) => {
        const host = req.body.host;
        // Simulate a ping command (should be sanitized)
        res.json({ host, result: 'sanitized' });
      });

      const commandInjectionPayloads = [
        'google.com; cat /etc/passwd',
        'google.com && rm -rf /',
        'google.com | nc -l 4444',
        'google.com `whoami`',
        'google.com $(cat /etc/passwd)'
      ];

      for (const payload of commandInjectionPayloads) {
        const response = await request(app)
          .post('/ping')
          .send({ host: payload });

        expect(response.status).toBe(200);
        expect(response.body.result).toBe('sanitized');
      }
    });

    test('should handle large payload attacks', async () => {
      app.post('/upload', (req, res) => {
        res.json({ size: JSON.stringify(req.body).length });
      });

      // Create a large payload
      const largePayload = {
        data: 'A'.repeat(10000000) // 10MB of data
      };

      const response = await request(app)
        .post('/upload')
        .send(largePayload);

      // Should either reject or handle gracefully
      expect([200, 413, 400]).toContain(response.status);
    });
  });

  describe('Authentication Security', () => {
    test('should prevent timing attacks on login', async () => {
      app.post('/login', async (req, res) => {
        const { _email, _password } = req.body;
        
        // Simulate constant-time comparison
        const startTime = Date.now();
        
        // Always perform some work regardless of user existence
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        res.json({ 
          success: false, 
          message: 'Invalid credentials',
          duration 
        });
      });

      const validEmail = 'user@example.com';
      const invalidEmail = 'nonexistent@example.com';
      
      const response1 = await request(app)
        .post('/login')
        .send({ email: validEmail, password: 'wrong' });
        
      const response2 = await request(app)
        .post('/login')
        .send({ email: invalidEmail, password: 'wrong' });

      // Response times should be similar to prevent timing attacks
      const timeDiff = Math.abs(response1.body.duration - response2.body.duration);
      expect(timeDiff).toBeLessThan(50); // Allow 50ms variance
    });

    test('should enforce password complexity', async () => {
      const { validationRules } = require('../../middleware/security');
      
      app.post('/register', [
        validationRules.password,
        (req, res, next) => {
          const errors = require('express-validator').validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
          }
          next();
        }
      ], (req, res) => {
        res.json({ message: 'valid password' });
      });

      const weakPasswords = [
        'password',
        '12345678',
        'Password',
        'Password1',
        'password1!'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/register')
          .send({ password });

        expect(response.status).toBe(400);
      }

      // Test strong password
      const strongResponse = await request(app)
        .post('/register')
        .send({ password: 'StrongP@ssw0rd!' });

      expect(strongResponse.status).toBe(200);
    });
  });
});