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
  collectCoverage: true,
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
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './models/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './routes/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './middleware/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './utils/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
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
  
  // Test result processors (commented out - install if needed)
  // testResultsProcessor: 'jest-sonar-reporter',
  
  // Reporters (commented out - install if needed)
  reporters: [
    'default'
    // [
    //   'jest-junit',
    //   {
    //     outputDirectory: './test-results',
    //     outputName: 'junit.xml',
    //     suiteName: 'Holistic Dropship Store Tests'
    //   }
    // ],
    // [
    //   'jest-html-reporters',
    //   {
    //     publicPath: './test-results',
    //     filename: 'report.html',
    //     expand: true
    //   }
    // ]
  ],
  
  // Error handling
  errorOnDeprecated: true,
  
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
  // notifyMode: 'failure-change',
  
  // Bail configuration (stop on first failure in CI)
  bail: process.env.CI ? 1 : 0,
  
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Projects configuration for different test types (commented out for now)
  // projects: [
  //   {
  //     displayName: 'unit',
  //     testMatch: [
  //       '<rootDir>/test/models/**/*.test.js',
  //       '<rootDir>/test/utils/**/*.test.js',
  //       '<rootDir>/test/middleware/**/*.test.js'
  //     ],
  //     coverageDirectory: '<rootDir>/coverage/unit'
  //   },
  //   {
  //     displayName: 'integration',
  //     testMatch: [
  //       '<rootDir>/test/routes/**/*.test.js',
  //       '<rootDir>/test/integration/**/*.test.js'
  //     ],
  //     coverageDirectory: '<rootDir>/coverage/integration'
  //   },
  //   {
  //     displayName: 'performance',
  //     testMatch: [
  //       '<rootDir>/test/performance/**/*.test.js'
  //     ],
  //     coverageDirectory: '<rootDir>/coverage/performance'
  //   },
  //   {
  //     displayName: 'security',
  //     testMatch: [
  //       '<rootDir>/test/security/**/*.test.js'
  //     ],
  //     coverageDirectory: '<rootDir>/coverage/security'
  //   }
  // ]
};