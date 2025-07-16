const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const wholesalerRoutes = require('../../routes/wholesalers');

// Mock the wholesaler notification service
jest.mock('../../utils/wholesalerNotificationService', () => ({
  processPendingNotifications: jest.fn(),
  processOrderNotifications: jest.fn()
}));

const { processPendingNotifications, processOrderNotifications } = require('../../utils/wholesalerNotificationService');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/wholesalers', wholesalerRoutes);
  return app;
};

describe('Wholesaler Routes', () => {
  let app;
  let testOrder;
  let testProduct;
  
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/holistic-store-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    app = createTestApp();
  });
  
  beforeEach(async () => {
    // Clear database
    await Order.deleteMany({});
    await Product.deleteMany({});
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Create test product
    testProduct = await Product.create({
      name: 'Test Crystal',
      slug: 'test-crystal',
      description: 'A test crystal for wholesaler testing',
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
    
    // Create test order
    testOrder = await Order.create({
      guestInfo: {
        email: 'guest@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '555-123-4567'
      },
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
        firstName: 'Jane',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      },
      billingAddress: {
        firstName: 'Jane',
        lastName: 'Doe',
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
        method: 'creditcard',
        status: 'paid'
      },
      status: 'processing'
    });
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  describe('GET /api/wholesalers/test', () => {
    it('should return system status', async () => {
      const response = await request(app)
        .get('/api/wholesalers/test')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Wholesaler notification system is active');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.endpoints).toHaveLength(4);
    });
  });
  
  describe('POST /api/wholesalers/process-notifications', () => {
    it('should process pending notifications successfully', async () => {
      const mockResult = {
        success: true,
        processed: 1,
        successCount: 1,
        errorCount: 0,
        results: [{
          orderNumber: testOrder.orderNumber,
          wholesalerEmail: 'test@wholesaler.com',
          status: 'success',
          messageId: 'test-message-id'
        }]
      };
      
      processPendingNotifications.mockResolvedValue(mockResult);
      
      const response = await request(app)
        .post('/api/wholesalers/process-notifications')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notification processing completed');
      expect(response.body.data.processed).toBe(1);
      expect(response.body.data.successCount).toBe(1);
      expect(response.body.data.errorCount).toBe(0);
      expect(response.body.data.results).toHaveLength(1);
      
      expect(processPendingNotifications).toHaveBeenCalledTimes(1);
    });
    
    it('should handle processing errors', async () => {
      const mockResult = {
        success: false,
        error: 'Email service unavailable'
      };
      
      processPendingNotifications.mockResolvedValue(mockResult);
      
      const response = await request(app)
        .post('/api/wholesalers/process-notifications')
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email service unavailable');
    });
    
    it('should handle service exceptions', async () => {
      processPendingNotifications.mockRejectedValue(new Error('Service crashed'));
      
      const response = await request(app)
        .post('/api/wholesalers/process-notifications')
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Service crashed');
    });
  });
  
  describe('POST /api/wholesalers/notify/:orderId', () => {
    it('should process notifications for specific order', async () => {
      const mockResult = {
        success: true,
        orderNumber: testOrder.orderNumber,
        results: [{
          wholesalerEmail: 'test@wholesaler.com',
          status: 'success',
          messageId: 'test-message-id'
        }]
      };
      
      processOrderNotifications.mockResolvedValue(mockResult);
      
      const response = await request(app)
        .post(`/api/wholesalers/notify/${testOrder._id}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Order notifications processed');
      expect(response.body.data.orderNumber).toBe(testOrder.orderNumber);
      expect(response.body.data.results).toHaveLength(1);
      
      expect(processOrderNotifications).toHaveBeenCalledWith(testOrder._id.toString());
    });
    
    it('should handle order not found', async () => {
      const mockResult = {
        success: false,
        error: 'Order not found'
      };
      
      processOrderNotifications.mockResolvedValue(mockResult);
      
      const response = await request(app)
        .post(`/api/wholesalers/notify/${testOrder._id}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order not found');
    });
    
    it('should handle no pending notifications', async () => {
      const mockResult = {
        success: true,
        message: 'No pending wholesaler notifications for this order',
        results: []
      };
      
      processOrderNotifications.mockResolvedValue(mockResult);
      
      const response = await request(app)
        .post(`/api/wholesalers/notify/${testOrder._id}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('No pending wholesaler notifications for this order');
      expect(response.body.data.results).toHaveLength(0);
    });
  });
  
  describe('GET /api/wholesalers/pending', () => {
    it('should return pending orders', async () => {
      const response = await request(app)
        .get('/api/wholesalers/pending')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(1);
      expect(response.body.data.orders).toHaveLength(1);
      
      const order = response.body.data.orders[0];
      expect(order.orderNumber).toBe(testOrder.orderNumber);
      expect(order.status).toBe('processing');
      expect(order.paymentStatus).toBe('paid');
      expect(order.pendingWholesalers).toHaveLength(1);
      expect(order.pendingWholesalers[0].wholesalerEmail).toBe('test@wholesaler.com');
    });
    
    it('should return empty list when no pending orders', async () => {
      // Mark wholesaler as notified
      testOrder.items[0].wholesaler.notified = true;
      await testOrder.save();
      
      const response = await request(app)
        .get('/api/wholesalers/pending')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(0);
      expect(response.body.data.orders).toHaveLength(0);
    });
    
    it('should only include orders with paid/processing status', async () => {
      // Create order with pending payment
      await Order.create({
        ...testOrder.toObject(),
        _id: new mongoose.Types.ObjectId(),
        orderNumber: 'ORD-PENDING-123',
        payment: { method: 'creditcard', status: 'pending' },
        status: 'pending'
      });
      
      const response = await request(app)
        .get('/api/wholesalers/pending')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(1); // Only the paid/processing order
      expect(response.body.data.orders[0].orderNumber).toBe(testOrder.orderNumber);
    });
  });
  
  describe('GET /api/wholesalers/status/:orderId', () => {
    it('should return wholesaler status for order', async () => {
      const response = await request(app)
        .get(`/api/wholesalers/status/${testOrder._id}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.orderNumber).toBe(testOrder.orderNumber);
      expect(response.body.data.wholesalers).toHaveLength(1);
      
      const wholesaler = response.body.data.wholesalers[0];
      expect(wholesaler.wholesalerName).toBe('Test Wholesaler');
      expect(wholesaler.wholesalerEmail).toBe('test@wholesaler.com');
      expect(wholesaler.productCode).toBe('TEST-001');
      expect(wholesaler.notified).toBe(false);
      expect(wholesaler.notifiedAt).toBeNull();
    });
    
    it('should return updated status after notification', async () => {
      // Update order to show notification sent
      const notificationTime = new Date();
      testOrder.items[0].wholesaler.notified = true;
      testOrder.items[0].wholesaler.notifiedAt = notificationTime;
      await testOrder.save();
      
      const response = await request(app)
        .get(`/api/wholesalers/status/${testOrder._id}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      const wholesaler = response.body.data.wholesalers[0];
      expect(wholesaler.notified).toBe(true);
      expect(wholesaler.notifiedAt).toBeDefined();
    });
    
    it('should return 404 for non-existent order', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/wholesalers/status/${fakeOrderId}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order not found');
    });
    
    it('should handle multiple wholesalers in one order', async () => {
      // Add another item with different wholesaler
      const anotherProduct = await Product.create({
        name: 'Another Crystal',
        slug: 'another-crystal',
        description: 'Another test crystal',
        price: 19.99,
        category: 'crystals',
        isActive: true,
        properties: { chakra: ['heart'] },
        wholesaler: {
          name: 'Another Wholesaler',
          email: 'another@wholesaler.com',
          productCode: 'TEST-002',
          cost: 10.00
        }
      });
      
      testOrder.items.push({
        product: anotherProduct._id,
        quantity: 1,
        price: anotherProduct.price,
        wholesaler: {
          name: anotherProduct.wholesaler.name,
          email: anotherProduct.wholesaler.email,
          productCode: anotherProduct.wholesaler.productCode,
          notified: true,
          notifiedAt: new Date()
        }
      });
      await testOrder.save();
      
      const response = await request(app)
        .get(`/api/wholesalers/status/${testOrder._id}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.wholesalers).toHaveLength(2);
      
      // First wholesaler not notified
      expect(response.body.data.wholesalers[0].notified).toBe(false);
      // Second wholesaler notified
      expect(response.body.data.wholesalers[1].notified).toBe(true);
    });
  });
});