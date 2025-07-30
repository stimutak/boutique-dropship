/**
 * @jest-environment node
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Product = require('../models/Product');
const User = require('../models/User');
const Cart = require('../models/Cart');

describe('Cart Integration Tests - Docker Environment', () => {
  // Use existing test connection from test/setup.js
  
  afterAll(async () => {
    // Cleanup is handled by global test setup
  });

  beforeEach(async () => {
    // Clear all data
    await Product.deleteMany({});
    await User.deleteMany({});
    await Cart.deleteMany({});
  });

  describe('Add to Cart - Docker Environment Simulation', () => {
    let testProduct;
    let agent;
    let csrfToken;
    let sessionId;

    beforeEach(async () => {
      // Create test product
      testProduct = await Product.create({
        name: 'Test Crystal',
        slug: 'test-crystal',
        description: 'A test crystal',
        shortDescription: 'Test crystal',
        price: 29.99,
        category: 'crystals',
        isActive: true,
        stock: 10,
        wholesaler: {
          name: 'Test Wholesaler',
          email: 'test@wholesaler.com',
          productCode: 'TEST-001',
          cost: 15.00
        }
      });

      // Create agent to maintain session/cookies
      agent = request.agent(app);
    });

    it('should handle add to cart with CSRF token correctly', async () => {
      // Step 1: Get CSRF token (simulating page load)
      const csrfResponse = await agent
        .get('/api/csrf-token')
        .expect(200);
      
      expect(csrfResponse.body.success).toBe(true);
      expect(csrfResponse.body.csrfToken).toBeTruthy();
      csrfToken = csrfResponse.body.csrfToken;

      // Step 2: Add to cart with CSRF token
      const addResponse = await agent
        .post('/api/cart/add')
        .set('x-csrf-token', csrfToken)
        .send({ 
          productId: testProduct._id.toString(), 
          quantity: 1 
        })
        .expect(200);

      expect(addResponse.body.success).toBe(true);
      expect(addResponse.body.message).toBe('Item added to cart');
      expect(addResponse.body.data.cart.items).toHaveLength(1);
      expect(addResponse.body.data.cart.items[0].quantity).toBe(1);
    });

    it('should reject add to cart without CSRF token', async () => {
      // Try to add without getting CSRF token first
      const response = await agent
        .post('/api/cart/add')
        .send({ 
          productId: testProduct._id.toString(), 
          quantity: 1 
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CSRF_TOKEN_MISMATCH');
    });

    it('should handle guest session correctly in Docker environment', async () => {
      // Step 1: Get CSRF token to establish session
      const csrfResponse = await agent
        .get('/api/csrf-token')
        .expect(200);
      
      csrfToken = csrfResponse.body.csrfToken;

      // Step 2: Add to cart as guest
      const addResponse = await agent
        .post('/api/cart/add')
        .set('x-csrf-token', csrfToken)
        .set('x-guest-session-id', 'guest_123_test')
        .send({ 
          productId: testProduct._id.toString(), 
          quantity: 2 
        })
        .expect(200);

      expect(addResponse.body.success).toBe(true);

      // Step 3: Fetch cart to verify persistence
      const cartResponse = await agent
        .get('/api/cart')
        .set('x-guest-session-id', 'guest_123_test')
        .expect(200);

      expect(cartResponse.body.success).toBe(true);
      expect(cartResponse.body.data.cart.items).toHaveLength(1);
      expect(cartResponse.body.data.cart.items[0].quantity).toBe(2);
    });

    it('should handle authenticated user add to cart', async () => {
      // Create test user
      const testUser = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        isVerified: true
      });

      // Login to get JWT cookie
      const loginResponse = await agent
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);

      // Get CSRF token after login
      const csrfResponse = await agent
        .get('/api/csrf-token')
        .expect(200);
      
      csrfToken = csrfResponse.body.csrfToken;

      // Add to cart as authenticated user
      const addResponse = await agent
        .post('/api/cart/add')
        .set('x-csrf-token', csrfToken)
        .send({ 
          productId: testProduct._id.toString(), 
          quantity: 3 
        })
        .expect(200);

      expect(addResponse.body.success).toBe(true);
      expect(addResponse.body.data.cart.items).toHaveLength(1);
      expect(addResponse.body.data.cart.items[0].quantity).toBe(3);

      // Verify cart is saved to user
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.cart.items).toHaveLength(1);
      expect(updatedUser.cart.items[0].quantity).toBe(3);
    });

    it('should handle concurrent cart operations', async () => {
      // Get CSRF token
      const csrfResponse = await agent
        .get('/api/csrf-token')
        .expect(200);
      
      csrfToken = csrfResponse.body.csrfToken;

      // Simulate concurrent add to cart operations
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          agent
            .post('/api/cart/add')
            .set('x-csrf-token', csrfToken)
            .set('x-guest-session-id', 'guest_concurrent_test')
            .send({ 
              productId: testProduct._id.toString(), 
              quantity: 1 
            })
        );
      }

      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      // Final cart should have quantity 5
      const cartResponse = await agent
        .get('/api/cart')
        .set('x-guest-session-id', 'guest_concurrent_test')
        .expect(200);

      expect(cartResponse.body.data.cart.items).toHaveLength(1);
      expect(cartResponse.body.data.cart.items[0].quantity).toBe(5);
    });
  });
});