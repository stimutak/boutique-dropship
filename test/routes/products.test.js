const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Product = require('../../models/Product');
const User = require('../../models/User');
const { createTestApp } = require('../helpers/testApp');

describe('Product Routes', () => {
  let app;
  let testProducts;
  let adminUser;
  let adminToken;
  
  beforeAll(async () => {
    // Set JWT secret for testing
    process.env.JWT_SECRET = 'test-secret';
    
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/holistic-store-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    app = createTestApp();
  });
  
  beforeEach(async () => {
    // Clear database
    await Product.deleteMany({});
    await User.deleteMany({});
    
    // Create admin user
    adminUser = await User.create({
      email: 'admin@example.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true
    });
    
    adminToken = jwt.sign({ userId: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    // Create test products
    testProducts = await Product.insertMany([
      {
        name: 'Rose Quartz Crystal',
        slug: 'rose-quartz-crystal',
        description: 'Beautiful rose quartz crystal for heart chakra healing and love energy',
        shortDescription: 'Heart chakra healing crystal for love and compassion',
        price: 29.99,
        compareAtPrice: 39.99,
        category: 'crystals',
        isActive: true,
        isFeatured: true,
        tags: ['rose quartz', 'heart chakra', 'love', 'healing'],
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
          description: 'Discover our premium Rose Quartz crystal for heart chakra healing.',
          keywords: ['rose quartz', 'heart chakra', 'love crystal', 'healing stone']
        },
        crossSiteIntegration: {
          enabled: true,
          referenceKey: 'rose-quartz-heart-chakra'
        },
        wholesaler: {
          name: 'Crystal Wholesale Co',
          email: 'orders@crystalwholesale.com',
          productCode: 'RQ-001',
          cost: 15.00
        }
      },
      {
        name: 'Amethyst Crystal',
        slug: 'amethyst-crystal',
        description: 'Crown chakra crystal for spiritual growth and meditation',
        shortDescription: 'Crown chakra crystal for spiritual development',
        price: 24.99,
        category: 'crystals',
        isActive: true,
        isFeatured: false,
        tags: ['amethyst', 'crown chakra', 'meditation', 'spiritual'],
        properties: {
          chakra: ['crown', 'third-eye'],
          element: ['air'],
          zodiac: ['pisces', 'aquarius'],
          healing: ['spiritual-growth', 'meditation', 'clarity']
        },
        wholesaler: {
          name: 'Crystal Wholesale Co',
          email: 'orders@crystalwholesale.com',
          productCode: 'AM-001',
          cost: 12.00
        }
      },
      {
        name: 'Lavender Essential Oil',
        slug: 'lavender-essential-oil',
        description: 'Pure lavender oil for relaxation and aromatherapy',
        shortDescription: 'Relaxing lavender oil for sleep and calm',
        price: 19.99,
        category: 'oils',
        isActive: true,
        isFeatured: true,
        tags: ['lavender', 'essential oil', 'relaxation', 'sleep'],
        properties: {
          chakra: ['heart', 'crown'],
          element: ['air'],
          healing: ['relaxation', 'sleep', 'stress-relief']
        },
        wholesaler: {
          name: 'Essential Oils Direct',
          email: 'fulfillment@oilsdirect.com',
          productCode: 'LAV-15ML',
          cost: 10.00
        }
      },
      {
        name: 'Inactive Product',
        slug: 'inactive-product',
        description: 'This product is inactive',
        shortDescription: 'Inactive test product',
        price: 9.99,
        category: 'other',
        isActive: false,
        properties: {},
        wholesaler: {
          name: 'Test Wholesaler',
          email: 'test@wholesaler.com',
          productCode: 'INACTIVE-001',
          cost: 5.00
        }
      }
    ]);
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  describe('GET /api/products', () => {
    it('should return all active products with default pagination', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(3); // Only active products
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalProducts).toBe(3);
      expect(response.body.data.pagination.limit).toBe(20);
      
      // Ensure wholesaler info is not exposed
      response.body.data.products.forEach(product => {
        expect(product.wholesaler).toBeUndefined();
      });
    });
    
    it('should filter products by category', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ category: 'crystals' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(2);
      expect(response.body.data.products.every(p => p.category === 'crystals')).toBe(true);
      expect(response.body.data.filters.category).toBe('crystals');
    });
    
    it('should search products by text', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ search: 'heart chakra' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBeGreaterThan(0);
      expect(response.body.data.filters.search).toBe('heart chakra');
    });
    
    it('should filter by chakra properties', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ chakra: 'heart' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBeGreaterThan(0);
      expect(response.body.data.products.every(p => p.properties.chakra.includes('heart'))).toBe(true);
    });
    
    it('should filter by multiple chakras', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ chakra: ['heart', 'crown'] })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBeGreaterThan(0);
    });
    
    it('should filter by element properties', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ element: 'air' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.products.every(p => p.properties.element.includes('air'))).toBe(true);
    });
    
    it('should filter by healing properties', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ healing: 'relaxation' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.products.every(p => p.properties.healing.includes('relaxation'))).toBe(true);
    });
    
    it('should filter by price range', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ minPrice: 20, maxPrice: 30 })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.products.every(p => p.price >= 20 && p.price <= 30)).toBe(true);
    });
    
    it('should filter featured products', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ featured: 'true' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.products.every(p => p.isFeatured === true)).toBe(true);
    });
    
    it('should sort products by price low to high', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ sort: 'price-low' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      const prices = response.body.data.products.map(p => p.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });
    
    it('should sort products by price high to low', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ sort: 'price-high' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      const prices = response.body.data.products.map(p => p.price);
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
    });
    
    it('should sort products by name', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ sort: 'name' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      const names = response.body.data.products.map(p => p.name);
      expect(names).toEqual([...names].sort());
    });
    
    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({ page: 1, limit: 2 })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(2);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalPages).toBe(2);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
      expect(response.body.data.pagination.hasPrevPage).toBe(false);
    });
    
    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/products')
        .query({
          category: 'crystals',
          chakra: 'heart',
          minPrice: 25,
          sort: 'price-high'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.filters.category).toBe('crystals');
      expect(response.body.data.filters.chakra).toBe('heart');
      expect(response.body.data.filters.priceRange.min).toBe('25');
    });
  });
  
  describe('GET /api/products/search', () => {
    it('should perform text search', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .query({ q: 'crystal' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.query).toBe('crystal');
      expect(response.body.results.length).toBeGreaterThan(0);
      expect(response.body.meta.resultCount).toBeGreaterThan(0);
    });
    
    it('should provide search suggestions', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .query({ q: 'rose', suggest: 'true' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.suggestions).toBeDefined();
      expect(response.body.meta.suggestionsEnabled).toBe(true);
    });
    
    it('should require search query', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_QUERY');
    });
    
    it('should limit search results', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .query({ q: 'healing' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.results.length).toBeLessThanOrEqual(20);
    });
  });
  
  describe('GET /api/products/categories', () => {
    it('should return categories with counts and price ranges', async () => {
      const response = await request(app)
        .get('/api/products/categories')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.categories).toHaveLength(2); // crystals and oils
      
      const crystalsCategory = response.body.categories.find(cat => cat.name === 'crystals');
      expect(crystalsCategory).toBeDefined();
      expect(crystalsCategory.count).toBe(2);
      expect(crystalsCategory.priceRange.min).toBeDefined();
      expect(crystalsCategory.priceRange.max).toBeDefined();
      expect(crystalsCategory.priceRange.avg).toBeDefined();
    });
    
    it('should sort categories by count', async () => {
      const response = await request(app)
        .get('/api/products/categories')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      const counts = response.body.categories.map(cat => cat.count);
      expect(counts).toEqual([...counts].sort((a, b) => b - a));
    });
  });
  
  describe('GET /api/products/filters', () => {
    it('should return available filter options', async () => {
      const response = await request(app)
        .get('/api/products/filters')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.filters.chakras).toContain('heart');
      expect(response.body.filters.chakras).toContain('crown');
      expect(response.body.filters.elements).toContain('air');
      expect(response.body.filters.elements).toContain('earth');
      expect(response.body.filters.healingProperties).toContain('love');
      expect(response.body.filters.healingProperties).toContain('relaxation');
      expect(response.body.filters.priceRange.min).toBeDefined();
      expect(response.body.filters.priceRange.max).toBeDefined();
    });
    
    it('should filter options by category', async () => {
      const response = await request(app)
        .get('/api/products/filters')
        .query({ category: 'crystals' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.appliedTo).toBe('category: crystals');
    });
    
    it('should sort filter options alphabetically', async () => {
      const response = await request(app)
        .get('/api/products/filters')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.filters.chakras).toEqual([...response.body.filters.chakras].sort());
      expect(response.body.filters.elements).toEqual([...response.body.filters.elements].sort());
    });
  });
  
  describe('GET /api/products/recommendations/:productId', () => {
    it('should return product recommendations', async () => {
      const roseQuartz = testProducts.find(p => p.slug === 'rose-quartz-crystal');
      
      const response = await request(app)
        .get(`/api/products/recommendations/${roseQuartz._id}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.recommendations).toBeDefined();
      expect(response.body.basedOn.productId).toBe(roseQuartz._id.toString());
      expect(response.body.basedOn.productName).toBe('Rose Quartz Crystal');
      expect(response.body.meta.count).toBeDefined();
    });
    
    it('should limit recommendations', async () => {
      const roseQuartz = testProducts.find(p => p.slug === 'rose-quartz-crystal');
      
      const response = await request(app)
        .get(`/api/products/recommendations/${roseQuartz._id}`)
        .query({ limit: 2 })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.recommendations.length).toBeLessThanOrEqual(2);
      expect(response.body.meta.limit).toBe(2);
    });
    
    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/products/recommendations/${fakeId}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
    
    it('should exclude the base product from recommendations', async () => {
      const roseQuartz = testProducts.find(p => p.slug === 'rose-quartz-crystal');
      
      const response = await request(app)
        .get(`/api/products/recommendations/${roseQuartz._id}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.recommendations.every(p => p._id !== roseQuartz._id.toString())).toBe(true);
    });
  });
  
  describe('GET /api/products/:slug', () => {
    it('should return product by slug with related products', async () => {
      const response = await request(app)
        .get('/api/products/rose-quartz-crystal')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.product.name).toBe('Rose Quartz Crystal');
      expect(response.body.data.product.slug).toBe('rose-quartz-crystal');
      expect(response.body.data.product.price).toBe(29.99);
      expect(response.body.data.related).toBeDefined();
      expect(response.body.data.meta.slug).toBe('rose-quartz-crystal');
      expect(response.body.data.meta.category).toBe('crystals');
      
      // Ensure wholesaler info is not exposed
      expect(response.body.data.product.wholesaler).toBeUndefined();
    });
    
    it('should return related products', async () => {
      const response = await request(app)
        .get('/api/products/rose-quartz-crystal')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.related).toBeDefined();
      expect(response.body.data.meta.relatedCount).toBeDefined();
      
      // Related products should not include the main product
      expect(response.body.data.related.every(p => p.slug !== 'rose-quartz-crystal')).toBe(true);
    });
    
    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/non-existent-product')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
    
    it('should return 404 for inactive product', async () => {
      const response = await request(app)
        .get('/api/products/inactive-product')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });
  
  describe('POST /api/products (Admin Only)', () => {
    it('should create new product with valid data', async () => {
      const newProduct = {
        name: 'Green Aventurine',
        description: 'Green aventurine crystal for prosperity and luck',
        shortDescription: 'Prosperity crystal for good fortune',
        price: 22.99,
        compareAtPrice: 29.99,
        category: 'crystals',
        properties: {
          chakra: ['heart'],
          element: ['earth'],
          healing: ['prosperity', 'luck']
        },
        wholesaler: {
          name: 'Crystal Wholesale Co',
          email: 'orders@crystalwholesale.com',
          productCode: 'GA-001',
          cost: 12.00
        }
      };
      
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProduct)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product created successfully');
      expect(response.body.product.name).toBe('Green Aventurine');
      expect(response.body.product.slug).toBe('green-aventurine');
      
      // Verify product was saved to database
      const savedProduct = await Product.findOne({ slug: 'green-aventurine' });
      expect(savedProduct).toBeTruthy();
      expect(savedProduct.wholesaler.name).toBe('Crystal Wholesale Co');
    });
    
    it('should generate slug automatically', async () => {
      const newProduct = {
        name: 'Black Tourmaline Crystal',
        description: 'Protection crystal for negative energy',
        shortDescription: 'Protection crystal for negative energy',
        price: 18.99,
        category: 'crystals',
        properties: { chakra: ['root'] },
        wholesaler: {
          name: 'Crystal Wholesale Co',
          email: 'orders@crystalwholesale.com',
          productCode: 'BT-001',
          cost: 10.00
        }
      };
      
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProduct)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.product.slug).toBe('black-tourmaline-crystal');
    });
    
    it('should handle duplicate slugs', async () => {
      const newProduct = {
        name: 'Rose Quartz Crystal', // Same name as existing product
        description: 'Another rose quartz crystal',
        shortDescription: 'Another rose quartz crystal',
        price: 25.99,
        category: 'crystals',
        properties: { chakra: ['heart'] },
        wholesaler: {
          name: 'Crystal Wholesale Co',
          email: 'orders@crystalwholesale.com',
          productCode: 'RQ-002',
          cost: 13.00
        }
      };
      
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProduct)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.product.slug).toMatch(/^rose-quartz-crystal-\d+$/);
    });
    
    it('should validate required fields', async () => {
      const invalidProduct = {
        name: '',
        price: -10,
        category: 'invalid-category'
      };
      
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidProduct)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
    });
    
    it('should require admin authentication', async () => {
      const newProduct = {
        name: 'Test Product',
        description: 'Test description',
        shortDescription: 'Test description',
        price: 19.99,
        category: 'crystals',
        wholesaler: {
          name: 'Test Wholesaler',
          email: 'test@wholesaler.com',
          productCode: 'TEST-001',
          cost: 10.00
        }
      };
      
      const response = await request(app)
        .post('/api/products')
        .send(newProduct)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('PUT /api/products/:id (Admin Only)', () => {
    it('should update existing product', async () => {
      const roseQuartz = testProducts.find(p => p.slug === 'rose-quartz-crystal');
      const updateData = {
        price: 34.99,
        shortDescription: 'Updated description for heart chakra crystal'
      };
      
      const response = await request(app)
        .put(`/api/products/${roseQuartz._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product updated successfully');
      expect(response.body.product.price).toBe(34.99);
      expect(response.body.product.shortDescription).toBe('Updated description for heart chakra crystal');
    });
    
    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/api/products/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 25.99 })
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
    
    it('should require admin authentication', async () => {
      const roseQuartz = testProducts.find(p => p.slug === 'rose-quartz-crystal');
      
      const response = await request(app)
        .put(`/api/products/${roseQuartz._id}`)
        .send({ price: 25.99 })
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('DELETE /api/products/:id (Admin Only)', () => {
    it('should deactivate product', async () => {
      const roseQuartz = testProducts.find(p => p.slug === 'rose-quartz-crystal');
      
      const response = await request(app)
        .delete(`/api/products/${roseQuartz._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product deactivated successfully');
      expect(response.body.product.isActive).toBe(false);
      
      // Verify product is deactivated in database
      const updatedProduct = await Product.findById(roseQuartz._id);
      expect(updatedProduct.isActive).toBe(false);
    });
    
    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete(`/api/products/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
    
    it('should require admin authentication', async () => {
      const roseQuartz = testProducts.find(p => p.slug === 'rose-quartz-crystal');
      
      const response = await request(app)
        .delete(`/api/products/${roseQuartz._id}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
});