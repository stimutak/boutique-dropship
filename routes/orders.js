const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { authenticateToken, requireAuth, requireAdmin } = require('../middleware/auth');
const { validateCSRFToken } = require('../middleware/sessionCSRF');
const { getCurrencyForLocale, getExchangeRates } = require('../utils/currency');
const { _ErrorCodes } = require('../utils/errorHandler');
const { i18nMiddleware } = require('../utils/i18n');
const { validateObjectIdParam } = require('../utils/inputSanitizer');

// Helper function to get user's currency from request
function getUserCurrency(req) {
  // Check for explicit currency in query or header
  if (req.query.currency) {return req.query.currency;}
  if (req.headers['x-currency']) {return req.headers['x-currency'];}
  
  // Get from locale header (set by frontend based on i18n)
  const locale = req.headers['x-locale'] || 'en';
  return getCurrencyForLocale(locale);
}

// Validation middleware for guest checkout
const validateGuestCheckout = [
  body('guestInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('guestInfo.firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('guestInfo.lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('guestInfo.phone')
    .optional()
    .isString()
    .isLength({ min: 7, max: 30 })
    .withMessage('Phone number must be between 7 and 30 characters'),
  body('shippingAddress.firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Shipping first name is required'),
  body('shippingAddress.lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Shipping last name is required'),
  body('shippingAddress.street')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Shipping street address is required'),
  body('shippingAddress.city')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Shipping city is required'),
  body('shippingAddress.state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Shipping state is required'),
  body('shippingAddress.zipCode')
    .trim()
    .isLength({ min: 5, max: 10 })
    .withMessage('Valid shipping zip code is required'),
  body('shippingAddress.country')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Valid country code is required'),
  body('billingAddress.firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Billing first name is required'),
  body('billingAddress.lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Billing last name is required'),
  body('billingAddress.street')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Billing street address is required'),
  body('billingAddress.city')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Billing city is required'),
  body('billingAddress.state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Billing state is required'),
  body('billingAddress.zipCode')
    .trim()
    .isLength({ min: 5, max: 10 })
    .withMessage('Valid billing zip code is required'),
  body('billingAddress.country')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Valid country code is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 99 })
    .withMessage('Quantity must be between 1 and 99'),
  body('referralSource')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Referral source must be less than 100 characters')
];

// Create order (both guest and authenticated)
router.post('/', authenticateToken, validateGuestCheckout, validateCSRFToken, async (req, res) => {
  try {
    // Check validation errors
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

    const {
      guestInfo,
      shippingAddress,
      billingAddress,
      items: requestItems,
      notes,
      referralSource
    } = req.body;

    // Validate and process cart items - FIXED N+1 QUERY
    const orderItems = [];
    let subtotal = 0;

    // Batch fetch all products at once to avoid N+1 queries
    const productIds = requestItems.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const item of requestItems) {
      const product = productMap.get(item.productId);
      
      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRODUCT',
            message: `Product ${item.productId} not found or unavailable`
          }
        });
      }

      // Get the price in user's currency if available, otherwise use USD price
      const userCurrency = getUserCurrency(req);
      const priceInCurrency = product.prices && product.prices[userCurrency] 
        ? product.prices[userCurrency] 
        : product.price;
      
      const itemTotal = priceInCurrency * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: priceInCurrency,
        wholesaler: {
          name: product.wholesaler.name,
          email: product.wholesaler.email,
          productCode: product.wholesaler.productCode,
          notified: false
        }
      });
    }

    // Get user's currency
    const userCurrency = getUserCurrency(req);
    const exchangeRates = getExchangeRates();
    const exchangeRate = exchangeRates[userCurrency] || 1;
    
    // Subtotal is already in user's currency
    const subtotalInCurrency = subtotal;
    const tax = Math.round(subtotalInCurrency * 0.08 * 100) / 100; // 8% tax rate
    const shippingCost = subtotalInCurrency > 50 ? 0 : 5.99; // Free shipping threshold in user currency
    const total = Math.round((subtotalInCurrency + tax + shippingCost) * 100) / 100;

    // Create order
    const orderData = {
      items: orderItems,
      shippingAddress,
      billingAddress,
      subtotal: Math.round(subtotalInCurrency * 100) / 100,
      tax,
      shippingCost,
      total,
      payment: {
        method: 'other', // Will be updated when payment is processed
        status: 'pending'
      },
      status: 'pending',
      notes,
      referralSource,
      currency: userCurrency,
      exchangeRate: exchangeRate
    };

    // Add customer ID if user is authenticated
    if (req.user) {
      orderData.customer = req.user._id;
      // For registered users, populate guest info from their profile
      orderData.guestInfo = {
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        phone: req.user.phone || guestInfo?.phone
      };
    } else {
      // For guest checkout, use provided guest info
      orderData.guestInfo = guestInfo;
    }

    const order = await Order.create(orderData);
    
    // Populate product details for email
    await order.populate('items.product', 'name slug images');

    // Send order confirmation email
    try {
      const { sendOrderConfirmation } = require('../utils/emailService');
      
      // Get user's locale from request headers
      const userLocale = req.headers['x-locale'] || 'en';
      
      const emailData = {
        orderNumber: order.orderNumber,
        customerName: `${order.guestInfo.firstName} ${order.guestInfo.lastName}`,
        items: order.items.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: order.total,
        shippingAddress: order.shippingAddress,
        currency: order.currency
      };

      const emailResult = await sendOrderConfirmation(order.guestInfo.email, emailData, userLocale);
      if (!emailResult.success) {
        console.error('Failed to send order confirmation email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Error sending order confirmation email:', emailError);
    }

    // Note: Cart will be cleared after successful payment, not here
    // This allows users to retry payment if it fails

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        currency: order.currency,
        exchangeRate: order.exchangeRate,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_CREATION_ERROR',
        message: 'Failed to create order'
      }
    });
  }
});

// Create order (guest checkout) - explicit guest route
router.post('/guest', validateGuestCheckout, async (req, res) => {
  try {
    // Check validation errors
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

    const {
      guestInfo,
      shippingAddress,
      billingAddress,
      items: requestItems,
      notes,
      referralSource
    } = req.body;

    // Validate and process cart items - FIXED N+1 QUERY
    const orderItems = [];
    let subtotal = 0;

    // Batch fetch all products at once to avoid N+1 queries
    const productIds = requestItems.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const item of requestItems) {
      const product = productMap.get(item.productId);
      
      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRODUCT',
            message: `Product ${item.productId} not found or unavailable`
          }
        });
      }

      // Get the price in user's currency if available, otherwise use USD price
      const userCurrency = getUserCurrency(req);
      const priceInCurrency = product.prices && product.prices[userCurrency] 
        ? product.prices[userCurrency] 
        : product.price;
      
      const itemTotal = priceInCurrency * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: priceInCurrency,
        wholesaler: {
          name: product.wholesaler.name,
          email: product.wholesaler.email,
          productCode: product.wholesaler.productCode,
          notified: false,
          notificationAttempts: 0
        }
      });
    }

    // Get user's currency
    const userCurrency = getUserCurrency(req);
    const exchangeRates = getExchangeRates();
    const exchangeRate = exchangeRates[userCurrency] || 1;
    
    // Subtotal is already in user's currency
    const subtotalInCurrency = subtotal;
    const tax = Math.round(subtotalInCurrency * 0.08 * 100) / 100; // 8% tax rate
    const shippingCost = subtotalInCurrency > 50 ? 0 : 5.99; // Free shipping threshold in user currency
    const total = Math.round((subtotalInCurrency + tax + shippingCost) * 100) / 100;

    // Create order
    const orderData = {
      guestInfo,
      items: orderItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      subtotal: Math.round(subtotalInCurrency * 100) / 100,
      tax,
      shippingCost,
      total,
      payment: {
        method: 'card',
        status: 'pending'
      },
      status: 'pending',
      notes,
      referralSource,
      currency: userCurrency,
      exchangeRate: exchangeRate
    };

    const order = await Order.create(orderData);

    res.status(201).json({
      success: true,
      message: 'Guest order created successfully',
      data: {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          guestInfo: order.guestInfo,
          items: order.items,
          shippingAddress: order.shippingAddress,
          billingAddress: order.billingAddress,
          subtotal: order.subtotal,
          tax: order.tax,
          shipping: order.shipping,
          total: order.total,
          status: order.status,
          currency: order.currency,
          exchangeRate: order.exchangeRate,
          createdAt: order.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Error creating guest order:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_CREATION_ERROR',
        message: 'Failed to create guest order'
      }
    });
  }
});

// Create order for registered user
router.post('/registered', authenticateToken, validateCSRFToken, async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'You must be logged in to place an order'
        }
      });
    }

    const {
      shippingAddress,
      billingAddress,
      items: requestItems,
      notes,
      referralSource,
      useDefaultAddresses = false
    } = req.body;

    // Use default addresses if requested and available
    let finalShippingAddress = shippingAddress;
    let finalBillingAddress = billingAddress;

    if (useDefaultAddresses) {
      const defaultShipping = req.user.getDefaultShippingAddress();
      const defaultBilling = req.user.getDefaultBillingAddress();
      
      if (defaultShipping) {
        finalShippingAddress = defaultShipping.toObject();
        delete finalShippingAddress._id;
        delete finalShippingAddress.type;
        delete finalShippingAddress.isDefault;
      }
      
      if (defaultBilling) {
        finalBillingAddress = defaultBilling.toObject();
        delete finalBillingAddress._id;
        delete finalBillingAddress.type;
        delete finalBillingAddress.isDefault;
      }
    }

    // Validate required addresses
    if (!finalShippingAddress || !finalBillingAddress) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ADDRESSES',
          message: 'Shipping and billing addresses are required'
        }
      });
    }

    // Get items from user's cart if not provided
    let itemsToProcess = requestItems;
    if (!itemsToProcess || itemsToProcess.length === 0) {
      // Fetch from user's cart
      const user = await User.findById(req.user._id);
      if (!user.cart || !user.cart.items || user.cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'EMPTY_CART',
            message: 'Your cart is empty'
          }
        });
      }
      itemsToProcess = user.cart.items.map(item => ({
        productId: item.product,
        quantity: item.quantity
      }));
    }

    // Validate and process cart items - FIXED N+1 QUERY
    const orderItems = [];
    let subtotal = 0;

    // Batch fetch all products at once to avoid N+1 queries
    const productIds = itemsToProcess.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const item of itemsToProcess) {
      const product = productMap.get(item.productId.toString());
      
      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRODUCT',
            message: `Product ${item.productId} not found or unavailable`
          }
        });
      }

      // Get the price in user's currency if available, otherwise use USD price
      const userCurrency = getUserCurrency(req);
      const priceInCurrency = product.prices && product.prices[userCurrency] 
        ? product.prices[userCurrency] 
        : product.price;
      
      const itemTotal = priceInCurrency * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: priceInCurrency,
        wholesaler: {
          name: product.wholesaler.name,
          email: product.wholesaler.email,
          productCode: product.wholesaler.productCode,
          notified: false
        }
      });
    }

    // Get user's currency
    const userCurrency = getUserCurrency(req);
    const exchangeRates = getExchangeRates();
    const exchangeRate = exchangeRates[userCurrency] || 1;
    
    // Subtotal is already in user's currency
    const subtotalInCurrency = subtotal;
    const tax = Math.round(subtotalInCurrency * 0.08 * 100) / 100; // 8% tax rate
    const shippingCost = subtotalInCurrency > 50 ? 0 : 5.99; // Free shipping threshold in user currency
    const total = Math.round((subtotalInCurrency + tax + shippingCost) * 100) / 100;

    // Create order for registered user
    const orderData = {
      customer: req.user._id,
      items: orderItems,
      shippingAddress: finalShippingAddress,
      billingAddress: finalBillingAddress,
      subtotal: Math.round(subtotalInCurrency * 100) / 100,
      tax,
      shippingCost,
      total,
      payment: {
        method: 'other',
        status: 'pending'
      },
      status: 'pending',
      notes,
      referralSource,
      currency: userCurrency,
      exchangeRate: exchangeRate
    };

    const order = await Order.create(orderData);
    
    // Populate product details for email
    await order.populate('items.product', 'name slug images');

    // Send order confirmation email for registered user
    try {
      if (req.user.wantsEmail('orderConfirmations')) {
        const { sendOrderConfirmation } = require('../utils/emailService');
        
        // Get user's locale from request headers or user preferences
        const userLocale = req.headers['x-locale'] || req.user.preferences?.locale || 'en';
        
        const emailData = {
          orderNumber: order.orderNumber,
          customerName: `${req.user.firstName} ${req.user.lastName}`,
          items: order.items.map(item => ({
            productName: item.product.name,
            quantity: item.quantity,
            price: item.price
          })),
          total: order.total,
          shippingAddress: order.shippingAddress,
          currency: order.currency
        };

        const emailResult = await sendOrderConfirmation(req.user.email, emailData, userLocale);
        if (!emailResult.success) {
          console.error('Failed to send order confirmation email:', emailResult.error);
        }
      }
    } catch (emailError) {
      console.error('Error sending order confirmation email:', emailError);
    }

    // Clear user's cart
    const user = await User.findById(req.user._id);
    user.cart = { items: [], updatedAt: new Date() };
    await user.save();
    
    // Clear cart session
    if (req.session && req.session.cart) {
      req.session.cart = [];
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        currency: order.currency,
        exchangeRate: order.exchangeRate,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating registered user order:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_CREATION_ERROR',
        message: 'Failed to create order'
      }
    });
  }
});

// Admin orders list endpoint (must come before /:id route)
router.get('/admin', requireAdmin, i18nMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status;

    // Build query
    const query = {};
    if (statusFilter && ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(statusFilter)) {
      query.status = statusFilter;
    }

    // Get orders with full details (admin can see everything)
    const orders = await Order.find(query)
      .populate('customer', 'firstName lastName email')
      .populate('items.product', 'name slug images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    // Return full order data for admin (including wholesaler info)
    res.json({
      success: true,
      data: {
        orders: orders.map(order => {
          const orderObj = order.toObject();
          // Admin can see all data, don't filter wholesaler info
          return orderObj;
        }),
        pagination: {
          currentPage: page,
          totalPages,
          totalOrders,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADMIN_ORDERS_ERROR',
        message: req.i18n('ADMIN_ORDERS_ERROR', 'Failed to fetch orders')
      }
    });
  }
});

// Get order by ID (supports both authenticated and guest orders)
router.get('/:id', validateObjectIdParam('id'), authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', '-wholesaler')
      .populate('customer', 'firstName lastName email');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // For guest orders, allow access without authentication
    // For authenticated users, check ownership (unless admin)
    if (req.user) {
      if (!req.user.isAdmin && order.customer && order.customer._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only access your own orders'
          }
        });
      }
    }
    // Guest orders (no customer field) are accessible without auth

    // Return public order data (excludes sensitive wholesaler info)
    res.json({
      success: true,
      data: {
        order: order.toPublicJSON()
      }
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_FETCH_ERROR',
        message: 'Failed to fetch order'
      }
    });
  }
});

// Get order history for registered user
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'You must be logged in to view orders'
        }
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.product', 'name slug images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments({ customer: req.user._id });
    const totalPages = Math.ceil(totalOrders / limit);
    
    

    // Return public order data
    const publicOrders = orders.map(order => order.toPublicJSON());

    res.json({
      success: true,
      data: {
        orders: publicOrders,
        pagination: {
          currentPage: page,
          totalPages,
          totalOrders,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_HISTORY_ERROR',
        message: 'Failed to fetch order history'
      }
    });
  }
});

// Associate order with authenticated user
router.post('/:id/associate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the order
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Check if order is already associated with a user
    if (order.customer) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ORDER_ALREADY_ASSOCIATED',
          message: 'Order is already associated with a user'
        }
      });
    }

    // Associate order with the authenticated user
    order.customer = req.user._id;
    await order.save();

    res.json({
      success: true,
      message: 'Order successfully associated with your account'
    });

  } catch (error) {
    console.error('Error associating order:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_ASSOCIATION_ERROR',
        message: 'Failed to associate order with account'
      }
    });
  }
});

// Admin order fulfillment endpoint
router.put('/:id/fulfill', requireAdmin, validateCSRFToken, i18nMiddleware, async (req, res) => {
  try {
    const { status, trackingNumber, shippingCarrier, shipDate, estimatedDeliveryDate, notes } = req.body;
    
    // Validate required status
    if (!status) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: req.i18n('VALIDATION_ERROR', 'Status is required')
        }
      });
    }

    // Validate status is in allowed enum
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: req.i18n('INVALID_ORDER_STATUS', 'Invalid order status')
        }
      });
    }

    // Find the order
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: req.i18n('ORDER_NOT_FOUND', 'Order not found')
        }
      });
    }

    // Check if transition is valid
    if (!order.canTransitionTo(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: req.i18n('INVALID_STATUS_TRANSITION', `Cannot transition from ${order.status} to ${status}`)
        }
      });
    }

    // Validate required fields for shipping
    if (status === 'shipped') {
      if (!trackingNumber) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TRACKING_NUMBER_REQUIRED',
            message: req.i18n('TRACKING_NUMBER_REQUIRED', 'Tracking number is required when shipping orders')
          }
        });
      }
    }

    try {
      // Update order status using the model method
      order.addStatusHistory(status, {
        notes,
        trackingNumber,
        shippingCarrier,
        admin: req.user._id
      });

      // Set additional dates if provided
      if (shipDate) {order.shipDate = new Date(shipDate);}
      if (estimatedDeliveryDate) {order.estimatedDeliveryDate = new Date(estimatedDeliveryDate);}

      await order.save();

      // Send status update email
      try {
        const { sendOrderStatusUpdate } = require('../utils/emailService');
        
        let customerEmail, customerName, shouldSendEmail = true, userLocale = 'en';
        
        if (order.customer) {
          // Registered user
          await order.populate('customer', 'firstName lastName email preferences');
          customerEmail = order.customer.email;
          customerName = `${order.customer.firstName} ${order.customer.lastName}`;
          shouldSendEmail = order.customer.preferences?.emailPreferences?.orderUpdates !== false;
          userLocale = order.customer.preferences?.locale || req.headers['x-locale'] || 'en';
        } else {
          // Guest user
          customerEmail = order.guestInfo.email;
          customerName = `${order.guestInfo.firstName} ${order.guestInfo.lastName}`;
          userLocale = req.headers['x-locale'] || 'en';
        }

        if (shouldSendEmail && ['processing', 'shipped', 'delivered'].includes(status)) {
          const statusData = {
            orderNumber: order.orderNumber,
            customerName,
            status,
            trackingNumber,
            shippingCarrier,
            estimatedDeliveryDate: order.estimatedDeliveryDate
          };

          const emailResult = await sendOrderStatusUpdate(customerEmail, statusData, userLocale);
          if (!emailResult.success) {
            console.error('Failed to send order status update email:', emailResult.error);
          }
        }
      } catch (emailError) {
        console.error('Error sending order status update email:', emailError);
      }

      res.json({
        success: true,
        message: 'Order status updated successfully',
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          trackingNumber: order.trackingNumber,
          shippingCarrier: order.shippingCarrier,
          shipDate: order.shipDate,
          estimatedDeliveryDate: order.estimatedDeliveryDate,
          statusHistory: order.statusHistory,
          updatedAt: order.updatedAt
        }
      });

    } catch (transitionError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: req.i18n('INVALID_STATUS_TRANSITION', transitionError.message)
        }
      });
    }

  } catch (error) {
    console.error('Error updating order fulfillment:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_FULFILLMENT_ERROR',
        message: req.i18n('ORDER_FULFILLMENT_ERROR', 'Failed to update order fulfillment status')
      }
    });
  }
});

// Update order status (admin only - legacy endpoint, use /fulfill instead)
router.put('/:id/status', requireAdmin, validateCSRFToken, i18nMiddleware, async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;
    
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Invalid order status'
        }
      });
    }

    const updateData = { status };
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('customer', 'firstName lastName email preferences');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Send status update email
    try {
      const { sendOrderStatusUpdate } = require('../utils/emailService');
      
      let customerEmail, customerName, shouldSendEmail = true, userLocale = 'en';
      
      if (order.customer) {
        // Registered user
        customerEmail = order.customer.email;
        customerName = `${order.customer.firstName} ${order.customer.lastName}`;
        shouldSendEmail = order.customer.preferences?.emailPreferences?.orderUpdates !== false;
        userLocale = order.customer.preferences?.locale || req.headers['x-locale'] || 'en';
      } else {
        // Guest user
        customerEmail = order.guestInfo.email;
        customerName = `${order.guestInfo.firstName} ${order.guestInfo.lastName}`;
        userLocale = req.headers['x-locale'] || 'en';
      }

      if (shouldSendEmail && ['processing', 'shipped', 'delivered'].includes(status)) {
        const statusData = {
          orderNumber: order.orderNumber,
          customerName,
          status,
          trackingNumber
        };

        const emailResult = await sendOrderStatusUpdate(customerEmail, statusData, userLocale);
        if (!emailResult.success) {
          console.error('Failed to send order status update email:', emailResult.error);
        }
      }
    } catch (emailError) {
      console.error('Error sending order status update email:', emailError);
    }

    res.json({
      success: true,
      message: 'Order status updated',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        trackingNumber: order.trackingNumber,
        updatedAt: order.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_UPDATE_ERROR',
        message: 'Failed to update order status'
      }
    });
  }
});

module.exports = router;