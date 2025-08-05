const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import mocks before anything else
require('./helpers/mockServices');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-for-testing';
  process.env.MONGODB_TEST_URI = mongoUri;
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
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
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, _promise) => {
  // Log unhandled rejections for debugging - consider using proper logger in production
  process.stderr.write(`Unhandled Rejection: ${reason}\n`);
});