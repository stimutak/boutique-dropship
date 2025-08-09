const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
// rateLimit removed - not used
const session = require('express-session');
// MongoStore removed - not used
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// Import logging first for proper startup logging
const { logger, securityLogger } = require('./utils/logger');

// Only log environment details in development - never in production for security
if (process.env.NODE_ENV === 'development') {
  logger.info('Environment variables loaded:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT
  });
  // Note: Never log JWT_SECRET details, even in development
}

// Validate critical environment variables at startup
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
  securityLogger.error('FATAL ERROR: JWT_SECRET environment variable is not set. This is required for secure token generation.');
  throw new Error('JWT_SECRET not configured');
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  if (process.env.NODE_ENV !== 'test') {
    securityLogger.error('FATAL ERROR: JWT_SECRET must be at least 32 characters long for security.');
    // Never log actual JWT_SECRET length for security reasons
    throw new Error('JWT_SECRET too short');
  }
}

// Import error handling
const { globalErrorHandler } = require('./middleware/errorHandler');
const { i18nMiddleware } = require('./utils/i18n');
const { errorResponse } = require('./utils/errorHandler');
const { 
  rateLimits, 
  speedLimiter, 
  sanitizeInput, 
  securityHeaders 
} = require('./middleware/security');

const app = express();

// Security middleware
app.use(helmet());
app.use(securityHeaders);
// Configure CORS with explicit settings for Docker environment
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:3003',
      'http://localhost:5173'
    ];
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {return callback(null, true);}
    
    // Check if the origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Log CORS blocks to proper logger instead of console spam
      logger.warn('CORS blocked origin', { origin, timestamp: new Date().toISOString() });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-guest-session-id', 'x-locale', 'x-currency', 'Cookie'],
  exposedHeaders: ['set-cookie']
};

app.use(cors(corsOptions));

// Input sanitization
app.use(sanitizeInput);

// General rate limiting
app.use(rateLimits.general);

// Speed limiting for brute force protection
app.use(speedLimiter);

// Import unified session/CSRF management
const { 
  createSessionConfig, 
  generateCSRFToken,
  enhanceGuestSession,
  cleanupGuestSession 
} = require('./middleware/sessionCSRF');

// Session middleware with unified config
const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store';
app.use(session(createSessionConfig(mongoUrl)));

// Session enhancement middleware
app.use(generateCSRFToken);
app.use(enhanceGuestSession);
app.use(cleanupGuestSession);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parser middleware
app.use(cookieParser());

// i18n middleware for error messages
app.use(i18nMiddleware);

// Error response helper middleware
app.use(errorResponse);

// Static files
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// Database connection - only connect if not already connected (for testing)
if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    logger.info('Connected to MongoDB');
  }).catch((error) => {
    logger.warn('MongoDB connection failed', { error: error.message });
    logger.warn('Running in development mode without database');
  });
} else if (process.env.NODE_ENV !== 'test') {
  logger.info('Using existing MongoDB connection');
}

// Handle MongoDB connection events
mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error', { error: error.message });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

// Routes with specific rate limiting
app.use('/api/auth', rateLimits.auth, require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', rateLimits.payment, require('./routes/payments'));
app.use('/api/wholesalers', require('./routes/wholesalers'));
app.use('/api/blog', require('./routes/blog'));
app.use('/api/integration', rateLimits.integration, require('./routes/integration'));
app.use('/api/admin', rateLimits.admin, require('./routes/admin'));
app.use('/api/settings', rateLimits.admin, require('./routes/settings'));
app.use('/api/monitoring', require('./routes/monitoring'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
  res.json({ 
    success: true,
    csrfToken: req.session.csrfToken,
    sessionInfo: {
      isGuest: !req.user && !!req.session.guestId,
      hasCart: !!req.session.cart && !!req.session.cart.items && req.session.cart.items.length > 0
    }
  });
});

// Root route for API info
app.get('/', (req, res) => {
  res.json({
    message: 'Holistic Dropship Store API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      products: '/api/products',
      cart: '/api/cart',
      orders: '/api/orders',
      payments: '/api/payments'
    },
    frontend: process.env.FRONTEND_URL || 'http://localhost:3000'
  });
});

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5001;

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

// Export app for testing
module.exports = app;
