const express = require('express');
const router = express.Router();
const { createMollieClient } = require('@mollie/api-client');
const Order = require('../models/Order');
const { requireAuth } = require('../middleware/auth');

// Initialize Mollie client
const mollieClient = createMollieClient({ 
  apiKey: process.env.MOLLIE_API_KEY 
});

// Create payment for order
router.post('/create', async (req, res) => {
  try {
    const { orderId, method = 'creditcard', redirectUrl, webhookUrl } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ORDER_ID',
          message: 'Order ID is required'
        }
      });
    }

    // Find the order
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
      payment: {
        id: molliePayment.id,
        status: molliePayment.status,
        checkoutUrl: molliePayment.getCheckoutUrl(),
        amount: molliePayment.amount,
        method: molliePayment.method,
        createdAt: molliePayment.createdAt
      },
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        total: order.total
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

    // TODO: Send confirmation email if payment is successful
    // TODO: Trigger wholesaler notifications if payment is successful

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