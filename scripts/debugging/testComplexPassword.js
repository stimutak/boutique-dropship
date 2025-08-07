const mongoose = require('mongoose');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

async function testComplexPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store');
    
    // Test various complex passwords
    const testPasswords = [
      'TempPass123!',
      'Complex@Pass#2024',
      'P@ssw0rd!123',
      'Test$123%Pass',
      'Simple123'
    ];
    
    console.log('\n=================================');
    console.log('TESTING COMPLEX PASSWORD SUPPORT');
    console.log('=================================\n');
    
    // Create a test user
    const testUser = new User({
      email: 'test-complex@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'Initial123'
    });
    
    for (const password of testPasswords) {
      console.log(`Testing password: "${password}"`);
      
      // Set and save password
      testUser.password = password;
      testUser.isModified('password'); // Force password to be marked as modified
      await testUser.save();
      
      // Test the password
      const matches = await testUser.comparePassword(password);
      console.log(`  - Password comparison: ${matches ? 'PASS' : 'FAIL'}`);
      
      // Test with bcrypt directly
      const directMatch = await bcrypt.compare(password, testUser.password);
      console.log(`  - Direct bcrypt test: ${directMatch ? 'PASS' : 'FAIL'}`);
      console.log(`  - Hash length: ${testUser.password.length}`);
      console.log('');
    }
    
    // Clean up
    await User.deleteOne({ email: 'test-complex@example.com' });
    
    console.log('=================================\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testComplexPassword();