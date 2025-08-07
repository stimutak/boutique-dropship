const mongoose = require('mongoose');
const Order = require('../models/Order');

async function cleanupOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store');
    
    // Find orders with null products
    const ordersWithNullProducts = await Order.find({
      'items.product': null
    });
    
    console.log(`Found ${ordersWithNullProducts.length} orders with null products`);
    
    // Delete these orders
    if (ordersWithNullProducts.length > 0) {
      const result = await Order.deleteMany({
        'items.product': null
      });
      console.log(`Deleted ${result.deletedCount} orders with null products`);
    }
    
    // Show remaining orders
    const remainingOrders = await Order.countDocuments();
    console.log(`${remainingOrders} orders remain in the database`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

cleanupOrders();