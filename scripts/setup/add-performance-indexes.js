const mongoose = require('mongoose');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const User = require('../../models/User');
require('dotenv').config();

async function addPerformanceIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');
    console.log('Adding performance indexes...');

    // Product indexes for admin queries
    console.log('\n--- Product Indexes ---');
    
    // Index for wholesaler queries
    await Product.collection.createIndex({ 'wholesaler.email': 1 });
    console.log('✓ Added index: wholesaler.email');
    
    // Index for inventory tracking queries
    await Product.collection.createIndex({ 
      'inventory.trackInventory': 1,
      'inventory.stock': 1,
      'inventory.lowStockThreshold': 1
    });
    console.log('✓ Added compound index: inventory tracking');
    
    // Index for category and status queries
    await Product.collection.createIndex({ category: 1, isActive: 1, createdAt: -1 });
    console.log('✓ Added compound index: category + isActive + createdAt');
    
    // Index for search queries
    await Product.collection.createIndex({ 
      name: 'text', 
      description: 'text',
      tags: 'text' 
    });
    console.log('✓ Added text index for search');

    // Order indexes for analytics
    console.log('\n--- Order Indexes ---');
    
    // Index for date range queries with payment status
    await Order.collection.createIndex({ 
      createdAt: -1, 
      'payment.status': 1 
    });
    console.log('✓ Added compound index: createdAt + payment.status');
    
    // Index for customer analytics
    await Order.collection.createIndex({ 
      customer: 1, 
      'payment.status': 1,
      createdAt: -1 
    });
    console.log('✓ Added compound index: customer + payment.status + createdAt');
    
    // Index for product performance queries
    await Order.collection.createIndex({ 
      'items.product': 1,
      'payment.status': 1,
      createdAt: -1
    });
    console.log('✓ Added compound index: items.product + payment.status + createdAt');
    
    // Index for currency analytics
    await Order.collection.createIndex({ 
      'currency.code': 1,
      'payment.status': 1,
      createdAt: -1
    });
    console.log('✓ Added compound index: currency.code + payment.status + createdAt');

    // User indexes
    console.log('\n--- User Indexes ---');
    
    // Index for role-based queries
    await User.collection.createIndex({ role: 1, isActive: 1 });
    console.log('✓ Added compound index: role + isActive');
    
    // Index for name search
    await User.collection.createIndex({ firstName: 1, lastName: 1 });
    console.log('✓ Added compound index: firstName + lastName');

    // List all indexes
    console.log('\n--- Current Indexes ---');
    
    const productIndexes = await Product.collection.indexes();
    console.log('\nProduct indexes:', productIndexes.length);
    productIndexes.forEach(idx => {
      console.log('  -', idx.name, ':', JSON.stringify(idx.key));
    });
    
    const orderIndexes = await Order.collection.indexes();
    console.log('\nOrder indexes:', orderIndexes.length);
    orderIndexes.forEach(idx => {
      console.log('  -', idx.name, ':', JSON.stringify(idx.key));
    });
    
    const userIndexes = await User.collection.indexes();
    console.log('\nUser indexes:', userIndexes.length);
    userIndexes.forEach(idx => {
      console.log('  -', idx.name, ':', JSON.stringify(idx.key));
    });

    console.log('\n✅ Performance indexes added successfully!');

  } catch (error) {
    console.error('Error adding indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
addPerformanceIndexes();