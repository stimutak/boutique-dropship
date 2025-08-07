const mongoose = require('mongoose');
const Order = require('../../models/Order');
const _Product = require('../../models/Product');

async function inspectOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store');
    
    // Find orders for user oed@mac.com
    const orders = await Order.find({ 'guestInfo.email': 'oed@mac.com' })
      .populate('items.product')
      .lean();
    
    console.log(`Found ${orders.length} orders for oed@mac.com\n`);
    
    orders.forEach((order, index) => {
      console.log(`Order ${index + 1}: ${order.orderNumber}`);
      console.log(`Status: ${order.status}`);
      console.log(`Total: $${order.total}`);
      console.log('Items:');
      order.items.forEach(item => {
        console.log(`  - Product: ${item.product ? item.product.name : 'NULL PRODUCT'} (ID: ${item.product?._id || 'NO ID'})`);
        console.log(`    Quantity: ${item.quantity}, Price: $${item.price}`);
      });
      console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

inspectOrders();