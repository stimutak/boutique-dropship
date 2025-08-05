const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ErrorCodes } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
  try {
    // Check for token in cookie first (more secure), then fall back to header
    const cookieToken = req.cookies?.token;
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    // Prefer cookie token over header token for security
    const token = cookieToken || headerToken;
    
    if (!token) {
      req.user = null;
      return next(); // Continue without authentication for optional auth routes
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      req.user = null;
      return next();
    }
    
    req.user = user;
    next();
  } catch (error) {
    // Log the error for debugging but don't expose details to client
    logger.error('JWT verification error', { error: error.message });
    req.user = null;
    next(); // Continue without authentication for optional auth routes
  }
};

// Middleware to require authentication
const requireAuth = async (req, res, next) => {
  try {
    // Check for token in cookie first (more secure), then fall back to header
    const cookieToken = req.cookies?.token;
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    
    // Prefer cookie token over header token for security
    const token = cookieToken || headerToken;
    
    if (!token) {
      return res.error ? res.error(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Access token is required') : res.status(401).json({
        success: false,
        error: {
          code: ErrorCodes.AUTHENTICATION_REQUIRED,
          message: 'Access token is required'
        }
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.error ? res.error(401, ErrorCodes.TOKEN_INVALID, 'Invalid or expired token') : res.status(401).json({
        success: false,
        error: {
          code: ErrorCodes.TOKEN_INVALID,
          message: 'Invalid or expired token'
        }
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.error ? res.error(401, ErrorCodes.TOKEN_INVALID, 'Invalid token format') : res.status(401).json({
        success: false,
        error: {
          code: ErrorCodes.TOKEN_INVALID,
          message: 'Invalid token format'
        }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.error ? res.error(401, ErrorCodes.TOKEN_EXPIRED, 'Token has expired') : res.status(401).json({
        success: false,
        error: {
          code: ErrorCodes.TOKEN_EXPIRED,
          message: 'Token has expired'
        }
      });
    }
    
    logger.error('Authentication error', { error: error.message });
    if (res.error) {
      res.error(500, ErrorCodes.INTERNAL_ERROR, 'Authentication failed');
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Authentication failed'
        }
      });
    }
  }
};

// Middleware to require admin role
const requireAdmin = async (req, res, next) => {
  try {
    // Check for token in cookie first (more secure), then fall back to header
    const cookieToken = req.cookies?.token;
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    
    // Prefer cookie token over header token for security
    const token = cookieToken || headerToken;
    
    if (!token) {
      return res.error ? res.error(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Access token is required') : res.status(401).json({
        success: false,
        error: {
          code: ErrorCodes.AUTHENTICATION_REQUIRED,
          message: 'Access token is required'
        }
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.error ? res.error(401, ErrorCodes.TOKEN_INVALID, 'Invalid or expired token') : res.status(401).json({
        success: false,
        error: {
          code: ErrorCodes.TOKEN_INVALID,
          message: 'Invalid or expired token'
        }
      });
    }
    
    // Check if user has admin role
    if (!user.isAdmin) {
      return res.error ? res.error(403, ErrorCodes.INSUFFICIENT_PERMISSIONS, 'Admin access required') : res.status(403).json({
        success: false,
        error: {
          code: ErrorCodes.INSUFFICIENT_PERMISSIONS,
          message: 'Admin access required'
        }
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.error ? res.error(401, ErrorCodes.TOKEN_INVALID, 'Invalid token format') : res.status(401).json({
        success: false,
        error: {
          code: ErrorCodes.TOKEN_INVALID,
          message: 'Invalid token format'
        }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.error ? res.error(401, ErrorCodes.TOKEN_EXPIRED, 'Token has expired') : res.status(401).json({
        success: false,
        error: {
          code: ErrorCodes.TOKEN_EXPIRED,
          message: 'Token has expired'
        }
      });
    }
    
    logger.error('Admin auth error', { error: error.message });
    if (res.error) {
      res.error(500, ErrorCodes.INTERNAL_ERROR, 'Authorization failed');
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: 'Authorization failed'
        }
      });
    }
  }
};

module.exports = {
  authenticateToken,
  requireAuth,
  requireAdmin
};