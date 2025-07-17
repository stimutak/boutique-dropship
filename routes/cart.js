const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authenticateToken, requireAuth } = require('../middleware/auth');

// Middleware to initialize cart in session
const initializeCart = (req, res, next) => {
  if (!req.session.cart) {
    req.session.cart = [];
  }
  next();
};

// Get cart contents
router.get('/', authenticateToken, initializeCart, async (req, res) => {
  try {
    let cart = [];
    
    if (req.user) {
      // For authenticated users, get cart from user session or database
      cart = req.session.cart || [];
    } else {
      // For guests, get cart from session
      cart = req.session.cart || [];
    }
    
    // Populate product details for cart items
    const populatedCart = await Promise.all(
      cart.map(async (item) => {
        try {
          const product = await Product.findById(item.productId).select('-wholesaler');
          if (!product || !product.isActive) {
            return null; // Remove inactive products
          }
          
          return {
            _id: item._id || item.productId,
            product: product.toPublicJSON(),
            quantity: item.quantity,
            price: product.price,
            subtotal: product.price * item.quantity
          };
        } catch (error) {
          console.error('Error populating cart item:', error);
          return null;
        }
      })
    );
    
    // Filter out null items (inactive products)
    const validCart = populatedCart.filter(item => item !== null);
    
    // Update session cart to remove invalid items
    req.session.cart = validCart.map(item => ({
      productId: item.product._id,
      quantity: item.quantity
    }));
    
    // Calculate totals
    const subtotal = validCart.reduce((sum, item) => sum + item.subtotal, 0);
    const itemCount = validCart.reduce((sum, item) => sum + item.quantity, 0);
    
    res.json({
      success: true,
      data: {
        cart: {
          items: validCart,
          subtotal: Math.round(subtotal * 100) / 100,
          itemCount,
          isEmpty: validCart.length === 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CART_ERROR',
        message: 'Failed to retrieve cart contents'
      }
    });
  }
});

// Add item to cart
router.post('/add', requireAuth, initializeCart, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PRODUCT_ID',
          message: 'Product ID is required'
        }
      });
    }
    
    if (quantity < 1 || quantity > 99) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantity must be between 1 and 99'
        }
      });
    }
    
    // Verify product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found or unavailable'
        }
      });
    }
    
    // Check if item already exists in cart
    const existingItemIndex = req.session.cart.findIndex(
      item => item.productId.toString() === productId
    );
    
    if (existingItemIndex > -1) {
      // Update quantity of existing item
      const newQuantity = req.session.cart[existingItemIndex].quantity + parseInt(quantity);
      if (newQuantity > 99) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MAX_QUANTITY_EXCEEDED',
            message: 'Maximum quantity per item is 99'
          }
        });
      }
      req.session.cart[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item to cart
      req.session.cart.push({
        productId: productId,
        quantity: parseInt(quantity)
      });
    }
    
    // Save session
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          error: {
            code: 'SESSION_ERROR',
            message: 'Failed to save cart'
          }
        });
      }
      
      res.json({
        success: true,
        data: {
          cart: {
            items: req.session.cart,
            itemCount: req.session.cart.reduce((sum, item) => sum + item.quantity, 0)
          }
        },
        message: 'Item added to cart'
      });
    });
    
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CART_ADD_ERROR',
        message: 'Failed to add item to cart'
      }
    });
  }
});

// Update cart item quantity
router.put('/update', initializeCart, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PRODUCT_ID',
          message: 'Product ID is required'
        }
      });
    }
    
    if (quantity < 0 || quantity > 99) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantity must be between 0 and 99'
        }
      });
    }
    
    const itemIndex = req.session.cart.findIndex(
      item => item.productId.toString() === productId
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found in cart'
        }
      });
    }
    
    if (quantity === 0) {
      // Remove item if quantity is 0
      req.session.cart.splice(itemIndex, 1);
    } else {
      // Update quantity
      req.session.cart[itemIndex].quantity = parseInt(quantity);
    }
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          error: {
            code: 'SESSION_ERROR',
            message: 'Failed to update cart'
          }
        });
      }
      
      res.json({
        success: true,
        message: quantity === 0 ? 'Item removed from cart' : 'Cart updated',
        cartItemCount: req.session.cart.reduce((sum, item) => sum + item.quantity, 0)
      });
    });
    
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CART_UPDATE_ERROR',
        message: 'Failed to update cart'
      }
    });
  }
});

// Remove item from cart
router.delete('/remove', initializeCart, async (req, res) => {
  try {
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PRODUCT_ID',
          message: 'Product ID is required'
        }
      });
    }
    
    const itemIndex = req.session.cart.findIndex(
      item => item.productId.toString() === productId
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found in cart'
        }
      });
    }
    
    req.session.cart.splice(itemIndex, 1);
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          error: {
            code: 'SESSION_ERROR',
            message: 'Failed to remove item from cart'
          }
        });
      }
      
      res.json({
        success: true,
        message: 'Item removed from cart',
        cartItemCount: req.session.cart.reduce((sum, item) => sum + item.quantity, 0)
      });
    });
    
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CART_REMOVE_ERROR',
        message: 'Failed to remove item from cart'
      }
    });
  }
});

// Clear entire cart
router.delete('/clear', initializeCart, async (req, res) => {
  try {
    req.session.cart = [];
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          error: {
            code: 'SESSION_ERROR',
            message: 'Failed to clear cart'
          }
        });
      }
      
      res.json({
        success: true,
        message: 'Cart cleared',
        cartItemCount: 0
      });
    });
    
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CART_CLEAR_ERROR',
        message: 'Failed to clear cart'
      }
    });
  }
});

module.exports = router;