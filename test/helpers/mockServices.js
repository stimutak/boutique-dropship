// Mock all external services for testing

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(() => Promise.resolve({
      messageId: 'test-message-id',
      accepted: ['test@example.com'],
      rejected: []
    }))
  }))
}));

// Mock Mollie client
jest.mock('@mollie/api-client', () => ({
  createMollieClient: jest.fn(() => ({
    payments: {
      create: jest.fn(() => Promise.resolve({
        id: 'tr_test123',
        status: 'open',
        amount: { value: '10.00', currency: 'EUR' },
        description: 'Test payment',
        redirectUrl: 'https://example.com/return',
        webhookUrl: 'https://example.com/webhook',
        _links: {
          checkout: { href: 'https://checkout.mollie.com/test' }
        }
      })),
      get: jest.fn(() => Promise.resolve({
        id: 'tr_test123',
        status: 'paid',
        amount: { value: '10.00', currency: 'EUR' }
      })),
      list: jest.fn(() => Promise.resolve({
        _embedded: { payments: [] },
        count: 0
      }))
    },
    methods: {
      list: jest.fn(() => Promise.resolve([
        { id: 'card', description: 'Credit card' },
        { id: 'ideal', description: 'iDEAL' }
      ]))
    }
  }))
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock error recovery
jest.mock('../../utils/errorRecovery', () => ({
  getCircuitBreakerStatus: jest.fn(() => ({
    payment: { state: 'closed', failures: 0 },
    email: { state: 'closed', failures: 0 },
    wholesaler: { state: 'closed', failures: 0 }
  })),
  executeWithCircuitBreaker: jest.fn((service, operation) => operation())
}));

// Mock wholesaler notification service
jest.mock('../../utils/wholesalerNotificationService', () => ({
  sendOrderNotification: jest.fn(() => Promise.resolve({
    success: true,
    messageId: 'test-notification-id'
  })),
  retryFailedNotifications: jest.fn(() => Promise.resolve({
    success: true,
    retriedCount: 0
  }))
}));

// Mock email service
jest.mock('../../utils/emailService', () => ({
  sendWelcomeEmail: jest.fn(() => Promise.resolve({
    success: true,
    messageId: 'welcome-email-id'
  })),
  sendOrderConfirmation: jest.fn(() => Promise.resolve({
    success: true,
    messageId: 'order-confirmation-id'
  })),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve({
    success: true,
    messageId: 'password-reset-id'
  }))
}));

module.exports = {
  // Export mocked services for direct access in tests if needed
};