const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const { createTestApp } = require('../helpers/testApp');
const { createAdminUserWithToken, createRegularUserWithToken } = require('../helpers/testSetup');

describe('Performance and Load Testing', () => {
  let app;
  let testProducts = [];
  let testUsers = [];
  let userTokens = [];

  beforeAll(async () => {
    app = createTestApp();
    
    // Create test data for performance testing
    await setupPerformanceTestData();
  }, 30000);

  beforeEach(async () => {
    // Clear orders but keep users and products for performance tests
    await Order.deleteMany({});
  });

  async function setupPerformanceTestData() {
    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    // Create 100 test products
    const productData = [];
    for (let i = 0; i < 100; i++) {
      productData.push({
        name: `Performance Product ${i}`,
        slug: `performance-product-${i}`,
        description: `High-quality holistic product ${i} for performance testing`,
        shortDescription: `Performance product ${i}`,
        price: 10 + (i * 0.5),
        category: ['crystals', 'herbs', 'oils', 'supplements'][i % 4],
        properties: {
          chakra: [['root'], ['sacral'], ['solar-plexus'], ['heart'], ['throat'], ['third-eye'], ['crown']][i % 7],
          element: ['earth', 'water', 'fire', 'air'][i % 4],
          zodiac: ['aries', 'taurus', 'gemini', 'cancer'][i % 4]
        },
        wholesaler: {
          name: `Wholesaler ${Math.floor(i / 10)}`,
          email: `wholesaler${Math.floor(i / 10)}@test.com`,
          productCode: `PP${i.toString().padStart(3, '0')}`,
          cost: 5 + (i * 0.25)
        },
        tags: [`tag${i % 5}`, `category${i % 3}`, `type${i % 7}`]
      });
    }
    testProducts = await Product.insertMany(productData);

    // Create 20 test users
    const userData = [];
    for (let i = 0; i < 20; i++) {
      userData.push({
        email: `perfuser${i}@test.com`,
        password: 'password123',
        firstName: `User${i}`,
        lastName: 'Performance',
        addresses: [{
          type: 'shipping',
          firstName: `User${i}`,
          lastName: 'Performance',
          street: `${100 + i} Performance St`,
          city: 'Test City',
          state: 'CA',
          zipCode: '90210',
          country: 'US',
          isDefault: true
        }]
      });
    }
    testUsers = await User.insertMany(userData);

    // Generate tokens for users
    userTokens = testUsers.map(user => 
      jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' })
    );
  }

  describe('API Response Time Tests', () => {
    it('should handle product catalog requests within acceptable time', async () => {
      const iterations = 10;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const response = await request(app)
          .get('/api/products?limit=20')
          .expect(200);
        const endTime = Date.now();

        times.push(endTime - startTime);
        expect(response.body.success).toBe(true);
        expect(response.body.products.length).toBeGreaterThan(0);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      console.log(`Product catalog - Average: ${avgTime}ms, Max: ${maxTime}ms`);
      
      // Should average under 200ms and max under 500ms
      expect(avgTime).toBeLessThan(200);
      expect(maxTime).toBeLessThan(500);
    });

    it('should handle product search requests efficiently', async () => {
      const searchTerms = ['crystal', 'herb', 'oil', 'supplement', 'performance'];
      const times = [];

      for (const term of searchTerms) {
        const startTime = Date.now();
        const response = await request(app)
          .get(`/api/products/search?q=${term}`)
          .expect(200);
        const endTime = Date.now();

        times.push(endTime - startTime);
        expect(response.body.success).toBe(true);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Product search - Average: ${avgTime}ms`);
      
      // Search should average under 300ms
      expect(avgTime).toBeLessThan(300);
    });

    it('should handle individual product page loads quickly', async () => {
      const productSlugs = testProducts.slice(0, 10).map(p => p.slug);
      const times = [];

      for (const slug of productSlugs) {
        const startTime = Date.now();
        const response = await request(app)
          .get(`/api/products/${slug}`)
          .expect(200);
        const endTime = Date.now();

        times.push(endTime - startTime);
        expect(response.body.success).toBe(true);
        expect(response.body.data.product.slug).toBe(slug);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Individual product - Average: ${avgTime}ms`);
      
      // Individual product loads should average under 100ms
      expect(avgTime).toBeLessThan(100);
    });
  });

  describe('Concurrent User Load Tests', () => {
    it('should handle concurrent user registrations', async () => {
      const concurrentRegistrations = [];
      
      for (let i = 0; i < 10; i++) {
        concurrentRegistrations.push(
          request(app)
            .post('/api/auth/register')
            .send({
              email: `concurrent${i}@test.com`,
              password: 'password123',
              firstName: `Concurrent${i}`,
              lastName: 'User'
            })
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(concurrentRegistrations);
      const endTime = Date.now();

      results.forEach((result, index) => {
        expect(result.status).toBe(201);
        expect(result.body.success).toBe(true);
        expect(result.body.data.user.email).toBe(`concurrent${index}@test.com`);
      });

      console.log(`Concurrent registrations (10): ${endTime - startTime}ms`);
      // Should complete within 2 seconds
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle concurrent cart operations', async () => {
      const concurrentCartOps = [];
      
      // Each user adds different products to cart
      for (let i = 0; i < 10; i++) {
        concurrentCartOps.push(
          request(app)
            .post('/api/cart/add')
            .set('Authorization', `Bearer ${userTokens[i]}`)
            .send({
              productId: testProducts[i]._id,
              quantity: Math.floor(Math.random() * 3) + 1
            })
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(concurrentCartOps);
      const endTime = Date.now();

      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
      });

      console.log(`Concurrent cart operations (10): ${endTime - startTime}ms`);
      // Should complete within 1 second
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle concurrent order creation', async () => {
      const concurrentOrders = [];
      
      for (let i = 0; i < 5; i++) {
        concurrentOrders.push(
          request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${userTokens[i]}`)
            .send({
              items: [{
                product: testProducts[i * 2]._id,
                quantity: 1,
                price: testProducts[i * 2].price
              }],
              useDefaultAddress: true
            })
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(concurrentOrders);
      const endTime = Date.now();

      results.forEach(result => {
        expect(result.status).toBe(201);
        expect(result.body.success).toBe(true);
        expect(result.body.data.order.items).toHaveLength(1);
      });

      console.log(`Concurrent order creation (5): ${endTime - startTime}ms`);
      // Should complete within 1.5 seconds
      expect(endTime - startTime).toBeLessThan(1500);
    });
  });

  describe('Database Query Performance', () => {
    it('should handle complex product filtering efficiently', async () => {
      const filterTests = [
        { category: 'crystals', chakra: 'heart' },
        { category: 'herbs', element: 'fire' },
        { priceMin: 20, priceMax: 40 },
        { zodiac: 'taurus', element: 'earth' },
        { tags: 'tag1,tag2' }
      ];

      const times = [];

      for (const filter of filterTests) {
        const queryString = Object.entries(filter)
          .map(([key, value]) => `${key}=${value}`)
          .join('&');

        const startTime = Date.now();
        const response = await request(app)
          .get(`/api/products?${queryString}`)
          .expect(200);
        const endTime = Date.now();

        times.push(endTime - startTime);
        expect(response.body.success).toBe(true);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Complex filtering - Average: ${avgTime}ms`);
      
      // Complex queries should average under 250ms
      expect(avgTime).toBeLessThan(250);
    });

    it('should handle pagination efficiently with large datasets', async () => {
      const pageTests = [
        { page: 1, limit: 10 },
        { page: 5, limit: 10 },
        { page: 10, limit: 10 },
        { page: 1, limit: 50 },
        { page: 2, limit: 50 }
      ];

      const times = [];

      for (const { page, limit } of pageTests) {
        const startTime = Date.now();
        const response = await request(app)
          .get(`/api/products?page=${page}&limit=${limit}`)
          .expect(200);
        const endTime = Date.now();

        times.push(endTime - startTime);
        expect(response.body.success).toBe(true);
        expect(response.body.products.length).toBeLessThanOrEqual(limit);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Pagination queries - Average: ${avgTime}ms`);
      
      // Pagination should average under 150ms
      expect(avgTime).toBeLessThan(150);
    });

    it('should handle user order history queries efficiently', async () => {
      // Create order history for users
      const orderPromises = [];
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 5; j++) {
          orderPromises.push(
            Order.create({
              customer: testUsers[i]._id,
              items: [{
                product: testProducts[j]._id,
                quantity: 1,
                price: testProducts[j].price
              }],
              shippingAddress: testUsers[i].addresses[0],
              billingAddress: testUsers[i].addresses[0],
              subtotal: testProducts[j].price,
              total: testProducts[j].price,
              payment: {
                method: 'card',
                status: 'paid'
              },
              status: 'delivered'
            })
          );
        }
      }
      await Promise.all(orderPromises);

      const times = [];

      // Test order history queries for multiple users
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        const response = await request(app)
          .get('/api/orders')
          .set('Authorization', `Bearer ${userTokens[i]}`)
          .expect(200);
        const endTime = Date.now();

        times.push(endTime - startTime);
        expect(response.body.success).toBe(true);
        expect(response.body.data.orders).toHaveLength(5);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Order history queries - Average: ${avgTime}ms`);
      
      // Order history should average under 200ms
      expect(avgTime).toBeLessThan(200);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not have significant memory leaks during repeated operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform 100 product queries
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/products?limit=10')
          .expect(200);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`Memory increase after 100 queries: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle database connection pooling efficiently', async () => {
      const connectionsBefore = mongoose.connection.readyState;
      
      // Perform many concurrent database operations
      const operations = [];
      for (let i = 0; i < 50; i++) {
        operations.push(
          Product.findOne({ slug: testProducts[i % testProducts.length].slug })
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const endTime = Date.now();

      const connectionsAfter = mongoose.connection.readyState;

      expect(connectionsBefore).toBe(connectionsAfter);
      expect(results).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000);
      
      console.log(`50 concurrent DB operations: ${endTime - startTime}ms`);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle rate limiting gracefully under load', async () => {
      const requests = [];
      
      // Make 150 requests rapidly (should hit rate limit)
      for (let i = 0; i < 150; i++) {
        requests.push(
          request(app)
            .get('/api/products')
            .then(res => ({ status: res.status, success: res.body.success }))
            .catch(err => ({ status: err.status || 500, success: false }))
        );
      }

      const results = await Promise.all(requests);
      
      const successfulRequests = results.filter(r => r.status === 200).length;
      const rateLimitedRequests = results.filter(r => r.status === 429).length;
      
      console.log(`Successful: ${successfulRequests}, Rate limited: ${rateLimitedRequests}`);
      
      // Should have some successful requests and some rate limited
      expect(successfulRequests).toBeGreaterThan(50);
      expect(rateLimitedRequests).toBeGreaterThan(0);
      expect(successfulRequests + rateLimitedRequests).toBe(150);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle invalid requests efficiently', async () => {
      const invalidRequests = [
        request(app).get('/api/products/non-existent-slug'),
        request(app).post('/api/auth/login').send({ invalid: 'data' }),
        request(app).get('/api/orders').set('Authorization', 'Bearer invalid-token'),
        request(app).post('/api/cart/add').send({}),
        request(app).get('/api/admin/products')
      ];

      const startTime = Date.now();
      const results = await Promise.all(
        invalidRequests.map(req => 
          req.then(res => res).catch(err => err.response || { status: 500 })
        )
      );
      const endTime = Date.now();

      // All should return appropriate error status codes
      expect(results[0].status).toBe(404);
      expect(results[1].status).toBe(400);
      expect(results[2].status).toBe(401);
      expect(results[3].status).toBe(400);
      expect(results[4].status).toBe(401);

      console.log(`Error handling (5 requests): ${endTime - startTime}ms`);
      
      // Error handling should be fast
      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});