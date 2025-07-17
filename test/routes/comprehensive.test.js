const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const { createTestApp } = require('../helpers/testApp');

describe('Comprehensive Route Testing', () => {
  let app;
  let adminUser;
  let regularUser;
  let adminToken;
  let regularUserToken;
  let testProduct;
  let testOrder;

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    // Create test users
    adminUser = await User.create({
      email: 'admin@test.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true
    });

    regularUser = await User.create({
      email: 'user@test.com',
      password: 'password123',
      firstName: 'Regular',
      lastName: 'User',
      isAdmin: false
    });

    // Generate tokens
    adminToken = jwt.sign(
      { userId: adminUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    regularUserToken = jwt.sign(
      { userId: regularUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test product
    testProduct = await Product.create({
      name: 'Test Crystal',
      slug: 'test-crystal',
      description: 'A beautiful test crystal for healing and meditation',
      shortDescription: 'A beautiful test crystal',
      price: 29.99,
      category: 'crystals',
      properties: {
        chakra: ['heart'],
        element: 'earth',
        zodiac: ['taurus']
      },
      wholesaler: {
        name: 'Test Wholesaler',
        email: 'wholesaler@test.com',
        productCode: 'TC001',
        cost: 15.00
      }
    });

    // Create test order
    testOrder = await Order.create({
      customer: regularUser._id,
      items: [{
        product: testProduct._id,
        quantity: 1,
        price: testProduct.price
      }],
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
      },
      subtotal: testProduct.price,
      total: testProduct.price,
      payment: {
        method: 'card',
        status: 'pending'
      },
      status: 'pending'
    });
  });

  describe('Health Check Routes', () => {
    it('GET /health should return OK', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('OK');
    });
  });

  describe('Auth Routes (/api/auth)', () => {
    describe('POST /api/auth/register', () => {
      it('should register new user', async () => {
        const userData = {
          email: 'newuser@test.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe(userData.email);
        expect(response.body).toHaveProperty('token');
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'user@test.com',
            password: 'password123'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('token');
      });

      it('should reject invalid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'user@test.com',
            password: 'wrongpassword'
          })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      });
    });

    describe('GET /api/auth/profile', () => {
      it('should get profile with valid token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${regularUserToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe('user@test.com');
      });

      it('should reject without token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Product Routes (/api/products)', () => {
    describe('GET /api/products', () => {
      it('should get all products', async () => {
        const response = await request(app)
          .get('/api/products')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.products)).toBe(true);
        expect(response.body.data.products.length).toBeGreaterThan(0);
      });

      it('should filter by category', async () => {
        const response = await request(app)
          .get('/api/products?category=crystals')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.products)).toBe(true);
      });
    });

    describe('GET /api/products/:slug', () => {
      it('should get single product by slug', async () => {
        const response = await request(app)
          .get(`/api/products/${testProduct.slug}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.product.name).toBe('Test Crystal');
        // Should not include wholesaler info in public API
        expect(response.body.data.product.wholesaler).toBeUndefined();
      });

      it('should return 404 for non-existent product', async () => {
        const response = await request(app)
          .get(`/api/products/non-existent-slug`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Cart Routes (/api/cart)', () => {
    describe('POST /api/cart/add', () => {
      it('should add item to cart for authenticated user', async () => {
        const response = await request(app)
          .post('/api/cart/add')
          .set('Authorization', `Bearer ${regularUserToken}`)
          .send({
            productId: testProduct._id,
            quantity: 2
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.cart.items.length).toBe(1);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/cart/add')
          .send({
            productId: testProduct._id,
            quantity: 1
          })
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/cart', () => {
      it('should get user cart', async () => {
        // Use agent to maintain session
        const agent = request.agent(app);
        
        // First add item to cart
        await agent
          .post('/api/cart/add')
          .set('Authorization', `Bearer ${regularUserToken}`)
          .send({
            productId: testProduct._id,
            quantity: 1
          });

        const response = await agent
          .get('/api/cart')
          .set('Authorization', `Bearer ${regularUserToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.cart.items.length).toBe(1);
      });
    });
  });

  describe('Order Routes (/api/orders)', () => {
    describe('GET /api/orders', () => {
      it('should get user orders', async () => {
        const response = await request(app)
          .get('/api/orders')
          .set('Authorization', `Bearer ${regularUserToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.orders)).toBe(true);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/orders')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/orders/:id', () => {
      it('should get single order for owner', async () => {
        const response = await request(app)
          .get(`/api/orders/${testOrder._id}`)
          .set('Authorization', `Bearer ${regularUserToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.order._id.toString()).toBe(testOrder._id.toString());
      });

      it('should allow admin access to any order', async () => {
        const response = await request(app)
          .get(`/api/orders/${testOrder._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.order._id.toString()).toBe(testOrder._id.toString());
      });
    });
  });

  describe('Admin Routes (/api/admin)', () => {
    describe('GET /api/admin/products', () => {
      it('should get products with admin data', async () => {
        const response = await request(app)
          .get('/api/admin/products')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.products)).toBe(true);
        // Should include wholesaler info for admin
        if (response.body.data.products.length > 0) {
          expect(response.body.data.products[0]).toHaveProperty('wholesaler');
        }
      });

      it('should deny access to non-admin users', async () => {
        const response = await request(app)
          .get('/api/admin/products')
          .set('Authorization', `Bearer ${regularUserToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      });

      it('should deny access without authentication', async () => {
        const response = await request(app)
          .get('/api/admin/products')
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/admin/orders', () => {
      it('should get all orders for admin', async () => {
        const response = await request(app)
          .get('/api/admin/orders')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.orders)).toBe(true);
      });
    });
  });

  describe('Monitoring Routes (/api/monitoring)', () => {
    describe('GET /api/monitoring/health', () => {
      it('should return health status without auth', async () => {
        const response = await request(app)
          .get('/api/monitoring/health')
          .expect(200);

        expect(response.body.status).toBe('OK');
        expect(response.body).toHaveProperty('timestamp');
      });
    });

    describe('GET /api/monitoring/status', () => {
      it('should return detailed status for admin', async () => {
        const response = await request(app)
          .get('/api/monitoring/status')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('uptime');
        expect(response.body.data).toHaveProperty('memory');
        expect(response.body.data).toHaveProperty('database');
      });

      it('should deny access to non-admin', async () => {
        const response = await request(app)
          .get('/api/monitoring/status')
          .set('Authorization', `Bearer ${regularUserToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Payment Routes (/api/payments)', () => {
    describe('POST /api/payments/create', () => {
      it('should create payment for authenticated user', async () => {
        const paymentData = {
          amount: 29.99,
          description: 'Test payment',
          orderId: testOrder._id
        };

        const response = await request(app)
          .post('/api/payments/create')
          .set('Authorization', `Bearer ${regularUserToken}`)
          .send(paymentData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('paymentId');
        expect(response.body.data).toHaveProperty('checkoutUrl');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/payments/create')
          .send({
            amount: 29.99,
            description: 'Test payment'
          })
          .expect(401);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      // Should return proper error format or 404
      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.status).toBe(400);
    });
  });

  describe('Response Format Consistency', () => {
    it('should maintain consistent success response format', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(typeof response.body.data).toBe('object');
    });

    it('should maintain consistent error response format', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive data in public endpoints', async () => {
      const response = await request(app)
        .get(`/api/products/${testProduct.slug}`)
        .expect(200);

      expect(response.body.data.product.wholesaler).toBeUndefined();
    });

    it('should validate JWT tokens properly', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should enforce admin permissions', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });
});