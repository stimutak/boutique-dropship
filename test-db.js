const mongoose = require('mongoose');

async function testDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/holistic-store');
    console.log('✅ Connected to MongoDB successfully!');
    
    // Test creating a simple document
    const testSchema = new mongoose.Schema({ name: String });
    const TestModel = mongoose.model('Test', testSchema);
    
    const testDoc = new TestModel({ name: 'Test Document' });
    await testDoc.save();
    console.log('✅ Test document created successfully!');
    
    // Clean up
    await TestModel.deleteMany({});
    console.log('✅ Test document cleaned up!');
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

testDB();