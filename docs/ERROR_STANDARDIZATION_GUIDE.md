# Error Standardization Guide

This guide shows how to update route files to use the standardized error handling system with i18n support.

## Overview

The standardized error handling system provides:
- Consistent error format across all routes
- Automatic i18n translation based on locale
- Support for 8 languages including RTL (Arabic, Hebrew)
- Simplified error responses using helper methods

## Required Imports

Add these imports to your route file:

```javascript
const { AppError } = require('../middleware/errorHandler');
const { ErrorCodes } = require('../utils/errorHandler');
```

## Error Response Format

All errors follow this standardized format:

```javascript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Localized error message",
    "field": "fieldName" // optional, for validation errors
  }
}
```

## Using Error Helpers

### 1. Validation Errors

**Before:**
```javascript
const errors = validationResult(req);
if (!errors.isEmpty()) {
  return res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: errors.array()
    }
  });
}
```

**After:**
```javascript
const errors = validationResult(req);
if (!errors.isEmpty()) {
  return res.validationError(errors);
}
```

### 2. Standard Errors

**Before:**
```javascript
return res.status(404).json({
  success: false,
  error: {
    code: 'PRODUCT_NOT_FOUND',
    message: 'Product not found'
  }
});
```

**After:**
```javascript
return res.error(404, ErrorCodes.PRODUCT_NOT_FOUND, 'Product not found');
```

### 3. Using AppError with next()

**Before:**
```javascript
return res.status(500).json({
  success: false,
  error: {
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong'
  }
});
```

**After:**
```javascript
return next(new AppError('Something went wrong', 500, ErrorCodes.INTERNAL_ERROR));
```

### 4. Webhook Errors (Plain Text)

For webhook endpoints that require plain text responses:

```javascript
const { webhookError } = require('../utils/errorHandler');

// In webhook handler
if (!paymentId) {
  return webhookError(res, 400, 'Payment ID is required');
}
```

## Common Error Codes

Use predefined error codes from `ErrorCodes`:

```javascript
// Authentication
ErrorCodes.INVALID_CREDENTIALS
ErrorCodes.USER_EXISTS
ErrorCodes.USER_NOT_FOUND
ErrorCodes.TOKEN_INVALID
ErrorCodes.TOKEN_EXPIRED

// Products
ErrorCodes.PRODUCT_NOT_FOUND
ErrorCodes.PRODUCTS_FETCH_ERROR

// Cart
ErrorCodes.CART_ADD_ERROR
ErrorCodes.ITEM_NOT_FOUND
ErrorCodes.MAX_QUANTITY_EXCEEDED

// Orders
ErrorCodes.ORDER_NOT_FOUND
ErrorCodes.ORDER_CREATE_ERROR
ErrorCodes.EMPTY_CART

// Payments
ErrorCodes.PAYMENT_FAILED
ErrorCodes.PAYMENT_REQUIRED
```

## Complete Example: Updating a Route

Here's a complete example of updating a route handler:

**Original Route:**
```javascript
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMPTY_CART',
          message: 'Your cart is empty'
        }
      });
    }
    
    // Create order logic...
    
    res.json({
      success: true,
      message: 'Order created successfully',
      order: newOrder
    });
    
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_CREATE_ERROR',
        message: 'Failed to create order'
      }
    });
  }
});
```

**Updated Route:**
```javascript
router.post('/create-order', authenticateToken, async (req, res, next) => {
  try {
    const { items, shippingAddress } = req.body;
    
    if (!items || items.length === 0) {
      return res.error(400, ErrorCodes.EMPTY_CART, 'Your cart is empty');
    }
    
    // Create order logic...
    
    res.json({
      success: true,
      message: 'Order created successfully',
      order: newOrder
    });
    
  } catch (error) {
    console.error('Order creation error:', error);
    // Option 1: Use res.error
    res.error(500, ErrorCodes.ORDER_CREATE_ERROR, 'Failed to create order');
    
    // Option 2: Use next() with AppError (preferred for async errors)
    // next(new AppError('Failed to create order', 500, ErrorCodes.ORDER_CREATE_ERROR));
  }
});
```

## Testing Error Translations

To test that errors are properly translated:

1. Set the locale header:
```javascript
// Test request
curl -H "x-locale: es" http://localhost:5001/api/products/invalid-id
```

2. Expected Spanish response:
```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Producto no encontrado"
  }
}
```

## Adding New Error Codes

1. Add the error code to `/utils/errorHandler.js`:
```javascript
const ErrorCodes = {
  // ... existing codes
  MY_NEW_ERROR: 'MY_NEW_ERROR'
};
```

2. Add translations to `/utils/i18n.js`:
```javascript
const errorTranslations = {
  en: {
    // ... existing translations
    MY_NEW_ERROR: 'My new error message'
  },
  es: {
    // ... existing translations
    MY_NEW_ERROR: 'Mi nuevo mensaje de error'
  },
  // ... other languages
};
```

## Migration Checklist

When updating a route file:

- [ ] Add required imports (AppError, ErrorCodes)
- [ ] Replace validation error responses with `res.validationError()`
- [ ] Replace standard error responses with `res.error()`
- [ ] Use ErrorCodes constants instead of hardcoded strings
- [ ] Keep webhook endpoints using plain text responses
- [ ] Test with different locales (especially RTL languages)
- [ ] Ensure error messages are meaningful defaults (for missing translations)

## Benefits

1. **Consistency**: All errors follow the same format
2. **i18n Support**: Automatic translation based on user locale
3. **Maintainability**: Centralized error codes and messages
4. **Developer Experience**: Simple helper methods
5. **RTL Support**: Proper handling of Arabic and Hebrew
6. **Extensibility**: Easy to add new languages or error codes