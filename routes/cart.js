const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const Cart = require('../models/Cart');
const { authenticateToken } = require('../middleware/auth');

// Helper function to get or create cart
const getOrCreateCart = async (req) => {
  if (req.user) {
    // For authenticated users, use user's cart
    const user = await User.findById(req.user._id);
    if (!user.cart) {
      user.cart = { items: [], updatedAt: new Date() };
      await user.save();
    }
    return { type: 'user', cart: user.cart, user };
  } else {
    // For guests, use session-based cart with database storage
    const sessionId = req.sessionID;
    let cart = await Cart.findOne({ sessionId });
    
    if (!cart) {
      cart = new Cart({ sessionId, items: [] });
      await cart.save();
    }
    
    return { type: 'guest', cart, sessionId };
  }
};

// Get cart contents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, cart, user } = await getOrCreateCart(req);
    
    // Populate product details for cart items
    const populatedCart = await Promise.all(
      cart.items.map(async (item) => {
        try {
          const product = await Product.findById(item.product).select('-wholesaler');
          if (!product || !product.isActive) {
            return null; // Filter out inactive products
          }
          
          return {
            _id: item.product,
            product: product.toPublicJSON(),
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity
          };
        } catch (error) {
          console.error('Error populating cart item:', error);
          return null;
        }
      })
    );

    // Filter out null items (inactive products)
    const validCartItems = populatedCart.filter(item => item !== null);
    
    // Calculate totals
    const itemCount = validCartItems.reduce((total, item) => total + item.quantity, 0);
    const subtotal = validCartItems.reduce((total, item) => total + item.subtotal, 0);
    
    res.json({
      success: true,
      data: {
        cart: {
          items: validCartItems,
          itemCount,
          subtotal: Math.round(subtotal * 100) / 100,
          total: Math.round(subtotal * 100) / 100,
          isEmpty: validCartItems.length === 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CART_FETCH_ERROR',
        message: 'Failed to fetch cart'
      }
    });
  }
});

// Add item to cart
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Validation
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Product ID is required'
        }
      });
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Quantity must be between 1 and 99'
        }
      });
    }

    // Check if product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Product not found or inactive'
        }
      });
    }

    const { type, cart, user } = await getOrCreateCart(req);

    if (type === 'user') {
      // Add to user's cart
      const existingItemIndex = user.cart.items.findIndex(item => 
        item.product.toString() === productId.toString()
      );

      if (existingItemIndex >= 0) {
        user.cart.items[existingItemIndex].quantity += quantity;
        user.cart.items[existingItemIndex].addedAt = new Date();
      } else {
        user.cart.items.push({
          product: productId,
          quantity,
          price: product.price,
          addedAt: new Date()
        });
      }
      
      user.cart.updatedAt = new Date();
      await user.save();
    } else {
      // Add to guest cart
      cart.addItem(productId, quantity, product.price);
      await cart.save();
    }

    // Return updated cart
    const updatedCartData = await getOrCreateCart(req);
    const populatedCart = await Promise.all(
      updatedCartData.cart.items.map(async (item) => {
        const prod = await Product.findById(item.product).select('-wholesaler');
        return {
          _id: item.product,
          product: prod.toPublicJSON(),
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity
        };
      })
    );

    const itemCount = populatedCart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = populatedCart.reduce((total, item) => total + item.subtotal, 0);

    res.json({
      success: true,
      message: 'Item added to cart',
      data: {
        cart: {
          items: populatedCart,
          itemCount,
          subtotal: Math.round(subtotal * 100) / 100,
          total: Math.round(subtotal * 100) / 100
        }
      }
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
router.put('/update', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Product ID is required'
        }
      });
    }

    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Quantity must be between 0 and 99'
        }
      });
    }

    const { type, cart, user } = await getOrCreateCart(req);

    if (type === 'user') {
      const itemIndex = user.cart.items.findIndex(item => 
        item.product.toString() === productId.toString()
      );

      if (itemIndex >= 0) {
        if (quantity === 0) {
          user.cart.items.splice(itemIndex, 1);
        } else {
          user.cart.items[itemIndex].quantity = quantity;
          user.cart.items[itemIndex].addedAt = new Date();
        }
        user.cart.updatedAt = new Date();
        await user.save();
      }
    } else {
      cart.updateItem(productId, quantity);
      await cart.save();
    }

    // Return updated cart
    const updatedCartData = await getOrCreateCart(req);
    const populatedCart = await Promise.all(
      updatedCartData.cart.items.map(async (item) => {
        const prod = await Product.findById(item.product).select('-wholesaler');
        return {
          _id: item.product,
          product: prod.toPublicJSON(),
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity
        };
      })
    );

    const itemCount = populatedCart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = populatedCart.reduce((total, item) => total + item.subtotal, 0);

    res.json({
      success: true,
      message: 'Cart updated successfully',
      data: {
        cart: {
          items: populatedCart,
          itemCount,
          subtotal: Math.round(subtotal * 100) / 100,
          total: Math.round(subtotal * 100) / 100
        }
      }
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
router.delete('/remove', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Product ID is required'
        }
      });
    }

    const { type, cart, user } = await getOrCreateCart(req);

    if (type === 'user') {
      const itemIndex = user.cart.items.findIndex(item => 
        item.product.toString() === productId.toString()
      );

      if (itemIndex >= 0) {
        user.cart.items.splice(itemIndex, 1);
        user.cart.updatedAt = new Date();
        await user.save();
      }
    } else {
      cart.removeItem(productId);
      await cart.save();
    }

    // Return updated cart
    const updatedCartData = await getOrCreateCart(req);
    const populatedCart = await Promise.all(
      updatedCartData.cart.items.map(async (item) => {
        const prod = await Product.findById(item.product).select('-wholesaler');
        return {
          _id: item.product,
          product: prod.toPublicJSON(),
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity
        };
      })
    );

    const itemCount = populatedCart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = populatedCart.reduce((total, item) => total + item.subtotal, 0);

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: {
        cart: {
          items: populatedCart,
          itemCount,
          subtotal: Math.round(subtotal * 100) / 100,
          total: Math.round(subtotal * 100) / 100
        }
      }
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
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    const { type, cart, user } = await getOrCreateCart(req);

    if (type === 'user') {
      user.cart.items = [];
      user.cart.updatedAt = new Date();
      await user.save();
    } else {
      cart.clearCart();
      await cart.save();
    }

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        cart: {
          items: [],
          itemCount: 0,
          subtotal: 0,
          total: 0,
          isEmpty: true
        }
      }
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

// Merge guest cart with user cart (called after login)
router.post('/merge', authenticateToken, initializeCart, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'User must be authenticated to merge cart'
        }
      });
    }

    const { guestCart } = req.body;
    
    if (!guestCart || !Array.isArray(guestCart) || guestCart.length === 0) {
      return res.json({
        success: true,
        message: 'No guest cart to merge',
        data: {
          cart: {
            items: [],
            itemCount: 0,
            subtotal: 0,
            total: 0,
            isEmpty: true
          }
        }
      });
    }

    // Merge guest cart items with session cart
    for (const guestItem of guestCart) {
      const existingItemIndex = req.session.cart.findIndex(
        item => item.productId === guestItem.productId
      );

      if (existingItemIndex >= 0) {
        // Update quantity if item already exists
        req.session.cart[existingItemIndex].quantity += guestItem.quantity;
      } else {
        // Add new item
        req.session.cart.push({
          productId: guestItem.productId,
          quantity: guestItem.quantity
        });
      }
    }

    // Save session
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Return updated cart
    const populatedCart = await Promise.all(
      req.session.cart.map(async (item) => {
        try {
          const product = await Product.findById(item.productId).select('-wholesaler');
          if (!product || !product.isActive) {
            return null;
          }
          return {
            _id: item.productId,
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
    const validItems = populatedCart.filter(item => item !== null);
    const itemCount = validItems.reduce((total, item) => total + item.quantity, 0);
    const subtotal = validItems.reduce((total, item) => total + item.subtotal, 0);

    res.json({
      success: true,
      message: 'Cart merged successfully',
      data: {
        cart: {
          items: validItems,
          itemCount: itemCount,
          subtotal: subtotal,
          total: subtotal,
          isEmpty: validItems.length === 0
        }
      }
    });
          items: populatedCart,
          itemCount,
          subtotal: Math.round(subtotal * 100) / 100,
          total: Math.round(subtotal * 100) / 100
        }
      }
    });

  } catch (error) {
    console.error('Error merging cart:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CART_MERGE_ERROR',
        message: 'Failed to merge cart'
      }
    });
  }
});

module.exports = router;