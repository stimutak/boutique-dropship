
// Test script to demonstrate wholesaler notification functionality
// Creates sample orders and processes notifications

require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const { processPendingNotifications } = require('../utils/wholesalerNotificationService');

// Sample test data
const sampleProducts = [
  {
    name: 'Amethyst Crystal',
    slug: 'amethyst-crystal',
    description: 'Beautiful purple amethyst for spiritual healing',
    price: 29.99,
    category: 'crystals',
    properties: {
      chakra: ['crown', 'third-eye'],
      element: ['air'],
      healing: ['stress-relief', 'spiritual-growth']
    },
    wholesaler: {
      name: 'Crystal Wholesale Co',
      email: 'orders@crystalwholesale.com',
      productCode: 'AME-001',
      cost: 15.00
    }
  },
  {
    name: 'Lavender Essential Oil',
    slug: 'lavender-essential-oil',
    description: 'Pure lavender oil for relaxation and aromatherapy',
    price: 24.99,
    category: 'oils',
    properties: {
      chakra: ['heart'],
      element: ['earth'],
      healing: ['relaxation', 'sleep']
    },
    wholesaler: {
      name: 'Essential Oils Direct',
      email: 'fulfillment@oilsdirect.com',
      productCode: 'LAV-15ML',
      cost: 12.50
    }
  }
];

const sampleOrder = {
  orderNumber: 'ORD-TEST-' + Date.now(),
  guestInfo: {
    email: 'customer@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '555-123-4567'
  },
  shippingAddress: {
    firstName: 'Jane',
    lastName: 'Smith',
    street: '123 Wellness Way',
    city: 'Harmony',
    state: 'CA',
    zipCode: '90210',
    country: 'US',
    phone: '555-123-4567'
  },
  billingAddress: {
    firstName: 'Jane',
    lastName: 'Smith',
    street: '123 Wellness Way',
    city: 'Harmony',
    state: 'CA',
    zipCode: '90210',
    country: 'US'
  },
  subtotal: 54.98,
  tax: 4.40,
  shipping: 5.99,
  total: 65.37,
  payment: {
    method: 'card',
    status: 'paid',
    transactionId: 'test_' + Date.now(),
    paidAt: new Date()
  },
  status: 'processing',
  notes: 'Please handle with care - fragile items'
};

async function createTestData() {
  console.log('Creating test products...');
  
  // Clear existing test data
  await Product.deleteMany({ slug: { $in: ['amethyst-crystal', 'lavender-essential-oil'] } });
  await Order.deleteMany({ orderNumber: { $regex: /^ORD-TEST-/ } });
  
  // Create products
  const products = await Product.insertMany(sampleProducts);
  console.log(`Created ${products.length} test products`);
  
  // Create order with product references
  sampleOrder.items = [
    {
      product: products[0]._id,
      quantity: 1,
      price: products[0].price,
      wholesaler: products[0].wholesaler
    },
    {
      product: products[1]._id,
      quantity: 2,
      price: products[1].price,
      wholesaler: products[1].wholesaler
    }
  ];
  
  const order = await Order.create(sampleOrder);
  console.log(`Created test order: ${order.orderNumber}`);
  
  return { products, order };
}

async function testNotificationSystem() {
  try {
    console.log('=== WHOLESALER NOTIFICATION SYSTEM TEST ===\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to database\n');
    
    // Create test data
    const { _products, order } = await createTestData();
    console.log('✓ Test data created\n');
    
    // Show order before processing
    console.log('ORDER BEFORE NOTIFICATION:');
    console.log(`Order Number: ${order.orderNumber}`);
    console.log(`Status: ${order.status}`);
    console.log(`Payment Status: ${order.payment.status}`);
    console.log('Items:');
    order.items.forEach((item, index) => {
      console.log(`  ${index + 1}. Wholesaler: ${item.wholesaler.name}`);
      console.log(`     Email: ${item.wholesaler.email}`);
      console.log(`     Product Code: ${item.wholesaler.productCode}`);
      console.log(`     Notified: ${item.wholesaler.notified}`);
      console.log(`     Quantity: ${item.quantity}`);
    });
    console.log();
    
    // Process notifications
    console.log('PROCESSING NOTIFICATIONS...\n');
    const result = await processPendingNotifications();
    
    if (result.success) {
      console.log('✓ Notification processing completed');
      console.log(`  Orders processed: ${result.processed}`);
      console.log(`  Successful notifications: ${result.successCount || 0}`);
      console.log(`  Failed notifications: ${result.errorCount || 0}\n`);
      
      if (result.results && result.results.length > 0) {
        console.log('DETAILED RESULTS:');
        result.results.forEach(r => {
          const status = r.status === 'success' ? '✓' : '✗';
          console.log(`${status} Order ${r.orderNumber} - ${r.wholesalerEmail || 'N/A'}`);
          if (r.error) {console.log(`   Error: ${r.error}`);}
          if (r.messageId) {console.log(`   Message ID: ${r.messageId}`);}
        });
        console.log();
      }
      
      // Show order after processing
      const updatedOrder = await Order.findById(order._id);
      console.log('ORDER AFTER NOTIFICATION:');
      console.log(`Order Number: ${updatedOrder.orderNumber}`);
      updatedOrder.items.forEach((item, index) => {
        console.log(`  ${index + 1}. Wholesaler: ${item.wholesaler.name}`);
        console.log(`     Notified: ${item.wholesaler.notified}`);
        console.log(`     Notified At: ${item.wholesaler.notifiedAt || 'N/A'}`);
      });
      
    } else {
      console.error('✗ Processing failed:', result.error);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  testNotificationSystem();
}

module.exports = testNotificationSystem;