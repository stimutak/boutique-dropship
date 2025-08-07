const mongoose = require('mongoose');
require('dotenv').config();

// Following CLAUDE.md - addressing root causes, not workarounds
// This script adds missing indexes identified in performance analysis

async function addIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Add compound index for orders - frequently queried by status and date
    console.log('Adding index: orders (status, createdAt)...');
    await db.collection('orders').createIndex({ status: 1, createdAt: -1 });
    
    // Add index for customer order history queries
    console.log('Adding index: orders (customer, createdAt)...');
    await db.collection('orders').createIndex({ customer: 1, createdAt: -1 });

    // Add compound index for products - wholesaler queries with active filter
    console.log('Adding index: products (wholesaler, isActive)...');
    await db.collection('products').createIndex({ wholesaler: 1, isActive: 1 });
    
    // Add index for price-based queries with active filter
    console.log('Adding index: products (price, isActive)...');
    await db.collection('products').createIndex({ price: 1, isActive: 1 });

    // List all indexes to confirm
    console.log('\nCurrent indexes on orders collection:');
    const orderIndexes = await db.collection('orders').indexes();
    console.log(orderIndexes.map(idx => idx.name).join(', '));

    console.log('\nCurrent indexes on products collection:');
    const productIndexes = await db.collection('products').indexes();
    console.log(productIndexes.map(idx => idx.name).join(', '));

    console.log('\n✅ All indexes added successfully!');

  } catch (error) {
    console.error('Error adding indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
addIndexes();