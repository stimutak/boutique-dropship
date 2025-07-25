/**
 * @jest-environment node
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Mock mongodb-memory-server to prevent library dependency issues
jest.mock('mongodb-memory-server', () => ({
  MongoMemoryServer: {
    create: jest.fn().mockResolvedValue({
      getUri: jest.fn().mockReturnValue('mongodb://localhost:27017/test'),
      stop: jest.fn().mockResolvedValue(true)
    })
  }
}));

// Mock mongoose before requiring models
jest.mock('mongoose', () => {
  const mockConnect = jest.fn().mockResolvedValue(true);
  const mockClose = jest.fn().mockResolvedValue(true);
  
  // Mock ObjectId constructor
  const MockObjectId = jest.fn();
  MockObjectId.toString = jest.fn().mockReturnValue('507f1f77bcf86cd799439011');
  
  const mockModel = (name) => {
    const MockedModel = jest.fn();
    
    // Create a chainable mock for select
    const createSelectableMock = (returnValue) => {
      const mock = jest.fn().mockResolvedValue(returnValue);
      mock.select = jest.fn().mockResolvedValue(returnValue);
      return mock;
    };
    
    // Static methods
    MockedModel.findById = jest.fn().mockImplementation((id) => {
      const mock = jest.fn().mockResolvedValue(null);
      mock.select = jest.fn().mockResolvedValue(null);
      return mock;
    });
    MockedModel.findOne = jest.fn();
    MockedModel.find = jest.fn();
    MockedModel.create = jest.fn();
    MockedModel.deleteMany = jest.fn();
    MockedModel.deleteOne = jest.fn();
    MockedModel.findByIdAndUpdate = jest.fn();
    
    // Instance methods
    MockedModel.prototype.save = jest.fn().mockResolvedValue(true);
    MockedModel.prototype.toObject = jest.fn().mockReturnValue({});
    MockedModel.prototype.toPublicJSON = jest.fn().mockReturnValue({});
    
    return MockedModel;
  };
  
  // Mock Schema constructor
  const MockSchema = jest.fn().mockImplementation((definition, options) => {
    const schema = {
      index: jest.fn(),
      methods: {},
      statics: {},
      pre: jest.fn(),
      post: jest.fn(),
      plugin: jest.fn()
    };
    return schema;
  });
  
  // Set up Schema.Types
  MockSchema.Types = {
    ObjectId: MockObjectId,
    String: String,
    Number: Number,
    Date: Date,
    Boolean: Boolean,
    Array: Array,
    Mixed: Object
  };
  
  return {
    connect: mockConnect,
    connection: {
      close: mockClose,
      readyState: 1,
      collections: {}
    },
    model: mockModel,
    Schema: MockSchema
  };
});

// Import models after mocking mongoose
const Product = require('../../models/Product');
const User = require('../../models/User');
const Cart = require('../../models/Cart');
const cartRoutes = require('../../routes/cart');

// Mock the auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = null; // Default to guest user
    next();
  }
}));

// Mock the CSRF middleware
jest.mock('../../middleware/sessionCSRF', () => ({
  validateCSRFToken: (req, res, next) => {
    next(); // Skip CSRF validation in tests
  }
}));

// Mock auth service (removed cartService mock as it no longer exists)
// The services were deleted during cleanup

// Removed cartService require as the services directory was deleted

// Create test app
const createTestApp = () => {
  const app = express();
  
  // Session middleware for testing
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: false,
      httpOnly: false,
      maxAge: 1000 * 60 * 60
    }
  }));
  
  app.use(express.json());
  app.use('/api/cart', cartRoutes);
  
  return app;
};

describe('Cart Routes', () => {
  let app;
  let testProduct;
  let testCart;
  
  beforeAll(async () => {
    app = createTestApp();
  });
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock test product
    testProduct = {
      _id: '507f1f77bcf86cd799439011',
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
      },
      toPublicJSON: () => ({
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Crystal',
        price: 29.99,
        category: 'crystals',
        isActive: true
      })
    };
    
    // Mock test cart
    testCart = {
      _id: '507f1f77bcf86cd799439012',
      sessionId: 'guest_test_session',
      items: [],
      save: jest.fn().mockResolvedValue(true),
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateItem: jest.fn()
    };
    
    // Setup default Product model mocks
    Product.deleteMany = jest.fn().mockResolvedValue(true);
    Product.create = jest.fn().mockResolvedValue(testProduct);
    
    // Create a comprehensive findById mock that handles both direct calls and select chaining
    Product.findById = jest.fn().mockImplementation((id) => {
      // Create a promise-like object that can be awaited directly OR has a select method
      const result = {
        // For direct await
        then: (onResolve, onReject) => Promise.resolve(testProduct).then(onResolve, onReject),
        // For select chaining
        select: jest.fn().mockResolvedValue({
          ...testProduct,
          toPublicJSON: testProduct.toPublicJSON
        })
      };
      return result;
    });
    
    // Setup default Cart model mocks
    Cart.findOne = jest.fn().mockResolvedValue(testCart);
    Cart.find = jest.fn().mockResolvedValue([testCart]); // Return array for cleanup logic
    Cart.prototype.save = jest.fn().mockResolvedValue(true);
    Cart.deleteOne = jest.fn().mockResolvedValue(true);
    Cart.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
    Cart.findByIdAndUpdate = jest.fn().mockResolvedValue(testCart);
    Cart.findOneAndUpdate = jest.fn().mockResolvedValue(testCart);
    
    // Mock Cart constructor more completely
    Cart.mockImplementation = jest.fn().mockImplementation((data) => ({
      ...testCart,
      ...data,
      save: jest.fn().mockResolvedValue(true)
    }));
    
    // Set up Cart as a constructor function
    global.Cart = jest.fn().mockImplementation((data) => ({
      ...testCart,
      ...data,
      save: jest.fn().mockResolvedValue(true)
    }));
    
    // Also assign the static methods to the global Cart
    global.Cart.findOne = Cart.findOne;
    global.Cart.find = Cart.find;
    global.Cart.deleteOne = Cart.deleteOne;
    global.Cart.deleteMany = Cart.deleteMany;
    global.Cart.findByIdAndUpdate = Cart.findByIdAndUpdate;
    global.Cart.findOneAndUpdate = Cart.findOneAndUpdate;
    
    // Setup cart service mocks
    cartService.getCartWithPerformanceOptimization.mockImplementation(async (req) => ({
      type: 'guest',
      cart: testCart,
      sessionId: 'guest_test_session'
    }));
    
    cartService.updateCartOptimistically.mockResolvedValue({
      duration: 0,
      performance: 'test'
    });
  });
  
  describe('GET /api/cart', () => {
    it('should return empty cart for new session', async () => {
      // Mock empty cart
      const emptyCart = { ...testCart, items: [] };
      cartService.getCartWithPerformanceOptimization.mockResolvedValue({
        type: 'guest',
        cart: emptyCart,
        sessionId: 'guest_test_session'
      });
      
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
      // Mock cart with items
      const cartWithItems = {
        ...testCart,
        items: [{
          product: testProduct._id,
          quantity: 2,
          price: 29.99,
          addedAt: new Date()
        }]
      };
      
      cartService.getCartWithPerformanceOptimization.mockResolvedValue({
        type: 'guest',
        cart: cartWithItems,
        sessionId: 'guest_test_session'
      });
      
      const response = await request(app)
        .get('/api/cart')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.cart.items).toHaveLength(1);
      expect(response.body.data.cart.items[0].product.name).toBe('Test Crystal');
      expect(response.body.data.cart.items[0].quantity).toBe(2);
      expect(response.body.data.cart.itemCount).toBe(2);
      expect(response.body.data.cart.isEmpty).toBe(false);
    });
    
    it('should filter out inactive products from cart', async () => {
      // Mock inactive product
      const inactiveProduct = { ...testProduct, isActive: false };
      Product.findById = jest.fn().mockImplementation((id) => ({
        select: jest.fn().mockResolvedValue(inactiveProduct)
      }));
      
      // Mock cart with items
      const cartWithItems = {
        ...testCart,
        items: [{
          product: testProduct._id,
          quantity: 1,
          price: 29.99
        }]
      };
      
      cartService.getCartWithPerformanceOptimization.mockResolvedValue({
        type: 'guest',
        cart: cartWithItems,
        sessionId: 'guest_test_session'
      });
      
      const response = await request(app)
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
    });
    
    it('should reject invalid product ID', async () => {
      const response = await request(app)
        .post('/api/cart/add')
        .send({ productId: 'invalid-id', quantity: 1 })
        .expect(400);
        
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PRODUCT_ID');
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
      // Mock inactive product
      const inactiveProduct = { ...testProduct, isActive: false };
      Product.findById = jest.fn().mockResolvedValue(inactiveProduct);
      
      const response = await request(app)
        .post('/api/cart/add')
        .send({ productId: testProduct._id, quantity: 1 })
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
    
    it('should reject product not found', async () => {
      Product.findById = jest.fn().mockResolvedValue(null);
      
      const response = await request(app)
        .post('/api/cart/add')
        .send({ productId: testProduct._id, quantity: 1 })
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });
  
  describe('PUT /api/cart/update', () => {
    it('should update item quantity', async () => {
      // Mock cart with existing item
      const cartWithItems = {
        ...testCart,
        items: [{ product: testProduct._id, quantity: 1, price: 29.99 }]
      };
      
      // Mock getOrCreateCart by overriding Cart.findOne to return cart with items
      Cart.findOne = jest.fn().mockResolvedValue(cartWithItems);
      
      cartService.getCartWithPerformanceOptimization
        .mockResolvedValueOnce({
          type: 'guest',
          cart: cartWithItems,
          sessionId: 'guest_test_session'
        })
        .mockResolvedValueOnce({
          type: 'guest',
          cart: { ...cartWithItems, items: [{ product: testProduct._id, quantity: 5, price: 29.99 }] },
          sessionId: 'guest_test_session'
        });
      
      const response = await request(app)
        .put('/api/cart/update')
        .send({ productId: testProduct._id, quantity: 5 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Cart updated');
    });
    
    it('should remove item when quantity is 0', async () => {
      // Mock cart with existing item
      const cartWithItems = {
        ...testCart,
        items: [{ product: testProduct._id, quantity: 1, price: 29.99 }]
      };
      
      // Mock getOrCreateCart by overriding Cart.findOne to return cart with items
      Cart.findOne = jest.fn().mockResolvedValue(cartWithItems);
      
      cartService.getCartWithPerformanceOptimization
        .mockResolvedValueOnce({
          type: 'guest',
          cart: cartWithItems,
          sessionId: 'guest_test_session'
        })
        .mockResolvedValueOnce({
          type: 'guest',
          cart: { ...cartWithItems, items: [] },
          sessionId: 'guest_test_session'
        });
      
      const response = await request(app)
        .put('/api/cart/update')
        .send({ productId: testProduct._id, quantity: 0 })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Item removed from cart');
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
      // Mock empty cart
      Cart.findOne = jest.fn().mockResolvedValue({ ...testCart, items: [] });
      
      cartService.getCartWithPerformanceOptimization.mockResolvedValue({
        type: 'guest',
        cart: { ...testCart, items: [] },
        sessionId: 'guest_test_session'
      });
      
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
      // Mock cart with existing item
      const cartWithItems = {
        ...testCart,
        items: [{ product: testProduct._id, quantity: 3, price: 29.99 }]
      };
      
      // Mock getOrCreateCart by overriding Cart.findOne to return cart with items
      Cart.findOne = jest.fn().mockResolvedValue(cartWithItems);
      
      cartService.getCartWithPerformanceOptimization
        .mockResolvedValueOnce({
          type: 'guest',
          cart: cartWithItems,
          sessionId: 'guest_test_session'
        })
        .mockResolvedValueOnce({
          type: 'guest',
          cart: { ...cartWithItems, items: [] },
          sessionId: 'guest_test_session'
        });
      
      const response = await request(app)
        .delete('/api/cart/remove')
        .send({ productId: testProduct._id })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Item removed from cart');
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
      // Mock empty cart
      Cart.findOne = jest.fn().mockResolvedValue({ ...testCart, items: [] });
      
      cartService.getCartWithPerformanceOptimization.mockResolvedValue({
        type: 'guest',
        cart: { ...testCart, items: [] },
        sessionId: 'guest_test_session'
      });
      
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
      // Mock cart with items
      const cartWithItems = {
        ...testCart,
        items: [{ product: testProduct._id, quantity: 2, price: 29.99 }]
      };
      
      cartService.getCartWithPerformanceOptimization.mockResolvedValue({
        type: 'guest',
        cart: cartWithItems,
        sessionId: 'guest_test_session'
      });
      
      Cart.deleteOne = jest.fn().mockResolvedValue(true);
      Cart.prototype.constructor = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(true)
      }));
      
      const response = await request(app)
        .delete('/api/cart/clear')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Cart cleared');
      expect(response.body.cartItemCount).toBe(0);
    });
    
    it('should work on empty cart', async () => {
      // Mock empty cart
      cartService.getCartWithPerformanceOptimization.mockResolvedValue({
        type: 'guest',
        cart: { ...testCart, items: [] },
        sessionId: 'guest_test_session'
      });
      
      const response = await request(app)
        .delete('/api/cart/clear')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.cartItemCount).toBe(0);
    });
  });
});