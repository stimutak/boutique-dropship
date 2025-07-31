const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');

const { createTestApp } = require('../helpers/testApp');

let app;

describe('Admin Routes', () => {
  let adminToken;
  let regularUserToken;
  let adminUser;
  let regularUser;
  let testProduct;
  let testOrder;

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Create admin user before each test to handle afterEach cleanup
    adminUser = await User.create({
      email: 'admin@test.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true
    });

    // Create regular user
    regularUser = await User.create({
      email: 'user@test.com',
      password: 'password123',
      firstName: 'Regular',
      lastName: 'User',
      isAdmin: false
    });

    // Generate tokens - process.env.JWT_SECRET is set in test/setup.js
    adminToken = jwt.sign(
      { userId: adminUser._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    regularUserToken = jwt.sign(
      { userId: regularUser._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create test product
    testProduct = await Product.create({
      name: 'Test Crystal',
      slug: 'test-crystal',
      description: 'A beautiful test crystal',
      shortDescription: 'Test crystal for testing',
      price: 29.99,
      category: 'crystals',
      properties: {
        chakra: ['heart'],
        element: ['earth'],
        healing: ['love', 'peace']
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
        lastName: 'Doe',
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US'
      },
      billingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US'
      },
      subtotal: 59.98,
      tax: 4.80,
      shipping: 0,
      total: 64.78,
      payment: {
        method: 'card',
        status: 'paid'
      },
      status: 'processing'
    });
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
  });

  describe('Authentication and Authorization', () => {
    test('should deny access without token', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    test('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_INVALID');
    });

    test('should deny access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('should allow access for admin users', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeDefined();
    });
  });

  describe('Product Management', () => {
    test('should get all products with admin data', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0].wholesaler).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });

    test('should filter products by category', async () => {
      const response = await request(app)
        .get('/api/admin/products?category=crystals')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0].category).toBe('crystals');
    });

    test('should search products', async () => {
      const response = await request(app)
        .get('/api/admin/products?search=crystal')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
    });

    test('should export products to CSV', async () => {
      const response = await request(app)
        .get('/api/admin/products/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('Test Crystal');
    });

    test('should handle bulk import with valid CSV', async () => {
      // Create test CSV content
      const csvContent = `name,price,category,wholesaler_name,wholesaler_email,wholesaler_product_code,description
Test Import Product,19.99,herbs,Import Wholesaler,import@test.com,IMP001,Imported test product`;
      
      const csvPath = path.join(__dirname, `../temp-test-${Date.now()}.csv`);
      fs.writeFileSync(csvPath, csvContent);

      try {
        const response = await request(app)
          .post('/api/admin/products/bulk-import')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('csvFile', csvPath)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.summary.successCount).toBe(1);
        expect(response.body.results).toHaveLength(1);
        
        // Verify product was created
        const importedProduct = await Product.findOne({ name: 'Test Import Product' });
        expect(importedProduct).toBeTruthy();
        expect(importedProduct.wholesaler.name).toBe('Import Wholesaler');
      } finally {
        // Clean up
        if (fs.existsSync(csvPath)) {
          fs.unlinkSync(csvPath);
        }
      }
    });

    test('should handle bulk import with invalid CSV', async () => {
      const csvContent = `name,price
Invalid Product`; // Missing required fields
      
      const csvPath = path.join(__dirname, `../temp-test-invalid-${Date.now()}.csv`);
      fs.writeFileSync(csvPath, csvContent);

      try {
        const response = await request(app)
          .post('/api/admin/products/bulk-import')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('csvFile', csvPath)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.summary.errorCount).toBe(1);
        expect(response.body.errors).toHaveLength(1);
      } finally {
        // Clean up
        if (fs.existsSync(csvPath)) {
          fs.unlinkSync(csvPath);
        }
      }
    });
  });

  describe('Order Management', () => {
    test('should get all orders with admin data', async () => {
      const response = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(1);
      expect(response.body.data.orders[0].items[0].wholesaler).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });

    test('should get single order with full admin data', async () => {
      const response = await request(app)
        .get(`/api/admin/orders/${testOrder._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.order._id).toBe(testOrder._id.toString());
      expect(response.body.order.items[0].wholesaler).toBeDefined();
    });

    test('should update order status', async () => {
      const response = await request(app)
        .put(`/api/admin/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'shipped',
          notes: 'Order shipped via FedEx'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.order.status).toBe('shipped');

      // Verify in database
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.status).toBe('shipped');
      expect(updatedOrder.notes).toBe('Order shipped via FedEx');
    });

    test('should reject invalid order status', async () => {
      const response = await request(app)
        .put(`/api/admin/orders/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'invalid-status'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should filter orders by status', async () => {
      // First, ensure we have an order with the status we're looking for
      const response = await request(app)
        .get('/api/admin/orders?status=processing')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // The test order was created with status 'processing'
      expect(response.body.data.orders.length).toBeGreaterThanOrEqual(1);
      const processingOrders = response.body.data.orders.filter(o => o.status === 'processing');
      expect(processingOrders.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe.skip('Wholesaler Communication Management', () => {
    test('should get wholesaler communication logs', async () => {
      const response = await request(app)
        .get('/api/admin/wholesalers/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.logs).toBeDefined();
      expect(response.body.logs).toHaveLength(1);
      expect(response.body.logs[0].wholesaler.name).toBe('Test Wholesaler');
    });

    test('should retry wholesaler notifications', async () => {
      const response = await request(app)
        .post(`/api/admin/wholesalers/retry/${testOrder._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orderNumber).toBeDefined();
    });

    test('should get wholesaler communication summary', async () => {
      const response = await request(app)
        .get('/api/admin/wholesalers/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.summary.overall).toBeDefined();
      expect(response.body.summary.byWholesaler).toBeDefined();
    });
  });

  describe('Analytics Endpoints', () => {
    test('should get dashboard analytics', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.analytics.metrics).toBeDefined();
      expect(response.body.analytics.metrics.sales).toBeDefined();
      expect(response.body.analytics.metrics.products).toBeDefined();
      expect(response.body.analytics.metrics.users).toBeDefined();
      expect(response.body.analytics.period).toBeDefined();
    });

    test.skip('should get sales analytics with different periods', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/sales?period=7d&groupBy=day')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.salesAnalytics.period).toBe('7d');
      expect(response.body.salesAnalytics.groupBy).toBe('day');
      expect(response.body.salesAnalytics.data).toBeDefined();
    });

    test.skip('should filter sales analytics by category', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/sales?category=crystals')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.salesAnalytics.filters.category).toBe('crystals');
    });
  });

  describe('User Management', () => {
    test('should get all users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      
      // Check that passwords are not included
      response.body.users.forEach(user => {
        expect(user.password).toBeUndefined();
      });
    });

    test('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/admin/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].isAdmin).toBe(true);
    });

    test('should search users', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].email).toBe('admin@test.com');
    });

    test('should update user status', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${regularUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false,
          isAdmin: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.isActive).toBe(false);
      expect(response.body.user.isAdmin).toBe(true);

      // Verify in database
      const updatedUser = await User.findById(regularUser._id);
      expect(updatedUser.isActive).toBe(false);
      expect(updatedUser.isAdmin).toBe(true);
    });

    test('should reject invalid user status update', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${regularUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/admin/orders/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
    });

    test('should handle non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/admin/users/${fakeId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    test('should handle bulk import without file', async () => {
      const response = await request(app)
        .post('/api/admin/products/bulk-import')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE');
    });
  });
});