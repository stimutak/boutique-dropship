const mongoose = require('mongoose');
const Order = require('../models/Order');
const _Product = require('../models/Product');

async function deleteNullProductOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store');
    
    // Find all orders
    const allOrders = await Order.find({}).populate('items.product');
    
    const ordersToDelete = [];
    
    for (const order of allOrders) {
      // Check if any item has a null product
      const hasNullProduct = order.items.some(item => !item.product);
      if (hasNullProduct) {
        ordersToDelete.push(order._id);
      }
    }
    
    console.log(`Found ${ordersToDelete.length} orders with null products`);
    
    if (ordersToDelete.length > 0) {
      const result = await Order.deleteMany({ _id: { $in: ordersToDelete } });
      console.log(`Deleted ${result.deletedCount} orders`);
    }
    
    // Count remaining orders
    const remainingOrders = await Order.countDocuments();
    console.log(`${remainingOrders} valid orders remain`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

deleteNullProductOrders();