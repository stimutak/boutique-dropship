const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const cookieParser = require('cookie-parser');

// Mock Mollie client before importing routes
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

// Import middleware
const { globalErrorHandler } = require('../../middleware/errorHandler');
const { i18nMiddleware } = require('../../utils/i18n');
const { errorResponse } = require('../../utils/errorHandler');
const { authenticateToken } = require('../../middleware/auth');

// Import routes
const authRoutes = require('../../routes/auth');
const productRoutes = require('../../routes/products');
const cartRoutes = require('../../routes/cart');
const orderRoutes = require('../../routes/orders');
const paymentRoutes = require('../../routes/payments');
const adminRoutes = require('../../routes/admin');
const wholesalerRoutes = require('../../routes/wholesalers');
const integrationRoutes = require('../../routes/integration');
const monitoringRoutes = require('../../routes/monitoring');
const reviewRoutes = require('../../routes/reviews');

// Create test app without starting server
function createTestApp() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }));

  // Rate limiting (more lenient for tests)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Higher limit for tests
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.'
      }
    }
  });
  app.use(limiter);

  // Session middleware for cart functionality and CSRF
  app.use(session({
    secret: 'test-session-secret',
    resave: false,
    saveUninitialized: true, // Important for CSRF token generation
    cookie: { secure: false } // Set to false for testing
  }));
  
  // Generate CSRF token for test requests
  app.use((req, res, next) => {
    if (!req.session.csrfToken) {
      req.session.csrfToken = 'test-csrf-token'; // Use fixed token for tests
    }
    next();
  });

  // Body parsing middleware with error handling
  app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf);
      } catch (e) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON format'
          }
        });
        throw new Error('Invalid JSON');
      }
    }
  }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Cookie parser middleware
  app.use(cookieParser());

  // i18n middleware for error messages
  app.use(i18nMiddleware);

  // Error response helper middleware
  app.use(errorResponse);

  // Authentication middleware for testing
  app.use(authenticateToken);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/wholesalers', wholesalerRoutes);
  app.use('/api/integration', integrationRoutes);
  app.use('/api/monitoring', monitoringRoutes);
  app.use('/api/reviews', reviewRoutes);

  // Error handling middleware
  app.use(globalErrorHandler);

  return app;
}

module.exports = { createTestApp };