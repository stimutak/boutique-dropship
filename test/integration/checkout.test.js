const request = require('supertest');
const app = require('../../server');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const { connectDB, clearDB, closeDB } = require('../setup/testDb');

describe('Checkout Flow Integration Tests', () => {
  let agent;
  let testProduct;
  let csrfToken;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(async () => {
    await clearDB();
    agent = request.agent(app);
    
    // Create test product
    testProduct = await Product.create({
      name: 'Test Crystal',
      slug: 'test-crystal',
      description: 'A test crystal product',
      price: 29.99,
      category: 'crystals',
      images: [{
        url: 'https://example.com/crystal.jpg',
        alt: 'Test Crystal'
      }],
      inventory: {
        inStock: true,
        quantity: 10
      }
    });

    // Get CSRF token
    const csrfRes = await agent.get('/api/csrf-token');
    csrfToken = csrfRes.body.csrfToken;
  });

  describe('Guest Checkout', () => {
    test('should complete full guest checkout flow', async () => {
      // 1. Add to cart
      const cartRes = await agent
        .post('/api/cart/add')
        .set('X-CSRF-Token', csrfToken)
        .send({
          productId: testProduct._id,
          quantity: 2
        });
      
      expect(cartRes.status).toBe(200);
      expect(cartRes.body.success).toBe(true);
      expect(cartRes.body.cart.items).toHaveLength(1);
      expect(cartRes.body.cart.items[0].quantity).toBe(2);

      // 2. Create order
      const orderData = {
        items: [{
          productId: testProduct._id,
          quantity: 2,
          price: testProduct.price
        }],
        guestInfo: {
          firstName: 'Test',
          lastName: 'Customer',
          email: 'test@example.com',
          phone: '+33 6 12 34 56 78'
        },
        shippingAddress: {
          firstName: 'Test',
          lastName: 'Customer',
          street: '123 Test Street',
          city: 'Paris',
          state: 'IDF',
          zipCode: '75001',
          country: 'FR'
        },
        billingAddress: {
          firstName: 'Test',
          lastName: 'Customer',
          street: '123 Test Street',
          city: 'Paris',
          state: 'IDF',
          zipCode: '75001',
          country: 'FR'
        }
      };

      const orderRes = await agent
        .post('/api/orders')
        .set('X-CSRF-Token', csrfToken)
        .send(orderData);
      
      expect(orderRes.status).toBe(201);
      expect(orderRes.body.success).toBe(true);
      expect(orderRes.body.order).toBeDefined();
      expect(orderRes.body.order.total).toBe(59.98 + 5.99 + 8.17); // items + shipping + tax
      
      const orderId = orderRes.body.order._id;

      // 3. Complete demo payment
      const paymentRes = await agent
        .post(`/api/payments/demo-complete/${orderId}`)
        .set('X-CSRF-Token', csrfToken)
        .send({});
      
      expect(paymentRes.status).toBe(200);
      expect(paymentRes.body.success).toBe(true);
      expect(paymentRes.body.order.status).toBe('processing');

      // 4. Verify order status
      const order = await Order.findById(orderId);
      expect(order.status).toBe('processing');
      expect(order.paymentStatus).toBe('paid');
    });

    test('should validate guest information', async () => {
      const invalidOrderData = {
        items: [{
          productId: testProduct._id,
          quantity: 1,
          price: testProduct.price
        }],
        guestInfo: {
          firstName: '',  // Missing required field
          lastName: 'Customer',
          email: 'invalid-email', // Invalid email
          phone: '123' // Too short
        },
        shippingAddress: {
          firstName: 'Test',
          lastName: 'Customer',
          street: '',  // Missing required field
          city: 'Paris',
          state: 'IDF',
          zipCode: '75001',
          country: 'FR'
        }
      };

      const res = await agent
        .post('/api/orders')
        .set('X-CSRF-Token', csrfToken)
        .send(invalidOrderData);
      
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toBeDefined();
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });
  });

  describe('Cart Persistence', () => {
    test('should persist cart across sessions', async () => {
      // Add to cart
      await agent
        .post('/api/cart/add')
        .set('X-CSRF-Token', csrfToken)
        .send({
          productId: testProduct._id,
          quantity: 1
        });

      // Get cart
      const cartRes1 = await agent
        .get('/api/cart')
        .set('X-CSRF-Token', csrfToken);
      
      expect(cartRes1.body.cart.items).toHaveLength(1);
      const sessionCookie = cartRes1.headers['set-cookie'];

      // Create new agent with same session
      const agent2 = request.agent(app);
      
      // Get new CSRF token but use same session
      const csrfRes2 = await agent2
        .get('/api/csrf-token')
        .set('Cookie', sessionCookie);
      
      const csrfToken2 = csrfRes2.body.csrfToken;

      // Get cart with new agent
      const cartRes2 = await agent2
        .get('/api/cart')
        .set('X-CSRF-Token', csrfToken2)
        .set('Cookie', sessionCookie);
      
      expect(cartRes2.body.cart.items).toHaveLength(1);
      expect(cartRes2.body.cart.items[0].product._id).toBe(testProduct._id.toString());
    });
  });

  describe('Inventory Management', () => {
    test('should prevent ordering out of stock items', async () => {
      // Set product out of stock
      testProduct.inventory.inStock = false;
      testProduct.inventory.quantity = 0;
      await testProduct.save();

      const res = await agent
        .post('/api/cart/add')
        .set('X-CSRF-Token', csrfToken)
        .send({
          productId: testProduct._id,
          quantity: 1
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PRODUCT_UNAVAILABLE');
    });

    test('should prevent ordering more than available quantity', async () => {
      testProduct.inventory.quantity = 5;
      await testProduct.save();

      const res = await agent
        .post('/api/cart/add')
        .set('X-CSRF-Token', csrfToken)
        .send({
          productId: testProduct._id,
          quantity: 10
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('Session and CSRF', () => {
    test('should reject requests without CSRF token', async () => {
      const res = await agent
        .post('/api/cart/add')
        .send({
          productId: testProduct._id,
          quantity: 1
        });
      
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_ERROR');
    });

    test('should provide session info in CSRF endpoint', async () => {
      const res = await agent.get('/api/csrf-token');
      
      expect(res.body.success).toBe(true);
      expect(res.body.csrfToken).toBeDefined();
      expect(res.body.sessionInfo).toBeDefined();
      expect(res.body.sessionInfo.isGuest).toBe(true);
      expect(res.body.sessionInfo.hasCart).toBe(false);
    });
  });
});