const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../server');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Test user data
const testUser = {
  email: 'testuser@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  phone: '1234567890'
};

const testProduct = {
  name: 'Test Product',
  slug: 'test-product',
  description: 'Test product description',
  shortDescription: 'Short test description',
  price: 29.99,
  category: 'crystals',
  images: [{
    url: 'test.jpg',
    alt: 'Test image',
    isPrimary: true
  }],
  isActive: true,
  wholesaler: {
    name: 'Test Wholesaler',
    email: 'wholesaler@example.com',
    productCode: 'TEST001',
    cost: 15.00
  }
};

describe('GitHub Issues Reproduction Tests', () => {
  let product;
  let validToken;
  let invalidToken;
  let sessionCookie;
  let server;

  beforeAll(async () => {
    // Don't reconnect if already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store-test', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }

    // Clean up database
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    // Create test product
    product = await Product.create(testProduct);

    // Generate invalid token
    invalidToken = jwt.sign({ userId: '123456789012345678901234' }, 'wrongsecret');
  });

  afterAll(async () => {
    // Don't close the connection that server.js is using
    // await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up users before each test
    await User.deleteMany({});
    await Order.deleteMany({});
  });

  // Issue #13: "placing an order as logged in says you must be logged in to checkout"
  describe('Issue #13: Order placement as logged-in user', () => {
    beforeEach(async () => {
      // Create and login user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      validToken = registerRes.body.data.token;
    });

    test('FAILING: Should allow logged-in user to place order without authentication error', async () => {
      // Add item to cart
      await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          productId: product._id,
          quantity: 1
        });

      // Place order
      const orderData = {
        items: [{
          productId: product._id,
          quantity: 1,
          price: product.price
        }],
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        },
        billingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        }
      };

      const response = await request(app)
        .post('/api/orders/registered')
        .set('Authorization', `Bearer ${validToken}`)
        .send(orderData);

      expect(response.status).not.toBe(401);
      expect(response.body.error?.message).not.toContain('must be logged in');
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  // Issue #12: "logging in says cannot sync with ? and then acts as if logged in but without name"
  describe('Issue #12: Login sync error', () => {
    test('FAILING: Should properly sync user data after login', async () => {
      // Register user
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.user).toBeDefined();
      expect(loginRes.body.data.user.firstName).toBe(testUser.firstName);
      expect(loginRes.body.data.user.lastName).toBe(testUser.lastName);
      
      // Verify token works
      const profileRes = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${loginRes.body.data.token}`);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.user.firstName).toBe(testUser.firstName);
    });
  });

  // Issue #11: "registering presents itself as logged in but unable to do anything"
  describe('Issue #11: Registration login state', () => {
    test('FAILING: Should be fully logged in after registration', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(registerRes.status).toBe(201);
      expect(registerRes.body.data.token).toBeDefined();
      expect(registerRes.body.data.user).toBeDefined();

      const token = registerRes.body.data.token;

      // Should be able to access protected routes
      const profileRes = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.success).toBe(true);

      // Should be able to add to cart
      const cartRes = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product._id,
          quantity: 1
        });

      expect(cartRes.status).toBe(200);
      expect(cartRes.body.success).toBe(true);
    });
  });

  // Issue #10: "bad login presents as logged in without being able to do anything"
  describe('Issue #10: Bad login state', () => {
    test('FAILING: Should not appear logged in after failed login', async () => {
      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Try bad login
      const badLoginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(badLoginRes.status).toBe(401);
      expect(badLoginRes.body.success).toBe(false);
      expect(badLoginRes.body.data?.token).toBeUndefined();
      expect(badLoginRes.body.data?.user).toBeUndefined();
    });
  });

  // Issue #9: "trying to update profile presents login screen even when logged in"
  describe('Issue #9: Profile update authentication', () => {
    beforeEach(async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      validToken = registerRes.body.data.token;
    });

    test('FAILING: Should allow profile update without re-authentication', async () => {
      const updateRes = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name'
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.user.firstName).toBe('Updated');
      
      // Should still be authenticated after update
      const profileRes = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.user.firstName).toBe('Updated');
    });
  });

  // Issue #8 & #7: Guest checkout issues
  describe('Issues #8 & #7: Guest checkout', () => {
    test('FAILING: Should allow guest checkout', async () => {
      const guestOrderData = {
        guestInfo: {
          email: 'guest@example.com',
          firstName: 'Guest',
          lastName: 'User',
          phone: '9876543210'
        },
        items: [{
          productId: product._id,
          quantity: 1,
          price: product.price
        }],
        shippingAddress: {
          firstName: 'Guest',
          lastName: 'User',
          street: '456 Guest Ave',
          city: 'Guest City',
          state: 'GS',
          zipCode: '54321',
          country: 'US'
        },
        billingAddress: {
          firstName: 'Guest',
          lastName: 'User',
          street: '456 Guest Ave',
          city: 'Guest City',
          state: 'GS',
          zipCode: '54321',
          country: 'US'
        }
      };

      const response = await request(app)
        .post('/api/orders')
        .send(guestOrderData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.order).toBeDefined();
      expect(response.body.order._id).toBeDefined();
    });
  });

  // Issue #6 & #4: Profile and address management
  describe('Issues #6 & #4: Profile and address management', () => {
    beforeEach(async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      validToken = registerRes.body.data.token;
    });

    test('FAILING: Should update profile without issues', async () => {
      const updateData = {
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        phone: '5555555555'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe('UpdatedFirst');
    });

    test('FAILING: Should add address to profile', async () => {
      const addressData = {
        type: 'shipping',
        firstName: 'Test',
        lastName: 'User',
        street: '789 Address St',
        city: 'Address City',
        state: 'AS',
        zipCode: '11111',
        country: 'US',
        isDefault: true
      };

      const response = await request(app)
        .post('/api/auth/addresses')
        .set('Authorization', `Bearer ${validToken}`)
        .send(addressData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user.addresses).toHaveLength(1);
      expect(response.body.user.addresses[0].street).toBe('789 Address St');
    });
  });

  // Issues #5, #3: Cart persistence
  describe('Issues #5 & #3: Cart persistence', () => {
    let userId;

    beforeEach(async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      validToken = registerRes.body.data.token;
      userId = registerRes.body.data.user._id;
    });

    test('FAILING: Should persist cart for registered users', async () => {
      // Add item to cart
      const addRes = await request(app)
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          productId: product._id,
          quantity: 2
        });

      expect(addRes.status).toBe(200);

      // Simulate new session - get cart
      const cartRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${validToken}`);

      expect(cartRes.status).toBe(200);
      expect(cartRes.body.data.items).toHaveLength(1);
      expect(cartRes.body.data.items[0].quantity).toBe(2);
      expect(cartRes.body.data.items[0].product._id).toBe(product._id.toString());
    });

    test('FAILING: Guest cart should merge on login', async () => {
      // Add items as guest
      const guestRes = await request(app)
        .post('/api/cart/add')
        .send({
          productId: product._id,
          quantity: 1
        });

      const sessionId = guestRes.headers['x-session-id'];
      expect(sessionId).toBeDefined();

      // Login with existing user
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('x-session-id', sessionId)
        .send({
          email: testUser.email,
          password: testUser.password,
          guestCartItems: [{
            productId: product._id,
            quantity: 1
          }]
        });

      expect(loginRes.status).toBe(200);

      // Check cart after login
      const cartRes = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${loginRes.body.data.token}`);

      expect(cartRes.body.data.items).toHaveLength(1);
      expect(cartRes.body.data.items[0].quantity).toBe(1);
    });
  });
});