const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const authService = require('../services/authService');
const cartService = require('../services/cartService');

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
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { email, password, firstName, lastName, phone, preferences } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists'
        }
      });
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
        
        const welcomeData = {
          firstName: user.firstName,
          email: user.email
        };

        const emailResult = await sendWelcomeEmail(user.email, welcomeData);
        if (!emailResult.success) {
          console.error('Failed to send welcome email:', emailResult.error);
        }
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: user.toPublicJSON()
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: 'Failed to register user'
      }
    });
  }
});

// Login user with enhanced cart merging
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { email, password, guestCartItems } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Your account has been disabled'
        }
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Enhanced cart preservation and merging
    let cartInfo = { itemCount: 0, mergedItems: 0 };
    
    // Merge guest cart if provided
    if (guestCartItems && Array.isArray(guestCartItems) && guestCartItems.length > 0) {
      try {
        const mergeResult = await cartService.mergeCartsWithConflictResolution(
          user._id,
          guestCartItems,
          req.sessionID
        );
        
        cartInfo = {
          preservedCart: true,
          mergedItems: mergeResult.mergedItems,
          conflicts: mergeResult.conflicts,
          duration: mergeResult.duration
        };
      } catch (mergeError) {
        console.error('Cart merge error during login:', mergeError);
        cartInfo.mergeError = 'Failed to merge guest cart';
      }
    }

    // Emit user login event
    authService.emit('userLogin', {
      userId: user._id,
      email: user.email,
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toPublicJSON(),
      cart: cartInfo
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: 'Failed to login'
      }
    });
  }
});

// Forgot password - Fixed timing attack vulnerability
router.post('/forgot-password', validateForgotPassword, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { email } = req.body;
    
    // Always execute the same operations to prevent timing attacks
    let user, resetToken, resetTokenHash;
    
    // Find user
    user = await User.findOne({ email });
    
    // Always generate a token (even if user doesn't exist) to normalize timing
    resetToken = crypto.randomBytes(32).toString('hex');
    resetTokenHash = crypto
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
        
        const emailResult = await sendPasswordResetEmail(user.email, {
          firstName: user.firstName,
          resetToken,
          resetUrl
        });
        
        if (!emailResult.success) {
          console.error('Failed to send reset email:', emailResult.error);
        }
        
        // Log reset URL for development when email is not configured
        if (emailResult.message === 'Email skipped - not configured') {
          console.log('\n========================================');
          console.log('PASSWORD RESET URL (Email not configured)');
          console.log('========================================');
          console.log(`User: ${user.email}`);
          console.log(`Reset URL: ${resetUrl}`);
          console.log('========================================\n');
        }
      } catch (emailError) {
        console.error('Error sending reset email:', emailError);
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
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FORGOT_PASSWORD_ERROR',
        message: 'Failed to process password reset request'
      }
    });
  }
});

// Reset password
router.post('/reset-password', validateResetPassword, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
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
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Password reset token is invalid or has expired'
        }
      });
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
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RESET_PASSWORD_ERROR',
        message: 'Failed to reset password'
      }
    });
  }
});

// Get user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user.toPublicJSON()
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFILE_FETCH_ERROR',
        message: 'Failed to fetch user profile'
      }
    });
  }
});

// Update user profile
router.put('/profile', requireAuth, [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('phone').optional().isString().isLength({ min: 7, max: 30 }),
  body('preferences.notifications').optional().isBoolean(),
  body('preferences.newsletter').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { email, firstName, lastName, phone, preferences, addresses } = req.body;
    
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (preferences !== undefined) updateData.preferences = { ...req.user.preferences, ...preferences };
    if (addresses !== undefined) updateData.addresses = addresses;

    // Don't allow email updates through this endpoint
    delete updateData.email;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser.toPublicJSON()
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFILE_UPDATE_ERROR',
        message: 'Failed to update profile'
      }
    });
  }
});

// Change password
router.post('/change-password', requireAuth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password field
    const user = await User.findById(req.user._id).select('+password');

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect'
        }
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PASSWORD_CHANGE_ERROR',
        message: 'Failed to change password'
      }
    });
  }
});

// Logout (optional - mainly for server-side session cleanup)
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Emit logout event
    authService.emit('userLogout', {
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
          console.error('Session destruction error:', err);
        }
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
      cartCleared: true // Signal to frontend to clear cart state
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_ERROR',
        message: 'Failed to logout'
      }
    });
  }
});

// Refresh token endpoint
router.post('/refresh-token', async (req, res) => {
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
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_REFRESH_ERROR',
        message: 'Failed to refresh token'
      }
    });
  }
});

module.exports = router;