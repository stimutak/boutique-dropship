const {
  sendOrderConfirmation,
  sendWelcomeEmail,
  sendPaymentReceipt,
  emailTemplates
} = require('../../utils/emailService');

describe('Email Service Unit Tests', () => {
  // Mock environment variables
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Email Service Configuration', () => {
    test('should skip emails when not configured', async () => {
      // Remove email configuration
      delete process.env.EMAIL_HOST;
      delete process.env.EMAIL_USER;

      const result = await sendOrderConfirmation('test@example.com', {
        orderNumber: 'TEST-123',
        customerName: 'Test User',
        items: [],
        total: 100,
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        }
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email skipped - not configured');
    });

    test('should handle email sending errors gracefully', async () => {
      // Set up email config
      process.env.EMAIL_HOST = 'smtp.test.com';
      process.env.EMAIL_USER = 'test@test.com';
      process.env.EMAIL_PASS = 'testpass';

      // Email will fail because the SMTP server doesn't exist
      const result = await sendWelcomeEmail('test@example.com', {
        firstName: 'Test',
        email: 'test@example.com'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Email Templates', () => {
    test('should generate order confirmation template', () => {
      const orderData = {
        orderNumber: 'ORD-12345',
        customerName: 'John Doe',
        items: [
          { productName: 'Crystal', quantity: 2, price: 29.99 },
          { productName: 'Essential Oil', quantity: 1, price: 19.99 }
        ],
        total: 79.97,
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          city: 'Paris',
          state: 'IDF',
          zipCode: '75001',
          country: 'FR'
        }
      };

      const template = emailTemplates.orderConfirmation(orderData);
      
      expect(template.subject).toBe('Order Confirmation - ORD-12345');
      expect(template.text).toContain('John Doe');
      expect(template.text).toContain('Crystal (Qty: 2) - $29.99');
      expect(template.text).toContain('Essential Oil (Qty: 1) - $19.99');
      expect(template.text).toContain('$79.97');
      expect(template.html).toContain('<h2');
      expect(template.html).toContain('Order Confirmation');
    });

    test('should generate payment receipt template', () => {
      const paymentData = {
        orderNumber: 'ORD-12345',
        customerName: 'Jane Smith',
        total: 99.99,
        paymentMethod: 'Credit Card',
        transactionId: 'TXN-98765',
        paidAt: new Date('2024-01-15')
      };

      const template = emailTemplates.paymentReceipt(paymentData);
      
      expect(template.subject).toBe('Payment Receipt - ORD-12345');
      expect(template.text).toContain('Jane Smith');
      expect(template.text).toContain('$99.99');
      expect(template.text).toContain('TXN-98765');
      expect(template.html).toContain('Payment Receipt');
    });

    test('should generate welcome email template', () => {
      const userData = {
        firstName: 'Alice',
        email: 'alice@example.com'
      };

      const template = emailTemplates.welcomeEmail(userData);
      
      expect(template.subject).toBe('Welcome to Our Holistic Store!');
      expect(template.text).toContain('Dear Alice');
      expect(template.text).toContain('holistic wellness community');
      expect(template.html).toContain('Welcome to Our Holistic Store!');
    });

    test('should generate order status update template', () => {
      const statusData = {
        orderNumber: 'ORD-12345',
        customerName: 'Bob Johnson',
        status: 'shipped',
        trackingNumber: 'TRACK-123456'
      };

      const template = emailTemplates.orderStatusUpdate(statusData);
      
      expect(template.subject).toBe('Order Update - ORD-12345');
      expect(template.text).toContain('Bob Johnson');
      expect(template.text).toContain('Status: Shipped');
      expect(template.text).toContain('Your order has been shipped');
      expect(template.text).toContain('TRACK-123456');
    });

    test('should generate password reset template', () => {
      const resetData = {
        firstName: 'Charlie',
        resetToken: 'reset-token-123',
        resetUrl: 'https://example.com/reset?token=reset-token-123'
      };

      const template = emailTemplates.passwordReset(resetData);
      
      expect(template.subject).toBe('Password Reset Request');
      expect(template.text).toContain('Dear Charlie');
      expect(template.text).toContain(resetData.resetUrl);
      expect(template.text).toContain('expire in 1 hour');
      expect(template.html).toContain('Reset Password');
    });
  });
});