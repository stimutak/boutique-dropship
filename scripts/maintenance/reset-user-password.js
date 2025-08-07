const mongoose = require('mongoose');
const User = require('../../models/User');
require('dotenv').config();

/**
 * Reset User Password Script
 * 
 * Usage: node reset-user-password.js [email] [password]
 * 
 * Examples:
 * - node reset-user-password.js oed@mac.com TempPass123!
 * - node reset-user-password.js (uses defaults)
 */

async function resetUserPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store');
    
    // Get email and password from command line args or use defaults
    const email = process.argv[2] || 'oed@mac.com';
    const newPassword = process.argv[3] || 'TempPass123!';
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User not found with email: ${email}`);
      process.exit(1);
    }
    
    // Set new password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();
    
    // Test it works
    const matches = await user.comparePassword(newPassword);
    
    console.log('\n=================================');
    console.log('PASSWORD RESET SUCCESSFUL');
    console.log('=================================');
    console.log(`Email: ${email}`);
    console.log(`New Password: ${newPassword}`);
    console.log('Password test:', matches ? '✅ VERIFIED' : '❌ FAILED');
    console.log('=================================');
    console.log('⚠️  Please change this password after logging in!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

resetUserPassword();