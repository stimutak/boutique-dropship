module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  
  // Test file patterns
  testMatch: [
    '**/test/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/client/node_modules/'
  ],
  
  // Coverage configuration
  collectCoverage: false, // Disable by default for faster tests
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // Coverage collection patterns
  collectCoverageFrom: [
    'server.js',
    'models/**/*.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/test/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**'
  ],
  
  // Coverage thresholds (relaxed for now)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  
  // Test timeout
  testTimeout: 15000,
  
  // Verbose output
  verbose: false,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@models/(.*)$': '<rootDir>/models/$1',
    '^@routes/(.*)$': '<rootDir>/routes/$1',
    '^@middleware/(.*)$': '<rootDir>/middleware/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@test/(.*)$': '<rootDir>/test/$1'
  },
  
  // Global variables
  globals: {
    'process.env.NODE_ENV': 'test'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'json',
    'node'
  ],
  
  // Reporters
  reporters: ['default'],
  
  // Error handling
  errorOnDeprecated: false,
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/test-results/',
    '/logs/',
    '/uploads/'
  ],
  
  // Notification configuration (disabled to avoid dependency issues)
  notify: false,
  
  // Bail configuration (stop on first failure in CI)
  bail: process.env.CI ? 1 : 0,
  
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache'
};