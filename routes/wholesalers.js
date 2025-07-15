const express = require('express');
const router = express.Router();
const { processPendingNotifications, processOrderNotifications } = require('../utils/wholesalerNotificationService');
const Order = require('../models/Order');

// GET /api/wholesalers/test
// Test endpoint to verify the system is working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Wholesaler notification system is active',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/wholesalers/process-notifications - Process all pending notifications',
      'POST /api/wholesalers/notify/:orderId - Process notifications for specific order',
      'GET /api/wholesalers/pending - Get orders with pending notifications',
      'GET /api/wholesalers/status/:orderId - Get notification status for order'
    ]
  });
});

// POST /api/wholesalers/process-notifications
// Process all pending wholesaler notifications
router.post('/process-notifications', async (req, res) => {
  try {
    const result = await processPendingNotifications();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Notification processing completed',
        data: {
          processed: result.processed,
          successCount: result.successCount || 0,
          errorCount: result.errorCount || 0,
          results: result.results || []
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/wholesalers/notify/:orderId
// Process notifications for a specific order
router.post('/notify/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await processOrderNotifications(orderId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message || 'Order notifications processed',
        data: {
          orderNumber: result.orderNumber,
          results: result.results || []
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/wholesalers/pending
// Get list of orders with pending wholesaler notifications
router.get('/pending', async (req, res) => {
  try {
    const pendingOrders = await Order.find({
      $or: [
        { 'payment.status': 'paid' },
        { status: 'processing' }
      ],
      'items.wholesaler.notified': false
    }).select('orderNumber createdAt status payment.status items.wholesaler');
    
    const summary = pendingOrders.map(order => ({
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      status: order.status,
      paymentStatus: order.payment.status,
      pendingWholesalers: order.items
        .filter(item => !item.wholesaler.notified && item.wholesaler.email)
        .map(item => ({
          wholesalerName: item.wholesaler.name,
          wholesalerEmail: item.wholesaler.email,
          productCode: item.wholesaler.productCode
        }))
    }));
    
    res.json({
      success: true,
      data: {
        count: pendingOrders.length,
        orders: summary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/wholesalers/status/:orderId
// Get wholesaler notification status for a specific order
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).select('orderNumber items.wholesaler');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    const wholesalerStatus = order.items.map(item => ({
      wholesalerName: item.wholesaler.name,
      wholesalerEmail: item.wholesaler.email,
      productCode: item.wholesaler.productCode,
      notified: item.wholesaler.notified,
      notifiedAt: item.wholesaler.notifiedAt
    }));
    
    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        wholesalers: wholesalerStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;