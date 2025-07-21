const request = require('supertest');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const Product = require('../../models/Product');
const cartRoutes = require('../../routes/cart');

// Create test app
const createTestApp = () => {
  const app = express();
  
  // Session middleware for testing
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  }));
  
  app.use(express.json());
  app.use('/api/cart', cartRoutes);
  
  return app;
};

describe('Cart Routes', () => {
  let app;
  let testProduct;
  
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/holistic-store-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    app = createTestApp();
  });
  
  beforeEach(async () => {
    // Clear database and create test product
    await Product.deleteMany({});
    
    testProduct = await Product.create({
      name: 'Test Crystal',
      slug: 'test-crystal',
      description: 'A test crystal for unit testing',
      shortDescription: 'A test crystal for unit testing',
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
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  describe('GET /api/cart', () => {
    it('should return empty cart for new session', async () => {
      const response = await request(app)
        .get('/api/cart')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.cart.items).toEqual([]);
      expect(response.body.data.cart.subtotal).toBe(0);
      expect(response.body.data.cart.itemCount).toBe(0);
      expect(response.body.data.cart.isEmpty).toBe(true);
    });
    
    it('should return cart with populated product details', async () => {
      const agent = request.agent(app);
      
      // Add item to cart first
      await agent
        .post('/api/cart/add')
        .send({ productId: testProduct._id, quantity: 2 })
        .expect(200);
      
      // Get cart
      const response = await agent
        .get('/api/cart')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.cart.items).toHaveLength(1);
      expect(response.body.data.cart.items[0].product.name).toBe('Test Crystal');
      expect(response.body.data.cart.items[0].quantity).toBe(2);
      expect(response.body.data.cart.items[0].subtotal).toBe(59.98);
      expect(response.body.data.cart.subtotal).toBe(59.98);
      expect(response.body.data.cart.itemCount).toBe(2);
      expect(response.body.data.cart.isEmpty).toBe(false);
      
      // Ensure wholesaler info is not exposed
      expect(response.body.data.cart.items[0].product.wholesaler).toBeUndefined();
    });
    
    it('should filter out inactive products from cart', async () => {
      const agent = request.agent(app);
      
      // Add item to cart
      await agent
        .post('/api/cart/add')
        .send({ productId: testProduct._id, quantity: 1 })
        .expect(200);
      
      // Deactivate product
      testProduct.isActive = false;
      await testProduct.save();
      
      // Get cart - should be empty now
      const response = await agent
        .get('/api/cart')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.cart.items).toEqual([]);
      expect(response.body.data.cart.isEmpty).toBe(true);
    });
  });
  
  describe('POST /api/cart/add', () => {
    it('should add new item to cart', async () => {
      const response = await request(app)
        .post('/api/cart/add')
        .send({ productId: testProduct._id, quantity: 1 })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Item added to cart');
      expect(response.body.data.cart.itemCount).toBe(1);
    });
    
    it('should update quantity for existing item', async () => {
      const agent = request.agent(app);
      
      // Add item first time
      await agent
        .post('/api/cart/add')
        .send({ productId: testProduct._id, quantity: 2 })
        .expect(200);
      
      // Add same item again
      const response = await agent
        .post('/api/cart/add')
        .send({ productId: testProduct._id, quantity: 3 })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.cart.itemCount).toBe(5); // 2 + 3
    });
    
    it('should reject invalid product ID', async () => {
      const response = await request(app)
        .post('/api/cart/add')
        .send({ productId: 'invalid-id', quantity: 1 })
        .expect(500); // Will fail on mongoose validation
    });
    
    it('should reject missing product ID', async () => {
      const response = await request(app)
        .post('/api/cart/add')
        .send({ quantity: 1 })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_PRODUCT_ID');
    });
    
    it('should reject invalid quantity', async () => {
      const response = await request(app)
        .post('/api/cart/add')
        .send({ productId: testProduct._id, quantity: 0 })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_QUANTITY');
    });
    
    it('should reject quantity over maximum', async () => {
      const response = await request(app)
        .post('/api/cart/add')
        .send({ productId: testProduct._id, quantity: 100 })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_QUANTITY');
    });
    
    it('should reject inactive product', async () => {
      testProduct.isActive = false;
      await testProduct.save();
      
      const response = await request(app)
        .post('/api/cart/add')
        .send({ productId: testProduct._id, quantity: 1 })
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
    
    it('should prevent exceeding maximum quantity when updating existing item', async () => {
      const agent = request.agent(app);
      
      // Add item with high quantity
      await agent
        .post('/api/cart/add')
        .send({ productId: testProduct._id, quantity: 98 })
        .expect(200);
      
      // Try to add more - should fail
      const response = await agent
        .post('/api/cart/add')
        .send({ productId: testProduct._id, quantity: 2 })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MAX_QUANTITY_EXCEEDED');
    });
  });
  
  describe('PUT /api/cart/update', () => {
    it('should update item quantity', async () => {
      const agent = request.agent(app);
      
      // Add item first
      await agent
        .post('/api/cart/add')
        .send({ productId: testProduct._id, quantity: 1 })
        .expect(200);
      
      // Update quantity
      const response = await agent
        .put('/api/cart/update')
        .send({ productId: testProduct._id, quantity: 5 })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Cart updated');
      expect(response.body.cartItemCount).toBe(5);
    });
    
    it('should remove item when quantity is 0', async () => {
      const agent = request.agent(app);
      
      // Add item first
      await agent
        .post('/api/cart/add')
        .send({ productId: testProduct._id, quantity: 1 })
        .expect(200);
      
      // Update quantity to 0
      const response = await agent
        .put('/api/cart/update')
        .send({ productId: testProduct._id, quantity: 0 })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Item removed from cart');
      expect(response.body.cartItemCount).toBe(0);
    });
    
    it('should reject missing product ID', async () => {
      const response = await request(app)
        .put('/api/cart/update')
        .send({ quantity: 1 })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_PRODUCT_ID');
    });
    
    it('should reject invalid quantity', async () => {
      const response = await request(app)
        .put('/api/cart/update')
        .send({ productId: testProduct._id, quantity: -1 })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_QUANTITY');
    });
    
    it('should return 404 for non-existent item', async () => {
      const response = await request(app)
        .put('/api/cart/update')
        .send({ productId: testProduct._id, quantity: 1 })
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });
  });
  
  describe('DELETE /api/cart/remove', () => {
    it('should remove item from cart', async () => {
      const agent = request.agent(app);
      
      // Add item first
      await agent
        .post('/api/cart/add')
        .send({ productId: testProduct._id, quantity: 3 })
        .expect(200);
      
      // Remove item
      const response = await agent
        .delete('/api/cart/remove')
        .send({ productId: testProduct._id })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Item removed from cart');
      expect(response.body.cartItemCount).toBe(0);
    });
    
    it('should reject missing product ID', async () => {
      const response = await request(app)
        .delete('/api/cart/remove')
        .send({})
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_PRODUCT_ID');
    });
    
    it('should return 404 for non-existent item', async () => {
      const response = await request(app)
        .delete('/api/cart/remove')
        .send({ productId: testProduct._id })
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });
  });
  
  describe('DELETE /api/cart/clear', () => {
    it('should clear entire cart', async () => {
      const agent = request.agent(app);
      
      // Add multiple items
      await agent
        .post('/api/cart/add')
        .send({ productId: testProduct._id, quantity: 2 })
        .expect(200);
      
      // Clear cart
      const response = await agent
        .delete('/api/cart/clear')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Cart cleared');
      expect(response.body.cartItemCount).toBe(0);
    });
    
    it('should work on empty cart', async () => {
      const response = await request(app)
        .delete('/api/cart/clear')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.cartItemCount).toBe(0);
    });
  });
});