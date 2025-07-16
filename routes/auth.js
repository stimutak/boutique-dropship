const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

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

// Login user
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

    const { email, password } = req.body;

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

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toPublicJSON()
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
      user: req.user.toPublicJSON()
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

// Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, phone, preferences } = req.body;
    
    const updateData = {};
    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (phone) updateData.phone = phone.trim();
    if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };

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

// Password reset request (placeholder - would need email service)
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

    // TODO: Implement actual password reset email sending
    if (user) {
      console.log(`Password reset requested for user: ${user.email}`);
      // Generate reset token and send email
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

// Test route to trigger hook
router.get('/test', (req, res) => {
  res.json({ message: 'Auth test endpoint' });
});

module.exports = router;