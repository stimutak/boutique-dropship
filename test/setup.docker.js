const mongoose = require('mongoose');

// Import mocks before anything else
require('./helpers/mockServices');

// MongoDB connection for Docker environment
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://mongodb:27017/test-db';

// Setup before all tests
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-for-testing';
  process.env.MONGODB_TEST_URI = MONGODB_URI;
  
  // Connect to MongoDB container
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB container for testing');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}, 30000);

// Cleanup after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});

// Cleanup after all tests
afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    // Drop the test database to ensure clean state
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  }
}, 30000);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, _promise) => {
  // Log unhandled rejections for debugging
  process.stderr.write(`Unhandled Rejection: ${reason}\n`);
});