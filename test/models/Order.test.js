const _mongoose = require('mongoose');
const Order = require('../../models/Order');
const User = require('../../models/User');
const Product = require('../../models/Product');
const { createAdminUserWithToken, createRegularUserWithToken } = require('../helpers/testSetup');

describe('Order Model', () => {
  let testUser, testProduct;

  beforeEach(async () => {

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe'
    });

    // Create test product
    testProduct = await Product.create({
      name: 'Test Crystal',
      slug: 'test-crystal',
      description: 'Test description',
      shortDescription: 'Test short description',
      price: 25.00,
      category: 'crystals',
      wholesaler: {
        name: 'Test Wholesaler',
        email: 'wholesaler@test.com',
        productCode: 'TEST-001',
        cost: 12.50
      }
    });
  });

  describe('Order Creation', () => {
    test('should create order with registered user', async () => {
      const orderData = {
        customer: testUser._id,
        items: [{
          product: testProduct._id,
          quantity: 2,
          price: 25.00,
          wholesaler: {
            name: testProduct.wholesaler.name,
            email: testProduct.wholesaler.email,
            productCode: testProduct.wholesaler.productCode
          }
        }],
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        },
        billingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        },
        subtotal: 50.00,
        total: 50.00,
        payment: {
          method: 'card',
          status: 'pending'
        }
      };

      const order = new Order(orderData);
      const savedOrder = await order.save();

      expect(savedOrder.customer).toEqual(testUser._id);
      expect(savedOrder.orderNumber).toMatch(/^ORD-/);
      expect(savedOrder.items[0].wholesaler.notified).toBe(false);
      expect(savedOrder.items[0].wholesaler.notificationAttempts).toBe(0);
    });

    test('should create order with guest checkout', async () => {
      const orderData = {
        guestInfo: {
          email: 'guest@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '555-1234'
        },
        items: [{
          product: testProduct._id,
          quantity: 1,
          price: 25.00,
          wholesaler: {
            name: testProduct.wholesaler.name,
            email: testProduct.wholesaler.email,
            productCode: testProduct.wholesaler.productCode
          }
        }],
        shippingAddress: {
          firstName: 'Jane',
          lastName: 'Smith',
          street: '456 Oak Ave',
          city: 'Somewhere',
          state: 'NY',
          zipCode: '67890',
          country: 'US'
        },
        billingAddress: {
          firstName: 'Jane',
          lastName: 'Smith',
          street: '456 Oak Ave',
          city: 'Somewhere',
          state: 'NY',
          zipCode: '67890',
          country: 'US'
        },
        subtotal: 25.00,
        total: 25.00,
        payment: {
          method: 'crypto',
          status: 'pending'
        }
      };

      const order = new Order(orderData);
      const savedOrder = await order.save();

      expect(savedOrder.customer).toBeUndefined();
      expect(savedOrder.guestInfo.email).toBe('guest@example.com');
      expect(savedOrder.orderNumber).toMatch(/^ORD-/);
    });
  });

  describe('Validation', () => {
    test('should require guest info when no customer is provided', async () => {
      const orderData = {
        items: [{
          product: testProduct._id,
          quantity: 1,
          price: 25.00
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
        },
        subtotal: 25.00,
        total: 25.00,
        payment: {
          method: 'card'
        }
      };

      const order = new Order(orderData);
      await expect(order.save()).rejects.toThrow();
    });
  });

  describe('Wholesaler Notification Methods', () => {
    let testOrder;

    beforeEach(async () => {
      testOrder = await Order.create({
        guestInfo: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        },
        items: [{
          product: testProduct._id,
          quantity: 1,
          price: 25.00,
          wholesaler: {
            name: 'Test Wholesaler',
            email: 'wholesaler@test.com',
            productCode: 'TEST-001'
          }
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
        },
        subtotal: 25.00,
        total: 25.00,
        payment: {
          method: 'card',
          status: 'paid'
        }
      });
    });

    test('allWholesalersNotified should return false initially', () => {
      expect(testOrder.allWholesalersNotified()).toBe(false);
    });

    test('getPendingNotifications should return all items initially', () => {
      const pending = testOrder.getPendingNotifications();
      expect(pending).toHaveLength(1);
      expect(pending[0].wholesaler.notified).toBe(false);
    });

    test('updateWholesalerNotification should update notification status', async () => {
      const itemId = testOrder.items[0]._id;
      await testOrder.updateWholesalerNotification(itemId, true);
      
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.items[0].wholesaler.notified).toBe(true);
      expect(updatedOrder.items[0].wholesaler.notifiedAt).toBeDefined();
      expect(updatedOrder.items[0].wholesaler.notificationAttempts).toBe(1);
    });

    test('updateWholesalerNotification should handle failures', async () => {
      const itemId = testOrder.items[0]._id;
      await testOrder.updateWholesalerNotification(itemId, false, 'Network error');
      
      const updatedOrder = await Order.findById(testOrder._id);
      expect(updatedOrder.items[0].wholesaler.notified).toBe(false);
      expect(updatedOrder.items[0].wholesaler.lastNotificationError).toBe('Network error');
      expect(updatedOrder.items[0].wholesaler.notificationAttempts).toBe(1);
    });

    test('findPendingNotifications should find orders needing notification', async () => {
      const pendingOrders = await Order.findPendingNotifications();
      expect(pendingOrders).toHaveLength(1);
      expect(pendingOrders[0]._id).toEqual(testOrder._id);
    });
  });

  describe('Customer Methods', () => {
    test('getCustomerEmail should work for registered users', async () => {
      const order = await Order.create({
        customer: testUser._id,
        items: [{
          product: testProduct._id,
          quantity: 1,
          price: 25.00
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
        },
        subtotal: 25.00,
        total: 25.00,
        payment: {
          method: 'card'
        }
      });

      await order.populate('customer');
      expect(order.getCustomerEmail()).toBe('test@example.com');
    });

    test('getCustomerEmail should work for guest users', async () => {
      const order = await Order.create({
        guestInfo: {
          email: 'guest@example.com',
          firstName: 'Guest',
          lastName: 'User'
        },
        items: [{
          product: testProduct._id,
          quantity: 1,
          price: 25.00
        }],
        shippingAddress: {
          firstName: 'Guest',
          lastName: 'User',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        },
        billingAddress: {
          firstName: 'Guest',
          lastName: 'User',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        },
        subtotal: 25.00,
        total: 25.00,
        payment: {
          method: 'card'
        }
      });

      expect(order.getCustomerEmail()).toBe('guest@example.com');
    });
  });

  describe('Data Privacy', () => {
    test('toPublicJSON should exclude sensitive wholesaler information', async () => {
      const order = await Order.create({
        guestInfo: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        },
        items: [{
          product: testProduct._id,
          quantity: 1,
          price: 25.00,
          wholesaler: {
            name: 'Secret Wholesaler',
            email: 'secret@wholesaler.com',
            productCode: 'SECRET-001',
            notified: true,
            notifiedAt: new Date()
          }
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
        },
        subtotal: 25.00,
        total: 25.00,
        payment: {
          method: 'card'
        }
      });

      const publicData = order.toPublicJSON();
      
      expect(publicData.guestInfo.email).toBe('test@example.com');
      expect(publicData.items[0].wholesaler.notified).toBe(true);
      expect(publicData.items[0].wholesaler.notifiedAt).toBeDefined();
      expect(publicData.items[0].wholesaler.name).toBeUndefined();
      expect(publicData.items[0].wholesaler.email).toBeUndefined();
      expect(publicData.items[0].wholesaler.productCode).toBeUndefined();
    });
  });
});