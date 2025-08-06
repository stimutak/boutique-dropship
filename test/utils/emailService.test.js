// Clear the global mock for emailService to test the actual implementation
jest.unmock('../../utils/emailService');

// Mock nodemailer BEFORE importing emailService
jest.mock('nodemailer');

const nodemailer = require('nodemailer');
const { createAdminUserWithToken, createRegularUserWithToken } = require('../helpers/testSetup');

// Now require the email service after the mock is set up
const {
  sendOrderConfirmation,
  sendPaymentReceipt,
  sendOrderStatusUpdate,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendWholesalerNotification,
  sendEmail,
  emailTemplates
} = require('../../utils/emailService');

describe('Email Service', () => {
  let mockTransporter;

  beforeEach(() => {
    mockTransporter = {
      sendMail: jest.fn()
    };
    nodemailer.createTransport = jest.fn().mockReturnValue(mockTransporter);
    
    // Set up environment variables for tests
    process.env.EMAIL_HOST = 'smtp.test.com';
    process.env.EMAIL_PORT = '587';
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'testpass';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOrderConfirmation', () => {
    const mockOrderData = {
      orderNumber: 'ORD-123456',
      customerName: 'John Doe',
      items: [
        { productName: 'Crystal Healing Set', quantity: 2, price: 29.99 },
        { productName: 'Essential Oil Bundle', quantity: 1, price: 45.00 }
      ],
      total: 104.98,
      shippingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      }
    };

    it('should send order confirmation email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendOrderConfirmation('customer@example.com', mockOrderData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'customer@example.com',
        subject: 'Order Confirmation - ORD-123456',
        text: expect.stringContaining('Thank you for your order!'),
        html: expect.stringContaining('Order Confirmation')
      });
    });

    it('should handle email sending failure', async () => {
      const error = new Error('SMTP connection failed');
      mockTransporter.sendMail.mockRejectedValue(error);

      const result = await sendOrderConfirmation('customer@example.com', mockOrderData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP connection failed');
    });
  });

  describe('sendPaymentReceipt', () => {
    const mockPaymentData = {
      orderNumber: 'ORD-123456',
      customerName: 'John Doe',
      total: 104.98,
      paymentMethod: 'Credit Card',
      transactionId: 'txn_123456789',
      paidAt: new Date('2023-12-01T10:00:00Z')
    };

    it('should send payment receipt email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendPaymentReceipt('customer@example.com', mockPaymentData);

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'customer@example.com',
        subject: 'Payment Receipt - ORD-123456',
        text: expect.stringContaining('Your payment has been successfully processed!'),
        html: expect.stringContaining('Payment Receipt')
      });
    });
  });

  describe('sendOrderStatusUpdate', () => {
    const mockStatusData = {
      orderNumber: 'ORD-123456',
      customerName: 'John Doe',
      status: 'shipped',
      trackingNumber: 'TRK123456789'
    };

    it('should send order status update email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendOrderStatusUpdate('customer@example.com', mockStatusData);

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'customer@example.com',
        subject: 'Order Update - ORD-123456',
        text: expect.stringContaining('Great news! Your order has been shipped.'),
        html: expect.stringContaining('Order Update')
      });
    });

    it('should handle different order statuses', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const processingData = { ...mockStatusData, status: 'processing' };
      await sendOrderStatusUpdate('customer@example.com', processingData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Your order is being processed')
        })
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    const mockUserData = {
      firstName: 'John',
      email: 'john@example.com'
    };

    it('should send welcome email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendWelcomeEmail('john@example.com', mockUserData);

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'john@example.com',
        subject: 'Welcome to Our Holistic Store!',
        text: expect.stringContaining('Welcome to our holistic wellness community!'),
        html: expect.stringContaining('Welcome to Our Holistic Store!')
      });
    });
  });

  describe('sendPasswordResetEmail', () => {
    const mockResetData = {
      firstName: 'John',
      resetToken: 'reset-token-123',
      resetUrl: 'https://example.com/reset-password?token=reset-token-123'
    };

    it('should send password reset email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendPasswordResetEmail('john@example.com', mockResetData);

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'john@example.com',
        subject: 'Password Reset Request',
        text: expect.stringContaining('We received a request to reset your password'),
        html: expect.stringContaining('Password Reset Request')
      });
    });
  });

  describe('sendWholesalerNotification', () => {
    const mockOrderData = {
      orderNumber: 'ORD-123456',
      orderDate: '12/1/2023',
      shippingAddress: {
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US',
        phone: '555-1234'
      },
      items: [
        {
          wholesaler: { productCode: 'WS-CRYSTAL-001' },
          quantity: 2,
          productName: 'Crystal Healing Set'
        }
      ],
      notes: 'Handle with care'
    };

    it('should send wholesaler notification email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendWholesalerNotification('wholesaler@example.com', mockOrderData);

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'wholesaler@example.com',
        subject: 'New Order - ORD-123456',
        text: expect.stringContaining('We have received a new order that requires fulfillment')
      });
    });
  });

  describe('sendEmail (generic)', () => {
    it('should send generic email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendEmail(
        'recipient@example.com',
        'Test Subject',
        'Test message content',
        '<p>Test HTML content</p>'
      );

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test message content',
        html: '<p>Test HTML content</p>'
      });
    });

    it('should send text-only email when HTML is not provided', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendEmail(
        'recipient@example.com',
        'Test Subject',
        'Test message content'
      );

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test message content'
      });
    });
  });

  describe('Email Templates', () => {
    it('should generate order confirmation template correctly', () => {
      const orderData = {
        orderNumber: 'ORD-123456',
        customerName: 'John Doe',
        items: [{ productName: 'Test Product', quantity: 1, price: 29.99 }],
        total: 29.99,
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        }
      };

      const template = emailTemplates.orderConfirmation(orderData);

      expect(template.subject).toBe('Order Confirmation - ORD-123456');
      expect(template.text).toContain('Dear John Doe');
      expect(template.text).toContain('Order Number: ORD-123456');
      expect(template.html).toContain('Order Confirmation');
    });

    it('should generate payment receipt template correctly', () => {
      const paymentData = {
        orderNumber: 'ORD-123456',
        customerName: 'John Doe',
        total: 29.99,
        paymentMethod: 'Credit Card',
        transactionId: 'txn_123',
        paidAt: new Date('2023-12-01')
      };

      const template = emailTemplates.paymentReceipt(paymentData);

      expect(template.subject).toBe('Payment Receipt - ORD-123456');
      expect(template.text).toContain('Your payment has been successfully processed!');
      expect(template.html).toContain('Payment Receipt');
    });
  });
});