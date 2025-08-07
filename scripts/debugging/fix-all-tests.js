
/**
 * Script to fix all test issues for Docker environment with real MongoDB
 * Fixes:
 * 1. Removes conflicting mongoose mocks
 * 2. Updates error code expectations
 * 3. Fixes authentication setup
 * 4. Ensures proper test data
 */

const fs = require('fs');
const path = require('path');

// Patterns to fix in test files
const fixes = [
  // Remove mongoose mocks that conflict with real database
  {
    pattern: /jest\.mock\(['"]mongoose['"].*?\}\);?\s*/gs,
    replacement: ''
  },
  // Remove User model mocks
  {
    pattern: /jest\.mock\(['"].*?\/models\/User['"].*?\}\);?\s*/gs,
    replacement: ''
  },
  // Update error code expectations
  {
    pattern: /\.toBe\(['"]NO_TOKEN['"]\)/g,
    replacement: '.toBe(\'AUTHENTICATION_REQUIRED\')'
  },
  {
    pattern: /\.toBe\(['"]STATUS_ERROR['"]\)/g,
    replacement: '.toBe(\'INTERNAL_ERROR\')'
  },
  // Fix require paths for test helpers
  {
    pattern: /require\(['"]\.\.\/\.\.\/test\/setup['"]\)/g,
    replacement: 'require(\'../setup.docker\')'
  }
];

// Additional fixes for specific test files
const specificFixes = {
  'test/routes/monitoring.test.js': [
    {
      // Replace entire mock section with proper imports
      pattern: /^.*?describe\(['"]Monitoring Routes/ms,
      replacement: `const request = require('supertest');
const app = require('../../server');
const { createAdminUserWithToken, createRegularUserWithToken } = require('../helpers/testSetup');
const User = require('../../models/User');

// Mock only external services
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('../../utils/errorRecovery', () => ({
  getCircuitBreakerStatus: jest.fn(() => ({
    payment: { state: 'closed', failures: 0 },
    email: { state: 'closed', failures: 0 }
  }))
}));

describe('Monitoring Routes`
    }
  ]
};

// Process test files
function processTestFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Apply general fixes
  for (const fix of fixes) {
    const newContent = content.replace(fix.pattern, fix.replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }
  
  // Apply specific fixes if available
  const fileName = path.relative(process.cwd(), filePath);
  if (specificFixes[fileName]) {
    for (const fix of specificFixes[fileName]) {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
  }
  
  // Add test setup helper import if missing
  if (!content.includes('testSetup') && content.includes('describe(')) {
    const setupImport = "const { createAdminUserWithToken, createRegularUserWithToken } = require('../helpers/testSetup');\n";
    if (!content.includes(setupImport)) {
      // Add after other requires
      content = content.replace(
        // eslint-disable-next-line security/detect-unsafe-regex
        /(const\s+.*?=\s*require\([^)]+\);\n)+/,
        '$&' + setupImport
      );
      modified = true;
    }
  }
  
  // Fix JWT token generation
  if (content.includes('jwt.sign(') && !content.includes('process.env.JWT_SECRET')) {
    content = content.replace(
      /jwt\.sign\((.*?),\s*['"][\w-]+['"]/g,
      'jwt.sign($1, process.env.JWT_SECRET || \'test-secret-key-for-testing-only\''
    );
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Fixed ${filePath}`);
  } else {
    console.log('  ⏭️  No changes needed');
  }
}

// Find all test files
function findTestFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.includes('node_modules')) {
      files.push(...findTestFiles(fullPath));
    } else if (item.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Main execution
console.log('🔧 Fixing all test files for Docker environment...\n');

const testDir = path.join(process.cwd(), 'test');
const testFiles = findTestFiles(testDir);

console.log(`Found ${testFiles.length} test files\n`);

for (const file of testFiles) {
  processTestFile(file);
}

console.log('\n✅ Test fixes complete!');
console.log('\nNext steps:');
console.log('1. Run: docker exec boutique-backend npm run test:docker');
console.log('2. Review any remaining failures');
console.log('3. Tests should now work with real MongoDB in Docker');