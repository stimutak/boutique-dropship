const mongoose = require('mongoose');
const Cart = require('../models/Cart');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clean up old guest carts
const cleanupGuestCarts = async () => {
  try {
    // Delete carts older than 1 day with no items or very old
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const result = await Cart.deleteMany({
      $or: [
        { items: { $size: 0 } }, // Empty carts
        { updatedAt: { $lt: oneDayAgo } }, // Old carts
        { createdAt: { $lt: oneDayAgo } } // Old carts
      ]
    });
    
    console.log(`Cleaned up ${result.deletedCount} old guest carts`);
    
    // Show remaining carts for debugging
    const remainingCarts = await Cart.find({}).select('sessionId items createdAt updatedAt');
    console.log('Remaining guest carts:', remainingCarts.length);
    
    remainingCarts.forEach(cart => {
      console.log(`- Session: ${cart.sessionId}, Items: ${cart.items.length}, Created: ${cart.createdAt}, Updated: ${cart.updatedAt}`);
    });
    
  } catch (error) {
    console.error('Error cleaning up guest carts:', error);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await cleanupGuestCarts();
  await mongoose.connection.close();
  console.log('Cleanup complete');
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { cleanupGuestCarts };