const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const resetPassword = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store');
    console.log('Connected to MongoDB');

    // Find the user
    const email = 'oed@mac.com';
    const newPassword = 'TempPass123!'; // Temporary password
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`User ${email} not found`);
      process.exit(1);
    }

    // Update the password
    user.password = newPassword; // The model's pre-save hook will hash it
    await user.save();

    console.log(`\n✅ Password reset successful for ${email}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log(`\n⚠️  Please change this password after logging in!\n`);

  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await mongoose.disconnect();
  }
};

resetPassword();