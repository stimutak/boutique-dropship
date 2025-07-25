const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const testLogin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store');
    console.log('Connected to MongoDB\n');

    const email = 'oed@mac.com';
    const password = 'TempPass123!';
    
    // Find the user
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ User ${email} not found`);
      return;
    }

    console.log(`✅ User found: ${email}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Admin: ${user.isAdmin}`);
    console.log(`   Password hash exists: ${!!user.password}`);
    console.log(`   Password hash: ${user.password.substring(0, 20)}...`);

    // Test password comparison
    const isMatch = await user.comparePassword(password);
    console.log(`\n🔐 Password comparison: ${isMatch ? 'MATCH' : 'NO MATCH'}`);

    // Try direct bcrypt comparison
    const directMatch = await bcrypt.compare(password, user.password);
    console.log(`🔐 Direct bcrypt comparison: ${directMatch ? 'MATCH' : 'NO MATCH'}`);

    // Let's also check what the server expects
    console.log(`\n📋 Server Configuration:`);
    console.log(`   JWT_SECRET exists: ${!!process.env.JWT_SECRET}`);
    console.log(`   JWT_SECRET length: ${process.env.JWT_SECRET?.length}`);
    console.log(`   Frontend URL: ${process.env.FRONTEND_URL}`);

  } catch (error) {
    console.error('Error testing login:', error);
  } finally {
    await mongoose.disconnect();
  }
};

testLogin();