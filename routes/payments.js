const express = require('express');
const router = express.Router();
const { createMollieClient } = require('@mollie/api-client');
const { body, param, validationResult } = require('express-validator');
const Order = require('../models/Order');
const { requireAuth, authenticateToken } = require('../middleware/auth');

// Initialize Mollie client with fallback
let mollieClient;
try {
  const apiKey = process.env.MOLLIE_API_KEY || process.env.MOLLIE_TEST_KEY;
  
  if (!apiKey) {
    console.warn('No Mollie API key found. Using mock client for development.');
    throw new Error('No API key provided');
  }
  
  mollieClient = createMollieClient({ 
    apiKey: apiKey
  });
  console.log('Mollie client initialized successfully');
} catch (error) {
  console.warn('Mollie client initialization failed:', error.message);
  // Create a mock client for development
  mollieClient = {
    payments: {
      create: () => Promise.reject(new Error('Mollie not configured')),
      get: () => Promise.reject(new Error('Mollie not configured')),
      refunds: {
        create: () => Promise.reject(new Error('Mollie not configured'))
      }
    },
    methods: {
      list: () => Promise.resolve([])
    }
  };
}

// Create payment for order
router.post('/create', authenticateToken, [
  body('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('method').optional().isIn(['card', 'crypto', 'creditcard', 'other']).withMessage('Invalid payment method'),
  body('redirectUrl').optional().custom((value) => {
    if (value && !value.match(/^https?:\/\/.+/)) {
      throw new Error('Valid redirect URL required');
    }
    return true;
  }),
  body('webhookUrl').optional().custom((value) => {
    if (value && !value.match(/^https?:\/\/.+/)) {
      throw new Error('Valid webhook URL required');
    }
    return true;
  })
], async (req, res) => {
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

    const { orderId, method = 'card', redirectUrl, webhookUrl } = req.body;
    console.log('Payment creation request:', { orderId, method, user: req.user?.email || 'guest' });

    // Find the order
    const order = await Order.findById(orderId);
    console.log('Order found:', order ? `${order.orderNumber} - $${order.total}` : 'NOT FOUND');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Check if order already has a payment
    if (order.payment.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ORDER_ALREADY_PAID',
          message: 'Order has already been paid'
        }
      });
    }

    // Prepare payment data
    const paymentData = {
      amount: {
        currency: 'USD',
        value: order.total.toFixed(2)
      },
      description: `Order ${order.orderNumber}`,
      redirectUrl: redirectUrl || `${process.env.FRONTEND_URL}/order-confirmation/${order._id}`,
      webhookUrl: webhookUrl || `${process.env.API_URL}/api/payments/webhook`,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber
      }
    };

    // Add method if specified
    if (method && method !== 'creditcard') {
      paymentData.method = method;
    }

    // Create payment with Mollie
    const molliePayment = await mollieClient.payments.create(paymentData);

    // Update order with payment information
    order.payment.molliePaymentId = molliePayment.id;
    order.payment.method = method;
    order.payment.status = 'pending';
    await order.save();

    res.json({
      success: true,
      data: {
        paymentId: molliePayment.id,
        status: molliePayment.status,
        checkoutUrl: molliePayment._links?.checkout?.href || 'https://checkout.mollie.com/test',
        amount: molliePayment.amount,
        method: molliePayment.method || method,
        createdAt: molliePayment.createdAt || new Date().toISOString(),
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          total: order.total
        }
      }
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    
    // Handle Mollie API errors
    if (error.field) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MOLLIE_VALIDATION_ERROR',
          message: `Mollie validation error: ${error.detail}`,
          field: error.field
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'PAYMENT_CREATION_ERROR',
        message: 'Failed to create payment'
      }
    });
  }
});

// Demo payment completion endpoint (for testing)
router.post('/demo-complete/:orderId', authenticateToken, [
  param('orderId').isMongoId().withMessage('Valid order ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Demo payment validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
    }

    const { orderId } = req.params;
    console.log('Demo payment request for order:', orderId, 'user:', req.user?.email || 'guest');
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Check if user owns this order or is admin (allow guest orders)
    if (req.user && !req.user.isAdmin && order.customer && order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only complete payments for your own orders'
        }
      });
    }

    // Check if order is already paid
    if (order.payment.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ORDER_ALREADY_PAID',
          message: 'Order has already been paid'
        }
      });
    }

    // Update order payment status
    order.payment.status = 'paid';
    order.payment.method = 'other'; // Use 'other' since 'demo' is not in enum
    order.payment.paidAt = new Date();
    order.payment.transactionId = `demo_${Date.now()}`;
    order.status = 'processing';
    
    // Associate order with authenticated user if not already associated
    console.log('Demo payment - req.user:', req.user ? req.user.email : 'null', 'order.customer:', order.customer);
    if (req.user && req.user._id && !order.customer) {
      order.customer = req.user._id;
      console.log('Associated order with user:', req.user.email);
    }
    
    await order.save();

    // Send wholesaler notifications
    try {
      const { processOrderNotifications } = require('../utils/wholesalerNotificationService');
      await processOrderNotifications(orderId);
    } catch (notificationError) {
      console.error('Wholesaler notification error:', notificationError);
    }

    res.json({
      success: true,
      message: 'Demo payment completed successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        payment: {
          status: order.payment.status,
          method: order.payment.method,
          paidAt: order.payment.paidAt
        }
      }
    });

  } catch (error) {
    console.error('Demo payment completion error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DEMO_PAYMENT_ERROR',
        message: 'Failed to complete demo payment'
      }
    });
  }
});

// Mollie webhook handler
router.post('/webhook', async (req, res) => {
  try {
    const { id: paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).send('Payment ID is required');
    }

    // Get payment details from Mollie
    const molliePayment = await mollieClient.payments.get(paymentId);
    
    // Find the order
    const order = await Order.findOne({ 'payment.molliePaymentId': paymentId });
    if (!order) {
      console.error(`Order not found for payment ID: ${paymentId}`);
      return res.status(404).send('Order not found');
    }

    // Update order based on payment status
    const previousStatus = order.payment.status;
    
    switch (molliePayment.status) {
      case 'paid':
        order.payment.status = 'paid';
        order.payment.paidAt = new Date(molliePayment.paidAt);
        order.payment.transactionId = molliePayment.details?.cardNumber || molliePayment.id;
        order.status = 'processing'; // Move order to processing
        break;
        
      case 'failed':
      case 'canceled':
      case 'expired':
        order.payment.status = 'failed';
        order.status = 'cancelled';
        break;
        
      case 'pending':
      case 'open':
        order.payment.status = 'pending';
        break;
        
      default:
        console.log(`Unhandled payment status: ${molliePayment.status}`);
    }

    await order.save();

    // Log status change
    console.log(`Payment ${paymentId} status changed from ${previousStatus} to ${molliePayment.status} for order ${order.orderNumber}`);

    // Send payment receipt and trigger wholesaler notifications if payment is successful
    if (molliePayment.status === 'paid' && previousStatus !== 'paid') {
      // Populate customer data for email
      await order.populate('customer', 'firstName lastName email preferences');
      
      try {
        const { sendPaymentReceipt } = require('../utils/emailService');
        
        let customerEmail, customerName, shouldSendEmail = true;
        
        if (order.customer) {
          // Registered user
          customerEmail = order.customer.email;
          customerName = `${order.customer.firstName} ${order.customer.lastName}`;
          shouldSendEmail = order.customer.preferences?.emailPreferences?.paymentReceipts !== false;
        } else {
          // Guest user
          customerEmail = order.guestInfo.email;
          customerName = `${order.guestInfo.firstName} ${order.guestInfo.lastName}`;
        }

        if (shouldSendEmail) {
          const paymentData = {
            orderNumber: order.orderNumber,
            customerName,
            total: order.total,
            paymentMethod: order.payment.method === 'card' ? 'Credit/Debit Card' : 
                          order.payment.method === 'crypto' ? 'Cryptocurrency' : 
                          order.payment.method,
            transactionId: order.payment.transactionId,
            paidAt: order.payment.paidAt
          };

          const emailResult = await sendPaymentReceipt(customerEmail, paymentData);
          if (!emailResult.success) {
            console.error('Failed to send payment receipt email:', emailResult.error);
          }
        }
      } catch (emailError) {
        console.error('Error sending payment receipt email:', emailError);
      }

      // Trigger wholesaler notifications
      try {
        const { sendWholesalerNotification } = require('../utils/emailService');
        
        // Process each item that needs wholesaler notification
        for (const item of order.items) {
          if (!item.wholesaler.notified && item.wholesaler.email) {
            const wholesalerData = {
              orderNumber: order.orderNumber,
              orderDate: order.createdAt.toLocaleDateString(),
              shippingAddress: order.shippingAddress,
              items: [{
                wholesaler: item.wholesaler,
                quantity: item.quantity,
                productName: item.product?.name || 'Product'
              }],
              notes: order.notes
            };

            const notificationResult = await sendWholesalerNotification(
              item.wholesaler.email, 
              wholesalerData
            );

            // Update notification status
            await order.updateWholesalerNotification(
              item._id, 
              notificationResult.success, 
              notificationResult.error
            );

            if (notificationResult.success) {
              console.log(`Wholesaler notification sent for order ${order.orderNumber}, item ${item._id}`);
            } else {
              console.error(`Failed to send wholesaler notification for order ${order.orderNumber}, item ${item._id}:`, notificationResult.error);
            }
          }
        }
      } catch (wholesalerError) {
        console.error('Error sending wholesaler notifications:', wholesalerError);
      }
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

// Check payment status
router.get('/status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Get payment from Mollie
    const molliePayment = await mollieClient.payments.get(paymentId);
    
    // Find associated order
    const order = await Order.findOne({ 'payment.molliePaymentId': paymentId });

    res.json({
      success: true,
      payment: {
        id: molliePayment.id,
        status: molliePayment.status,
        amount: molliePayment.amount,
        method: molliePayment.method,
        paidAt: molliePayment.paidAt,
        createdAt: molliePayment.createdAt,
        description: molliePayment.description
      },
      order: order ? {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.payment.status
      } : null
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment not found'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'PAYMENT_STATUS_ERROR',
        message: 'Failed to check payment status'
      }
    });
  }
});

// Get available payment methods
router.get('/methods', async (req, res) => {
  try {
    const { amount, currency = 'USD' } = req.query;

    const params = {};
    if (amount) {
      params.amount = {
        currency,
        value: parseFloat(amount).toFixed(2)
      };
    }

    const methods = await mollieClient.methods.list(params);

    const availableMethods = methods.map(method => ({
      id: method.id,
      description: method.description,
      minimumAmount: method.minimumAmount,
      maximumAmount: method.maximumAmount,
      image: method.image,
      pricing: method.pricing
    }));

    res.json({
      success: true,
      methods: availableMethods
    });

  } catch (error) {
    console.error('Payment methods error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PAYMENT_METHODS_ERROR',
        message: 'Failed to fetch payment methods'
      }
    });
  }
});

// Process refund (admin only)
router.post('/refund', requireAuth, async (req, res) => {
  try {
    const { paymentId, amount, description } = req.body;

    // Check if user is admin (you may want to add proper admin middleware)
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Admin access required'
        }
      });
    }

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PAYMENT_ID',
          message: 'Payment ID is required'
        }
      });
    }

    // Find the order
    const order = await Order.findOne({ 'payment.molliePaymentId': paymentId });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found for this payment'
        }
      });
    }

    // Prepare refund data
    const refundData = {
      description: description || `Refund for order ${order.orderNumber}`
    };

    if (amount) {
      refundData.amount = {
        currency: 'USD',
        value: parseFloat(amount).toFixed(2)
      };
    }

    // Create refund with Mollie
    const mollieRefund = await mollieClient.payments.refunds.create(paymentId, refundData);

    // Update order status
    if (mollieRefund.amount.value === order.total.toFixed(2)) {
      order.payment.status = 'refunded';
      order.status = 'cancelled';
    }
    await order.save();

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        id: mollieRefund.id,
        amount: mollieRefund.amount,
        status: mollieRefund.status,
        createdAt: mollieRefund.createdAt
      },
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.payment.status
      }
    });

  } catch (error) {
    console.error('Refund processing error:', error);
    
    if (error.field) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MOLLIE_REFUND_ERROR',
          message: `Mollie refund error: ${error.detail}`,
          field: error.field
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'REFUND_ERROR',
        message: 'Failed to process refund'
      }
    });
  }
});

// Test Mollie connection
router.get('/test', async (req, res) => {
  try {
    // Test by fetching payment methods
    const methods = await mollieClient.methods.list();
    
    res.json({
      success: true,
      message: 'Mollie connection successful',
      availableMethods: methods.length,
      testMode: process.env.MOLLIE_API_KEY?.startsWith('test_')
    });

  } catch (error) {
    console.error('Mollie test error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'MOLLIE_CONNECTION_ERROR',
        message: 'Failed to connect to Mollie API'
      }
    });
  }
});

module.exports = router;