console.log('Script starting...');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

console.log('Imports loaded...');

// Import models
const User = require('./models/User');
const Product = require('./models/Product');

console.log('Models imported...');

async function debugPopulate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/holistic-store', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check existing data
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    console.log(`Current users: ${userCount}, products: ${productCount}`);

    // Create a simple test product
    const testProduct = {
      name: 'Test Crystal',
      slug: 'test-crystal',
      description: 'A test crystal for debugging',
      shortDescription: 'Test crystal',
      price: 19.99,
      category: 'crystals',
      tags: ['test', 'crystal'],
      images: [{
        url: 'https://via.placeholder.com/400x400/9966cc/ffffff?text=Test',
        alt: 'Test Crystal',
        isPrimary: true
      }],
      properties: {
        chakra: ['test'],
        element: ['test'],
        zodiac: ['test'],
        healing: ['test']
      },
      wholesaler: {
        name: 'Test Wholesaler',
        email: 'test@example.com',
        productCode: 'TEST-001',
        cost: 10.00,
        minOrderQty: 1
      },
      seo: {
        title: 'Test Crystal',
        description: 'Test crystal for debugging',
        keywords: ['test', 'crystal']
      }
    };

    console.log('Creating test product...');
    const product = new Product(testProduct);
    await product.save();
    console.log('✅ Test product created:', product.name);

    // Create a test user
    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123',
      isAdmin: false
    };

    console.log('Creating test user...');
    const user = new User(testUser);
    await user.save();
    console.log('✅ Test user created:', user.email);

    // Final count
    const finalUserCount = await User.countDocuments();
    const finalProductCount = await Product.countDocuments();
    console.log(`Final count - Users: ${finalUserCount}, Products: ${finalProductCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

console.log('Starting debug populate...');
debugPopulate();