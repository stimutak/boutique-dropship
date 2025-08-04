# CI/CD Errors to Fix

## Critical Errors (Must fix for CI to pass)

### 1. Duplicate Keys in Configuration Files
- **jest.config.js:109** - Duplicate key 'reporters'
- **models/Order.js:152** - Duplicate key 'shipping'

### 2. Node.js Version Compatibility
- Multiple files have "Rest/spread properties not supported until Node.js 8.3.0"
- Need to update .eslintrc.js Node version or use babel transform

### 3. ESLint Rule Violations
- **no-unused-vars**: 80+ occurrences of unused variables
- **no-process-exit**: middleware/errorHandler.js using process.exit()
- **curly**: Missing curly braces after if conditions
- **no-prototype-builtins**: Using hasOwnProperty directly

### 4. Security Warnings (316 total)
- **detect-object-injection**: Dynamic property access warnings
- **detect-non-literal-fs-filename**: File operations with variables
- **detect-unsafe-regex**: Unsafe regular expressions

### 5. Console.log Statements (200+ occurrences)
- Need to implement proper logging levels
- Replace console.log with logger methods

## Quick Fixes Available

Run `npm run lint -- --fix` to automatically fix:
- Missing semicolons
- Quote consistency
- Spacing issues
- Some curly brace issues

## Manual Fixes Required

### High Priority
1. Fix duplicate keys in jest.config.js and Order.js
2. Update Node.js version in ESLint config to support spread operator
3. Replace console.log with proper logging
4. Fix unused variables (prefix with _ or remove)

### Medium Priority
1. Add curly braces to all if statements
2. Fix security warnings for file operations
3. Replace process.exit() with proper error handling

### Low Priority
1. Fix object injection warnings (mostly false positives)
2. Optimize regular expressions
3. Clean up unused imports

## GitHub Actions Status

The workflow should now run on GitHub. Check:
https://github.com/stimutak/boutique-dropship/actions

Expected outcomes:
- ✅ Tests should run with MongoDB service
- ✅ JUnit test reports should be generated
- ⚠️ ESLint will show warnings but not fail
- ✅ Security audit will run but not block
- ✅ Coverage reports will be generated

## Next Steps

1. Monitor GitHub Actions run
2. Fix critical ESLint errors
3. Update Node.js version compatibility
4. Implement proper logging strategy
5. Clean up security warnings