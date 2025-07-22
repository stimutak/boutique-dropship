const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function debugUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store');
    
    const user = await User.findOne({ email: 'oed@mac.com' });
    if (!user) {
      console.log('User not found with email: oed@mac.com');
      process.exit(0);
    }
    
    console.log('\n=================================');
    console.log('USER DEBUG INFO');
    console.log('=================================');
    console.log('Email:', user.email);
    console.log('Name:', user.firstName, user.lastName);
    console.log('Is Active:', user.isActive);
    console.log('Created:', user.createdAt);
    console.log('Password hash exists:', !!user.password);
    console.log('Password hash length:', user.password ? user.password.length : 0);
    
    // Test password
    const testPassword = 'TempPass123!';
    const isMatch = await user.comparePassword(testPassword);
    console.log('\nPassword test for "TempPass123!":',isMatch);
    
    // Test bcrypt directly
    const directMatch = await bcrypt.compare(testPassword, user.password);
    console.log('Direct bcrypt test:', directMatch);
    
    console.log('=================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

debugUser();