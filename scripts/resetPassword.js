const mongoose = require('mongoose');
const User = require('../models/User');

async function resetUserPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store');
    
    const user = await User.findOne({ email: 'oed@mac.com' });
    if (!user) {
      console.log('User not found with email: oed@mac.com');
      process.exit(0);
    }
    
    // Set a new password
    user.password = 'TempPass123!';
    await user.save();
    
    console.log('\n=================================');
    console.log('PASSWORD RESET SUCCESSFUL');
    console.log('=================================');
    console.log('Email: oed@mac.com');
    console.log('New Password: TempPass123!');
    console.log('=================================');
    console.log('Please change this password after logging in!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetUserPassword();