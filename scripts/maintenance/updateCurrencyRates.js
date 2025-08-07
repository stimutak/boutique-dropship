/**
 * Update currency rates for all products
 * This can be run manually or as a cron job
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../../models/Product');
const { STATIC_RATES, calculateAllPrices } = require('../utils/currency');

async function updateCurrencyRates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store');
    console.log('Connected to MongoDB');

    // In production, fetch rates from an API like:
    // const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    // const data = await response.json();
    // const rates = data.rates;
    
    // For now, use static rates
    const rates = STATIC_RATES;
    console.log('Using exchange rates:', rates);

    // Get all products
    const products = await Product.find({});
    console.log(`Found ${products.length} products to update`);

    let updated = 0;
    for (const product of products) {
      // Calculate prices for all currencies based on USD price
      const newPrices = calculateAllPrices(product.price, rates);
      
      // Update product prices
      product.prices = newPrices;
      product.baseCurrency = 'USD';
      
      // Update compareAtPrice if it exists
      if (product.compareAtPrice) {
        const compareAtPrices = calculateAllPrices(product.compareAtPrice, rates);
        // Store these in a separate field if needed
        product.compareAtPrices = compareAtPrices;
      }
      
      await product.save();
      updated++;
      
      if (updated % 10 === 0) {
        console.log(`Updated ${updated} products...`);
      }
    }

    console.log(`✅ Successfully updated ${updated} products with current exchange rates`);
    
    // Update exchange rates in a config collection if needed
    // This could be used to store the last update time and rates
    
  } catch (error) {
    console.error('Error updating currency rates:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  updateCurrencyRates();
}

module.exports = updateCurrencyRates;