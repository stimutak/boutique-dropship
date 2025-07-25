const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store');
    console.log('Connected to MongoDB\n');

    const userData = {
      email: 'oed@mac.com',
      password: 'TempPass123!',
      firstName: 'OED',
      lastName: 'User',
      isAdmin: true, // Set to true for admin access
      isActive: true
    };

    const user = new User(userData);
    await user.save();

    console.log('✅ User created successfully!');
    console.log(`📧 Email: ${userData.email}`);
    console.log(`🔑 Password: ${userData.password}`);
    console.log(`👤 Name: ${userData.firstName} ${userData.lastName}`);
    console.log(`🔐 Admin: ${userData.isAdmin ? 'Yes' : 'No'}`);
    console.log('\n⚠️  Please change the password after logging in!');

  } catch (error) {
    if (error.code === 11000) {
      console.error('User with this email already exists');
    } else {
      console.error('Error creating user:', error.message);
    }
  } finally {
    await mongoose.disconnect();
  }
};

createUser();