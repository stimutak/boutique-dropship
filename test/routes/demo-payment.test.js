const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');
const paymentRoutes = require('../../routes/payments');

// Mock wholesaler notification service
jest.mock('../../utils/wholesalerNotificationService', () => ({
  processOrderNotifications: jest.fn()
}));

const { processOrderNotifications } = require('../../utils/wholesalerNotificationService');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/payments', paymentRoutes);
  return app;
};

describe('Demo Payment Completion Endpoint', () => {
  let app;
  let testOrder;
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;
  
  beforeAll(async () => {
    // Set environment variables for testing
    process.env.JWT_SECRET = 'test-secret';
    
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/holistic-store-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    app = createTestApp();
  });
  
  beforeEach(async () => {
    // Clear database
    await Order.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Create test product
    const testProduct = await Product.create({
      name: 'Test Crystal',
      slug: 'test-crystal',
      description: 'A test crystal for payment testing',
      shortDescription: 'Test crystal for payments',
      price: 29.99,
      category: 'crystals',
      isActive: true,
      properties: {
        chakra: ['crown'],
        element: ['air'],
        healing: ['test']
      },
      wholesaler: {
        name: 'Test Wholesaler',
        email: 'test@wholesaler.com',
        productCode: 'TEST-001',
        cost: 15.00
      }
    });
    
    // Create test users
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Smith',
      isAdmin: false
    });
    
    adminUser = await User.create({
      email: 'admin@example.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true
    });
    
    userToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    adminToken = jwt.sign({ userId: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // Create test order for registered user
    testOrder = await Order.create({
      customer: testUser._id,
      items: [{
        product: testProduct._id,
        quantity: 2,
        price: testProduct.price,
        wholesaler: {
          name: testProduct.wholesaler.name,
          email: testProduct.wholesaler.email,
          productCode: testProduct.wholesaler.productCode,
          notified: false
        }
      }],
      shippingAddress: {
        firstName: 'John',
        lastName: 'Smith',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      },
      billingAddress: {
        firstName: 'John',
        lastName: 'Smith',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      },
      subtotal: 59.98,
      tax: 4.80,
      shipping: 0,
      total: 64.78,
      payment: {
        method: 'other',
        status: 'pending'
      },
      status: 'pending'
    });
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  describe('POST /api/payments/demo-complete/:orderId', () => {
    it('should complete demo payment successfully for order owner', async () => {
      processOrderNotifications.mockResolvedValue({ success: true });
      
      const response = await request(app)
        .post(`/api/payments/demo-complete/${testOrder._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Demo payment completed successfully');
      expect(response.body.order.orderNumber).toBe(testOrder.orderNumber);
      expect(response.body.order.status).toBe('processing');
      expect(response.body.order.payment.status).toBe('paid');
      expect(response.body.order.payment.method).toBe('other');
      expect(response.body.order.payment.paidAt).toBeDefined();
      
      // Verify order was updated in database
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.payment.status).toBe('paid');
      expect(updatedOrder.payment.method).toBe('other');
      expect(updatedOrder.status).toBe('processing');
      expect(updatedOrder.payment.transactionId).toMatch(/^demo_\d+$/);
      
      // Verify wholesaler notification was called
      expect(processOrderNotifications).toHaveBeenCalledWith(testOrder._id.toString());
    });
    
    it('should complete demo payment successfully for admin user', async () => {
      processOrderNotifications.mockResolvedValue({ success: true });
      
      const response = await request(app)
        .post(`/api/payments/demo-complete/${testOrder._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.order.payment.status).toBe('paid');
    });
    
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post(`/api/payments/demo-complete/${testOrder._id}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should reject invalid order ID format', async () => {
      const response = await request(app)
        .post('/api/payments/demo-complete/invalid-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Valid order ID is required' })
        ])
      );
    });
    
    it('should return 404 for non-existent order', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post(`/api/payments/demo-complete/${fakeOrderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
    });
    
    it('should reject access to other users orders', async () => {
      // Create another user
      const otherUser = await User.create({
        email: 'other@example.com',
        password: 'password123',
        firstName: 'Other',
        lastName: 'User',
        isAdmin: false
      });
      
      const otherUserToken = jwt.sign({ userId: otherUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      
      const response = await request(app)
        .post(`/api/payments/demo-complete/${testOrder._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
      expect(response.body.error.message).toBe('You can only complete payments for your own orders');
    });
    
    it('should reject already paid orders', async () => {
      // Mark order as already paid
      testOrder.payment.status = 'paid';
      await testOrder.save();
      
      const response = await request(app)
        .post(`/api/payments/demo-complete/${testOrder._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ORDER_ALREADY_PAID');
      expect(response.body.error.message).toBe('Order has already been paid');
    });
    
    it('should handle guest orders (no customer field)', async () => {
      // Create guest order
      const guestOrder = await Order.create({
        guestInfo: {
          email: 'guest@example.com',
          firstName: 'Guest',
          lastName: 'User'
        },
        items: [{
          product: (await Product.findOne())._id,
          quantity: 1,
          price: 29.99,
          wholesaler: {
            name: 'Test Wholesaler',
            email: 'test@wholesaler.com',
            productCode: 'TEST-001',
            notified: false
          }
        }],
        shippingAddress: {
          firstName: 'Guest',
          lastName: 'User',
          street: '123 Guest St',
          city: 'Guesttown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        },
        billingAddress: {
          firstName: 'Guest',
          lastName: 'User',
          street: '123 Guest St',
          city: 'Guesttown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        },
        subtotal: 29.99,
        tax: 2.40,
        shipping: 5.99,
        total: 38.38,
        payment: {
          method: 'other',
          status: 'pending'
        },
        status: 'pending'
      });
      
      // Admin should be able to complete guest orders
      const response = await request(app)
        .post(`/api/payments/demo-complete/${guestOrder._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.order.payment.status).toBe('paid');
    });
    
    it('should handle wholesaler notification errors gracefully', async () => {
      processOrderNotifications.mockRejectedValue(new Error('Notification service unavailable'));
      
      const response = await request(app)
        .post(`/api/payments/demo-complete/${testOrder._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.order.payment.status).toBe('paid');
      
      // Order should still be marked as paid even if notifications fail
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.payment.status).toBe('paid');
    });
    
    it('should generate unique transaction IDs', async () => {
      processOrderNotifications.mockResolvedValue({ success: true });
      
      // Create another order
      const secondOrder = await Order.create({
        customer: testUser._id,
        items: [{
          product: (await Product.findOne())._id,
          quantity: 1,
          price: 29.99,
          wholesaler: {
            name: 'Test Wholesaler',
            email: 'test@wholesaler.com',
            productCode: 'TEST-002',
            notified: false
          }
        }],
        shippingAddress: testOrder.shippingAddress,
        billingAddress: testOrder.billingAddress,
        subtotal: 29.99,
        tax: 2.40,
        shipping: 5.99,
        total: 38.38,
        payment: {
          method: 'other',
          status: 'pending'
        },
        status: 'pending'
      });
      
      // Complete both payments
      await request(app)
        .post(`/api/payments/demo-complete/${testOrder._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      await request(app)
        .post(`/api/payments/demo-complete/${secondOrder._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      // Verify unique transaction IDs
      const order1 = await Order.findById(testOrder._id);
      const order2 = await Order.findById(secondOrder._id);
      
      expect(order1.payment.transactionId).not.toBe(order2.payment.transactionId);
      expect(order1.payment.transactionId).toMatch(/^demo_\d+$/);
      expect(order2.payment.transactionId).toMatch(/^demo_\d+$/);
    });
  });
});