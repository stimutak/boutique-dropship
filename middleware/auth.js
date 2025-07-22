const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authService = require('../services/authService');

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      req.user = null;
      return next(); // Continue without authentication for optional auth routes
    }
    
    // Use auth service for token validation with fallback
    let decoded, user;
    try {
      const validation = await authService.validateTokenSafely(token);
      if (validation.valid) {
        decoded = validation.decoded;
        user = validation.user;
      } else {
        req.user = null;
        return next();
      }
    } catch (serviceError) {
      // Fallback to direct JWT verification
      console.warn('Auth service failed, using fallback:', serviceError.message);
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await User.findById(decoded.userId).select('-password');
    }
    
    if (!user || !user.isActive) {
      req.user = null;
      return next();
    }
    
    req.user = user;
    next();
  } catch (error) {
    req.user = null;
    next(); // Continue without authentication for optional auth routes
  }
};

// Middleware to require authentication
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Access token is required'
        }
      });
    }
    
    // Use auth service for token validation with automatic refresh
    let decoded, user;
    try {
      const validation = await authService.validateTokenSafely(token);
      if (validation.valid) {
        decoded = validation.decoded;
        user = validation.user;
        
        // Check if token needs refresh
        const refreshResult = await authService.refreshTokenIfNeeded(token);
        if (refreshResult.refreshed) {
          // Add new token to response headers for client to update
          res.setHeader('X-New-Token', refreshResult.token);
        }
      } else {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: validation.reason === 'user_not_found' ? 'User not found' : 'Invalid or expired token'
          }
        });
      }
    } catch (serviceError) {
      // Fallback to direct JWT verification
      console.warn('Auth service failed in requireAuth, using fallback:', serviceError.message);
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token'
          }
        });
      }
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token format'
        }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired'
        }
      });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
    });
  }
};

// Middleware to require admin role
const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Access token is required'
        }
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }
    
    // Check if user has admin role
    if (!user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Admin access required'
        }
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token format'
        }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired'
        }
      });
    }
    
    console.error('Admin auth error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authorization failed'
      }
    });
  }
};

module.exports = {
  authenticateToken,
  requireAuth,
  requireAdmin
};