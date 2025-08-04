const request = require('supertest');
const app = require('../../server');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
// Test setup is handled by jest.config.js setupFilesAfterEnv

describe('Payment Integration Tests', () => {
  let agent;
  let testOrder;
  let csrfToken;

  // Database connection handled by test/setup.js

  beforeEach(async () => {
    // Database cleanup handled by test/setup.js afterEach hook
    agent = request.agent(app);
    
    // Get CSRF token
    const csrfRes = await agent.get('/api/csrf-token');
    csrfToken = csrfRes.body.csrfToken;

    // Create test product
    const product = await Product.create({
      name: 'Test Product',
      slug: 'test-product',
      description: 'Test description',
      price: 50.00,
      category: 'other',
      images: [{ url: 'test.jpg', alt: 'Test' }]
    });

    // Create test order
    testOrder = await Order.create({
      orderNumber: `TEST-${Date.now()}`,
      items: [{
        product: product._id,
        quantity: 2,
        price: 50.00
      }],
      subtotal: 100.00,
      shipping: 10.00,
      tax: 11.00,
      total: 121.00,
      customer: null,
      guestInfo: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      },
      shippingAddress: {
        firstName: 'Test',
        lastName: 'User',
        street: '123 Test St',
        city: 'Paris',
        state: 'IDF',
        zipCode: '75001',
        country: 'FR'
      },
      billingAddress: {
        firstName: 'Test',
        lastName: 'User',
        street: '123 Test St',
        city: 'Paris',
        state: 'IDF',
        zipCode: '75001',
        country: 'FR'
      },
      status: 'pending',
      paymentStatus: 'pending'
    });
  });

  describe('Demo Payment', () => {
    test('should complete demo payment successfully', async () => {
      const res = await agent
        .post(`/api/payments/demo-complete/${testOrder._id}`)
        .set('X-CSRF-Token', csrfToken)
        .send({});
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Demo payment completed successfully');
      expect(res.body.order.status).toBe('processing');
      
      // Verify order was updated
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.status).toBe('processing');
      expect(updatedOrder.paymentStatus).toBe('paid');
      expect(updatedOrder.paymentMethod).toBe('demo');
    });

    test('should not allow demo payment for already paid order', async () => {
      // Mark order as paid
      testOrder.paymentStatus = 'paid';
      testOrder.status = 'processing';
      await testOrder.save();

      const res = await agent
        .post(`/api/payments/demo-complete/${testOrder._id}`)
        .set('X-CSRF-Token', csrfToken)
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ORDER_ALREADY_PAID');
    });

    test('should handle invalid order ID', async () => {
      const res = await agent
        .post('/api/payments/demo-complete/invalid-id')
        .set('X-CSRF-Token', csrfToken)
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Payment Creation', () => {
    test('should handle Mollie unavailability gracefully', async () => {
      const res = await agent
        .post('/api/payments/create')
        .set('X-CSRF-Token', csrfToken)
        .send({
          orderId: testOrder._id,
          paymentMethod: 'ideal',
          returnUrl: 'http://localhost:3000/payment-success'
        });
      
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('MOLLIE_API_ERROR');
      expect(res.body.error.message).toContain('demo payment');
    });
  });

  describe('Webhook Processing', () => {
    test('should validate webhook requests', async () => {
      const res = await request(app)
        .post('/api/payments/webhook')
        .send({ id: 'tr_test123' });
      
      // Should fail without proper Mollie setup
      expect(res.status).toBe(500);
    });
  });

  describe('Payment Status', () => {
    test('should get payment status for order', async () => {
      // Complete demo payment first
      await agent
        .post(`/api/payments/demo-complete/${testOrder._id}`)
        .set('X-CSRF-Token', csrfToken)
        .send({});

      const res = await agent
        .get(`/api/payments/status/${testOrder._id}`)
        .set('X-CSRF-Token', csrfToken);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.paymentStatus).toBe('paid');
      expect(res.body.order).toBeDefined();
    });
  });
});