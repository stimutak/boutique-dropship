const Order = require('../models/Order');
const _Product = require('../models/Product');
const { sendWholesalerNotification } = require('./emailService');
const { logger } = require('./logger');
// Process pending wholesaler notifications
const processPendingNotifications = async () => {
  try {
    logger.info('Checking for orders requiring wholesaler notifications...');
    
    // Find orders with paid/processing status that have unnotified wholesalers
    const ordersToNotify = await Order.find({
      $or: [
        { 'payment.status': 'paid' },
        { status: 'processing' }
      ],
      'items.wholesaler.notified': false
    }).populate('items.product');

    if (ordersToNotify.length === 0) {
      logger.info('No orders requiring wholesaler notifications found.');
      return { success: true, processed: 0 };
    }

    logger.info(`Found ${ordersToNotify.length} orders requiring notifications.`);
    
    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const order of ordersToNotify) {
      try {
        // Group items by wholesaler email
        const wholesalerGroups = {};
        
        for (const item of order.items) {
          if (!item.wholesaler.notified && item.wholesaler.email) {
            const email = item.wholesaler.email;
            if (!wholesalerGroups[email]) {
              wholesalerGroups[email] = {
                wholesalerName: item.wholesaler.name,
                items: []
              };
            }
            
            // Add product name from populated product
            const itemWithProductName = {
              ...item.toObject(),
              productName: item.product ? item.product.name : 'Unknown Product'
            };
            
            wholesalerGroups[email].items.push(itemWithProductName);
          }
        }

        // Send notification to each wholesaler
        for (const [wholesalerEmail, group] of Object.entries(wholesalerGroups)) {
          const orderData = {
            orderNumber: order.orderNumber,
            orderDate: order.createdAt.toLocaleDateString(),
            shippingAddress: order.shippingAddress,
            items: group.items,
            notes: order.notes
          };

          logger.info(`Sending notification to ${wholesalerEmail} for order ${order.orderNumber}...`);
          
          const emailResult = await sendWholesalerNotification(wholesalerEmail, orderData);
          
          if (emailResult.success) {
            // Update all items for this wholesaler as notified
            const currentTime = new Date();
            
            for (let i = 0; i < order.items.length; i++) {
              if (order.items[i].wholesaler.email === wholesalerEmail && !order.items[i].wholesaler.notified) {
                order.items[i].wholesaler.notified = true;
                order.items[i].wholesaler.notifiedAt = currentTime;
              }
            }
            
            await order.save();
            
            logger.info(`✓ Successfully notified ${wholesalerEmail} for order ${order.orderNumber}`);
            successCount++;
            
            results.push({
              orderNumber: order.orderNumber,
              wholesalerEmail,
              status: 'success',
              messageId: emailResult.messageId
            });
          } else {
            logger.error(`✗ Failed to notify ${wholesalerEmail} for order ${order.orderNumber}: ${emailResult.error}`);
            errorCount++;
            
            results.push({
              orderNumber: order.orderNumber,
              wholesalerEmail,
              status: 'error',
              error: emailResult.error
            });
          }
        }
        
      } catch (orderError) {
        logger.error(`Error processing order ${order.orderNumber}:`, orderError.message);
        errorCount++;
        
        results.push({
          orderNumber: order.orderNumber,
          status: 'error',
          error: orderError.message
        });
      }
    }

    logger.info(`Notification processing complete. Success: ${successCount}, Errors: ${errorCount}`);
    
    return {
      success: true,
      processed: ordersToNotify.length,
      successCount,
      errorCount,
      results
    };
    
  } catch (error) {
    logger.error('Error in processPendingNotifications:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Process notifications for a specific order
const processOrderNotifications = async (orderId) => {
  try {
    const order = await Order.findById(orderId).populate('items.product');
    
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Check if order is in correct status
    if (order.payment.status !== 'paid' && order.status !== 'processing') {
      return { 
        success: false, 
        error: 'Order must be paid or processing to send wholesaler notifications' 
      };
    }

    // Process notifications for this specific order
    const results = [];
    const wholesalerGroups = {};
    
    // Group items by wholesaler
    for (const item of order.items) {
      if (!item.wholesaler.notified && item.wholesaler.email) {
        const email = item.wholesaler.email;
        if (!wholesalerGroups[email]) {
          wholesalerGroups[email] = {
            wholesalerName: item.wholesaler.name,
            items: []
          };
        }
        
        const itemWithProductName = {
          ...item.toObject(),
          productName: item.product ? item.product.name : 'Unknown Product'
        };
        
        wholesalerGroups[email].items.push(itemWithProductName);
      }
    }

    if (Object.keys(wholesalerGroups).length === 0) {
      return { 
        success: true, 
        message: 'No pending wholesaler notifications for this order',
        results: []
      };
    }

    // Send notifications
    for (const [wholesalerEmail, group] of Object.entries(wholesalerGroups)) {
      const orderData = {
        orderNumber: order.orderNumber,
        orderDate: order.createdAt.toLocaleDateString(),
        shippingAddress: order.shippingAddress,
        items: group.items,
        notes: order.notes
      };

      const emailResult = await sendWholesalerNotification(wholesalerEmail, orderData);
      
      if (emailResult.success) {
        // Update items as notified
        const currentTime = new Date();
        
        for (let i = 0; i < order.items.length; i++) {
          if (order.items[i].wholesaler.email === wholesalerEmail && !order.items[i].wholesaler.notified) {
            order.items[i].wholesaler.notified = true;
            order.items[i].wholesaler.notifiedAt = currentTime;
          }
        }
        
        results.push({
          wholesalerEmail,
          status: 'success',
          messageId: emailResult.messageId
        });
      } else {
        results.push({
          wholesalerEmail,
          status: 'error',
          error: emailResult.error
        });
      }
    }

    await order.save();
    
    return {
      success: true,
      orderNumber: order.orderNumber,
      results
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  processPendingNotifications,
  processOrderNotifications
};