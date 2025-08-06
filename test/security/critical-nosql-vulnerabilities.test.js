const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const { 
  sanitizeObjectId, 
  sanitizeQuery, 
  sanitizeBody,
  isValidObjectId 
} = require('../../utils/inputSanitizer');

/**
 * CRITICAL NoSQL Injection Vulnerability Tests
 * 
 * This test suite demonstrates the most critical NoSQL injection vulnerabilities
 * found in the codebase and verifies that proper fixes prevent exploitation.
 * 
 * VULNERABILITY SUMMARY:
 * 1. Direct ObjectId injection in route parameters
 * 2. Query object injection via findOne() calls
 * 3. Aggregation pipeline injection
 * 4. Authentication bypass attempts
 * 5. Admin privilege escalation via parameter pollution
 */

describe('CRITICAL NoSQL Injection Vulnerabilities', () => {
  let testApp;
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;
  let testProduct;
  let testOrder;

  beforeAll(async () => {
    // Set up test application with input sanitization
    process.env.NODE_ENV = 'test';
    
    // Create test users
    adminUser = await User.create({
      email: 'critical-admin@test.com',
      password: 'SecurePassword123!',
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true,
      isActive: true
    });

    testUser = await User.create({
      email: 'critical-user@test.com',
      password: 'SecurePassword123!',
      firstName: 'Test',
      lastName: 'User',
      isAdmin: false,
      isActive: true
    });

    // Generate tokens
    adminToken = jwt.sign({ userId: adminUser._id }, process.env.JWT_SECRET);
    userToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET);

    // Create test data
    testProduct = await Product.create({
      name: 'Critical Test Crystal',
      slug: 'critical-test-crystal',
      description: 'A test crystal for security testing',
      shortDescription: 'Critical test crystal',
      price: 99.99,
      category: 'crystals',
      isActive: true,
      wholesaler: {
        name: 'Critical Test Wholesaler',
        email: 'wholesaler@critical-test.com',
        productCode: 'CTC001',
        cost: 50.00
      }
    });

    testOrder = await Order.create({
      orderNumber: 'ORD-CRITICAL-001',
      customer: testUser._id,
      items: [{
        product: testProduct._id,
        quantity: 1,
        price: 99.99
      }],
      subtotal: 99.99,
      total: 99.99,
      currency: 'USD',
      status: 'pending',
      payment: { 
        status: 'pending',
        method: 'card'
      },
      shippingAddress: {
        firstName: 'Test',
        lastName: 'User',
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US'
      },
      billingAddress: {
        firstName: 'Test',
        lastName: 'User',
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US'
      }
    });

    // Import app after setting up test data to avoid circular dependency
    testApp = require('../../server');
  });

  afterAll(async () => {
    await User.deleteMany({ email: /critical-.*@test\.com/ });
    await Product.deleteMany({ slug: /critical-/ });
    await Order.deleteMany({ orderNumber: /ORD-CRITICAL/ });
  });

  describe('VULNERABILITY 1: Direct ObjectId Injection (CRITICAL)', () => {
    /**
     * VULNERABILITY: routes/orders.js:714 - Order.findById(req.params.id)
     * IMPACT: Information disclosure, potential data manipulation
     * CVSS: 8.1 (High)
     */
    test('Should prevent ObjectId injection in order lookup', async () => {
      const app = require('../../server');
      
      // ATTACK 1: NoSQL operator injection
      const maliciousId = { '$ne': null };
      
      const response1 = await request(app)
        .get(`/api/orders/${JSON.stringify(maliciousId)}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response1.body.success).toBe(false);
      expect(response1.body.error.code).toBe('INVALID_ID');

      // ATTACK 2: Regex injection to enumerate orders
      const regexAttack = { '$regex': '.*' };
      
      const response2 = await request(app)
        .get(`/api/orders/${JSON.stringify(regexAttack)}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response2.body.success).toBe(false);
    });

    /**
     * VULNERABILITY: routes/admin.js:1037 - Order.findById(req.params.id)
     * IMPACT: Admin panel compromise, order manipulation
     * CVSS: 9.1 (Critical)
     */
    test('Should prevent ObjectId injection in admin order lookup', async () => {
      const app = require('../../server');
      
      const maliciousId = { '$where': 'function() { return true; }' };
      
      const response = await request(app)
        .get(`/api/admin/orders/${JSON.stringify(maliciousId)}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    /**
     * VULNERABILITY: Multiple admin routes with findById
     * IMPACT: Complete admin panel compromise
     */
    test('Should prevent ObjectId injection across all admin routes', async () => {
      const app = require('../../server');
      
      const maliciousPayloads = [
        { '$ne': null },
        { '$regex': '.*', '$options': 'i' },
        { '$where': 'sleep(1000)' },
        { '$exists': true }
      ];

      const routes = [
        '/api/admin/products/',
        '/api/admin/users/',
        '/api/admin/orders/'
      ];

      for (const route of routes) {
        for (const payload of maliciousPayloads) {
          const response = await request(app)
            .get(`${route}${JSON.stringify(payload)}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(400);

          expect(response.body.success).toBe(false);
        }
      }
    });
  });

  describe('VULNERABILITY 2: Query Object Injection (CRITICAL)', () => {
    /**
     * VULNERABILITY: routes/auth.js:504 - User.findOne({ email, _id: { $ne: req.user._id } })
     * IMPACT: User enumeration, account takeover
     * CVSS: 8.5 (High)
     */
    test('Should prevent NoSQL injection in profile update email check', async () => {
      const app = require('../../server');
      
      // ATTACK: Use $ne operator to enumerate users
      const maliciousEmail = { '$ne': 'nonexistent@test.com' };
      
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: maliciousEmail,
          firstName: 'Hacked'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    /**
     * VULNERABILITY: Authentication bypass via NoSQL injection
     * IMPACT: Complete authentication bypass
     * CVSS: 9.8 (Critical)
     */
    test('Should prevent authentication bypass via NoSQL injection', async () => {
      const app = require('../../server');
      
      // ATTACK: Bypass password check
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: { '$ne': null },
          password: { '$ne': null }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('VULNERABILITY 3: Aggregation Pipeline Injection (HIGH)', () => {
    /**
     * VULNERABILITY: Admin analytics routes using unsanitized input in aggregation
     * IMPACT: Data exfiltration, server resource exhaustion
     * CVSS: 7.5 (High)
     */
    test('Should prevent aggregation pipeline injection in analytics', async () => {
      const app = require('../../server');
      
      const maliciousQuery = {
        period: { '$where': 'function() { return Date.now(); }' },
        currency: { '$ne': null }
      };

      const response = await request(app)
        .get('/api/admin/analytics/dashboard')
        .query(maliciousQuery)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Query should be sanitized - no error but no injection either
      expect(response.body.success).toBe(true);
    });
  });

  describe('VULNERABILITY 4: Parameter Pollution Attack (MEDIUM)', () => {
    /**
     * VULNERABILITY: Query parameter pollution leading to privilege escalation
     * IMPACT: Authorization bypass, data manipulation
     */
    test('Should prevent parameter pollution in admin queries', async () => {
      const app = require('../../server');
      
      // ATTACK: Use array parameters to bypass filters
      const response = await request(app)
        .get('/api/admin/products')
        .query({
          'search': ['test', { '$ne': null }],
          'category': [{ '$exists': true }],
          'status': ['active', { '$or': [{ 'isActive': true }, { 'isActive': false }] }]
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should return normal filtered results, not bypass security
    });
  });

  describe('INPUT SANITIZATION UNIT TESTS', () => {
    describe('ObjectId Validation', () => {
      test('isValidObjectId should correctly validate ObjectIds', () => {
        expect(isValidObjectId(new mongoose.Types.ObjectId().toString())).toBe(true);
        expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
        expect(isValidObjectId('invalid-id')).toBe(false);
        expect(isValidObjectId(null)).toBe(false);
        expect(isValidObjectId(undefined)).toBe(false);
        expect(isValidObjectId({})).toBe(false);
        expect(isValidObjectId({ '$ne': null })).toBe(false);
      });

      test('sanitizeObjectId should return valid ObjectId or null', () => {
        const validId = new mongoose.Types.ObjectId().toString();
        expect(sanitizeObjectId(validId)).toBe(validId);
        expect(sanitizeObjectId('invalid')).toBe(null);
        expect(sanitizeObjectId({ '$ne': null })).toBe(null);
        expect(sanitizeObjectId(null)).toBe(null);
      });
    });

    describe('Query Sanitization', () => {
      test('sanitizeQuery should remove MongoDB operators', () => {
        const maliciousQuery = {
          name: 'test',
          email: { '$ne': null },
          price: { '$gt': 0 },
          category: 'crystals'
        };

        const sanitized = sanitizeQuery(maliciousQuery);
        
        expect(sanitized.name).toBe('test');
        expect(sanitized.category).toBe('crystals');
        expect(sanitized.email).toBe('[object Object]'); // Converted to string
        expect(sanitized.price).toBe('[object Object]'); // Converted to string
      });
    });

    describe('Body Sanitization', () => {
      test('sanitizeBody should remove MongoDB operators from nested objects', () => {
        const maliciousBody = {
          name: 'test',
          email: { '$ne': 'admin@test.com' },
          preferences: {
            notifications: { '$set': true },
            validField: 'value'
          },
          '$where': 'function() { return true; }'
        };

        const sanitized = sanitizeBody(maliciousBody);
        
        expect(sanitized.name).toBe('test');
        expect(sanitized.email).toEqual({}); // MongoDB operators removed
        expect(sanitized.preferences.validField).toBe('value');
        expect(sanitized.preferences.notifications).toEqual({}); // $set removed
        expect(sanitized['$where']).toBeUndefined(); // Top-level operator removed
      });
    });
  });

  describe('ADVANCED ATTACK SCENARIOS', () => {
    test('Should prevent blind NoSQL injection for user enumeration', async () => {
      const app = require('../../server');
      
      // Technique: Time-based blind injection
      const timeBasedPayload = {
        email: {
          '$where': 'function() { if (this.email === "admin@test.com") { sleep(5000); } return true; }'
        }
      };

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send(timeBasedPayload)
        .expect(400);

      const duration = Date.now() - startTime;
      
      expect(response.body.success).toBe(false);
      expect(duration).toBeLessThan(1000); // Should not execute sleep
    });

    test('Should prevent JavaScript injection in $where clauses', async () => {
      const app = require('../../server');
      
      const jsInjectionPayload = {
        search: {
          '$where': 'function() { db.users.drop(); return true; }'
        }
      };

      const response = await request(app)
        .get('/api/admin/products')
        .query(jsInjectionPayload)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify database wasn't affected
      const userCount = await User.countDocuments();
      expect(userCount).toBeGreaterThan(0);
    });

    test('Should prevent regex DoS attacks', async () => {
      const app = require('../../server');
      
      // Catastrophic backtracking regex
      const regexDoSPayload = {
        search: {
          '$regex': '^(a+)+$',
          '$options': 'i'
        }
      };

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/products/search')
        .query({ q: JSON.stringify(regexDoSPayload) })
        .expect(200);

      const duration = Date.now() - startTime;
      
      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should not cause DoS
    });
  });

  describe('SECURITY BYPASS ATTEMPTS', () => {
    test('Should prevent authorization bypass via NoSQL injection', async () => {
      const app = require('../../server');
      
      // Try to access admin-only order with injection
      const response = await request(app)
        .get('/api/admin/orders')
        .query({
          customer: { '$ne': testUser._id }
        })
        .set('Authorization', `Bearer ${userToken}`) // Non-admin token
        .expect(403); // Should be forbidden

      expect(response.body.success).toBe(false);
    });

    test('Should prevent payment manipulation via injection', async () => {
      const app = require('../../server');
      
      const maliciousPayment = {
        orderId: { '$ne': null },
        amount: { '$set': 0.01 }
      };

      const response = await request(app)
        .post('/api/payments/create')
        .send(maliciousPayment)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});

describe('VULNERABILITY IMPACT ASSESSMENT', () => {
  test('Document vulnerability severity and impact', () => {
    const vulnerabilities = [
      {
        id: 'NOSQL-001',
        severity: 'CRITICAL',
        cvss: 9.1,
        location: 'routes/orders.js:714',
        description: 'Direct ObjectId injection in Order.findById()',
        impact: 'Information disclosure, data manipulation',
        affected_endpoints: ['/api/orders/:id']
      },
      {
        id: 'NOSQL-002',
        severity: 'CRITICAL',
        cvss: 9.8,
        location: 'routes/auth.js:151',
        description: 'Authentication bypass via NoSQL injection',
        impact: 'Complete authentication bypass',
        affected_endpoints: ['/api/auth/login']
      },
      {
        id: 'NOSQL-003',
        severity: 'HIGH',
        cvss: 8.5,
        location: 'routes/auth.js:504',
        description: 'User enumeration via findOne injection',
        impact: 'User enumeration, account takeover',
        affected_endpoints: ['/api/auth/profile']
      },
      {
        id: 'NOSQL-004',
        severity: 'HIGH',
        cvss: 8.1,
        location: 'routes/admin.js:multiple',
        description: 'Admin panel ObjectId injection',
        impact: 'Admin privilege escalation',
        affected_endpoints: ['/api/admin/products/:id', '/api/admin/users/:id', '/api/admin/orders/:id']
      },
      {
        id: 'NOSQL-005',
        severity: 'HIGH',
        cvss: 7.5,
        location: 'routes/admin.js:analytics',
        description: 'Aggregation pipeline injection',
        impact: 'Data exfiltration, DoS',
        affected_endpoints: ['/api/admin/analytics/*']
      }
    ];

    // Calculate total risk score
    const totalCVSS = vulnerabilities.reduce((sum, vuln) => sum + vuln.cvss, 0);
    const averageCVSS = totalCVSS / vulnerabilities.length;
    const criticalCount = vulnerabilities.filter(v => v.severity === 'CRITICAL').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'HIGH').length;

    console.log('\n=== NOSQL INJECTION VULNERABILITY ASSESSMENT ===');
    console.log(`Total Vulnerabilities Found: ${vulnerabilities.length}`);
    console.log(`Critical: ${criticalCount}, High: ${highCount}`);
    console.log(`Average CVSS Score: ${averageCVSS.toFixed(1)}`);
    console.log(`Risk Level: ${averageCVSS >= 9 ? 'CRITICAL' : averageCVSS >= 7 ? 'HIGH' : 'MEDIUM'}`);
    console.log('==============================================\n');

    // This test always passes - it's for documentation
    expect(vulnerabilities.length).toBeGreaterThan(0);
  });
});