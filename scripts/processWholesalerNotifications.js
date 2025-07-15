#!/usr/bin/env node

// Standalone script to process pending wholesaler notifications
// Can be run manually or via cron job

require('dotenv').config();
const mongoose = require('mongoose');
const { processPendingNotifications } = require('../utils/wholesalerNotificationService');

async function main() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to database');
    
    // Process notifications
    const result = await processPendingNotifications();
    
    if (result.success) {
      console.log('\n=== NOTIFICATION PROCESSING COMPLETE ===');
      console.log(`Orders processed: ${result.processed}`);
      console.log(`Successful notifications: ${result.successCount || 0}`);
      console.log(`Failed notifications: ${result.errorCount || 0}`);
      
      if (result.results && result.results.length > 0) {
        console.log('\nDetailed Results:');
        result.results.forEach(r => {
          const status = r.status === 'success' ? '✓' : '✗';
          console.log(`${status} Order ${r.orderNumber} - ${r.wholesalerEmail || 'N/A'}`);
          if (r.error) console.log(`   Error: ${r.error}`);
        });
      }
    } else {
      console.error('Processing failed:', result.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Script error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = main;