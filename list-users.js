const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const listUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store');
    console.log('Connected to MongoDB\n');

    const users = await User.find({}, 'email firstName lastName isAdmin createdAt');
    
    console.log(`Found ${users.length} users:\n`);
    
    users.forEach(user => {
      console.log(`📧 ${user.email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Admin: ${user.isAdmin ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.createdAt.toLocaleDateString()}\n`);
    });

  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await mongoose.disconnect();
  }
};

listUsers();