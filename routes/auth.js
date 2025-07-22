const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
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
    .isMobilePhone()
    .withMessage('Valid phone number is required')
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
      data: {
        token,
        user: user.toPublicJSON()
      }
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

    // Find user and include password for comparison
    const user = await User.findOne({ email, isActive: true }).select('+password');
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
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Generate token and update last login
    const token = generateToken(user._id);
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
      data: {
        token,
        user: user.toPublicJSON(),
        cart: cartInfo
      }
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

// Get user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.toPublicJSON()
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFILE_ERROR',
        message: 'Failed to fetch profile'
      }
    });
  }
});

// Update user profile with optimistic updates and performance monitoring
router.put('/profile', requireAuth, [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be less than 50 characters')
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
    if (email && email !== req.user.email) updateData.email = email;
    if (firstName && firstName.trim() !== req.user.firstName) updateData.firstName = firstName.trim();
    if (lastName && lastName.trim() !== req.user.lastName) updateData.lastName = lastName.trim();
    if (phone && phone.trim() !== req.user.phone) updateData.phone = phone.trim();
    if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };
    
    // Handle addresses update separately for better performance
    if (addresses && Array.isArray(addresses) && addresses.length > 0) {
      const addressResult = await authService.manageAddressOptimistically(
        req.user._id,
        'update',
        addresses[0],
        addresses[0]._id
      );
      
      if (!addressResult.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ADDRESS_UPDATE_ERROR',
            message: addressResult.error
          }
        });
      }
    }

    // Use optimistic profile service
    const auditContext = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    };

    const result = await authService.updateProfileOptimistically(
      req.user._id,
      updateData,
      auditContext
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: result.error.includes('Rate limit') ? 'RATE_LIMIT_ERROR' : 'PROFILE_UPDATE_ERROR',
          message: result.error
        }
      });
    }

    // Send email notification for sensitive changes
    if (updateData.email || updateData.phone) {
      await authService.notifyUserOfSensitiveChange(
        req.user._id,
        updateData.email ? 'email' : 'phone',
        auditContext
      );
    }

    // Synchronize user data across sessions
    await authService.synchronizeUserData(req.user._id, 'profile_update');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          ...result.user,
          // Remove sensitive data before sending
          password: undefined,
          passwordResetToken: undefined,
          passwordResetExpiry: undefined
        },
        performance: {
          duration: result.duration,
          status: result.performance
        }
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFILE_UPDATE_ERROR',
        message: 'Failed to update profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// Add address
router.post('/addresses', requireAuth, async (req, res) => {
  try {
    const { type, firstName, lastName, street, city, state, zipCode, country, phone, isDefault } = req.body;

    if (!['shipping', 'billing'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ADDRESS_TYPE',
          message: 'Address type must be shipping or billing'
        }
      });
    }

    const addressData = {
      type,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      zipCode: zipCode.trim(),
      country: country.trim(),
      phone: phone ? phone.trim() : undefined,
      isDefault: Boolean(isDefault)
    };

    await req.user.addAddress(addressData);

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      user: req.user.toPublicJSON()
    });

  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADDRESS_ADD_ERROR',
        message: 'Failed to add address'
      }
    });
  }
});

// Update address
router.put('/addresses/:addressId', requireAuth, async (req, res) => {
  try {
    const { addressId } = req.params;
    const updateData = req.body;

    const result = await req.user.updateAddress(addressId, updateData);
    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ADDRESS_NOT_FOUND',
          message: 'Address not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Address updated successfully',
      user: req.user.toPublicJSON()
    });

  } catch (error) {
    console.error('Update address error:', error);
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
router.delete('/addresses/:addressId', requireAuth, async (req, res) => {
  try {
    const { addressId } = req.params;

    await req.user.removeAddress(addressId);

    res.json({
      success: true,
      message: 'Address removed successfully',
      user: req.user.toPublicJSON()
    });

  } catch (error) {
    console.error('Remove address error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADDRESS_REMOVE_ERROR',
        message: 'Failed to remove address'
      }
    });
  }
});

// Get checkout preferences (addresses and settings)
router.get('/checkout-preferences', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    
    const preferences = {
      defaultShippingAddress: user.getDefaultShippingAddress(),
      defaultBillingAddress: user.getDefaultBillingAddress(),
      allAddresses: user.addresses,
      preferences: user.preferences,
      hasAddresses: user.addresses.length > 0,
      hasDefaultShipping: Boolean(user.getDefaultShippingAddress()),
      hasDefaultBilling: Boolean(user.getDefaultBillingAddress())
    };

    res.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('Checkout preferences error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CHECKOUT_PREFERENCES_ERROR',
        message: 'Failed to fetch checkout preferences'
      }
    });
  }
});

// Logout (client-side token removal, but we can track it)
router.post('/logout', requireAuth, async (req, res) => {
  try {
    // In a more sophisticated setup, you might want to blacklist the token
    // For now, we just acknowledge the logout
    res.json({
      success: true,
      message: 'Logged out successfully'
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

// Password reset request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_REQUIRED',
          message: 'Email is required'
        }
      });
    }

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    
    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });

    // Send password reset email if user exists
    if (user && user.wantsEmail('welcomeEmails')) {
      const crypto = require('crypto');
      const { sendPasswordResetEmail } = require('../utils/emailService');
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
      
      // Save reset token to user (we need to add these fields to User model)
      user.passwordResetToken = resetToken;
      user.passwordResetExpiry = resetTokenExpiry;
      await user.save();
      
      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      // Send email
      const emailResult = await sendPasswordResetEmail(user.email, {
        firstName: user.firstName,
        resetToken,
        resetUrl
      });
      
      if (!emailResult.success) {
        console.error('Failed to send password reset email:', emailResult.error);
      }
    }

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PASSWORD_RESET_ERROR',
        message: 'Failed to process password reset request'
      }
    });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Token and new password are required'
        }
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Password must be at least 6 characters long'
        }
      });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiry: { $gt: new Date() },
      isActive: true
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token'
        }
      });
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Password reset completion error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PASSWORD_RESET_COMPLETION_ERROR',
        message: 'Failed to reset password'
      }
    });
  }
});

// Get email preferences
router.get('/email-preferences', requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      preferences: req.user.preferences.emailPreferences
    });
  } catch (error) {
    console.error('Email preferences fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EMAIL_PREFERENCES_ERROR',
        message: 'Failed to fetch email preferences'
      }
    });
  }
});

// Update email preferences
router.put('/email-preferences', requireAuth, async (req, res) => {
  try {
    const { emailPreferences } = req.body;
    
    if (!emailPreferences || typeof emailPreferences !== 'object') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PREFERENCES',
          message: 'Valid email preferences object is required'
        }
      });
    }

    // Validate preference keys
    const validPreferences = [
      'orderConfirmations',
      'paymentReceipts', 
      'orderUpdates',
      'promotionalEmails',
      'welcomeEmails'
    ];

    const invalidKeys = Object.keys(emailPreferences).filter(
      key => !validPreferences.includes(key)
    );

    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PREFERENCE_KEYS',
          message: `Invalid preference keys: ${invalidKeys.join(', ')}`
        }
      });
    }

    await req.user.updateEmailPreferences(emailPreferences);

    res.json({
      success: true,
      message: 'Email preferences updated successfully',
      preferences: req.user.preferences.emailPreferences
    });

  } catch (error) {
    console.error('Email preferences update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EMAIL_PREFERENCES_UPDATE_ERROR',
        message: 'Failed to update email preferences'
      }
    });
  }
});

// Change password
router.post('/change-password', requireAuth, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
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

    // Get user with password for comparison
    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Current password is incorrect'
        }
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PASSWORD_CHANGE_ERROR',
        message: 'Failed to change password'
      }
    });
  }
});

// Test route to trigger hook
router.get('/test', (req, res) => {
  res.json({ message: 'Auth test endpoint' });
});

module.exports = router;