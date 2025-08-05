const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const Review = require('../../models/Review');

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
    describe('Internationalization Support', () => {
      test('should create product with i18n descriptions (TDD - RED)', async () => {
        const productDataWithI18n = {
          name: 'International Crystal',
          slug: 'international-crystal',
          description: 'A beautiful crystal for testing internationalization',
          shortDescription: 'International test crystal',
          translations: {
            es: {
              name: 'Cristal Internacional',
              description: 'Un hermoso cristal para probar la internacionalización',
              shortDescription: 'Cristal de prueba internacional'
            },
            ar: {
              name: 'كريستال دولي',
              description: 'كريستال جميل لاختبار التدويل',
              shortDescription: 'كريستال اختبار دولي'
            },
            ja: {
              name: '国際クリスタル',
              description: '国際化テスト用の美しいクリスタル',
              shortDescription: '国際テストクリスタル'
            }
          },
          price: 45.99,
          baseCurrency: 'USD',
          prices: {
            USD: 45.99,
            EUR: 42.50,
            JPY: 6800
          },
          category: 'crystals',
          wholesaler: {
            name: 'International Wholesaler',
            email: 'international@wholesaler.com',
            productCode: 'INT-CRYSTAL-001',
            cost: 25.00
          },
          isActive: true
        };

        const response = await request(app)
          .post('/api/admin/products')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(productDataWithI18n)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.product.translations).toBeDefined();
        expect(response.body.data.product.translations.es.name).toBe('Cristal Internacional');
        expect(response.body.data.product.translations.ar.name).toBe('كريستال دولي');
        expect(response.body.data.product.translations.ja.name).toBe('国際クリスタル');
        expect(response.body.data.product.prices.EUR).toBe(42.50);
        expect(response.body.data.product.prices.JPY).toBe(6800);
      });

      test('should get products with locale parameter (TDD - RED)', async () => {
        // First create a product with translations
        await Product.create({
          name: 'Test Localized Product',
          slug: 'test-localized-product',
          description: 'English description',
          shortDescription: 'English short description',
          translations: {
            es: {
              name: 'Producto Localizado de Prueba',
              description: 'Descripción en español',
              shortDescription: 'Descripción corta en español'
            }
          },
          price: 29.99,
          category: 'crystals',
          wholesaler: {
            name: 'Test Wholesaler',
            email: 'test@wholesaler.com',
            productCode: 'TEST-001',
            cost: 15.00
          }
        });

        const response = await request(app)
          .get('/api/admin/products?locale=es')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        const localizedProduct = response.body.data.products.find(p => p.slug === 'test-localized-product');
        expect(localizedProduct).toBeDefined();
        expect(localizedProduct.localizedName).toBe('Producto Localizado de Prueba');
        expect(localizedProduct.localizedDescription).toBe('Descripción en español');
      });

      test('should support soft delete instead of hard delete (TDD - RED)', async () => {
        const response = await request(app)
          .delete(`/api/admin/products/${testProduct._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Product archived successfully');

        // Product should still exist in database but marked as deleted
        const archivedProduct = await Product.findById(testProduct._id);
        expect(archivedProduct).toBeTruthy();
        expect(archivedProduct.isDeleted).toBe(true);
        expect(archivedProduct.deletedAt).toBeDefined();
        expect(archivedProduct.isActive).toBe(false);

        // Should not appear in normal listings
        const listResponse = await request(app)
          .get('/api/admin/products')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        const foundProduct = listResponse.body.data.products.find(p => p._id === testProduct._id.toString());
        expect(foundProduct).toBeUndefined();
      });

      test('should restore soft-deleted products (TDD - RED)', async () => {
        // First soft delete the product
        await request(app)
          .delete(`/api/admin/products/${testProduct._id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        // Then restore it
        const response = await request(app)
          .put(`/api/admin/products/${testProduct._id}/restore`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Product restored successfully');

        // Product should be active again
        const restoredProduct = await Product.findById(testProduct._id);
        expect(restoredProduct.isDeleted).toBe(false);
        expect(restoredProduct.deletedAt).toBeNull();
        expect(restoredProduct.isActive).toBe(true);
      });
    });

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

    test('should create new product with admin form data - reproduces current bug', async () => {
      // This test reproduces the exact bug from the frontend AdminProductForm
      // The form has all the required fields but they're not being submitted correctly
      const frontendFormData = {
        name: 'New Test Crystal',
        slug: 'new-test-crystal',
        description: 'A new beautiful crystal for testing',
        shortDescription: 'New test crystal',
        price: 45.99,
        category: 'crystals',
        wholesaler: {
          name: 'Test Wholesaler Company',
          email: 'orders@testwholesaler.com',
          productCode: 'NEW-TEST-CRYSTAL',
          cost: 25.00
        },
        isActive: true,
        inStock: true,
        images: [],
        translations: {}
      };

      // This should succeed since all required fields are present
      const response = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(frontendFormData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.name).toBe('New Test Crystal');
      expect(response.body.data.product.shortDescription).toBe('New test crystal');
      expect(response.body.data.product.wholesaler.name).toBe('Test Wholesaler Company');
    });

    test('should fail when missing required fields - demonstrates the bug', async () => {
      // This test shows what happens when required fields are missing
      const incompleteFormData = {
        name: 'Incomplete Crystal',
        slug: 'incomplete-crystal',
        description: 'A crystal missing required fields',
        price: 45.99,
        category: 'crystals',
        isActive: true,
        inStock: true,
        images: [],
        translations: {}
        // Missing: shortDescription and wholesaler object
      };

      const response = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(incompleteFormData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_CREATION_ERROR');
    });

    test('should create new product with complete required data', async () => {
      // This test shows what the API expects
      const completeProductData = {
        name: 'Complete Test Crystal',
        slug: 'complete-test-crystal',
        description: 'A complete crystal with all required fields',
        shortDescription: 'Complete test crystal',
        price: 35.99,
        category: 'crystals',
        wholesaler: {
          name: 'Test Wholesaler Inc',
          email: 'orders@testwholesaler.com',
          productCode: 'CTC001',
          cost: 20.00
        },
        isActive: true,
        inStock: true,
        images: [],
        translations: {}
      };

      const response = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(completeProductData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.name).toBe('Complete Test Crystal');
      expect(response.body.data.product.shortDescription).toBe('Complete test crystal');
      expect(response.body.data.product.wholesaler.name).toBe('Test Wholesaler Inc');
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
    describe('Multi-currency Support', () => {
      test('should filter orders by currency (TDD - RED)', async () => {
        // Create an order in EUR
        const _eurOrder = await Order.create({
          customer: regularUser._id,
          items: [{
            product: testProduct._id,
            quantity: 1,
            price: 42.50,
            wholesaler: {
              name: testProduct.wholesaler.name,
              email: testProduct.wholesaler.email,
              productCode: testProduct.wholesaler.productCode,
              notified: false
            }
          }],
          shippingAddress: {
            firstName: 'Jean',
            lastName: 'Dupont',
            street: '123 Rue de Test',
            city: 'Paris',
            state: 'IDF',
            zipCode: '75001',
            country: 'FR'
          },
          billingAddress: {
            firstName: 'Jean',
            lastName: 'Dupont',
            street: '123 Rue de Test',
            city: 'Paris',
            state: 'IDF',
            zipCode: '75001',
            country: 'FR'
          },
          subtotal: 42.50,
          tax: 8.50,
          shipping: 0,
          total: 51.00,
          currency: 'EUR',
          exchangeRate: 0.92,
          payment: {
            method: 'card',
            status: 'paid'
          },
          status: 'processing'
        });

        const response = await request(app)
          .get('/api/admin/orders?currency=EUR')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.orders.length).toBeGreaterThan(0);
        const eurOrders = response.body.data.orders.filter(o => o.currency === 'EUR');
        expect(eurOrders.length).toBeGreaterThan(0);
        expect(eurOrders[0].total).toBe(51.00);
        expect(eurOrders[0].currency).toBe('EUR');
      });

      test('should show currency conversion info in order details (TDD - RED)', async () => {
        const response = await request(app)
          .get(`/api/admin/orders/${testOrder._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.order.currency).toBeDefined();
        expect(response.body.order.exchangeRate).toBeDefined();
        expect(response.body.order.currencyInfo).toBeDefined();
        expect(response.body.order.currencyInfo.displayTotal).toBeDefined();
        expect(response.body.order.currencyInfo.baseTotal).toBeDefined();
      });
    });

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

  describe('Extended Product Management - Missing Endpoints (TDD)', () => {
    describe('Product Image Management', () => {
      test('should upload images to specific product - POST /products/:id/images (TDD - RED)', async () => {
        // Create mock image file
        const mockImage = Buffer.from('fake-image-data');
        
        const response = await request(app)
          .post(`/api/admin/products/${testProduct._id}/images`)
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('images', mockImage, 'test-image.jpg')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('uploaded successfully');
        expect(response.body.images).toBeDefined();
        expect(response.body.images).toHaveLength(1);
        expect(response.body.images[0].url).toContain('/images/products/');
        
        // Verify product was updated with new images
        const updatedProduct = await Product.findById(testProduct._id);
        expect(updatedProduct.images).toHaveLength(1);
      });

      test('should delete specific product image - DELETE /products/:id/images/:imageId (TDD - RED)', async () => {
        // First add an image to the product
        const imageId = new mongoose.Types.ObjectId();
        await Product.findByIdAndUpdate(testProduct._id, {
          $push: { 
            images: { 
              _id: imageId,
              url: '/images/products/test-image.jpg',
              alt: 'Test image',
              isPrimary: false 
            } 
          }
        });

        const response = await request(app)
          .delete(`/api/admin/products/${testProduct._id}/images/${imageId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Image deleted successfully');
        
        // Verify image was removed from product
        const updatedProduct = await Product.findById(testProduct._id);
        const imageExists = updatedProduct.images.some(img => img._id.toString() === imageId);
        expect(imageExists).toBe(false);
      });
    });

    describe('Category Management', () => {
      test('should get all product categories - GET /categories (TDD - RED)', async () => {
        const response = await request(app)
          .get('/api/admin/categories')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.categories).toBeDefined();
        expect(Array.isArray(response.body.categories)).toBe(true);
        expect(response.body.categories.length).toBeGreaterThan(0);
        
        // Should include the test product's category
        const crystalsCategory = response.body.categories.find(cat => cat.name === 'crystals');
        expect(crystalsCategory).toBeDefined();
        expect(crystalsCategory.count).toBeGreaterThan(0);
      });

      test('should create new category with i18n support - POST /categories (TDD - RED)', async () => {
        const categoryData = {
          name: 'herbs',
          slug: 'herbs',
          description: 'Healing herbs and botanicals',
          translations: {
            es: {
              name: 'hierbas',
              description: 'Hierbas curativas y productos botánicos'
            },
            fr: {
              name: 'herbes',
              description: 'Herbes de guérison et produits botaniques'
            }
          },
          isActive: true,
          sortOrder: 2
        };

        const response = await request(app)
          .post('/api/admin/categories')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(categoryData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.category.name).toBe('herbs');
        expect(response.body.category.translations.es.name).toBe('hierbas');
        expect(response.body.category.translations.fr.name).toBe('herbes');
        expect(response.body.category.isActive).toBe(true);
      });
    });

    describe('Inventory Management', () => {
      test('should update product inventory - PUT /products/:id/inventory (TDD - RED)', async () => {
        const inventoryData = {
          stock: 50,
          lowStockThreshold: 10,
          trackInventory: true,
          allowBackorder: false,
          sku: 'TC-001-NEW'
        };

        const response = await request(app)
          .put(`/api/admin/products/${testProduct._id}/inventory`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(inventoryData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Inventory updated successfully');
        expect(response.body.product.inventory.stock).toBe(50);
        expect(response.body.product.inventory.trackInventory).toBe(true);
        expect(response.body.product.inventory.sku).toBe('TC-001-NEW');
        
        // Verify in database
        const updatedProduct = await Product.findById(testProduct._id);
        expect(updatedProduct.inventory.stock).toBe(50);
        expect(updatedProduct.inventory.lowStockThreshold).toBe(10);
      });
    });
  });

  describe('Extended Order Management - Missing Endpoints (TDD)', () => {
    describe('Refund Processing', () => {
      test('should process refund via Mollie - POST /orders/:id/refund (TDD - RED)', async () => {
        const refundData = {
          amount: 30.00,
          reason: 'Customer request',
          notifyCustomer: true
        };

        const response = await request(app)
          .post(`/api/admin/orders/${testOrder._id}/refund`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(refundData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.refund).toBeDefined();
        expect(response.body.refund.amount).toBe(30.00);
        expect(response.body.refund.status).toBeDefined();
        expect(response.body.refund.mollieRefundId).toBeDefined();
        
        // Verify order was updated
        const updatedOrder = await Order.findById(testOrder._id);
        expect(updatedOrder.refunds).toHaveLength(1);
        expect(updatedOrder.refunds[0].amount).toBe(30.00);
      });

      test('should handle partial refunds (TDD - RED)', async () => {
        const refundData = {
          amount: 20.00,
          reason: 'Partial refund for damaged item',
          items: [{ productId: testProduct._id, quantity: 1 }]
        };

        const response = await request(app)
          .post(`/api/admin/orders/${testOrder._id}/refund`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(refundData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.refund.amount).toBe(20.00);
        expect(response.body.refund.type).toBe('partial');
      });
    });

    describe('Shipping Labels', () => {
      test('should generate shipping label - GET /orders/:id/shipping-label (TDD - RED)', async () => {
        const response = await request(app)
          .get(`/api/admin/orders/${testOrder._id}/shipping-label`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.shippingLabel).toBeDefined();
        expect(response.body.shippingLabel.trackingNumber).toBeDefined();
        expect(response.body.shippingLabel.labelUrl).toBeDefined();
        expect(response.body.shippingLabel.carrier).toBeDefined();
        
        // Verify order was updated with shipping info
        const updatedOrder = await Order.findById(testOrder._id);
        expect(updatedOrder.shipping.trackingNumber).toBeDefined();
        expect(updatedOrder.shipping.labelUrl).toBeDefined();
      });
    });
  });

  describe('Extended User Management - Missing Endpoints (TDD)', () => {
    describe('User Details and History', () => {
      test('should get user details with order history - GET /users/:id (TDD - RED)', async () => {
        const response = await request(app)
          .get(`/api/admin/users/${regularUser._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user).toBeDefined();
        expect(response.body.user._id).toBe(regularUser._id.toString());
        expect(response.body.user.email).toBe(regularUser.email);
        expect(response.body.user.password).toBeUndefined(); // Should not include password
        
        // Should include order history
        expect(response.body.user.orderHistory).toBeDefined();
        expect(response.body.user.orderHistory.orders).toBeDefined();
        expect(response.body.user.orderHistory.totalOrders).toBeGreaterThan(0);
        expect(response.body.user.orderHistory.totalSpent).toBeGreaterThan(0);
        expect(response.body.user.orderHistory.averageOrderValue).toBeGreaterThan(0);
      });

      test('should get user activity logs - GET /users/:id/activity (TDD - RED)', async () => {
        const response = await request(app)
          .get(`/api/admin/users/${regularUser._id}/activity`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.activity).toBeDefined();
        expect(response.body.activity.logs).toBeDefined();
        expect(Array.isArray(response.body.activity.logs)).toBe(true);
        expect(response.body.activity.summary).toBeDefined();
        expect(response.body.activity.summary.lastLogin).toBeDefined();
        expect(response.body.activity.summary.totalSessions).toBeDefined();
      });
    });

    describe('User Information Updates', () => {
      test('should update user information - PUT /users/:id (TDD - RED)', async () => {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+1-555-0123',
          preferences: {
            newsletter: true,
            language: 'es',
            currency: 'EUR'
          }
        };

        const response = await request(app)
          .put(`/api/admin/users/${regularUser._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.firstName).toBe('Updated');
        expect(response.body.user.lastName).toBe('Name');
        expect(response.body.user.phone).toBe('+1-555-0123');
        expect(response.body.user.preferences.language).toBe('es');
        
        // Verify in database
        const updatedUser = await User.findById(regularUser._id);
        expect(updatedUser.firstName).toBe('Updated');
        expect(updatedUser.preferences.currency).toBe('EUR');
      });

      test('should change user role - PUT /users/:id/role (TDD - RED)', async () => {
        const roleData = {
          role: 'admin',
          permissions: ['products.manage', 'orders.manage', 'users.view']
        };

        const response = await request(app)
          .put(`/api/admin/users/${regularUser._id}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(roleData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.user.isAdmin).toBe(true);
        expect(response.body.user.permissions).toEqual(['products.manage', 'orders.manage', 'users.view']);
        
        // Verify in database
        const updatedUser = await User.findById(regularUser._id);
        expect(updatedUser.isAdmin).toBe(true);
        expect(updatedUser.permissions).toEqual(['products.manage', 'orders.manage', 'users.view']);
      });
    });
  });

  describe('Extended Analytics - Missing Endpoints (TDD)', () => {
    describe('Sales Analytics', () => {
      test('should get sales analytics with multi-currency support - GET /analytics/sales (TDD - RED)', async () => {
        const response = await request(app)
          .get('/api/admin/analytics/sales?period=30d&groupBy=day&currency=all')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.salesAnalytics).toBeDefined();
        expect(response.body.salesAnalytics.period).toBe('30d');
        expect(response.body.salesAnalytics.groupBy).toBe('day');
        expect(response.body.salesAnalytics.data).toBeDefined();
        expect(response.body.salesAnalytics.summary).toBeDefined();
        expect(response.body.salesAnalytics.summary.totalRevenue).toBeDefined();
        expect(response.body.salesAnalytics.summary.totalOrders).toBeDefined();
        expect(response.body.salesAnalytics.summary.averageOrderValue).toBeDefined();
        expect(response.body.salesAnalytics.byCurrency).toBeDefined();
      });

      test('should filter sales analytics by currency (TDD - RED)', async () => {
        const response = await request(app)
          .get('/api/admin/analytics/sales?currency=USD&period=7d')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.salesAnalytics.filters.currency).toBe('USD');
        expect(response.body.salesAnalytics.byCurrency.USD).toBeDefined();
      });
    });

    describe('Product Performance Analytics', () => {
      test('should get product performance metrics - GET /analytics/products (TDD - RED)', async () => {
        const response = await request(app)
          .get('/api/admin/analytics/products?period=30d&sort=revenue&limit=10')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.productAnalytics).toBeDefined();
        expect(response.body.productAnalytics.topProducts).toBeDefined();
        expect(response.body.productAnalytics.categoryPerformance).toBeDefined();
        expect(response.body.productAnalytics.summary).toBeDefined();
        expect(response.body.productAnalytics.summary.totalProducts).toBeDefined();
        expect(response.body.productAnalytics.summary.activeProducts).toBeDefined();
        expect(response.body.productAnalytics.lowStockAlerts).toBeDefined();
      });
    });

    describe('Customer Analytics', () => {
      test('should get customer insights by country - GET /analytics/customers (TDD - RED)', async () => {
        const response = await request(app)
          .get('/api/admin/analytics/customers?period=30d&groupBy=country')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.customerAnalytics).toBeDefined();
        expect(response.body.customerAnalytics.byCountry).toBeDefined();
        expect(response.body.customerAnalytics.summary).toBeDefined();
        expect(response.body.customerAnalytics.summary.totalCustomers).toBeDefined();
        expect(response.body.customerAnalytics.summary.newCustomers).toBeDefined();
        expect(response.body.customerAnalytics.summary.returningCustomers).toBeDefined();
        expect(response.body.customerAnalytics.topCountries).toBeDefined();
      });

      test('should support different customer groupings (TDD - RED)', async () => {
        const response = await request(app)
          .get('/api/admin/analytics/customers?groupBy=language&period=7d')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.customerAnalytics.byLanguage).toBeDefined();
      });
    });

    describe('Revenue Analytics', () => {
      test('should get revenue analytics by currency - GET /analytics/revenue (TDD - RED)', async () => {
        const response = await request(app)
          .get('/api/admin/analytics/revenue?period=30d&groupBy=currency')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.revenueAnalytics).toBeDefined();
        expect(response.body.revenueAnalytics.byCurrency).toBeDefined();
        expect(response.body.revenueAnalytics.summary).toBeDefined();
        expect(response.body.revenueAnalytics.summary.totalRevenue).toBeDefined();
        expect(response.body.revenueAnalytics.summary.projectedRevenue).toBeDefined();
        expect(response.body.revenueAnalytics.trends).toBeDefined();
      });
    });

    describe('Analytics Export', () => {
      test('should export analytics data as CSV - GET /analytics/export (TDD - RED)', async () => {
        const response = await request(app)
          .get('/api/admin/analytics/export?type=sales&format=csv&period=30d')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.text).toContain('Date,Revenue,Orders,Average Order Value');
      });

      test('should export analytics data as JSON - GET /analytics/export (TDD - RED)', async () => {
        const response = await request(app)
          .get('/api/admin/analytics/export?type=products&format=json&period=7d')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.body.exportData).toBeDefined();
        expect(response.body.exportType).toBe('products');
        expect(response.body.period).toBe('7d');
        expect(response.body.generatedAt).toBeDefined();
      });
    });
  });

  describe('Review Management', () => {
    let testReviews;
    let testProduct2;
    let testUser2;

    beforeEach(async () => {
      // Clear reviews collection
      await Review.deleteMany({});

      // Create additional test product for reviews
      testProduct2 = await Product.create({
        name: 'Another Test Crystal',
        slug: 'another-test-crystal',
        description: 'Another beautiful test crystal',
        shortDescription: 'Another test crystal for testing',
        price: 39.99,
        category: 'crystals',
        properties: {
          chakra: ['throat'],
          element: ['water'],
          healing: ['communication', 'truth']
        },
        wholesaler: {
          name: 'Another Test Wholesaler',
          email: 'wholesaler2@test.com',
          productCode: 'ATC001',
          cost: 20.00
        }
      });

      // Create additional test user
      testUser2 = await User.create({
        email: 'user2@test.com',
        password: 'password123',
        firstName: 'Test2',
        lastName: 'User2',
        isAdmin: false
      });

      // Create test reviews with different statuses (avoiding duplicate user-product combinations)
      testReviews = [
        await Review.create({
          product: testProduct._id,
          user: regularUser._id,
          rating: 5,
          comment: 'This is an excellent product! I love it and would recommend it to anyone looking for high quality.',
          status: 'pending'
        }),
        await Review.create({
          product: testProduct2._id,
          user: adminUser._id,
          rating: 4,
          comment: 'Good product overall. The quality is decent and it arrived quickly. Worth the price.',
          status: 'approved',
          approvedBy: adminUser._id,
          approvedAt: new Date()
        }),
        await Review.create({
          product: testProduct2._id,
          user: testUser2._id,
          rating: 2,
          comment: 'This product was not what I expected. Poor quality and overpriced.',
          status: 'rejected',
          rejectedBy: adminUser._id,
          rejectedAt: new Date(),
          adminNotes: 'Contains inappropriate language'
        })
      ];
    });

    describe('GET /api/admin/reviews', () => {
      test('should get all reviews with filtering options', async () => {
        const response = await request(app)
          .get('/api/admin/reviews')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.reviews).toHaveLength(3);
        
        // Check structure of first review (any product is fine)
        expect(response.body.reviews[0]).toMatchObject({
          _id: expect.any(String),
          product: expect.objectContaining({
            name: expect.any(String),
            slug: expect.any(String)
          }),
          user: expect.objectContaining({
            firstName: expect.any(String),
            lastName: expect.any(String),
            email: expect.any(String)
          }),
          rating: expect.any(Number),
          comment: expect.any(String),
          status: expect.any(String),
          createdAt: expect.any(String)
        });
        
        // Check that reviews contain our test products
        const productNames = response.body.reviews.map(r => r.product.name);
        expect(productNames).toContain(testProduct.name);
        expect(productNames).toContain(testProduct2.name);
      });

      test('should filter reviews by status', async () => {
        const response = await request(app)
          .get('/api/admin/reviews?status=pending')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.reviews).toHaveLength(1);
        expect(response.body.reviews[0].status).toBe('pending');
      });

      test('should filter reviews by product', async () => {
        const response = await request(app)
          .get(`/api/admin/reviews?productId=${testProduct._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.reviews).toHaveLength(1); // Only one review for testProduct
        expect(response.body.reviews.every(review => 
          review.product._id === testProduct._id.toString()
        )).toBe(true);
      });

      test('should support pagination', async () => {
        const response = await request(app)
          .get('/api/admin/reviews?page=1&limit=2')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.reviews).toHaveLength(2);
        expect(response.body.pagination).toMatchObject({
          page: 1,
          limit: 2,
          total: 3,
          pages: 2
        });
      });

      test('should require admin authentication', async () => {
        await request(app)
          .get('/api/admin/reviews')
          .set('Authorization', `Bearer ${regularUserToken}`)
          .expect(403);
      });

      test('should require authentication', async () => {
        await request(app)
          .get('/api/admin/reviews')
          .expect(401);
      });
    });

    describe('PUT /api/admin/reviews/:id/approve', () => {
      test('should approve a pending review', async () => {
        const pendingReview = testReviews[0];
        
        const response = await request(app)
          .put(`/api/admin/reviews/${pendingReview._id}/approve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ adminNotes: 'Approved after review' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.review.status).toBe('approved');
        expect(response.body.review.approvedBy).toBe(adminUser._id.toString());
        expect(response.body.review.approvedAt).toBeDefined();
        expect(response.body.review.adminNotes).toBe('Approved after review');

        // Verify in database
        const updatedReview = await Review.findById(pendingReview._id);
        expect(updatedReview.status).toBe('approved');
        expect(updatedReview.approvedBy.toString()).toBe(adminUser._id.toString());
      });

      test('should handle approving already approved review', async () => {
        const approvedReview = testReviews[1];
        
        const response = await request(app)
          .put(`/api/admin/reviews/${approvedReview._id}/approve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ adminNotes: 'Already approved' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('already approved');
      });

      test('should require admin authentication', async () => {
        const pendingReview = testReviews[0];
        
        await request(app)
          .put(`/api/admin/reviews/${pendingReview._id}/approve`)
          .set('Authorization', `Bearer ${regularUserToken}`)
          .send({ adminNotes: 'Trying to approve' })
          .expect(403);
      });

      test('should handle non-existent review', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        
        const response = await request(app)
          .put(`/api/admin/reviews/${fakeId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ adminNotes: 'Approving fake review' })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Review not found');
      });

      test('should validate admin notes length', async () => {
        const pendingReview = testReviews[0];
        const longNote = 'x'.repeat(1001); // Exceeds 1000 character limit
        
        const response = await request(app)
          .put(`/api/admin/reviews/${pendingReview._id}/approve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ adminNotes: longNote })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
      });
    });

    describe('PUT /api/admin/reviews/:id/reject', () => {
      test('should reject a pending review', async () => {
        const pendingReview = testReviews[0];
        
        const response = await request(app)
          .put(`/api/admin/reviews/${pendingReview._id}/reject`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ adminNotes: 'Contains inappropriate content' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.review.status).toBe('rejected');
        expect(response.body.review.rejectedBy).toBe(adminUser._id.toString());
        expect(response.body.review.rejectedAt).toBeDefined();
        expect(response.body.review.adminNotes).toBe('Contains inappropriate content');

        // Verify in database
        const updatedReview = await Review.findById(pendingReview._id);
        expect(updatedReview.status).toBe('rejected');
        expect(updatedReview.rejectedBy.toString()).toBe(adminUser._id.toString());
      });

      test('should reject an approved review', async () => {
        const approvedReview = testReviews[1];
        
        const response = await request(app)
          .put(`/api/admin/reviews/${approvedReview._id}/reject`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ adminNotes: 'Content needs review' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.review.status).toBe('rejected');
      });

      test('should handle rejecting already rejected review', async () => {
        const rejectedReview = testReviews[2];
        
        const response = await request(app)
          .put(`/api/admin/reviews/${rejectedReview._id}/reject`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ adminNotes: 'Already rejected' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('already rejected');
      });

      test('should require admin notes for rejection', async () => {
        const pendingReview = testReviews[0];
        
        const response = await request(app)
          .put(`/api/admin/reviews/${pendingReview._id}/reject`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
      });

      test('should require admin authentication', async () => {
        const pendingReview = testReviews[0];
        
        await request(app)
          .put(`/api/admin/reviews/${pendingReview._id}/reject`)
          .set('Authorization', `Bearer ${regularUserToken}`)
          .send({ adminNotes: 'Trying to reject' })
          .expect(403);
      });
    });

    describe('DELETE /api/admin/reviews/:id', () => {
      test('should delete a review', async () => {
        const reviewToDelete = testReviews[0];
        
        const response = await request(app)
          .delete(`/api/admin/reviews/${reviewToDelete._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deleted');

        // Verify review is deleted from database
        const deletedReview = await Review.findById(reviewToDelete._id);
        expect(deletedReview).toBeNull();
      });

      test('should handle deleting non-existent review', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        
        const response = await request(app)
          .delete(`/api/admin/reviews/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Review not found');
      });

      test('should require admin authentication', async () => {
        const reviewToDelete = testReviews[0];
        
        await request(app)
          .delete(`/api/admin/reviews/${reviewToDelete._id}`)
          .set('Authorization', `Bearer ${regularUserToken}`)
          .expect(403);
      });

      test('should require authentication', async () => {
        const reviewToDelete = testReviews[0];
        
        await request(app)
          .delete(`/api/admin/reviews/${reviewToDelete._id}`)
          .expect(401);
      });
    });

    describe('GET /api/admin/reviews/stats', () => {
      test('should return review statistics', async () => {
        const response = await request(app)
          .get('/api/admin/reviews/stats')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.stats).toMatchObject({
          total: 3,
          pending: 1,
          approved: 1,
          rejected: 1,
          averageRating: expect.any(Number)
        });
      });

      test('should filter stats by date range', async () => {
        const today = new Date().toISOString().split('T')[0];
        
        const response = await request(app)
          .get(`/api/admin/reviews/stats?startDate=${today}&endDate=${today}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.stats.total).toBeGreaterThanOrEqual(0);
      });

      test('should require admin authentication', async () => {
        await request(app)
          .get('/api/admin/reviews/stats')
          .set('Authorization', `Bearer ${regularUserToken}`)
          .expect(403);
      });
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

    test('should handle non-existent product for image upload (TDD - RED)', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const mockImage = Buffer.from('fake-image-data');
      
      const response = await request(app)
        .post(`/api/admin/products/${fakeId}/images`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('images', mockImage, 'test-image.jpg')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    test('should handle invalid refund amount (TDD - RED)', async () => {
      const response = await request(app)
        .post(`/api/admin/orders/${testOrder._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: -10, reason: 'Invalid amount' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should handle refund amount exceeding order total (TDD - RED)', async () => {
      const response = await request(app)
        .post(`/api/admin/orders/${testOrder._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 1000, reason: 'Too much' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REFUND_AMOUNT_EXCEEDS_TOTAL');
    });
  });
});