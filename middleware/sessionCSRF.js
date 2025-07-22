const crypto = require('crypto');

// Unified CSRF token management
const generateCSRFToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  next();
};

// CSRF validation middleware
const validateCSRFToken = (req, res, next) => {
  // Skip CSRF for GET requests and API testing
  if (req.method === 'GET' || req.path.includes('/test')) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_ERROR',
        message: 'Invalid CSRF token'
      }
    });
  }
  
  next();
};

// Session configuration factory
const createSessionConfig = (mongoUrl) => ({
  secret: process.env.SESSION_SECRET || 'holistic-store-session-secret',
  resave: false,
  saveUninitialized: true, // Important for guest carts and CSRF
  store: require('connect-mongo').create({
    mongoUrl,
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/'
  },
  name: 'holistic.sid', // Custom session name
  proxy: process.env.NODE_ENV === 'production' // Trust proxy in production
});

// Guest session enhancement
const enhanceGuestSession = (req, res, next) => {
  if (!req.session.guestId && !req.user) {
    req.session.guestId = crypto.randomBytes(16).toString('hex');
  }
  
  // Ensure cart exists in session
  if (!req.session.cart) {
    req.session.cart = {
      items: [],
      updatedAt: new Date()
    };
  }
  
  next();
};

// Session cleanup for authenticated users
const cleanupGuestSession = (req, res, next) => {
  if (req.user && req.session.guestId) {
    // User is now authenticated, clean up guest data
    delete req.session.guestId;
    // Cart migration should happen in auth flow
  }
  next();
};

module.exports = {
  generateCSRFToken,
  validateCSRFToken,
  createSessionConfig,
  enhanceGuestSession,
  cleanupGuestSession
};