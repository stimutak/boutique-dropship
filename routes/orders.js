const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { authenticateToken, requireAuth } = require('../middleware/auth');

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
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
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

// Create order (guest checkout)
router.post('/', validateGuestCheckout, async (req, res) => {
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

    // Validate and process cart items
    const orderItems = [];
    let subtotal = 0;

    for (const item of requestItems) {
      const product = await Product.findById(item.productId);
      
      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRODUCT',
            message: `Product ${item.productId} not found or unavailable`
          }
        });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        wholesaler: {
          name: product.wholesaler.name,
          email: product.wholesaler.email,
          productCode: product.wholesaler.productCode,
          notified: false
        }
      });
    }

    // Calculate totals (simplified - you may want to add tax calculation)
    const tax = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax rate
    const shipping = subtotal > 50 ? 0 : 5.99; // Free shipping over $50
    const total = Math.round((subtotal + tax + shipping) * 100) / 100;

    // Create order
    const orderData = {
      guestInfo,
      items: orderItems,
      shippingAddress,
      billingAddress,
      subtotal: Math.round(subtotal * 100) / 100,
      tax,
      shipping,
      total,
      payment: {
        method: 'other', // Will be updated when payment is processed
        status: 'pending'
      },
      status: 'pending',
      notes,
      referralSource
    };

    // Note: Orders are created as guest orders by default
    // They can be associated with users later via the /associate endpoint

    const order = await Order.create(orderData);
    
    // Populate product details for email
    await order.populate('items.product', 'name slug images');

    // Send order confirmation email for guest checkout
    try {
      const { sendOrderConfirmation } = require('../utils/emailService');
      
      const emailData = {
        orderNumber: order.orderNumber,
        customerName: `${guestInfo.firstName} ${guestInfo.lastName}`,
        items: order.items.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: order.total,
        shippingAddress: order.shippingAddress
      };

      const emailResult = await sendOrderConfirmation(guestInfo.email, emailData);
      if (!emailResult.success) {
        console.error('Failed to send order confirmation email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Error sending order confirmation email:', emailError);
    }

    // Clear cart session after successful order creation
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

// Create order for registered user
router.post('/registered', requireAuth, async (req, res) => {
  try {
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

    // Validate and process cart items (same logic as guest checkout)
    const orderItems = [];
    let subtotal = 0;

    for (const item of requestItems) {
      const product = await Product.findById(item.productId);
      
      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRODUCT',
            message: `Product ${item.productId} not found or unavailable`
          }
        });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        wholesaler: {
          name: product.wholesaler.name,
          email: product.wholesaler.email,
          productCode: product.wholesaler.productCode,
          notified: false
        }
      });
    }

    // Calculate totals
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const shipping = subtotal > 50 ? 0 : 5.99;
    const total = Math.round((subtotal + tax + shipping) * 100) / 100;

    // Create order for registered user
    const orderData = {
      customer: req.user._id,
      items: orderItems,
      shippingAddress: finalShippingAddress,
      billingAddress: finalBillingAddress,
      subtotal: Math.round(subtotal * 100) / 100,
      tax,
      shipping,
      total,
      payment: {
        method: 'other',
        status: 'pending'
      },
      status: 'pending',
      notes,
      referralSource
    };

    const order = await Order.create(orderData);
    
    // Populate product details for email
    await order.populate('items.product', 'name slug images');

    // Send order confirmation email for registered user
    try {
      if (req.user.wantsEmail('orderConfirmations')) {
        const { sendOrderConfirmation } = require('../utils/emailService');
        
        const emailData = {
          orderNumber: order.orderNumber,
          customerName: `${req.user.firstName} ${req.user.lastName}`,
          items: order.items.map(item => ({
            productName: item.product.name,
            quantity: item.quantity,
            price: item.price
          })),
          total: order.total,
          shippingAddress: order.shippingAddress
        };

        const emailResult = await sendOrderConfirmation(req.user.email, emailData);
        if (!emailResult.success) {
          console.error('Failed to send order confirmation email:', emailResult.error);
        }
      }
    } catch (emailError) {
      console.error('Error sending order confirmation email:', emailError);
    }

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

// Get order by ID (requires authentication and ownership check)
router.get('/:id', requireAuth, async (req, res) => {
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

    // Check if user owns this order (unless admin)
    if (!req.user.isAdmin && order.customer && order.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own orders'
        }
      });
    }

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
router.get('/', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    console.log('Orders GET request - User:', req.user.email, 'ID:', req.user._id);
    
    const orders = await Order.find({ customer: req.user._id })
      .populate('items.product', 'name slug images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments({ customer: req.user._id });
    const totalPages = Math.ceil(totalOrders / limit);
    
    console.log('Orders found:', orders.length, 'Total orders:', totalOrders);
    
    // Debug: Check if there are any orders without customer
    const allOrders = await Order.find({}).select('_id orderNumber customer');
    console.log('All orders in database:', allOrders.length);
    allOrders.forEach(order => {
      console.log(`Order ${order.orderNumber}: customer=${order.customer}`);
    });

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

// Update order status (admin only - placeholder for now)
router.put('/:id/status', async (req, res) => {
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
      
      let customerEmail, customerName, shouldSendEmail = true;
      
      if (order.customer) {
        // Registered user
        customerEmail = order.customer.email;
        customerName = `${order.customer.firstName} ${order.customer.lastName}`;
        shouldSendEmail = order.customer.preferences?.emailPreferences?.orderUpdates !== false;
      } else {
        // Guest user
        customerEmail = order.guestInfo.email;
        customerName = `${order.guestInfo.firstName} ${order.guestInfo.lastName}`;
      }

      if (shouldSendEmail && ['processing', 'shipped', 'delivered'].includes(status)) {
        const statusData = {
          orderNumber: order.orderNumber,
          customerName,
          status,
          trackingNumber
        };

        const emailResult = await sendOrderStatusUpdate(customerEmail, statusData);
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