const mongoose = require('mongoose');
const Product = require('../models/Product');
const axios = require('axios');
require('dotenv').config();

// Replacement images for different product types
const replacementImages = {
  'Palo Santo Sticks - Pack of 5': 'https://images.unsplash.com/photo-1601128533718-374ffcca299b?w=800',
  'White Sage Smudge Bundle': 'https://images.unsplash.com/photo-1607443158658-f2991e61c793?w=800',
  'Meditation Cushion Set': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
  'Premium Cork Yoga Mat': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
  'Eucalyptus Essential Oil - 30ml': 'https://images.unsplash.com/photo-1608482620651-e9e4bd2d3286?w=800',
  'Lavender Essential Oil - 30ml': 'https://images.unsplash.com/photo-1587552566826-5740db373834?w=800',
  'Rose Quartz Heart': 'https://images.unsplash.com/photo-1602498456745-e9503b30470b?w=800'
};

async function checkImage(url) {
  try {
    const response = await axios.head(url);
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

async function fixBrokenImages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Get all products
    const products = await Product.find();
    console.log(`\n📦 Found ${products.length} products to check`);
    
    let fixed = 0;
    
    for (const product of products) {
      if (product.images && product.images.length > 0) {
        const imageUrl = product.images[0].url;
        console.log(`\nChecking ${product.name}...`);
        
        const isValid = await checkImage(imageUrl);
        
        if (!isValid) {
          console.log(`❌ Broken image detected for ${product.name}`);
          
          // Use replacement image if available
          if (replacementImages[product.name]) {
            product.images[0].url = replacementImages[product.name];
            await product.save();
            console.log(`✅ Fixed with replacement image`);
            fixed++;
          } else {
            // Use a generic placeholder based on category
            let placeholder;
            switch(product.category) {
              case 'crystals':
                placeholder = 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800';
                break;
              case 'herbs':
                placeholder = 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800';
                break;
              case 'oils':
                placeholder = 'https://images.unsplash.com/photo-1600197419560-52f0fbe680ca?w=800';
                break;
              case 'accessories':
                placeholder = 'https://images.unsplash.com/photo-1561087867-4972ca8d1298?w=800';
                break;
              default:
                placeholder = 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800';
            }
            
            product.images[0].url = placeholder;
            await product.save();
            console.log(`✅ Fixed with category placeholder`);
            fixed++;
          }
        } else {
          console.log(`✅ Image is valid`);
        }
      }
    }
    
    console.log(`\n🎉 Fixed ${fixed} broken images`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

fixBrokenImages();