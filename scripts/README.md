# Scripts Directory

This directory contains utility scripts for the Boutique Holistic Store application. Scripts are organized into categories for better maintainability and to avoid confusion.

## Directory Structure

```
scripts/
├── setup/          # Database setup and initialization scripts
├── maintenance/    # Regular maintenance and cleanup tasks
├── debugging/      # Testing and diagnostic tools
├── _deprecated/    # Old duplicate scripts (scheduled for deletion)
└── README.md       # This documentation
```

## Setup Scripts

**Location: `scripts/setup/`**

These scripts are used for initial database setup, data population, and system configuration.

### Database Population

- **`populate-simple.js`** - Main database seeding script with test products and users
  - Creates test users (admin and customer accounts)
  - Adds sample holistic/wellness products with proper internationalization
  - Sets up categories, tags, and product images
  - Usage: `node setup/populate-simple.js`

- **`populateTestData.js`** - Minimal test data (appears to be empty/stub)

- **`populate-settings.js`** - Application settings and configuration setup

### Product Management

- **`seedProducts.js`** - Additional product seeding functionality

- **`createProductImages.js`** - Generate and manage product images
- **`createSampleImages.js`** - Create sample images for testing
- **`downloadProductImages.js`** - Download images from external sources

### User Management

- **`create-user.js`** - Create new user accounts programmatically
  - Usage: `node setup/create-user.js [email] [password] [role]`

- **`list-users.js`** - List all users in the database
  - Shows user details including roles and status
  - Usage: `node setup/list-users.js`

### Performance Optimization

- **`add-performance-indexes.js`** - Add database indexes for better query performance
  - Creates compound indexes for orders, products, and users
  - Optimizes common query patterns for admin dashboard
  - Usage: `node setup/add-performance-indexes.js`

### Deployment

- **`prepare-production.js`** - Prepare application for production deployment
  - Validates production environment configuration
  - Creates required directories and files
  - Prepares build artifacts for DreamHost deployment
  - Usage: `node setup/prepare-production.js`

## Maintenance Scripts

**Location: `scripts/maintenance/`**

These scripts handle ongoing maintenance tasks, data cleanup, and system updates.

### User Management

- **`reset-user-password.js`** - Reset user passwords with verification
  - Accepts email and password as command line arguments
  - Includes password verification test
  - Usage: `node maintenance/reset-user-password.js [email] [password]`
  - Example: `node maintenance/reset-user-password.js user@example.com NewPass123!`

### Cart Management

- **`cleanup-carts.js`** - Comprehensive cart cleanup and maintenance
  - Removes duplicate guest carts (keeps most recent with most items)
  - Cleans up expired guest carts based on expiresAt field
  - Removes orphaned carts with invalid session IDs
  - Fixes user carts with invalid product references
  - Updates product prices in user carts
  - Generates detailed cart status report
  - Usage: `node maintenance/cleanup-carts.js`

### Data Maintenance

- **`updateCurrencyRates.js`** - Update currency exchange rates
  - Fetches latest rates for multi-currency support
  - Updates stored rates in database

- **`deleteNullProductOrders.js`** - Clean up orders with missing product data
  - Removes corrupt order entries

- **`fixBrokenImages.js`** - Repair broken product image references
- **`fixRemainingImages.js`** - Additional image fixing functionality

## Debugging Scripts

**Location: `scripts/debugging/`**

These scripts help diagnose issues, test functionality, and validate system behavior.

### System Diagnostics

- **`diagnose-system.js`** - Comprehensive system health check
  - Tests backend API endpoints
  - Validates frontend connectivity
  - Checks product data integrity
  - Verifies image URLs and accessibility
  - Tests user authentication flows
  - Usage: `node debugging/diagnose-system.js`

- **`inspectOrders.js`** - Detailed order data inspection
  - Shows order structure and status
  - Validates order data integrity

### User Testing

- **`debugUser.js`** - User account debugging and validation
- **`testLogin.js`** - Test user login functionality
- **`testComplexPassword.js`** - Password complexity validation testing

### E-commerce Testing

- **`testCheckout.js`** - End-to-end checkout process testing
  - Validates cart functionality
  - Tests payment processing flow
  - Checks order creation

### Feature Testing

- **`testWholesalerNotifications.js`** - Test notification system for wholesalers
- **`demoWholesalerNotifications.js`** - Demo wholesaler notification features
- **`processWholesalerNotifications.js`** - Process pending notifications

### Development Tools

- **`fix-all-tests.js`** - Fix test suite issues and configuration
- **`test-design-system.js`** - Test UI/design system components
- **`debug-populate.js`** - Debug data population issues

## Deprecated Scripts

**Location: `scripts/_deprecated/`**

These are old duplicate scripts that have been consolidated. They are kept temporarily for reference but should not be used in development.

**⚠️ Do not use these scripts - they contain duplicated functionality:**

- Password reset duplicates: `reset-oed-password.js`, `reset-user-password.js`, `resetPassword.js`, `resetPasswordSimple.js`, `resetToComplexPassword.js`
- Index creation duplicates: `add-performance-indexes.js`, `addPerformanceIndexes.js`
- Cart cleanup duplicates: `cleanupCartIssues.js`, `cleanupGuestCarts.js`, `cleanupOrphanedCarts.js`, `cleanupOrders.js`
- Diagnostic duplicates: `diagnoseIssues.js`, `checkIssues.js`
- Unused tools: `generateApiDocs.js`

**These will be deleted in the next cleanup cycle.**

## Usage Guidelines

### Prerequisites

1. **Environment Setup**: Ensure `.env` file is configured with:
   ```
   MONGODB_URI=mongodb://localhost:27017/holistic-store
   NODE_ENV=development
   ```

2. **Database Connection**: MongoDB must be running (local or Docker)

3. **Dependencies**: Run `npm install` in the project root

### Running Scripts

```bash
# From project root
cd scripts

# Setup scripts
node setup/populate-simple.js
node setup/create-user.js admin@example.com SecurePass123! admin

# Maintenance scripts  
node maintenance/cleanup-carts.js
node maintenance/reset-user-password.js user@example.com NewPass123!

# Debugging scripts
node debugging/diagnose-system.js
node debugging/testCheckout.js
```

### Docker Environment

When using Docker development environment:

```bash
# Run scripts inside backend container
docker-compose exec backend node scripts/setup/populate-simple.js
docker-compose exec backend node scripts/maintenance/cleanup-carts.js
```

## Development Notes

### Following CLAUDE.md Guidelines

These scripts adhere to the project's CLAUDE.md guidelines:

- ✅ **No duplicate functionality** - Consolidated 38 scripts into organized structure
- ✅ **Simple, focused scripts** - Each script has a single responsibility
- ✅ **International support** - Setup scripts include i18n considerations
- ✅ **Use existing patterns** - Scripts follow established database connection patterns

### Script Standards

All scripts in this directory follow these standards:

1. **Error Handling**: Proper try/catch blocks with meaningful error messages
2. **Database Cleanup**: Always disconnect from MongoDB in finally blocks
3. **Exit Codes**: Use appropriate exit codes (0 for success, 1 for error)
4. **Documentation**: Header comments explaining purpose and usage
5. **Flexibility**: Accept command line arguments where appropriate
6. **Feedback**: Provide clear console output about operations performed

### Adding New Scripts

Before adding new scripts:

1. **Check if functionality already exists** - Review this directory first
2. **Choose the correct category** - setup/, maintenance/, or debugging/
3. **Follow naming conventions** - Use kebab-case (dash-separated)
4. **Include proper documentation** - Header comment with usage instructions
5. **Update this README** - Add entry in appropriate section

### Security Considerations

- Scripts that modify user data include verification steps
- Password reset scripts require explicit user email specification
- Database operations are logged for audit trails
- Sensitive operations require confirmation or safe defaults

---

**Last Updated**: August 2025
**Maintainer**: Follow CLAUDE.md guidelines for modifications