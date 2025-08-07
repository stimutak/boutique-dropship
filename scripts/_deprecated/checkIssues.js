const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

async function checkIssues() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Check products
    const products = await Product.find().lean();
    console.log(`\n📦 Found ${products.length} products`);
    
    // Check first product structure
    if (products.length > 0) {
      const firstProduct = products[0];
      console.log('\n🔍 First product structure:');
      console.log('- Name:', firstProduct.name);
      console.log('- Slug:', firstProduct.slug);
      console.log('- Price:', firstProduct.price);
      console.log('- Images:', firstProduct.images?.length || 0);
      console.log('- First image:', firstProduct.images?.[0]);
      console.log('- Category:', firstProduct.category);
      console.log('- IsActive:', firstProduct.isActive);
    }
    
    // Check for common issues
    console.log('\n🔍 Checking for common issues:');
    
    // Check images
    const productsWithoutImages = products.filter(p => !p.images || p.images.length === 0);
    console.log(`- Products without images: ${productsWithoutImages.length}`);
    
    // Check inactive products
    const inactiveProducts = products.filter(p => !p.isActive);
    console.log(`- Inactive products: ${inactiveProducts.length}`);
    
    // Check slugs
    const productsWithoutSlugs = products.filter(p => !p.slug);
    console.log(`- Products without slugs: ${productsWithoutSlugs.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkIssues();