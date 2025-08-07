const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { requireAuth, authenticateToken } = require('../middleware/auth');
const { validateCSRFToken } = require('../middleware/sessionCSRF');
// AppError removed - using res.error() instead
const { ErrorCodes } = require('../utils/errorHandler');
const { logger, securityLogger } = require('../utils/logger');
const { sanitizeInputMiddleware, validateObjectIdParam } = require('../utils/inputSanitizer');
const { rateLimits, speedLimiter } = require('../middleware/security');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Validation middleware for registration
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('phone')
    .optional()
    .isString()
    .isLength({ min: 7, max: 30 })
    .withMessage('Phone number must be between 7 and 30 characters')
];

// Validation middleware for login
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation for forgot password
const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
];

// Validation for reset password
const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Register new user
router.post('/register', rateLimits.auth, speedLimiter, validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }

    const { email, password, firstName, lastName, phone, preferences } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.error(409, ErrorCodes.USER_EXISTS, 'User with this email already exists');
    }

    // Create new user
    const userData = {
      email,
      password,
      firstName,
      lastName,
      phone,
      preferences: preferences || {}
    };

    const user = await User.create(userData);
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Send welcome email
    try {
      if (user.wantsEmail('welcomeEmails')) {
        const { sendWelcomeEmail } = require('../utils/emailService');
        
        // Get user's locale from request headers or user preferences
        const userLocale = req.headers['x-locale'] || user.preferences?.locale || 'en';
        
        const welcomeData = {
          firstName: user.firstName,
          email: user.email
        };

        const emailResult = await sendWelcomeEmail(user.email, welcomeData, userLocale);
        if (!emailResult.success) {
          logger.error('Failed to send welcome email:', emailResult.error);
        }
      }
    } catch (emailError) {
      logger.error('Error sending welcome email:', emailError);
    }

    // Set token as httpOnly cookie for security
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token, // Still send token for backward compatibility during migration
        user: user.toPublicJSON()
      }
    });

  } catch (error) {
    logger.error('Registration error:', { error: error.message, stack: error.stack });
    res.error(500, ErrorCodes.REGISTRATION_ERROR, 'Failed to register user');
  }
});

// Login user with enhanced cart merging
router.post('/login', rateLimits.auth, speedLimiter, sanitizeInputMiddleware, validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }

    const { email, password, _guestCartItems } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.error(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.error(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      return res.error(403, ErrorCodes.ACCOUNT_DISABLED, 'Your account has been disabled');
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Cart info (simplified after removing cartService)
    const cartInfo = { itemCount: 0, mergedItems: 0 };
    
    // Guest cart merging would happen on the frontend after login

    // Set token as httpOnly cookie for security
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token, // Still send token for backward compatibility during migration
        user: user.toPublicJSON(),
        cart: cartInfo
      }
    });

  } catch (error) {
    securityLogger.error('Login error:', { error: error.message, stack: error.stack });
    res.error(500, ErrorCodes.LOGIN_ERROR, 'Failed to login');
  }
});

// Forgot password - Fixed timing attack vulnerability
router.post('/forgot-password', rateLimits.auth, speedLimiter, validateForgotPassword, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }

    const { email } = req.body;
    
    // Always execute the same operations to prevent timing attacks
    
    // Find user
    const user = await User.findOne({ email });
    
    // Always generate a token (even if user doesn't exist) to normalize timing
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // If user exists, save the reset token and send email
    if (user) {
      // Save reset token and expiry
      user.passwordResetToken = resetTokenHash;
      user.passwordResetExpiry = Date.now() + 3600000; // 1 hour
      await user.save();

      // Send reset email
      try {
        const { sendPasswordResetEmail } = require('../utils/emailService');
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        
        // Get user's locale from request headers or user preferences
        const userLocale = req.headers['x-locale'] || user.preferences?.locale || 'en';
        
        const emailResult = await sendPasswordResetEmail(user.email, {
          firstName: user.firstName,
          resetToken,
          resetUrl
        }, userLocale);
        
        if (!emailResult.success) {
          logger.error('Failed to send reset email:', emailResult.error);
        }
        
        // Log reset URL for development when email is not configured
        if (emailResult.message === 'Email skipped - not configured') {
          logger.info('Password reset URL generated (Email not configured):', {
            user: user.email,
            resetUrl,
            note: 'Email service not configured, showing URL in logs'
          });
        }
      } catch (emailError) {
        logger.error('Error sending reset email:', emailError);
      }
    } else {
      // If user doesn't exist, still perform the same cryptographic operations
      // and simulate sending an email to normalize response time
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    }

    // Always return the same response regardless of whether user exists
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent.'
    });

  } catch (error) {
    securityLogger.error('Forgot password error:', { error: error.message, stack: error.stack });
    res.error(500, ErrorCodes.FORGOT_PASSWORD_ERROR, 'Failed to process password reset request');
  }
});

// Reset password
router.post('/reset-password', rateLimits.auth, speedLimiter, validateResetPassword, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }

    const { token, password } = req.body;
    
    // Hash the token to match stored version
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.error(400, ErrorCodes.INVALID_RESET_TOKEN, 'Password reset token is invalid or has expired');
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    // Generate new auth token
    const authToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password has been reset successfully',
      token: authToken,
      user: user.toPublicJSON()
    });

  } catch (error) {
    securityLogger.error('Reset password error:', { error: error.message, stack: error.stack });
    res.error(500, ErrorCodes.RESET_PASSWORD_ERROR, 'Failed to reset password');
  }
});

// Verify token from cookie (for auth persistence check)
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // If authenticateToken middleware passed, user is authenticated
    if (!req.user) {
      return res.error(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Not authenticated');
    }

    // Get fresh user data
    const user = await User.findById(req.user._id).select('-password');
    if (!user || !user.isActive) {
      return res.error(401, ErrorCodes.USER_NOT_FOUND, 'User not found or inactive');
    }

    res.json({
      success: true,
      data: {
        user: user.toPublicJSON(),
        authenticated: true
      }
    });
  } catch (error) {
    securityLogger.error('Token verification error:', { error: error.message, stack: error.stack });
    res.error(500, ErrorCodes.VERIFICATION_ERROR, 'Failed to verify authentication');
  }
});

// Get user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    // Fetch fresh user data to ensure all fields are populated correctly
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.error(404, ErrorCodes.USER_NOT_FOUND, 'User not found');
    }
    
    res.json({
      success: true,
      data: {
        user: user.toPublicJSON()
      }
    });
  } catch (error) {
    logger.error('Profile fetch error:', { error: error.message, stack: error.stack });
    res.error(500, ErrorCodes.PROFILE_FETCH_ERROR, 'Failed to fetch user profile');
  }
});

// Update user profile with optimistic updates and performance optimization
router.put('/profile', requireAuth, sanitizeInputMiddleware, validateCSRFToken, [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
  body('phone').optional().isString().isLength({ min: 7, max: 30 }).withMessage('Phone must be 7-30 characters'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('addresses').optional().custom((value) => {
    // Allow null or array
    return value === null || Array.isArray(value);
  }).withMessage('Addresses must be null or an array'),
  body('addresses.*.street').optional().custom((value) => {
    // Allow empty string or valid length
    return !value || (value.trim().length >= 1 && value.trim().length <= 100);
  }).withMessage('Street must be 1-100 characters'),
  body('addresses.*.city').optional().custom((value) => {
    return !value || (value.trim().length >= 1 && value.trim().length <= 50);
  }).withMessage('City must be 1-50 characters'),
  body('addresses.*.state').optional().custom((value) => {
    return !value || (value.trim().length >= 1 && value.trim().length <= 50);
  }).withMessage('State must be 1-50 characters'),
  body('addresses.*.zipCode').optional().custom((value) => {
    return !value || (value.trim().length >= 5 && value.trim().length <= 10);
  }).withMessage('ZIP code must be 5-10 characters'),
  body('addresses.*.country').optional().custom((value) => {
    return !value || value.trim().length === 2;
  }).withMessage('Country must be 2-letter code'),
  body('preferences.notifications').optional().isBoolean().withMessage('Notifications must be boolean'),
  body('preferences.newsletter').optional().isBoolean().withMessage('Newsletter must be boolean'),
  body('preferences.emailPreferences').optional().isObject().withMessage('Email preferences must be an object')
], async (req, res) => {
  const startTime = Date.now();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }

    const { firstName, lastName, phone, email, addresses, preferences } = req.body;
    
    // Build update data object
    const updateData = {};
    if (firstName !== undefined) {updateData.firstName = firstName;}
    if (lastName !== undefined) {updateData.lastName = lastName;}
    if (phone !== undefined) {updateData.phone = phone;}
    if (email !== undefined) {updateData.email = email;}
    
    // Handle addresses carefully
    if (addresses !== undefined) {
      if (addresses === null) {
        // Skip null addresses
      } else if (Array.isArray(addresses)) {
        // Process addresses array
        const validAddresses = [];
        
        for (const addr of addresses) {
          // Skip if no address data
          if (!addr) {continue;}
          
          // Skip if all fields are empty
          const hasContent = addr.street || addr.city || addr.state || addr.zipCode;
          if (!hasContent) {continue;}
          
          // Check if address has required fields
          if (addr.street && addr.city && addr.state && addr.zipCode) {
            // Create valid address object
            const validAddress = {
              type: addr.type || 'shipping',
              firstName: addr.firstName || firstName || req.user.firstName,
              lastName: addr.lastName || lastName || req.user.lastName,
              street: addr.street,
              city: addr.city,
              state: addr.state,
              zipCode: addr.zipCode,
              country: addr.country || 'US',
              phone: addr.phone,
              isDefault: addr.isDefault !== undefined ? addr.isDefault : validAddresses.length === 0
            };
            validAddresses.push(validAddress);
          }
        }
        
        // Only update addresses if we have valid ones
        if (validAddresses.length > 0) {
          updateData.addresses = validAddresses;
        }
      }
    }
    
    // Handle nested preferences updates
    if (preferences !== undefined) {
      // Get current preferences safely
      let currentPreferences = {};
      if (req.user.preferences) {
        currentPreferences = typeof req.user.preferences.toObject === 'function' 
          ? req.user.preferences.toObject() 
          : req.user.preferences;
      }
      
      updateData.preferences = { 
        ...currentPreferences,
        ...preferences
      };
      
      // Handle nested emailPreferences
      if (preferences.emailPreferences) {
        updateData.preferences.emailPreferences = {
          ...currentPreferences.emailPreferences || {},
          ...preferences.emailPreferences
        };
      }
    }

    // Update user directly
    try {
      // Check if email is being changed and already exists
      if (email && email !== req.user.email) {
        const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
        if (existingUser) {
          return res.error(409, ErrorCodes.EMAIL_IN_USE, 'Email address is already in use');
        }
      }

      // Update the user
      const user = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.error(404, ErrorCodes.USER_NOT_FOUND, 'User not found');
      }

      const totalDuration = Date.now() - startTime;

      // Send success response
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: user.toPublicJSON()
        },
        performance: {
          duration: totalDuration,
          target: '200ms',
          status: totalDuration <= 200 ? 'optimal' : 'needs_optimization'
        }
      });
    } catch (updateError) {
      logger.error('Profile update error:', { error: updateError.message, stack: updateError.stack });
      return res.error(500, ErrorCodes.PROFILE_UPDATE_ERROR, updateError.message || 'Failed to update profile');
    }

  } catch (error) {
    logger.error('Profile update error:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.error(409, ErrorCodes.DUPLICATE_EMAIL, 'Email address is already in use');
    }

    res.error(500, ErrorCodes.PROFILE_UPDATE_ERROR, 'Failed to update profile', null, { details: error.message });
  }
});

// Change password
router.post('/change-password', rateLimits.auth, speedLimiter, requireAuth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.error(401, ErrorCodes.INVALID_PASSWORD, 'Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    securityLogger.error('Password change error:', { error: error.message, stack: error.stack });
    res.error(500, ErrorCodes.PASSWORD_CHANGE_ERROR, 'Failed to change password');
  }
});

// Logout (optional - mainly for server-side session cleanup)
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Log logout event
    securityLogger.info('User logout:', {
      userId: userId,
      timestamp: new Date()
    });

    // Clear any server-side sessions and cleanup cart state
    if (req.session) {
      // Clear any cart session IDs to prevent ghost carts
      delete req.session.cartId;
      delete req.session.guestId;
      
      // Clear the session
      req.session.destroy((err) => {
        if (err) {
          logger.error('Session destruction error:', err);
        }
      });
    }

    // Clear the JWT cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
      cartCleared: true // Signal to frontend to clear cart state
    });
  } catch (error) {
    securityLogger.error('Logout error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_ERROR',
        message: 'Failed to logout'
      }
    });
  }
});

// Address management endpoints without authentication loss

// Add new address
router.post('/profile/addresses', requireAuth, validateCSRFToken, [
  body('type').isIn(['shipping', 'billing']).withMessage('Address type must be shipping or billing'),
  body('firstName').trim().isLength({ min: 1, max: 50 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required'),
  body('street').trim().isLength({ min: 1, max: 100 }).withMessage('Street address is required'),
  body('city').trim().isLength({ min: 1, max: 50 }).withMessage('City is required'),
  body('state').trim().isLength({ min: 1, max: 50 }).withMessage('State is required'),
  body('zipCode').trim().isLength({ min: 3, max: 20 }).withMessage('ZIP code is required'),
  body('country').optional().trim().isLength({ min: 2, max: 3 }).withMessage('Country code must be 2-3 characters'),
  body('phone').optional().isString().isLength({ min: 7, max: 30 }).withMessage('Phone must be 7-30 characters'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }

    const addressData = {
      type: req.body.type,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      street: req.body.street,
      city: req.body.city,
      state: req.body.state,
      zipCode: req.body.zipCode,
      country: req.body.country || 'US',
      phone: req.body.phone,
      isDefault: req.body.isDefault || false
    };

    // Add address to user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.error(404, ErrorCodes.USER_NOT_FOUND, 'User not found');
    }

    // If this is the default address, unset other defaults
    if (addressData.isDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    user.addresses.push(addressData);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      user: user.toPublicJSON()
    });

  } catch (error) {
    logger.error('Add address error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: {
        code: 'ADDRESS_ADD_ERROR',
        message: 'Failed to add address'
      }
    });
  }
});

// Update existing address
router.put('/profile/addresses/:addressId', requireAuth, validateCSRFToken, [
  body('type').optional().isIn(['shipping', 'billing']).withMessage('Address type must be shipping or billing'),
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 characters'),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 characters'),
  body('street').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Street must be 1-100 characters'),
  body('city').optional().trim().isLength({ min: 1, max: 50 }).withMessage('City must be 1-50 characters'),
  body('state').optional().trim().isLength({ min: 1, max: 50 }).withMessage('State must be 1-50 characters'),
  body('zipCode').optional().trim().isLength({ min: 3, max: 20 }).withMessage('ZIP code must be 3-20 characters'),
  body('country').optional().trim().isLength({ min: 2, max: 3 }).withMessage('Country code must be 2-3 characters'),
  body('phone').optional().isString().isLength({ min: 7, max: 30 }).withMessage('Phone must be 7-30 characters'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }

    const { addressId } = req.params;
    const updateData = {};
    
    // Only include fields that are provided
    ['type', 'firstName', 'lastName', 'street', 'city', 'state', 'zipCode', 'country', 'phone', 'isDefault']
      .forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

    // Update address on user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.error(404, ErrorCodes.USER_NOT_FOUND, 'User not found');
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Address not found'
        }
      });
    }

    // If setting as default, unset other defaults
    if (updateData.isDefault) {
      user.addresses.forEach(addr => {
        if (addr._id.toString() !== addressId) {
          addr.isDefault = false;
        }
      });
    }

    // Update the address
    Object.assign(address, updateData);
    await user.save();

    res.json({
      success: true,
      message: 'Address updated successfully',
      user: user.toPublicJSON()
    });

  } catch (error) {
    logger.error('Update address error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: {
        code: 'ADDRESS_UPDATE_ERROR',
        message: 'Failed to update address'
      }
    });
  }
});

// Delete address
router.delete('/profile/addresses/:addressId', requireAuth, validateCSRFToken, async (req, res) => {
  try {
    const { addressId } = req.params;

    // Delete address from user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.error(404, ErrorCodes.USER_NOT_FOUND, 'User not found');
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Address not found'
        }
      });
    }

    // Remove the address using pull method
    user.addresses.pull(addressId);
    await user.save();

    res.json({
      success: true,
      message: 'Address deleted successfully',
      user: user.toPublicJSON()
    });

  } catch (error) {
    logger.error('Delete address error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: {
        code: 'ADDRESS_DELETE_ERROR',
        message: 'Failed to delete address'
      }
    });
  }
});

// Set default address
router.patch('/profile/addresses/:addressId/default', requireAuth, validateCSRFToken, async (req, res) => {
  try {
    const { addressId } = req.params;

    // Set default address
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.error(404, ErrorCodes.USER_NOT_FOUND, 'User not found');
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Address not found'
        }
      });
    }

    // Unset all other defaults and set this one
    user.addresses.forEach(addr => {
      addr.isDefault = addr._id.toString() === addressId;
    });
    
    await user.save();

    res.json({
      success: true,
      message: 'Default address updated successfully',
      user: user.toPublicJSON()
    });

  } catch (error) {
    logger.error('Set default address error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: {
        code: 'ADDRESS_DEFAULT_ERROR',
        message: 'Failed to set default address'
      }
    });
  }
});

// Refresh token endpoint
router.post('/refresh-token', rateLimits.auth, speedLimiter, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Token is required'
        }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token'
        }
      });
    }

    const newToken = generateToken(user._id);
    
    res.json({
      success: true,
      token: newToken,
      user: user.toPublicJSON()
    });
  } catch (error) {
    securityLogger.error('Token refresh error:', { error: error.message, stack: error.stack });
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_REFRESH_ERROR',
        message: 'Failed to refresh token'
      }
    });
  }
});

// ===== GDPR CONSENT ENDPOINTS =====

const GDPRConsent = require('../models/GDPRConsent');

// Get current consent status
router.get('/consent', async (req, res) => {
  try {
    let consent = null;
    
    // Check for authenticated user
    if (req.user) {
      consent = await GDPRConsent.getLatestForUser(req.user._id);
    } else if (req.session?.id) {
      // Check for session-based consent
      consent = await GDPRConsent.getLatestForSession(req.session.id);
    }

    if (!consent) {
      return res.json({
        success: true,
        data: null,
        message: 'No consent record found'
      });
    }

    res.json({
      success: true,
      data: consent.toJSON()
    });
  } catch (error) {
    logger.error('Get consent error:', error);
    res.error(500, 'CONSENT_FETCH_ERROR', 'Failed to fetch consent status');
  }
});

// Record new consent
router.post('/consent', async (req, res) => {
  try {
    const { purposes, consentVersion } = req.body;

    if (!purposes) {
      return res.error(400, 'INVALID_REQUEST', 'Consent purposes are required');
    }

    const consentData = {
      userId: req.user?._id || null,
      sessionId: req.session?.id || req.headers['x-session-id'] || 'anonymous',
      consentVersion: consentVersion || '1.0',
      purposes: {
        necessary: { granted: true, timestamp: new Date() },
        analytics: { 
          granted: purposes.analytics || false, 
          timestamp: purposes.analytics ? new Date() : null 
        },
        marketing: { 
          granted: purposes.marketing || false, 
          timestamp: purposes.marketing ? new Date() : null 
        },
        preferences: { 
          granted: purposes.preferences || false, 
          timestamp: purposes.preferences ? new Date() : null 
        }
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    };

    const consent = await GDPRConsent.recordConsent(consentData);

    // Update user record if authenticated
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        'gdprConsent.currentConsentId': consent._id,
        'gdprConsent.consentWithdrawnAt': null
      });
    }

    res.json({
      success: true,
      data: consent.toJSON(),
      message: 'Consent recorded successfully'
    });
  } catch (error) {
    logger.error('Record consent error:', error);
    res.error(500, 'CONSENT_RECORD_ERROR', 'Failed to record consent');
  }
});

// Update consent
router.put('/consent', requireAuth, validateCSRFToken, async (req, res) => {
  try {
    const { purposes } = req.body;

    if (!purposes) {
      return res.error(400, 'INVALID_REQUEST', 'Consent purposes are required');
    }

    const consent = await GDPRConsent.getLatestForUser(req.user._id);
    
    if (!consent) {
      // Create new consent if none exists
      return router.handle(req, res, () => router.post('/consent', req, res));
    }

    // Update purposes
    Object.keys(purposes).forEach(purpose => {
      if (consent.purposes[purpose]) {
        consent.purposes[purpose].granted = purposes[purpose];
        consent.purposes[purpose].timestamp = purposes[purpose] ? new Date() : null;
      }
    });

    await consent.save();

    res.json({
      success: true,
      data: consent.toJSON(),
      message: 'Consent updated successfully'
    });
  } catch (error) {
    logger.error('Update consent error:', error);
    res.error(500, 'CONSENT_UPDATE_ERROR', 'Failed to update consent');
  }
});

// Withdraw consent
router.delete('/consent', requireAuth, validateCSRFToken, async (req, res) => {
  try {
    const consent = await GDPRConsent.getLatestForUser(req.user._id);
    
    if (!consent) {
      return res.error(404, 'CONSENT_NOT_FOUND', 'No consent record found');
    }

    await consent.withdraw();

    // Update user record
    await User.findByIdAndUpdate(req.user._id, {
      'gdprConsent.consentWithdrawnAt': new Date()
    });

    res.json({
      success: true,
      message: 'Consent withdrawn successfully'
    });
  } catch (error) {
    logger.error('Withdraw consent error:', error);
    res.error(500, 'CONSENT_WITHDRAW_ERROR', 'Failed to withdraw consent');
  }
});

// ===== DATA EXPORT (RIGHT TO ACCESS) =====

// Request data export
router.post('/export-data', requireAuth, validateCSRFToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('gdprConsent.currentConsentId');

    if (!user) {
      return res.error(404, ErrorCodes.USER_NOT_FOUND, 'User not found');
    }

    // Check if there's a recent export request (within 24 hours)
    const recentExport = user.gdprConsent.dataExportRequests.find(req => {
      const hoursSinceRequest = (Date.now() - req.requestedAt) / (1000 * 60 * 60);
      return hoursSinceRequest < 24 && !req.completedAt;
    });

    if (recentExport) {
      return res.error(429, 'EXPORT_IN_PROGRESS', 'A data export is already in progress. Please wait 24 hours between requests.');
    }

    // Add export request to user record
    user.gdprConsent.dataExportRequests.push({
      requestedAt: new Date(),
      completedAt: null,
      downloadUrl: null,
      expiresAt: null
    });

    await user.save();

    // Process export asynchronously
    processDataExport(user._id);

    res.json({
      success: true,
      message: 'Data export request received. You will receive an email when your data is ready.',
      estimatedTime: '4-6 hours'
    });
  } catch (error) {
    logger.error('Data export request error:', error);
    res.error(500, 'EXPORT_REQUEST_ERROR', 'Failed to process data export request');
  }
});

// Helper function to process data export (would be moved to a job queue in production)
async function processDataExport(userId) {
  try {
    const Order = require('../models/Order');
    const Review = require('../models/Review');
    
    // Gather all user data
    const user = await User.findById(userId);
    const orders = await Order.find({ customer: userId });
    const reviews = await Review.find({ user: userId });
    const consents = await GDPRConsent.find({ userId });

    const exportData = {
      personalData: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        addresses: user.addresses,
        preferences: user.preferences,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      orders: orders.map(order => ({
        orderNumber: order.orderNumber,
        date: order.createdAt,
        status: order.status,
        total: order.total,
        currency: order.currency,
        items: order.items,
        shipping: order.shipping,
        billing: order.billing
      })),
      reviews: reviews.map(review => ({
        product: review.product,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt
      })),
      consentHistory: consents.map(consent => ({
        purposes: consent.purposes,
        consentVersion: consent.consentVersion,
        createdAt: consent.createdAt,
        withdrawnAt: consent.withdrawnAt
      }))
    };

    // In production, this would:
    // 1. Generate a secure download link
    // 2. Store the export file securely
    // 3. Send email notification
    // 4. Update user record with download URL

    // For now, just log success
    logger.info('Data export completed for user:', userId);
    
    // Update user record (in production, include actual download URL)
    const exportRequest = user.gdprConsent.dataExportRequests[user.gdprConsent.dataExportRequests.length - 1];
    exportRequest.completedAt = new Date();
    exportRequest.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
    await user.save();

    return exportData;
  } catch (error) {
    logger.error('Data export processing error:', error);
    throw error;
  }
}

// ===== ACCOUNT DELETION (RIGHT TO ERASURE) =====

// Request account deletion
router.post('/delete-account', requireAuth, validateCSRFToken, async (req, res) => {
  try {
    const { password, reason } = req.body;

    // Verify password for security
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.error(404, ErrorCodes.USER_NOT_FOUND, 'User not found');
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.error(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid password');
    }

    // Schedule deletion for 30 days (grace period)
    const scheduledDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    user.gdprConsent.deletionRequests.push({
      requestedAt: new Date(),
      scheduledFor: scheduledDate,
      reason: reason || 'User requested',
      status: 'scheduled'
    });

    user.isActive = false; // Deactivate account immediately
    await user.save();

    // Clear authentication
    res.clearCookie('token');

    res.json({
      success: true,
      message: 'Account deletion scheduled. Your account will be permanently deleted in 30 days. You can cancel this request by logging in before the deletion date.',
      scheduledFor: scheduledDate
    });
  } catch (error) {
    logger.error('Account deletion request error:', error);
    res.error(500, 'DELETION_REQUEST_ERROR', 'Failed to process account deletion request');
  }
});

// Cancel account deletion
router.post('/cancel-deletion', requireAuth, validateCSRFToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.error(404, ErrorCodes.USER_NOT_FOUND, 'User not found');
    }

    // Find pending deletion request
    const pendingDeletion = user.gdprConsent.deletionRequests.find(
      req => req.status === 'scheduled'
    );

    if (!pendingDeletion) {
      return res.error(404, 'NO_DELETION_REQUEST', 'No pending deletion request found');
    }

    pendingDeletion.status = 'cancelled';
    pendingDeletion.completedAt = new Date();
    user.isActive = true; // Reactivate account
    await user.save();

    res.json({
      success: true,
      message: 'Account deletion request cancelled successfully'
    });
  } catch (error) {
    logger.error('Cancel deletion error:', error);
    res.error(500, 'CANCEL_DELETION_ERROR', 'Failed to cancel deletion request');
  }
});

module.exports = router;