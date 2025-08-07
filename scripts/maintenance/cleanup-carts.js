
/**
 * Cart Cleanup Script
 * 
 * This script fixes common cart issues:
 * 1. Removes duplicate guest carts with same session ID
 * 2. Cleans up expired guest carts
 * 3. Removes orphaned carts with invalid session IDs
 * 4. Fixes user carts with invalid product references
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Cart = require('../../models/Cart');
const User = require('../../models/User');
const Product = require('../../models/Product');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/boutique', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function cleanupDuplicateGuestCarts() {
  console.log('\n=== Cleaning up duplicate guest carts ===');
  
  try {
    // Find all session IDs that have multiple carts
    const duplicates = await Cart.aggregate([
      {
        $group: {
          _id: '$sessionId',
          count: { $sum: 1 },
          carts: { $push: { id: '$_id', updatedAt: '$updatedAt', itemCount: { $size: '$items' } } }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);
    
    console.log(`Found ${duplicates.length} session IDs with duplicate carts`);
    
    let totalDeleted = 0;
    
    for (const duplicate of duplicates) {
      const sessionId = duplicate._id;
      const carts = duplicate.carts;
      
      // Sort by updatedAt (most recent first), then by item count (most items first)
      carts.sort((a, b) => {
        if (a.itemCount !== b.itemCount) {
          return b.itemCount - a.itemCount; // More items first
        }
        return new Date(b.updatedAt) - new Date(a.updatedAt); // Most recent first
      });
      
      // Keep the first cart (most recent with most items), delete the rest
      const cartsToDelete = carts.slice(1);
      
      console.log(`Session ${sessionId}: keeping 1 cart, deleting ${cartsToDelete.length} duplicates`);
      
      for (const cartToDelete of cartsToDelete) {
        await Cart.deleteOne({ _id: cartToDelete.id });
        totalDeleted++;
      }
    }
    
    console.log(`Deleted ${totalDeleted} duplicate guest carts`);
  } catch (error) {
    console.error('Error cleaning up duplicate carts:', error);
  }
}

async function cleanupExpiredGuestCarts() {
  console.log('\n=== Cleaning up expired guest carts ===');
  
  try {
    const result = await Cart.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    console.log(`Deleted ${result.deletedCount} expired guest carts`);
  } catch (error) {
    console.error('Error cleaning up expired carts:', error);
  }
}

async function cleanupOrphanedGuestCarts() {
  console.log('\n=== Cleaning up orphaned guest carts ===');
  
  try {
    // Find carts with invalid session IDs or very old empty carts
    const orphanedCarts = await Cart.find({
      $or: [
        { sessionId: { $not: /^guest_\d+_[a-z0-9]+$/ } }, // Invalid session ID format
        { 
          items: { $size: 0 }, 
          createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Empty carts older than 24 hours
        }
      ]
    });
    
    console.log(`Found ${orphanedCarts.length} orphaned guest carts`);
    
    if (orphanedCarts.length > 0) {
      const result = await Cart.deleteMany({
        _id: { $in: orphanedCarts.map(cart => cart._id) }
      });
      
      console.log(`Deleted ${result.deletedCount} orphaned guest carts`);
    }
  } catch (error) {
    console.error('Error cleaning up orphaned carts:', error);
  }
}

async function fixUserCartsWithInvalidProducts() {
  console.log('\n=== Fixing user carts with invalid product references ===');
  
  try {
    const users = await User.find({ 'cart.items.0': { $exists: true } });
    console.log(`Found ${users.length} users with cart items`);
    
    let totalFixed = 0;
    
    for (const user of users) {
      if (!user.cart || !user.cart.items) {continue;}
      
      const validItems = [];
      let removedItems = 0;
      
      for (const item of user.cart.items) {
        try {
          const product = await Product.findById(item.product);
          if (product && product.isActive) {
            // Update price if it's different
            if (item.price !== product.price) {
              item.price = product.price;
            }
            validItems.push(item);
          } else {
            removedItems++;
          }
        } catch (error) {
          console.error(`Error checking product ${item.product}:`, error);
          removedItems++;
        }
      }
      
      if (removedItems > 0) {
        user.cart.items = validItems;
        user.cart.updatedAt = new Date();
        await user.save();
        
        console.log(`Fixed cart for user ${user.email}: removed ${removedItems} invalid items`);
        totalFixed++;
      }
    }
    
    console.log(`Fixed ${totalFixed} user carts with invalid product references`);
  } catch (error) {
    console.error('Error fixing user carts:', error);
  }
}

async function generateCartReport() {
  console.log('\n=== Cart Status Report ===');
  
  try {
    const guestCartCount = await Cart.countDocuments();
    const guestCartsWithItems = await Cart.countDocuments({ 'items.0': { $exists: true } });
    const userCartsWithItems = await User.countDocuments({ 'cart.items.0': { $exists: true } });
    
    const totalGuestItems = await Cart.aggregate([
      { $unwind: '$items' },
      { $group: { _id: null, total: { $sum: '$items.quantity' } } }
    ]);
    
    const totalUserItems = await User.aggregate([
      { $unwind: '$cart.items' },
      { $group: { _id: null, total: { $sum: '$cart.items.quantity' } } }
    ]);
    
    console.log(`Guest carts: ${guestCartCount} total, ${guestCartsWithItems} with items`);
    console.log(`User carts: ${userCartsWithItems} with items`);
    console.log(`Total guest cart items: ${totalGuestItems[0]?.total || 0}`);
    console.log(`Total user cart items: ${totalUserItems[0]?.total || 0}`);
    
    // Check for recent activity
    const recentGuestCarts = await Cart.countDocuments({
      updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    console.log(`Guest carts active in last 24h: ${recentGuestCarts}`);
    
  } catch (error) {
    console.error('Error generating cart report:', error);
  }
}

async function main() {
  console.log('Starting cart cleanup process...');
  
  await connectDB();
  
  // Run cleanup operations
  await cleanupDuplicateGuestCarts();
  await cleanupExpiredGuestCarts();
  await cleanupOrphanedGuestCarts();
  await fixUserCartsWithInvalidProducts();
  
  // Generate final report
  await generateCartReport();
  
  console.log('\nCart cleanup completed!');
  
  await mongoose.connection.close();
  process.exit(0);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  cleanupDuplicateGuestCarts,
  cleanupExpiredGuestCarts,
  cleanupOrphanedGuestCarts,
  fixUserCartsWithInvalidProducts,
  generateCartReport
};