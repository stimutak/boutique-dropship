const request = require('supertest');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');
const orderRoutes = require('../../routes/orders');

// Create test app
const createTestApp = () => {
  const app = express();
  
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  }));
  
  app.use(express.json());
  app.use('/api/orders', orderRoutes);
  
  return app;
};

describe('Order Routes', () => {
  let app;
  let testProduct;
  let testUser;
  
  const validGuestOrderData = {
    guestInfo: {
      email: 'guest@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '555-123-4567'
    },
    shippingAddress: {
      firstName: 'Jane',
      lastName: 'Doe',
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
      country: 'US',
      phone: '555-123-4567'
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
    items: [],
    notes: 'Please handle with care',
    referralSource: 'sister-site'
  };
  
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
    await User.deleteMany({});
    
    // Create test product
    testProduct = await Product.create({
      name: 'Test Crystal',
      slug: 'test-crystal',
      description: 'A test crystal for unit testing',
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
      addresses: [{
        type: 'shipping',
        firstName: 'John',
        lastName: 'Smith',
        street: '456 Oak Ave',
        city: 'Testville',
        state: 'NY',
        zipCode: '67890',
        country: 'US',
        isDefault: true
      }, {
        type: 'billing',
        firstName: 'John',
        lastName: 'Smith',
        street: '456 Oak Ave',
        city: 'Testville',
        state: 'NY',
        zipCode: '67890',
        country: 'US',
        isDefault: true
      }]
    });
    
    // Add product to order data
    validGuestOrderData.items = [{
      productId: testProduct._id,
      quantity: 2
    }];
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  describe('POST /api/orders (Guest Checkout)', () => {
    it('should create order for guest user', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send(validGuestOrderData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Order created successfully');
      expect(response.body.order).toHaveProperty('orderNumber');
      expect(response.body.order).toHaveProperty('total');
      expect(response.body.order.status).toBe('pending');
      
      // Verify order was saved to database
      const savedOrder = await Order.findById(response.body.order._id);
      expect(savedOrder).toBeTruthy();
      expect(savedOrder.guestInfo.email).toBe('guest@example.com');
      expect(savedOrder.items).toHaveLength(1);
      expect(savedOrder.items[0].quantity).toBe(2);
      expect(savedOrder.items[0].price).toBe(29.99);
      
      // Verify wholesaler info is included for processing
      expect(savedOrder.items[0].wholesaler.name).toBe('Test Wholesaler');
      expect(savedOrder.items[0].wholesaler.email).toBe('test@wholesaler.com');
      expect(savedOrder.items[0].wholesaler.notified).toBe(false);
    });
    
    it('should calculate totals correctly', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send(validGuestOrderData)
        .expect(201);
      
      const savedOrder = await Order.findById(response.body.order._id);
      
      // 2 items × $29.99 = $59.98 subtotal
      expect(savedOrder.subtotal).toBe(59.98);
      
      // 8% tax on subtotal = $4.80
      expect(savedOrder.tax).toBe(4.80);
      
      // Shipping should be free (over $50)
      expect(savedOrder.shipping).toBe(0);
      
      // Total = $59.98 + $4.80 + $0 = $64.78
      expect(savedOrder.total).toBe(64.78);
    });
    
    it('should apply shipping charge for orders under $50', async () => {
      // Create order with single item (under $50)
      const smallOrderData = {
        ...validGuestOrderData,
        items: [{
          productId: testProduct._id,
          quantity: 1
        }]
      };
      
      const response = await request(app)
        .post('/api/orders')
        .send(smallOrderData)
        .expect(201);
      
      const savedOrder = await Order.findById(response.body.order._id);
      
      expect(savedOrder.subtotal).toBe(29.99);
      expect(savedOrder.shipping).toBe(5.99); // Shipping charge applied
    });
    
    it('should reject order with invalid product', async () => {
      const invalidOrderData = {
        ...validGuestOrderData,
        items: [{
          productId: new mongoose.Types.ObjectId(),
          quantity: 1
        }]
      };
      
      const response = await request(app)
        .post('/api/orders')
        .send(invalidOrderData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PRODUCT');
    });
    
    it('should reject order with inactive product', async () => {
      testProduct.isActive = false;
      await testProduct.save();
      
      const response = await request(app)
        .post('/api/orders')
        .send(validGuestOrderData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PRODUCT');
    });
    
    it('should validate required guest information', async () => {
      const invalidOrderData = {
        ...validGuestOrderData,
        guestInfo: {
          email: 'invalid-email',
          firstName: '',
          lastName: 'Doe'
        }
      };
      
      const response = await request(app)
        .post('/api/orders')
        .send(invalidOrderData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Valid email is required' }),
          expect.objectContaining({ msg: 'First name is required and must be less than 50 characters' })
        ])
      );
    });
    
    it('should validate shipping address', async () => {
      const invalidOrderData = {
        ...validGuestOrderData,
        shippingAddress: {
          firstName: 'Jane',
          lastName: 'Doe',
          street: '',
          city: 'Anytown',
          state: 'C', // Too short
          zipCode: '123', // Too short
          country: 'USA' // Too long
        }
      };
      
      const response = await request(app)
        .post('/api/orders')
        .send(invalidOrderData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('should validate billing address', async () => {
      const invalidOrderData = {
        ...validGuestOrderData,
        billingAddress: {
          firstName: '',
          lastName: 'Doe',
          street: '123 Main St',
          city: '',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        }
      };
      
      const response = await request(app)
        .post('/api/orders')
        .send(invalidOrderData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('should require at least one item', async () => {
      const invalidOrderData = {
        ...validGuestOrderData,
        items: []
      };
      
      const response = await request(app)
        .post('/api/orders')
        .send(invalidOrderData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('should validate item quantities', async () => {
      const invalidOrderData = {
        ...validGuestOrderData,
        items: [{
          productId: testProduct._id,
          quantity: 0 // Invalid quantity
        }]
      };
      
      const response = await request(app)
        .post('/api/orders')
        .send(invalidOrderData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('should handle referral source tracking', async () => {
      const orderWithReferral = {
        ...validGuestOrderData,
        referralSource: 'holistic-school'
      };
      
      const response = await request(app)
        .post('/api/orders')
        .send(orderWithReferral)
        .expect(201);
      
      const savedOrder = await Order.findById(response.body.order._id);
      expect(savedOrder.referralSource).toBe('holistic-school');
    });
  });
  
  describe('GET /api/orders/:id', () => {
    it('should return order details', async () => {
      // Create order first
      const createResponse = await request(app)
        .post('/api/orders')
        .send(validGuestOrderData)
        .expect(201);
      
      const orderId = createResponse.body.order._id;
      
      // Get order details
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.order).toHaveProperty('orderNumber');
      expect(response.body.order).toHaveProperty('guestInfo');
      expect(response.body.order).toHaveProperty('items');
      expect(response.body.order).toHaveProperty('shippingAddress');
      expect(response.body.order).toHaveProperty('total');
      
      // Ensure wholesaler info is not exposed in public API
      expect(response.body.order.items[0].wholesaler).toEqual({
        notified: false,
        notifiedAt: null
      });
    });
    
    it('should return 404 for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/orders/${fakeId}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
    });
  });
  
  describe('PUT /api/orders/:id/status', () => {
    it('should update order status', async () => {
      // Create order first
      const createResponse = await request(app)
        .post('/api/orders')
        .send(validGuestOrderData)
        .expect(201);
      
      const orderId = createResponse.body.order._id;
      
      // Update status
      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: 'processing' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Order status updated');
      expect(response.body.order.status).toBe('processing');
      
      // Verify in database
      const updatedOrder = await Order.findById(orderId);
      expect(updatedOrder.status).toBe('processing');
    });
    
    it('should reject invalid status', async () => {
      const createResponse = await request(app)
        .post('/api/orders')
        .send(validGuestOrderData)
        .expect(201);
      
      const orderId = createResponse.body.order._id;
      
      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .send({ status: 'invalid-status' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STATUS');
    });
    
    it('should return 404 for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/api/orders/${fakeId}/status`)
        .send({ status: 'processing' })
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
    });
  });
});