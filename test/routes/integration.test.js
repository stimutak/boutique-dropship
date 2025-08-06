const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const integrationRoutes = require('../../routes/integration');
const { createAdminUserWithToken, createRegularUserWithToken } = require('../helpers/testSetup');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/integration', integrationRoutes);
  return app;
};

describe('Integration Routes', () => {
  let app;
  let testProduct;
  let _testOrder;
  
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/holistic-store-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    app = createTestApp();
  });
  
  beforeEach(async () => {
    // Clear database
    await Product.deleteMany({});
    await Order.deleteMany({});
    
    // Create test product with cross-site integration enabled
    testProduct = await Product.create({
      name: 'Rose Quartz Crystal',
      slug: 'rose-quartz-crystal',
      description: 'Beautiful rose quartz crystal for heart chakra healing and love energy',
      shortDescription: 'Heart chakra healing crystal for love and compassion',
      price: 29.99,
      compareAtPrice: 39.99,
      category: 'crystals',
      isActive: true,
      isFeatured: true,
      images: [{
        url: 'https://example.com/rose-quartz.jpg',
        alt: 'Rose Quartz Crystal',
        isPrimary: true
      }],
      properties: {
        chakra: ['heart'],
        element: ['earth', 'water'],
        zodiac: ['taurus', 'libra'],
        healing: ['love', 'compassion', 'emotional-healing']
      },
      seo: {
        title: 'Rose Quartz Crystal - Heart Chakra Healing Stone for Love',
        description: 'Discover our premium Rose Quartz crystal for heart chakra healing. Perfect for love, compassion, and emotional balance.',
        keywords: ['rose quartz', 'heart chakra', 'love crystal', 'healing stone']
      },
      crossSiteIntegration: {
        enabled: true,
        referenceKey: 'rose-quartz-heart-chakra',
        relatedContent: ['chakra-heart', 'healing-love', 'element-earth']
      },
      wholesaler: {
        name: 'Crystal Wholesale Co',
        email: 'orders@crystalwholesale.com',
        productCode: 'RQ-001',
        cost: 15.00
      }
    });
    
    // Create test order with referral source
    _testOrder = await Order.create({
      guestInfo: {
        email: 'guest@example.com',
        firstName: 'Jane',
        lastName: 'Doe'
      },
      items: [{
        product: testProduct._id,
        quantity: 1,
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
      subtotal: 29.99,
      tax: 2.40,
      shipping: 0,
      total: 32.39,
      payment: {
        method: 'card',
        status: 'paid'
      },
      status: 'processing',
      referralSource: 'holistic-school'
    });
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  describe('GET /api/integration/products/link/:referenceKey', () => {
    it('should return product by reference key', async () => {
      const response = await request(app)
        .get('/api/integration/products/link/rose-quartz-heart-chakra')
        .query({ source: 'holistic-school' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.product.name).toBe('Rose Quartz Crystal');
      expect(response.body.product.slug).toBe('rose-quartz-crystal');
      expect(response.body.product.price).toBe(29.99);
      expect(response.body.product.properties.chakra).toContain('heart');
      
      // Ensure wholesaler info is not exposed
      expect(response.body.product.wholesaler).toBeUndefined();
      
      // Check meta information
      expect(response.body.meta.referralSource).toBe('holistic-school');
      expect(response.body.meta.crossSiteEnabled).toBe(true);
      expect(response.body.meta.directUrl).toBe('/products/rose-quartz-crystal');
      expect(response.body.meta.embedUrl).toBe('/api/integration/products/embed/rose-quartz-crystal');
    });
    
    it('should return product by slug as fallback', async () => {
      const response = await request(app)
        .get('/api/integration/products/link/rose-quartz-crystal')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.product.name).toBe('Rose Quartz Crystal');
    });
    
    it('should return 404 for non-existent reference key', async () => {
      const response = await request(app)
        .get('/api/integration/products/link/non-existent-key')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
    
    it('should return 404 for disabled cross-site integration', async () => {
      testProduct.crossSiteIntegration.enabled = false;
      await testProduct.save();
      
      const response = await request(app)
        .get('/api/integration/products/link/rose-quartz-heart-chakra')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
    
    it('should return 404 for inactive product', async () => {
      testProduct.isActive = false;
      await testProduct.save();
      
      const response = await request(app)
        .get('/api/integration/products/link/rose-quartz-heart-chakra')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });
  
  describe('GET /api/integration/products/embed/:slug', () => {
    it('should return JSON embed data by default', async () => {
      const response = await request(app)
        .get('/api/integration/products/embed/rose-quartz-crystal')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.embed.name).toBe('Rose Quartz Crystal');
      expect(response.body.embed.price).toBe(29.99);
      expect(response.body.embed.compareAtPrice).toBe(39.99);
      expect(response.body.embed.primaryImage.url).toBe('https://example.com/rose-quartz.jpg');
      expect(response.body.embed.properties.chakra).toContain('heart');
      expect(response.body.embed.urls.product).toBe('/products/rose-quartz-crystal');
      expect(response.body.embed.urls.addToCart).toBe('/api/cart/add');
      
      // Check meta information
      expect(response.body.meta.format).toBe('json');
      expect(response.body.meta.theme).toBe('light');
      expect(response.body.meta.embedCode).toContain('iframe');
    });
    
    it('should return HTML widget when format=html', async () => {
      const response = await request(app)
        .get('/api/integration/products/embed/rose-quartz-crystal')
        .query({ format: 'html', theme: 'dark' })
        .expect(200);
      
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('Rose Quartz Crystal');
      expect(response.text).toContain('$29.99');
      expect(response.text).toContain('$39.99');
      expect(response.text).toContain('background: #2d3748'); // Dark theme
      expect(response.text).toContain('Chakra: heart');
      expect(response.text).toContain('Element: earth, water');
    });
    
    it('should use light theme by default', async () => {
      const response = await request(app)
        .get('/api/integration/products/embed/rose-quartz-crystal')
        .query({ format: 'html' })
        .expect(200);
      
      expect(response.text).toContain('background: #ffffff'); // Light theme
    });
    
    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/integration/products/embed/non-existent-product')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
    
    it('should return 404 for disabled cross-site integration', async () => {
      testProduct.crossSiteIntegration.enabled = false;
      await testProduct.save();
      
      const response = await request(app)
        .get('/api/integration/products/embed/rose-quartz-crystal')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });
  
  describe('GET /api/integration/products/related/:contentId', () => {
    beforeEach(async () => {
      // Create additional test products
      await Product.create({
        name: 'Amethyst Crystal',
        slug: 'amethyst-crystal',
        description: 'Crown chakra crystal for spiritual growth',
        shortDescription: 'Crown chakra crystal for spiritual development',
        price: 24.99,
        category: 'crystals',
        isActive: true,
        properties: {
          chakra: ['crown', 'third-eye'],
          element: ['air'],
          healing: ['spiritual-growth', 'meditation']
        },
        crossSiteIntegration: {
          enabled: true,
          referenceKey: 'amethyst-crown-chakra'
        },
        wholesaler: {
          name: 'Crystal Wholesale Co',
          email: 'orders@crystalwholesale.com',
          productCode: 'AM-001',
          cost: 12.00
        }
      });
      
      await Product.create({
        name: 'Green Aventurine',
        slug: 'green-aventurine',
        description: 'Heart chakra stone for prosperity',
        shortDescription: 'Heart chakra stone for prosperity and luck',
        price: 19.99,
        category: 'crystals',
        isActive: true,
        properties: {
          chakra: ['heart'],
          element: ['earth'],
          healing: ['prosperity', 'luck']
        },
        crossSiteIntegration: {
          enabled: true,
          referenceKey: 'aventurine-heart-prosperity'
        },
        wholesaler: {
          name: 'Crystal Wholesale Co',
          email: 'orders@crystalwholesale.com',
          productCode: 'GA-001',
          cost: 10.00
        }
      });
    });
    
    it('should return products related to chakra content', async () => {
      const response = await request(app)
        .get('/api/integration/products/related/chakra-heart')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(2); // Rose Quartz and Green Aventurine
      expect(response.body.products.every(p => p.properties.chakra.includes('heart'))).toBe(true);
      expect(response.body.meta.contentId).toBe('chakra-heart');
      expect(response.body.meta.count).toBe(2);
    });
    
    it('should return products related to element content', async () => {
      const response = await request(app)
        .get('/api/integration/products/related/element-earth')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.products.length).toBeGreaterThan(0);
      expect(response.body.products.every(p => p.properties.element.includes('earth'))).toBe(true);
    });
    
    it('should return products related to healing content', async () => {
      const response = await request(app)
        .get('/api/integration/products/related/healing-love')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.products.length).toBeGreaterThan(0);
      expect(response.body.products.every(p => p.properties.healing.includes('love'))).toBe(true);
    });
    
    it('should limit results based on limit parameter', async () => {
      const response = await request(app)
        .get('/api/integration/products/related/chakra-heart')
        .query({ limit: 1 })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(1);
    });
    
    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/integration/products/related/chakra-heart')
        .query({ category: 'crystals' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.products.every(p => p.category === 'crystals')).toBe(true);
    });
    
    it('should filter by additional properties', async () => {
      const properties = JSON.stringify({ element: ['earth'] });
      
      const response = await request(app)
        .get('/api/integration/products/related/chakra-heart')
        .query({ properties })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.products.every(p => p.properties.element.includes('earth'))).toBe(true);
    });
    
    it('should handle invalid properties JSON gracefully', async () => {
      const response = await request(app)
        .get('/api/integration/products/related/chakra-heart')
        .query({ properties: 'invalid-json' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      // Should still return results, ignoring invalid properties filter
    });
    
    it('should return empty array for non-matching content', async () => {
      const response = await request(app)
        .get('/api/integration/products/related/chakra-nonexistent')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.products).toHaveLength(0);
    });
  });
  
  describe('POST /api/integration/analytics/referral', () => {
    beforeAll(() => {
      // Set up test API key for analytics endpoints
      process.env.VALID_API_KEYS = 'test-api-key-123';
    });

    it('should track referral analytics', async () => {
      const analyticsData = {
        source: 'holistic-school',
        productId: testProduct._id,
        action: 'view',
        metadata: {
          page: 'chakra-guide',
          section: 'heart-chakra'
        }
      };
      
      const response = await request(app)
        .post('/api/integration/analytics/referral')
        .set('x-api-key', 'test-api-key-123')
        .send(analyticsData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Referral tracked successfully');
    });
    
    it('should track different action types', async () => {
      const actions = ['view', 'click', 'add_to_cart', 'purchase'];
      
      for (const action of actions) {
        const response = await request(app)
          .post('/api/integration/analytics/referral')
          .set('x-api-key', 'test-api-key-123')
          .send({
            source: 'holistic-school',
            productId: testProduct._id,
            action
          })
          .expect(200);
        
        expect(response.body.success).toBe(true);
      }
    });
    
    it('should require source and action', async () => {
      const response = await request(app)
        .post('/api/integration/analytics/referral')
        .set('x-api-key', 'test-api-key-123')
        .send({ productId: testProduct._id })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
    
    it('should handle optional fields', async () => {
      const response = await request(app)
        .post('/api/integration/analytics/referral')
        .set('x-api-key', 'test-api-key-123')
        .send({
          source: 'holistic-school',
          action: 'view'
          // No productId or metadata
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('GET /api/integration/analytics/summary', () => {
    beforeEach(async () => {
      // Create additional test orders with different referral sources
      await Order.create({
        guestInfo: {
          email: 'guest2@example.com',
          firstName: 'John',
          lastName: 'Smith'
        },
        items: [{
          product: testProduct._id,
          quantity: 2,
          price: testProduct.price,
          wholesaler: testProduct.wholesaler
        }],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Smith',
          street: '456 Oak Ave',
          city: 'Testville',
          state: 'NY',
          zipCode: '67890',
          country: 'US'
        },
        billingAddress: {
          firstName: 'John',
          lastName: 'Smith',
          street: '456 Oak Ave',
          city: 'Testville',
          state: 'NY',
          zipCode: '67890',
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
        status: 'processing',
        referralSource: 'travel-discovery'
      });
    });
    
    it('should return analytics summary', async () => {
      const response = await request(app)
        .get('/api/integration/analytics/summary')
        .set('x-api-key', 'test-api-key-123')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.analytics.summary.totalReferralOrders).toBe(2);
      expect(response.body.analytics.summary.totalReferralRevenue).toBeCloseTo(97.17, 2); // 32.39 + 64.78
      expect(response.body.analytics.bySource).toHaveLength(2);
      expect(response.body.analytics.topProducts).toBeDefined();
      expect(response.body.meta.generatedAt).toBeDefined();
    });
    
    it('should filter by date range', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const response = await request(app)
        .get('/api/integration/analytics/summary')
        .set('x-api-key', 'test-api-key-123')
        .query({
          startDate: tomorrow.toISOString(),
          endDate: tomorrow.toISOString()
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.analytics.summary.totalReferralOrders).toBe(0);
    });
    
    it('should filter by source', async () => {
      const response = await request(app)
        .get('/api/integration/analytics/summary')
        .set('x-api-key', 'test-api-key-123')
        .query({ source: 'holistic-school' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.analytics.bySource.length).toBeGreaterThanOrEqual(1);
      const holisticSchoolSource = response.body.analytics.bySource.find(source => source._id === 'holistic-school');
      expect(holisticSchoolSource).toBeDefined();
      expect(holisticSchoolSource._id).toBe('holistic-school');
    });
    
    it('should include top products data', async () => {
      const response = await request(app)
        .get('/api/integration/analytics/summary')
        .set('x-api-key', 'test-api-key-123')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.analytics.topProducts).toHaveLength(1);
      expect(response.body.analytics.topProducts[0].productName).toBe('Rose Quartz Crystal');
      expect(response.body.analytics.topProducts[0].referralCount).toBe(3); // 1 + 2 from orders
    });
  });
});