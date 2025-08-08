const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { getMongoUri, connectionOptions } = require('./mongodb-config');

// Import mocks before anything else
require('./helpers/mockServices');

let mongoServer;
let useInMemory = false;

// Setup before all tests
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-for-testing-must-be-32-chars-long';
  
  // Try to use in-memory MongoDB first
  if (process.env.USE_MEMORY_DB !== 'false') {
    try {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_TEST_URI = mongoUri;
      process.env.MONGODB_URI = mongoUri;
      useInMemory = true;
    } catch (error) {
      // Fall back to real MongoDB
      useInMemory = false;
    }
  }
  
  // Use real MongoDB if in-memory failed or disabled
  if (!useInMemory) {
    const mongoUri = getMongoUri();
    process.env.MONGODB_TEST_URI = mongoUri;
    process.env.MONGODB_URI = mongoUri;
  }
  
  // Close any existing connections before connecting
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  // Connect to the database (either in-memory or real)
  const finalUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
  await mongoose.connect(finalUri, connectionOptions);
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
  try {
    // Close mongoose connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    
    // Stop MongoDB Memory Server
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    // Silently ignore cleanup errors to prevent test failures
    // The process will exit anyway
  }
}, 30000);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, _promise) => {
  // Log unhandled rejections for debugging - consider using proper logger in production
  process.stderr.write(`Unhandled Rejection: ${reason}\n`);
});