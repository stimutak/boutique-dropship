const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
require('dotenv').config();

// Import logging and error handling
const { logger } = require('./utils/logger');
const { globalErrorHandler } = require('./middleware/errorHandler');
const { 
  generateCSRFToken, 
  csrfProtection, 
  rateLimits, 
  speedLimiter, 
  sanitizeInput, 
  securityHeaders 
} = require('./middleware/security');

const app = express();

// Security middleware
app.use(helmet());
app.use(securityHeaders);
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003', 'http://localhost:5173'],
  credentials: true
}));

// Input sanitization
app.use(sanitizeInput);

// General rate limiting
app.use(rateLimits.general);

// Speed limiting for brute force protection
app.use(speedLimiter);

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'holistic-store-session-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store',
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Generate CSRF tokens for sessions
app.use(generateCSRFToken);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.warn('MongoDB connection failed:', error.message);
  console.warn('Running in development mode without database');
});

// Handle MongoDB connection events
mongoose.connection.on('error', (error) => {
  console.warn('MongoDB connection error:', error.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

// Routes with specific rate limiting
app.use('/api/auth', rateLimits.auth, require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', csrfProtection, require('./routes/cart'));
app.use('/api/orders', csrfProtection, require('./routes/orders'));
app.use('/api/payments', rateLimits.payment, csrfProtection, require('./routes/payments'));
app.use('/api/wholesalers', require('./routes/wholesalers'));
app.use('/api/integration', rateLimits.integration, require('./routes/integration'));
app.use('/api/admin', rateLimits.admin, csrfProtection, require('./routes/admin'));
app.use('/api/monitoring', require('./routes/monitoring'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});