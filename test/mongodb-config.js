// Unified MongoDB configuration for tests
// Automatically detects the right MongoDB connection based on environment

const getMongoUri = () => {
  // Priority order:
  // 1. Explicit MONGODB_TEST_URI
  // 2. Check if in Docker container
  // 3. Check if MongoDB is accessible on localhost
  // 4. Default to localhost
  
  if (process.env.MONGODB_TEST_URI) {
    return process.env.MONGODB_TEST_URI;
  }
  
  // Check if we're in a Docker container
  const isInDocker = process.env.DOCKER_ENV === 'true' || 
                      process.env.IN_DOCKER === 'true' ||
                      (process.env.HOSTNAME && process.env.HOSTNAME.length === 12); // Docker container IDs are typically 12 chars
  
  if (isInDocker) {
    return 'mongodb://mongodb:27017/test-db';
  }
  
  // Default to localhost (works with Docker containers mapped to localhost)
  return 'mongodb://localhost:27017/test-db';
};

module.exports = {
  getMongoUri,
  testDbName: 'test-db',
  connectionOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Fail fast if MongoDB is not available
    connectTimeoutMS: 10000
  }
};