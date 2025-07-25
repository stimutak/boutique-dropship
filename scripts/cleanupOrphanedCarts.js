#!/usr/bin/env node

/**
 * Cleanup script for orphaned guest carts
 * This script removes duplicate and expired guest carts to prevent cart persistence issues
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Cart = require('../models/Cart');

async function cleanupOrphanedCarts() {
  try {
    console.log('Starting orphaned cart cleanup...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/boutique');
    console.log('Connected to MongoDB');
    
    // Find all guest carts grouped by sessionId
    const cartGroups = await Cart.aggregate([
      {
        $group: {
          _id: '$sessionId',
          carts: { $push: { id: '$_id', updatedAt: '$updatedAt', itemCount: { $size: '$items' } } },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);
    
    console.log(`Found ${cartGroups.length} session IDs with duplicate carts`);
    
    let totalDeleted = 0;
    
    // For each session with duplicates, keep the most recent and delete the rest
    for (const group of cartGroups) {
      const { _id: sessionId, carts } = group;
      
      // Sort by updatedAt descending (most recent first)
      carts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      // Keep the first (most recent) cart, delete the rest
      const cartsToDelete = carts.slice(1);
      
      console.log(`Session ${sessionId}: Keeping 1 cart, deleting ${cartsToDelete.length} duplicates`);
      
      for (const cart of cartsToDelete) {
        await Cart.deleteOne({ _id: cart.id });
        totalDeleted++;
      }
    }
    
    // Also clean up expired carts
    const expiredResult = await Cart.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    console.log(`Deleted ${expiredResult.deletedCount} expired carts`);
    totalDeleted += expiredResult.deletedCount;
    
    // Clean up empty carts older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const emptyOldResult = await Cart.deleteMany({
      items: { $size: 0 },
      updatedAt: { $lt: oneHourAgo }
    });
    
    console.log(`Deleted ${emptyOldResult.deletedCount} empty old carts`);
    totalDeleted += emptyOldResult.deletedCount;
    
    console.log(`\nCleanup complete! Total carts deleted: ${totalDeleted}`);
    
    // Show remaining cart statistics
    const remainingCarts = await Cart.countDocuments();
    const nonEmptyCarts = await Cart.countDocuments({ items: { $not: { $size: 0 } } });
    
    console.log(`Remaining carts: ${remainingCarts} (${nonEmptyCarts} with items)`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupOrphanedCarts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = cleanupOrphanedCarts;