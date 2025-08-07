const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const resetPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store');
    console.log('Connected to MongoDB\n');

    const email = 'oed@mac.com';
    const newPassword = 'Password123'; // Simpler password without special chars in the middle
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ User ${email} not found`);
      return;
    }

    // Set the new password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    console.log('✅ Password reset successful!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log('\n⚠️  Please change this password after logging in!');

  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await mongoose.disconnect();
  }
};

resetPassword();