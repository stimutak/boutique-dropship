const request = require('supertest');
// express and session removed - not used
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');
// orderRoutes removed - not used

// Import the test app with proper middleware
const { createTestApp } = require('../helpers/testApp');

describe('Order Routes', () => {
  let app;
  let testProduct;
  let _testUser;
  let adminToken;
  let agent;  // For maintaining session cookies
  let _csrfToken;

  // Helper function to create test order data
  const createTestOrderData = (overrides = {}) => ({
    guestInfo: { email: 'test@example.com', firstName: 'Test', lastName: 'User' },
    items: [{ 
      product: testProduct._id, 
      quantity: 1, 
      price: testProduct.price, 
      wholesaler: { name: 'Test', email: 'test@test.com', productCode: 'TEST' } 
    }],
    shippingAddress: { 
      firstName: 'Test', lastName: 'User', street: '123 St', city: 'City', 
      state: 'ST', zipCode: '12345', country: 'US' 
    },
    billingAddress: { 
      firstName: 'Test', lastName: 'User', street: '123 St', city: 'City', 
      state: 'ST', zipCode: '12345', country: 'US' 
    },
    subtotal: testProduct.price,
    tax: 0,
    shipping: 0,
    total: testProduct.price,
    payment: { method: 'card', status: 'pending' },
    currency: 'USD',
    exchangeRate: 1,
    ...overrides
  });
  
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
      useUnifiedTopology: true
    });
    
    // Set JWT secret for testing
    process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars-long';
    
    app = createTestApp();
    agent = request.agent(app); // Create agent to maintain session
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
      shortDescription: 'Test crystal for TDD testing',
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

    // Get CSRF token for the session
    const csrfResponse = await agent.get('/health');
    csrfToken = csrfResponse.headers['set-cookie'] ? 
      (await agent.get('/csrf-token'))?.body?.csrfToken : null;
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

  describe('Admin Order Fulfillment Workflow', () => {
    let adminUser;
    let adminToken;
    
    beforeEach(async () => {
      // Create admin user for testing
      adminUser = await User.create({
        email: 'admin@example.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true
      });

      // Generate admin JWT token
      adminToken = jwt.sign(
        { userId: adminUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    describe('PUT /api/orders/:id/fulfill - Admin Only', () => {
      it('should require admin authentication', async () => {
        // Create an order directly in database to bypass CSRF for test
        const order = await Order.create(createTestOrderData());
        
        const orderId = order._id;
        
        const response = await request(app)
          .put(`/api/orders/${orderId}/fulfill`)
          .send({ 
            status: 'processing',
            trackingNumber: 'TRACK123',
            shippingCarrier: 'UPS'
          })
          .expect(401);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      });

      it('should validate status transitions (pending -> processing)', async () => {
        // Create an order directly in database
        const order = await Order.create(createTestOrderData());
        
        const orderId = order._id;
        
        const response = await request(app)
          .put(`/api/orders/${orderId}/fulfill`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ 
            status: 'processing',
            notes: 'Order is being prepared'
          })
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.order.status).toBe('processing');
        expect(response.body.order.statusHistory).toBeDefined();
        expect(response.body.order.statusHistory).toHaveLength(2); // pending -> processing
      });

      it('should validate status transitions (processing -> shipped)', async () => {
        // Create order directly in database
        const order = await Order.create(createTestOrderData());
        
        const orderId = order._id;
        
        // First update to processing
        await request(app)
          .put(`/api/orders/${orderId}/fulfill`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'processing' })
          .expect(200);
        
        // Then update to shipped with tracking
        const response = await request(app)
          .put(`/api/orders/${orderId}/fulfill`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ 
            status: 'shipped',
            trackingNumber: 'TRACK123456',
            shippingCarrier: 'UPS',
            shipDate: new Date().toISOString(),
            estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          })
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.order.status).toBe('shipped');
        expect(response.body.order.trackingNumber).toBe('TRACK123456');
        expect(response.body.order.shippingCarrier).toBe('UPS');
        expect(response.body.order.shipDate).toBeDefined();
        expect(response.body.order.estimatedDeliveryDate).toBeDefined();
      });

      it('should reject invalid status transitions (delivered -> processing)', async () => {
        // Create order directly in database and set to delivered
        const order = await Order.create(createTestOrderData({ status: 'delivered' }));
        
        const orderId = order._id;
        
        // Try to transition back to processing (should fail)
        const response = await request(app)
          .put(`/api/orders/${orderId}/fulfill`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'processing' })
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      });

      it('should require tracking number when shipping', async () => {
        // Create order directly in database
        const order = await Order.create(createTestOrderData());
        
        const orderId = order._id;
        
        // Set to processing first
        await request(app)
          .put(`/api/orders/${orderId}/fulfill`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'processing' })
          .expect(200);
        
        // Try to ship without tracking number
        const response = await request(app)
          .put(`/api/orders/${orderId}/fulfill`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ 
            status: 'shipped',
            shippingCarrier: 'UPS'
          })
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TRACKING_NUMBER_REQUIRED');
      });

      it('should track status change history with timestamps', async () => {
        // Create order directly in database
        const order = await Order.create(createTestOrderData());
        
        const orderId = order._id;
        
        // Update to processing
        const _processResponse = await request(app)
          .put(`/api/orders/${orderId}/fulfill`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ 
            status: 'processing',
            notes: 'Order confirmed and being prepared'
          })
          .expect(200);
        
        // Update to shipped
        const _shipResponse = await request(app)
          .put(`/api/orders/${orderId}/fulfill`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ 
            status: 'shipped',
            trackingNumber: 'TRACK789',
            shippingCarrier: 'FedEx'
          })
          .expect(200);
        
        // Verify status history
        const updatedOrder = await Order.findById(orderId);
        expect(updatedOrder.statusHistory).toHaveLength(3); // pending, processing, shipped
        expect(updatedOrder.statusHistory[0].status).toBe('pending');
        expect(updatedOrder.statusHistory[1].status).toBe('processing');
        expect(updatedOrder.statusHistory[1].notes).toBe('Order confirmed and being prepared');
        expect(updatedOrder.statusHistory[2].status).toBe('shipped');
        expect(updatedOrder.statusHistory[2].trackingNumber).toBe('TRACK789');
        expect(updatedOrder.statusHistory[2].shippingCarrier).toBe('FedEx');
      });

      it('should support i18n error messages', async () => {
        // Create order directly in database
        const order = await Order.create(createTestOrderData());
        
        const orderId = order._id;
        
        // Try invalid transition with Spanish locale header
        const response = await request(app)
          .put(`/api/orders/${orderId}/fulfill`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('x-locale', 'es')
          .send({ status: 'invalid-status' })
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_STATUS');
        // Should return Spanish error message
        expect(response.body.error.message).toContain('inválido');
      });
    });

    describe('GET /api/orders/admin - Admin order management', () => {
      it('should require admin authentication', async () => {
        const response = await request(app)
          .get('/api/orders/admin')
          .expect(401);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
      });

      it('should return all orders for admin with fulfillment data', async () => {
        // Create test order directly in database
        await Order.create(createTestOrderData());
        
        const response = await request(app)
          .get('/api/orders/admin')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.orders).toBeDefined();
        expect(response.body.data.orders.length).toBeGreaterThan(0);
        expect(response.body.data.orders[0]).toHaveProperty('statusHistory');
        expect(response.body.data.orders[0].items[0]).toHaveProperty('wholesaler'); // Admin can see wholesaler info
      });

      it('should support filtering by status', async () => {
        // Create orders with different statuses directly in database
        const order1 = await Order.create(createTestOrderData());
        
        // Set one order to processing
        await request(app)
          .put(`/api/orders/${order1._id}/fulfill`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'processing' })
          .expect(200);
        
        // Filter for processing orders
        const response = await request(app)
          .get('/api/orders/admin?status=processing')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
        
        expect(response.body.data.orders).toHaveLength(1);
        expect(response.body.data.orders[0].status).toBe('processing');
      });
    });
  });
});