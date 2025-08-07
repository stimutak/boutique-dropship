const mongoose = require('mongoose');
const Product = require('../../models/Product');
require('dotenv').config();

const workingImages = {
  'Copper Healing Ring': 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800', // Generic crystal/jewelry
  'Chakra Healing Bracelet': 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800', // Bracelet
  'White Sage Smudge Bundle': 'https://images.unsplash.com/photo-1519638831568-d9897f54ed69?w=800', // Herbs/sage
  'Eucalyptus Essential Oil - 30ml': 'https://images.unsplash.com/photo-1540202686899-71a053e9ff5e?w=800' // Essential oil bottles
};

async function fixImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    
    for (const [productName, newImageUrl] of Object.entries(workingImages)) {
      const product = await Product.findOne({ name: productName });
      if (product) {
        product.images[0].url = newImageUrl;
        await product.save();
        console.log(`✅ Fixed image for ${productName}`);
      }
    }
    
    console.log('\n✅ All images fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

fixImages();