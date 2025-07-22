const User = require('../models/User');
const jwt = require('jsonwebtoken');
const EventEmitter = require('events');

class AuthService extends EventEmitter {
  constructor() {
    super();
    this.auditLog = [];
    this.rateLimitStore = new Map(); // Simple in-memory rate limiting
  }

  // Rate limiting for profile updates (max 10 per minute)
  checkRateLimit(userId) {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 10;

    const userRequests = this.rateLimitStore.get(userId) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return {
        allowed: false,
        retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
      };
    }

    // Add current request
    validRequests.push(now);
    this.rateLimitStore.set(userId, validRequests);

    return { allowed: true };
  }

  // Optimistic profile update with performance monitoring
  async updateProfileOptimistically(userId, updateData, auditContext = {}) {
    const startTime = Date.now();
    
    try {
      // Rate limiting check
      const rateCheck = this.checkRateLimit(userId);
      if (!rateCheck.allowed) {
        throw new Error(`Rate limit exceeded. Try again in ${rateCheck.retryAfter} seconds.`);
      }

      // Get current user for rollback if needed
      const currentUser = await User.findById(userId).lean();
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Validate email uniqueness if email is being changed
      if (updateData.email && updateData.email !== currentUser.email) {
        const existingUser = await User.findOne({ 
          email: updateData.email,
          _id: { $ne: userId }
        }).lean();
        
        if (existingUser) {
          throw new Error('Email already in use');
        }
      }

      // Perform optimistic update
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          ...updateData,
          updatedAt: new Date()
        },
        { 
          new: true, 
          runValidators: true,
          lean: true
        }
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Audit logging for sensitive changes
      if (updateData.email || updateData.phone) {
        this.logSensitiveChange(userId, updateData, auditContext);
      }

      // Emit profile update event
      this.emit('profileUpdated', {
        userId,
        changes: updateData,
        timestamp: new Date(),
        performance: { duration }
      });

      // Performance monitoring (target: 200ms)
      if (duration > 200) {
        console.warn(`Profile update took ${duration}ms - exceeds 200ms target`);
      }

      return {
        user: updatedUser,
        duration,
        performance: duration <= 200 ? 'good' : 'needs_optimization',
        success: true
      };

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.error('Profile update error:', error);
      
      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  // Enhanced address management without authentication loss
  async manageAddressOptimistically(userId, operation, addressData = {}, addressId = null) {
    const startTime = Date.now();
    
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      let result;
      switch (operation) {
        case 'add':
          result = await user.addAddress(addressData);
          break;
        case 'update':
          result = await user.updateAddress(addressId, addressData);
          break;
        case 'delete':
          result = await user.removeAddress(addressId);
          break;
        case 'setDefault':
          result = await user.setDefaultAddress(addressId);
          break;
        default:
          throw new Error(`Unknown address operation: ${operation}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Emit address update event
      this.emit('addressUpdated', {
        userId,
        operation,
        addressId,
        timestamp: new Date(),
        performance: { duration }
      });

      return {
        user: result,
        duration,
        performance: duration <= 200 ? 'good' : 'needs_optimization',
        success: true
      };

    } catch (error) {
      console.error('Address management error:', error);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  // Audit logging for sensitive operations
  logSensitiveChange(userId, changes, context) {
    const auditEntry = {
      userId,
      timestamp: new Date(),
      changes: Object.keys(changes).filter(key => ['email', 'phone'].includes(key)),
      ip: context.ip,
      userAgent: context.userAgent,
      sessionId: context.sessionId
    };
    
    this.auditLog.push(auditEntry);
    
    // Keep only last 1000 entries in memory
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
    
    console.log('Sensitive profile change:', auditEntry);
  }

  // Validate token without requiring re-authentication
  async validateTokenSafely(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).lean();
      
      if (!user || !user.isActive) {
        return { valid: false, reason: 'user_not_found' };
      }
      
      return { valid: true, user, decoded };
    } catch (error) {
      return { valid: false, reason: 'invalid_token', error: error.message };
    }
  }

  // Enhanced token refresh mechanism
  async refreshTokenIfNeeded(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded) {
        return { success: false, reason: 'invalid_token' };
      }

      // Check if token expires within next hour
      const expiresAt = decoded.exp * 1000;
      const oneHourFromNow = Date.now() + (60 * 60 * 1000);
      
      if (expiresAt > oneHourFromNow) {
        return { success: true, refreshed: false, token };
      }

      // Generate new token
      const newToken = jwt.sign(
        { userId: decoded.userId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        refreshed: true,
        token: newToken,
        expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000))
      };

    } catch (error) {
      return { success: false, reason: 'refresh_failed', error: error.message };
    }
  }

  // Email notification for sensitive changes
  async notifyUserOfSensitiveChange(userId, changeType, context = {}) {
    try {
      const user = await User.findById(userId).lean();
      if (!user || !user.preferences?.emailPreferences?.orderConfirmations) {
        return; // User doesn't want notifications
      }

      // This would integrate with your email service
      console.log(`Email notification sent to ${user.email}: ${changeType} changed`);
      
      // Emit notification event
      this.emit('sensitiveChangeNotification', {
        userId,
        email: user.email,
        changeType,
        timestamp: new Date(),
        context
      });

    } catch (error) {
      console.error('Failed to send sensitive change notification:', error);
    }
  }

  // Optimistic user data synchronization
  async synchronizeUserData(userId, eventType = 'manual') {
    try {
      const user = await User.findById(userId).lean();
      if (!user) {
        throw new Error('User not found');
      }

      // Emit synchronization event for real-time updates
      this.emit('userDataSync', {
        userId,
        user,
        eventType,
        timestamp: new Date()
      });

      return { success: true, user };
    } catch (error) {
      console.error('User data synchronization error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get audit log for user (for admin or debugging)
  getUserAuditLog(userId, limit = 50) {
    return this.auditLog
      .filter(entry => entry.userId.toString() === userId.toString())
      .slice(-limit)
      .reverse();
  }

  // Clean up rate limit store periodically
  cleanupRateLimitStore() {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute

    for (const [userId, requests] of this.rateLimitStore.entries()) {
      const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
      
      if (validRequests.length === 0) {
        this.rateLimitStore.delete(userId);
      } else {
        this.rateLimitStore.set(userId, validRequests);
      }
    }
  }

  // Connection pooling awareness
  async withConnectionOptimization(operation) {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      if (duration > 100) {
        console.warn(`Database operation took ${duration}ms - consider connection pooling optimization`);
      }
      
      return result;
    } catch (error) {
      console.error('Database operation failed:', error);
      throw error;
    }
  }
}

// Cleanup rate limit store every 5 minutes
const authService = new AuthService();
setInterval(() => {
  authService.cleanupRateLimitStore();
}, 5 * 60 * 1000);

module.exports = authService;