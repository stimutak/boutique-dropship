const request = require('supertest');
const express = require('express');
const _mongoose = require('mongoose');

// Mock email service BEFORE importing routes
const mockEmailService = {
  sendOrderConfirmation: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  sendPaymentReceipt: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  sendOrderStatusUpdate: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  sendWholesalerNotification: jest.fn().mockResolvedValue({ success: true, messageId: 'test-id' })
};

jest.mock('../../utils/emailService', () => mockEmailService);

const User = require('../../models/User');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const authRoutes = require('../../routes/auth');
const orderRoutes = require('../../routes/orders');
const paymentRoutes = require('../../routes/payments');

// Mock Mollie client
jest.mock('@mollie/api-client', () => ({
  createMollieClient: jest.fn(() => ({
    payments: {
      get: jest.fn().mockResolvedValue({
        id: 'tr_test123',
        status: 'paid',
        amount: { value: '29.99', currency: 'USD' },
        paidAt: '2023-12-01T10:00:00Z',
        details: { cardNumber: '**** 1234' }
      })
    }
  }))
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

describe('Email Integration Tests', () => {
  let testUser;
  let testProduct;
  let authToken;

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});
    await Order.deleteMany({});
    await Product.deleteMany({});
    
    // Clear mock calls
    jest.clearAllMocks();

    // Create test product
    testProduct = await Product.create({
      name: 'Test Crystal',
      slug: 'test-crystal',
      description: 'A test crystal for healing',
      shortDescription: 'Test crystal for healing',
      price: 29.99,
      category: 'crystals',
      isActive: true,
      wholesaler: {
        name: 'Test Wholesaler',
        email: 'wholesaler@test.com',
        productCode: 'WS-001',
        cost: 15.00
      }
    });

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      preferences: {
        notifications: true,
        emailPreferences: {
          orderConfirmations: true,
          paymentReceipts: true,
          orderUpdates: true,
          promotionalEmails: false,
          welcomeEmails: true
        }
      }
    });

    // Generate auth token
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET);
  });

  describe('User Registration Email', () => {
    it('should send welcome email on user registration', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'newuser@example.com',
        expect.objectContaining({
          firstName: 'New',
          email: 'newuser@example.com'
        })
      );
    });

    it('should not send welcome email if user opts out', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        preferences: {
          emailPreferences: {
            welcomeEmails: false
          }
        }
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(mockEmailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });
  });

  describe('Order Confirmation Emails', () => {
    it('should send order confirmation email for guest checkout', async () => {
      const orderData = {
        guestInfo: {
          email: 'guest@example.com',
          firstName: 'Guest',
          lastName: 'User'
        },
        items: [{
          productId: testProduct._id,
          quantity: 2
        }],
        shippingAddress: {
          firstName: 'Guest',
          lastName: 'User',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        },
        billingAddress: {
          firstName: 'Guest',
          lastName: 'User',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        }
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData);
      
      if (response.status !== 201) {
        // Debug: Guest checkout error - check response.status and response.body if needed
      }
      
      expect(response.status).toBe(201);

      expect(response.body.success).toBe(true);
      expect(mockEmailService.sendOrderConfirmation).toHaveBeenCalledWith(
        'guest@example.com',
        expect.objectContaining({
          customerName: 'Guest User',
          items: expect.arrayContaining([
            expect.objectContaining({
              productName: 'Test Crystal',
              quantity: 2,
              price: 29.99
            })
          ])
        })
      );
    });

    it('should send order confirmation email for registered user', async () => {
      const orderData = {
        items: [{
          productId: testProduct._id,
          quantity: 1
        }],
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        },
        billingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        }
      };

      const response = await request(app)
        .post('/api/orders/registered')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockEmailService.sendOrderConfirmation).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          customerName: 'Test User'
        })
      );
    });

    it('should not send order confirmation if user opts out', async () => {
      // Update user preferences
      testUser.preferences.emailPreferences.orderConfirmations = false;
      await testUser.save();

      const orderData = {
        items: [{
          productId: testProduct._id,
          quantity: 1
        }],
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        },
        billingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        }
      };

      await request(app)
        .post('/api/orders/registered')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      expect(mockEmailService.sendOrderConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('Payment Receipt and Wholesaler Notification Emails', () => {
    let testOrder;

    beforeEach(async () => {
      // Create test order
      testOrder = await Order.create({
        customer: testUser._id,
        items: [{
          product: testProduct._id,
          quantity: 1,
          price: 29.99,
          wholesaler: {
            name: 'Test Wholesaler',
            email: 'wholesaler@test.com',
            productCode: 'WS-001',
            notified: false
          }
        }],
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        },
        billingAddress: {
          firstName: 'Test',
          lastName: 'User',
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
          status: 'pending',
          molliePaymentId: 'tr_test123'
        }
      });
    });

    it('should send payment receipt and wholesaler notification on successful payment', async () => {
      const _response = await request(app)
        .post('/api/payments/webhook')
        .send({ id: 'tr_test123' })
        .expect(200);

      // Check payment receipt email
      expect(mockEmailService.sendPaymentReceipt).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          orderNumber: testOrder.orderNumber,
          customerName: 'Test User',
          total: 32.39,
          paymentMethod: 'Credit/Debit Card'
        })
      );

      // Check wholesaler notification
      expect(mockEmailService.sendWholesalerNotification).toHaveBeenCalledWith(
        'wholesaler@test.com',
        expect.objectContaining({
          orderNumber: testOrder.orderNumber,
          shippingAddress: expect.objectContaining({
            firstName: 'Test',
            lastName: 'User'
          })
        })
      );
    });

    it('should not send payment receipt if user opts out', async () => {
      // Update user preferences
      testUser.preferences.emailPreferences.paymentReceipts = false;
      await testUser.save();

      await request(app)
        .post('/api/payments/webhook')
        .send({ id: 'tr_test123' })
        .expect(200);

      expect(mockEmailService.sendPaymentReceipt).not.toHaveBeenCalled();
      // Wholesaler notification should still be sent
      expect(mockEmailService.sendWholesalerNotification).toHaveBeenCalled();
    });
  });

  describe('Order Status Update Emails', () => {
    let testOrder;

    beforeEach(async () => {
      testOrder = await Order.create({
        customer: testUser._id,
        items: [{
          product: testProduct._id,
          quantity: 1,
          price: 29.99,
          wholesaler: {
            name: 'Test Wholesaler',
            email: 'wholesaler@test.com',
            productCode: 'WS-001',
            notified: true
          }
        }],
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        },
        billingAddress: {
          firstName: 'Test',
          lastName: 'User',
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
        status: 'processing'
      });
    });

    it('should send order status update email when status changes', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .send({ 
          status: 'shipped',
          trackingNumber: 'TRK123456789'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockEmailService.sendOrderStatusUpdate).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          orderNumber: testOrder.orderNumber,
          customerName: 'Test User',
          status: 'shipped',
          trackingNumber: 'TRK123456789'
        })
      );
    });

    it('should not send status update email for pending status', async () => {
      await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .send({ status: 'pending' })
        .expect(200);

      expect(mockEmailService.sendOrderStatusUpdate).not.toHaveBeenCalled();
    });

    it('should not send status update email if user opts out', async () => {
      // Update user preferences
      testUser.preferences.emailPreferences.orderUpdates = false;
      await testUser.save();

      await request(app)
        .put(`/api/orders/${testOrder._id}/status`)
        .send({ status: 'shipped' })
        .expect(200);

      expect(mockEmailService.sendOrderStatusUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Password Reset Email', () => {
    it('should send password reset email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          firstName: 'Test',
          resetToken: expect.any(String),
          resetUrl: expect.stringContaining('reset-password')
        })
      );
    });

    it('should not send password reset email if user opts out of welcome emails', async () => {
      // Update user preferences (password reset uses welcomeEmails preference)
      testUser.preferences.emailPreferences.welcomeEmails = false;
      await testUser.save();

      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });
});