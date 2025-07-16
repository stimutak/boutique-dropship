const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const adminRoutes = require('../../routes/admin');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  return app;
};

describe('Admin Routes - Focused Tests', () => {
  let app;
  let adminUser;
  let adminToken;
  let testProduct;

  beforeAll(async () => {
    // Set environment variables
    process.env.JWT_SECRET = 'test-secret';
    
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/holistic-store-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    app = createTestApp();
  });

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    // Create admin user
    adminUser = await User.create({
      email: 'admin@test.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true
    });

    adminToken = jwt.sign({ userId: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

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
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Authentication & Authorization', () => {
    test('should deny access without token', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    test('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    test('should allow access for admin users', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/products', () => {
    test('should return products with admin data including wholesaler info', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].wholesaler).toBeDefined();
      expect(response.body.products[0].wholesaler.name).toBe('Test Wholesaler');
      expect(response.body.pagination).toBeDefined();
      expect(response.body.filters).toBeDefined();
    });

    test('should filter by category', async () => {
      const response = await request(app)
        .get('/api/admin/products?category=crystals')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.filters.category).toBe('crystals');
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/admin/products?status=active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filters.status).toBe('active');
    });

    test('should search products', async () => {
      const response = await request(app)
        .get('/api/admin/products?search=crystal')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.filters.search).toBe('crystal');
    });

    test('should sort products', async () => {
      const response = await request(app)
        .get('/api/admin/products?sort=name')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filters.sort).toBe('name');
    });

    test('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/admin/products?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });
  });

  describe('POST /api/admin/products/bulk-import', () => {
    test('should require CSV file', async () => {
      const response = await request(app)
        .post('/api/admin/products/bulk-import')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE');
    });

    test('should import valid CSV data', async () => {
      const csvContent = `name,price,category,wholesaler_name,wholesaler_email,wholesaler_product_code,description
Test Import Product,19.99,herbs,Import Wholesaler,import@test.com,IMP001,Imported test product`;
      
      const csvPath = path.join(__dirname, 'temp-test.csv');
      fs.writeFileSync(csvPath, csvContent);

      const response = await request(app)
        .post('/api/admin/products/bulk-import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('csvFile', csvPath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.summary.successCount).toBe(1);
      expect(response.body.results).toHaveLength(1);

      // Clean up
      fs.unlinkSync(csvPath);
      
      // Verify product was created
      const importedProduct = await Product.findOne({ name: 'Test Import Product' });
      expect(importedProduct).toBeTruthy();
      expect(importedProduct.wholesaler.name).toBe('Import Wholesaler');
    });

    test('should handle CSV with missing required fields', async () => {
      const csvContent = `name,price
Invalid Product,19.99`; // Missing required fields
      
      const csvPath = path.join(__dirname, 'temp-test-invalid.csv');
      fs.writeFileSync(csvPath, csvContent);

      const response = await request(app)
        .post('/api/admin/products/bulk-import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('csvFile', csvPath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.summary.errorCount).toBe(1);
      expect(response.body.errors).toHaveLength(1);

      // Clean up
      fs.unlinkSync(csvPath);
    });

    test('should handle duplicate slugs', async () => {
      const csvContent = `name,price,category,wholesaler_name,wholesaler_email,wholesaler_product_code,description
Test Crystal,25.99,crystals,Another Wholesaler,another@test.com,TC002,Another test crystal`;
      
      const csvPath = path.join(__dirname, 'temp-test-duplicate.csv');
      fs.writeFileSync(csvPath, csvContent);

      const response = await request(app)
        .post('/api/admin/products/bulk-import')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('csvFile', csvPath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.summary.successCount).toBe(1);
      
      // Verify slug was modified to avoid duplicate
      const importedProduct = await Product.findOne({ name: 'Test Crystal', 'wholesaler.name': 'Another Wholesaler' });
      expect(importedProduct).toBeTruthy();
      expect(importedProduct.slug).toMatch(/^test-crystal-\d+$/);

      // Clean up
      fs.unlinkSync(csvPath);
    });
  });

  describe('GET /api/admin/products/export', () => {
    test('should export products to CSV', async () => {
      const response = await request(app)
        .get('/api/admin/products/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('products-export-');
      expect(response.text).toContain('Test Crystal');
      expect(response.text).toContain('Test Wholesaler');
    });

    test('should filter export by category', async () => {
      const response = await request(app)
        .get('/api/admin/products/export?category=crystals')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.text).toContain('Test Crystal');
    });

    test('should filter export by status', async () => {
      const response = await request(app)
        .get('/api/admin/products/export?status=active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.text).toContain('Test Crystal');
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Temporarily close database connection to simulate error
      await mongoose.connection.close();

      const response = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ADMIN_PRODUCTS_ERROR');

      // Reconnect for cleanup
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/holistic-store-test');
    });
  });
});