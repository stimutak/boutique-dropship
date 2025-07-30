/**
 * Example of a route file using standardized error handling
 * This shows the recommended patterns for error responses
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { AppError } = require('../middleware/errorHandler');
const { ErrorCodes } = require('../utils/errorHandler');
const { requireAuth } = require('../middleware/auth');

// Example 1: Route with validation
router.post('/products',
  requireAuth,
  [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category').isIn(['crystals', 'herbs', 'oils']).withMessage('Invalid category')
  ],
  async (req, res, next) => {
    try {
      // Handle validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.validationError(errors);
      }

      const { name, price, category } = req.body;

      // Check for duplicate
      const existingProduct = await Product.findOne({ name });
      if (existingProduct) {
        return res.error(409, 'PRODUCT_EXISTS', 'Product with this name already exists');
      }

      // Create product
      const product = await Product.create({
        name,
        price,
        category
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        product
      });

    } catch (error) {
      // For async errors, you can use either approach:
      
      // Option 1: Use res.error (simpler)
      res.error(500, ErrorCodes.PRODUCT_CREATION_ERROR, 'Failed to create product');
      
      // Option 2: Use next() with AppError (better for middleware chain)
      // next(new AppError('Failed to create product', 500, ErrorCodes.PRODUCT_CREATION_ERROR));
    }
  }
);

// Example 2: Simple GET route with error handling
router.get('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.error(400, ErrorCodes.INVALID_PRODUCT_ID, 'Invalid product ID format');
    }

    const product = await Product.findById(id);
    
    if (!product) {
      // Using standardized error response
      return res.error(404, ErrorCodes.PRODUCT_NOT_FOUND, 'Product not found');
    }

    res.json({
      success: true,
      product
    });

  } catch (error) {
    // Let global error handler catch it
    next(error);
  }
});

// Example 3: Route with multiple error scenarios
router.put('/products/:id/stock', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body;

    // Multiple validation checks with different error codes
    if (!quantity || quantity < 0) {
      return res.error(400, ErrorCodes.INVALID_QUANTITY, 'Invalid quantity');
    }

    if (!['add', 'subtract', 'set'].includes(operation)) {
      return res.error(400, ErrorCodes.BAD_REQUEST, 'Invalid operation');
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.error(404, ErrorCodes.PRODUCT_NOT_FOUND, 'Product not found');
    }

    // Business logic validation
    if (operation === 'subtract' && product.stock < quantity) {
      return res.error(
        400, 
        'INSUFFICIENT_STOCK', 
        'Insufficient stock available',
        'stock' // Optional field parameter
      );
    }

    // Update stock
    switch (operation) {
      case 'add':
        product.stock += quantity;
        break;
      case 'subtract':
        product.stock -= quantity;
        break;
      case 'set':
        product.stock = quantity;
        break;
    }

    await product.save();

    res.json({
      success: true,
      message: 'Stock updated successfully',
      product: {
        id: product._id,
        name: product.name,
        stock: product.stock
      }
    });

  } catch (error) {
    // Database errors or unexpected errors
    console.error('Stock update error:', error);
    next(new AppError('Failed to update stock', 500, 'STOCK_UPDATE_ERROR'));
  }
});

// Example 4: Webhook endpoint (requires plain text response)
router.post('/webhook/payment', async (req, res) => {
  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      // For webhooks, use the webhookError helper
      const { webhookError } = require('../utils/errorHandler');
      return webhookError(res, 400, 'Payment ID is required');
    }

    // Process webhook...

    // Webhooks typically expect plain text success response
    res.status(200).send('OK');

  } catch (error) {
    // Webhook errors also need plain text
    const { webhookError } = require('../utils/errorHandler');
    webhookError(res, 500, 'Webhook processing failed');
  }
});

// Example 5: Using try-catch with async/await
router.delete('/products/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id);
    if (!product) {
      return res.error(404, ErrorCodes.PRODUCT_NOT_FOUND, 'Product not found');
    }

    // Soft delete
    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    // Using AppError for consistency with middleware
    next(new AppError(
      'Failed to delete product', 
      500, 
      ErrorCodes.PRODUCT_DELETE_ERROR
    ));
  }
});

module.exports = router;