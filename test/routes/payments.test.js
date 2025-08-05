const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');

// Mock the entire Mollie module before requiring the routes
const mockMollieClient = {
  payments: {
    create: jest.fn(),
    get: jest.fn(),
    refunds: {
      create: jest.fn()
    }
  },
  methods: {
    list: jest.fn()
  }
};

jest.mock('@mollie/api-client', () => ({
  createMollieClient: jest.fn(() => mockMollieClient)
}));

// Now require the payment routes after mocking
const paymentRoutes = require('../../routes/payments');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Add auth middleware for testing
  app.use((req, res, next) => {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { _id: decoded.userId, isAdmin: true };
      } catch (error) {
        return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
      }
    }
    next();
  });
  
  app.use('/api/payments', paymentRoutes);
  return app;
};

describe('Payment Routes', () => {
  let app;
  let testOrder;
  let testUser;
  let authToken;
  
  beforeAll(async () => {
    // Set environment variables for testing
    process.env.JWT_SECRET = 'test-secret';
    process.env.MOLLIE_API_KEY = 'test_dHar4XY7LxsDOtmnkVtjNVWXLSlXsM';
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.API_URL = 'http://localhost:5000';
    
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
    
    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Smith',
      isAdmin: true
    });
    
    authToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
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
        method: 'other',
        status: 'pending'
      },
      status: 'pending'
    });
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  describe('POST /api/payments/create', () => {
    it('should create payment successfully', async () => {
      const mockPayment = {
        id: 'tr_test_payment_123',
        status: 'open',
        amount: { currency: 'USD', value: '64.78' },
        method: 'creditcard',
        createdAt: '2023-01-01T00:00:00Z',
        _links: {
          checkout: {
            href: 'https://www.mollie.com/payscreen/select-method/test_payment_123'
          }
        }
      };
      
      mockMollieClient.payments.create.mockResolvedValue(mockPayment);
      
      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id,
          method: 'card',
          redirectUrl: 'http://localhost:3000/success',
          webhookUrl: 'http://localhost:5000/webhook'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentId).toBe('tr_test_payment_123');
      expect(response.body.data.checkoutUrl).toBeDefined();
      expect(response.body.data.order.orderNumber).toBe(testOrder.orderNumber);
      
      // Verify order was updated
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.payment.molliePaymentId).toBe('tr_test_payment_123');
      expect(updatedOrder.payment.method).toBe('card');
      expect(updatedOrder.payment.status).toBe('pending');
      
      // Verify Mollie client was called correctly
      expect(mockMollieClient.payments.create).toHaveBeenCalledWith({
        amount: { currency: 'USD', value: '64.78' },
        description: `Order ${testOrder.orderNumber}`,
        method: 'card',
        redirectUrl: 'http://localhost:3000/success',
        webhookUrl: 'http://localhost:5000/webhook',
        metadata: {
          orderId: testOrder._id.toString(),
          orderNumber: testOrder.orderNumber
        }
      });
    });
    
    it('should reject missing order ID', async () => {
      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ method: 'creditcard' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Valid order ID is required' })
        ])
      );
    });
    
    it('should reject non-existent order', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ orderId: fakeOrderId, method: 'creditcard' })
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
    });
    
    it('should reject already paid order', async () => {
      testOrder.payment.status = 'paid';
      await testOrder.save();
      
      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ orderId: testOrder._id, method: 'creditcard' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ORDER_ALREADY_PAID');
    });
    
    it('should handle Mollie API errors', async () => {
      const mollieError = new Error('Invalid amount');
      mollieError.field = 'amount';
      mollieError.detail = 'Amount is too low';
      
      mockMollieClient.payments.create.mockRejectedValue(mollieError);
      
      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ orderId: testOrder._id, method: 'creditcard' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MOLLIE_VALIDATION_ERROR');
      expect(response.body.error.field).toBe('amount');
    });
    
    it('should create payment with cryptocurrency method', async () => {
      const mockPayment = {
        id: 'tr_test_crypto_123',
        status: 'open',
        amount: { currency: 'USD', value: '64.78' },
        method: 'bitcoin',
        createdAt: '2023-01-01T00:00:00Z',
        _links: {
          checkout: {
            href: 'https://www.mollie.com/payscreen/bitcoin/test_crypto_123'
          }
        }
      };
      
      mockMollieClient.payments.create.mockResolvedValue(mockPayment);
      
      const response = await request(app)
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testOrder._id,
          method: 'crypto'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.method).toBe('bitcoin');
      
      // Verify method was passed to Mollie
      expect(mockMollieClient.payments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'crypto'
        })
      );
    });
  });
  
  describe('POST /api/payments/webhook', () => {
    beforeEach(async () => {
      // Set up order with Mollie payment ID
      testOrder.payment.molliePaymentId = 'tr_test_payment_123';
      await testOrder.save();
    });
    
    it('should handle successful payment webhook', async () => {
      const mockPayment = {
        id: 'tr_test_payment_123',
        status: 'paid',
        paidAt: '2023-01-01T12:00:00Z',
        details: { cardNumber: '**** **** **** 1234' }
      };
      
      mockMollieClient.payments.get.mockResolvedValue(mockPayment);
      
      const response = await request(app)
        .post('/api/payments/webhook')
        .send({ id: 'tr_test_payment_123' })
        .expect(200);
      
      expect(response.text).toBe('OK');
      
      // Verify order was updated
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.payment.status).toBe('paid');
      expect(updatedOrder.payment.paidAt).toBeDefined();
      expect(updatedOrder.payment.transactionId).toBe('**** **** **** 1234');
      expect(updatedOrder.status).toBe('processing');
    });
    
    it('should handle failed payment webhook', async () => {
      const mockPayment = {
        id: 'tr_test_payment_123',
        status: 'failed'
      };
      
      mockMollieClient.payments.get.mockResolvedValue(mockPayment);
      
      const response = await request(app)
        .post('/api/payments/webhook')
        .send({ id: 'tr_test_payment_123' })
        .expect(200);
      
      expect(response.text).toBe('OK');
      
      // Verify order was updated
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.payment.status).toBe('failed');
      expect(updatedOrder.status).toBe('cancelled');
    });
    
    it('should handle pending payment webhook', async () => {
      const mockPayment = {
        id: 'tr_test_payment_123',
        status: 'pending'
      };
      
      mockMollieClient.payments.get.mockResolvedValue(mockPayment);
      
      const response = await request(app)
        .post('/api/payments/webhook')
        .send({ id: 'tr_test_payment_123' })
        .expect(200);
      
      expect(response.text).toBe('OK');
      
      // Verify order status remains pending
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.payment.status).toBe('pending');
      expect(updatedOrder.status).toBe('pending');
    });
    
    it('should reject webhook without payment ID', async () => {
      const response = await request(app)
        .post('/api/payments/webhook')
        .send({})
        .expect(400);
      
      expect(response.text).toBe('Payment ID is required');
    });
    
    it('should handle webhook for non-existent order', async () => {
      const mockPayment = {
        id: 'tr_nonexistent_payment',
        status: 'paid'
      };
      
      mockMollieClient.payments.get.mockResolvedValue(mockPayment);
      
      const response = await request(app)
        .post('/api/payments/webhook')
        .send({ id: 'tr_nonexistent_payment' })
        .expect(404);
      
      expect(response.text).toBe('Order not found');
    });
  });
  
  describe('GET /api/payments/status/:paymentId', () => {
    it('should return payment status', async () => {
      const mockPayment = {
        id: 'tr_test_payment_123',
        status: 'paid',
        amount: { currency: 'USD', value: '64.78' },
        method: 'creditcard',
        paidAt: '2023-01-01T12:00:00Z',
        createdAt: '2023-01-01T10:00:00Z',
        description: `Order ${testOrder.orderNumber}`
      };
      
      mockMollieClient.payments.get.mockResolvedValue(mockPayment);
      
      // Set up order with payment ID
      testOrder.payment.molliePaymentId = 'tr_test_payment_123';
      testOrder.payment.status = 'paid';
      await testOrder.save();
      
      const response = await request(app)
        .get('/api/payments/status/tr_test_payment_123')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.payment.id).toBe('tr_test_payment_123');
      expect(response.body.payment.status).toBe('paid');
      expect(response.body.order.orderNumber).toBe(testOrder.orderNumber);
    });
    
    it('should handle non-existent payment', async () => {
      const error = new Error('Payment not found');
      error.statusCode = 404;
      
      mockMollieClient.payments.get.mockRejectedValue(error);
      
      const response = await request(app)
        .get('/api/payments/status/tr_nonexistent')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PAYMENT_NOT_FOUND');
    });
  });
  
  describe('GET /api/payments/methods', () => {
    it('should return available payment methods', async () => {
      const mockMethods = [
        {
          id: 'creditcard',
          description: 'Credit card',
          minimumAmount: { currency: 'USD', value: '0.01' },
          maximumAmount: { currency: 'USD', value: '10000.00' },
          image: { size1x: 'https://example.com/creditcard.png' },
          pricing: []
        },
        {
          id: 'bitcoin',
          description: 'Bitcoin',
          minimumAmount: { currency: 'USD', value: '1.00' },
          maximumAmount: { currency: 'USD', value: '5000.00' },
          image: { size1x: 'https://example.com/bitcoin.png' },
          pricing: []
        }
      ];
      
      mockMollieClient.methods.list.mockResolvedValue(mockMethods);
      
      const response = await request(app)
        .get('/api/payments/methods')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.methods).toHaveLength(2);
      expect(response.body.methods[0].id).toBe('creditcard');
      expect(response.body.methods[1].id).toBe('bitcoin');
    });
    
    it('should filter methods by amount', async () => {
      mockMollieClient.methods.list.mockResolvedValue([]);
      
      const _response = await request(app)
        .get('/api/payments/methods?amount=100.00&currency=USD')
        .expect(200);
      
      expect(mockMollieClient.methods.list).toHaveBeenCalledWith({
        amount: { currency: 'USD', value: '100.00' }
      });
    });
  });
  
  describe('POST /api/payments/refund', () => {
    beforeEach(async () => {
      testOrder.payment.molliePaymentId = 'tr_test_payment_123';
      testOrder.payment.status = 'paid';
      await testOrder.save();
    });
    
    it('should process full refund successfully', async () => {
      const mockRefund = {
        id: 'rf_test_refund_123',
        amount: { currency: 'USD', value: '64.78' },
        status: 'pending',
        createdAt: '2023-01-01T12:00:00Z'
      };
      
      mockMollieClient.payments.refunds.create.mockResolvedValue(mockRefund);
      
      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: 'tr_test_payment_123',
          description: 'Customer requested refund'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.refund.id).toBe('rf_test_refund_123');
      
      // Verify order was updated
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.payment.status).toBe('refunded');
      expect(updatedOrder.status).toBe('cancelled');
    });
    
    it('should process partial refund successfully', async () => {
      const mockRefund = {
        id: 'rf_test_refund_123',
        amount: { currency: 'USD', value: '30.00' },
        status: 'pending',
        createdAt: '2023-01-01T12:00:00Z'
      };
      
      mockMollieClient.payments.refunds.create.mockResolvedValue(mockRefund);
      
      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentId: 'tr_test_payment_123',
          amount: '30.00',
          description: 'Partial refund'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.refund.amount.value).toBe('30.00');
      
      // Verify order status didn't change to refunded (partial refund)
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.payment.status).toBe('paid');
    });
    
    it('should reject refund from non-admin user', async () => {
      testUser.isAdmin = false;
      await testUser.save();
      
      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ paymentId: 'tr_test_payment_123' })
        .expect(403);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
    
    it('should reject unauthenticated refund request', async () => {
      const response = await request(app)
        .post('/api/payments/refund')
        .send({ paymentId: 'tr_test_payment_123' })
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should reject refund without payment ID', async () => {
      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Test refund' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_PAYMENT_ID');
    });
  });
  
  describe('GET /api/payments/test', () => {
    it('should test Mollie connection successfully', async () => {
      const mockMethods = [
        { id: 'creditcard', description: 'Credit card' },
        { id: 'bitcoin', description: 'Bitcoin' }
      ];
      
      mockMollieClient.methods.list.mockResolvedValue(mockMethods);
      
      const response = await request(app)
        .get('/api/payments/test')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mollie connection successful');
      expect(response.body.availableMethods).toBe(2);
      expect(response.body.testMode).toBe(true);
    });
    
    it('should handle Mollie connection failure', async () => {
      mockMollieClient.methods.list.mockRejectedValue(new Error('API connection failed'));
      
      const response = await request(app)
        .get('/api/payments/test')
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MOLLIE_CONNECTION_ERROR');
    });
  });
});