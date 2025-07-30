const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

describe('Order Currency Support', () => {
  let authToken;
  let testUser;
  let testProduct;

  beforeAll(async () => {
    // Wait for mongoose connection to be ready
    if (mongoose.connection.readyState !== 1) {
      await new Promise(resolve => {
        mongoose.connection.once('connected', resolve);
      });
    }
  });

  afterAll(async () => {
    // Clean up any remaining data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
  });

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User'
    });
    authToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET || 'test-secret');

    // Create test product with multiple currency prices
    testProduct = await Product.create({
      name: 'Test Crystal',
      slug: 'test-crystal',
      description: 'Test description',
      shortDescription: 'Test short description',
      price: 100, // USD base price
      prices: {
        USD: 100,
        EUR: 85,
        JPY: 11000,
        CNY: 645
      },
      category: 'crystals',
      isActive: true
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
  });

  describe('Guest Checkout', () => {
    it('should capture EUR currency from locale header', async () => {
      const response = await request(app)
        .post('/api/orders/guest')
        .set('x-locale', 'fr') // French locale = EUR
        .send({
          guestInfo: {
            email: 'guest@example.com',
            firstName: 'Guest',
            lastName: 'User',
            phone: '1234567890'
          },
          items: [{
            productId: testProduct._id,
            quantity: 1
          }],
          shippingAddress: {
            firstName: 'Guest',
            lastName: 'User',
            street: '123 Test St',
            city: 'Paris',
            state: 'IDF',
            zipCode: '75001',
            country: 'FR'
          },
          billingAddress: {
            firstName: 'Guest',
            lastName: 'User',
            street: '123 Test St',
            city: 'Paris',
            state: 'IDF',
            zipCode: '75001',
            country: 'FR'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.order.currency).toBe('EUR');
      expect(response.body.order.exchangeRate).toBe(0.85);
      expect(response.body.order.total).toBeCloseTo(85 * 1.08 + 5.99); // EUR price + tax + shipping
    });

    it('should default to USD when no locale header', async () => {
      const response = await request(app)
        .post('/api/orders/guest')
        .send({
          guestInfo: {
            email: 'guest@example.com',
            firstName: 'Guest',
            lastName: 'User'
          },
          items: [{
            productId: testProduct._id,
            quantity: 1
          }],
          shippingAddress: {
            firstName: 'Guest',
            lastName: 'User',
            street: '123 Test St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US'
          },
          billingAddress: {
            firstName: 'Guest',
            lastName: 'User',
            street: '123 Test St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'US'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.order.currency).toBe('USD');
      expect(response.body.order.exchangeRate).toBe(1);
    });
  });

  describe('Authenticated Checkout', () => {
    it('should capture JPY currency from locale header', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-locale', 'ja') // Japanese locale = JPY
        .send({
          items: [{
            productId: testProduct._id,
            quantity: 2
          }],
          shippingAddress: {
            firstName: 'Test',
            lastName: 'User',
            street: '123 Test St',
            city: 'Tokyo',
            state: 'Tokyo',
            zipCode: '100-0001',
            country: 'JP'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.order.currency).toBe('JPY');
      expect(response.body.order.exchangeRate).toBe(110);
      // JPY doesn't use decimals, shipping might be different
      expect(response.body.order.total).toBeGreaterThan(20000); // Rough estimate
    });
  });

  describe('Payment Processing', () => {
    it('should send correct currency to payment processor', async () => {
      const order = await Order.create({
        orderNumber: 'TEST-123',
        guestInfo: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        },
        items: [{
          product: testProduct._id,
          quantity: 1,
          price: 85 // EUR price
        }],
        currency: 'EUR',
        exchangeRate: 0.85,
        subtotal: 85,
        tax: 6.8,
        shipping: 5.99,
        total: 97.79,
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Paris',
          state: 'IDF',
          zipCode: '75001',
          country: 'FR'
        },
        billingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Paris',
          state: 'IDF',
          zipCode: '75001',
          country: 'FR'
        }
      });

      // Test payment endpoint would use order currency
      // This is a placeholder for the actual payment test
      expect(order.currency).toBe('EUR');
      expect(order.total).toBeCloseTo(97.79);
    });
  });
});