const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const Cart = require('../models/Cart');
const { authenticateToken } = require('../middleware/auth');
const { validateCSRFToken } = require('../middleware/sessionCSRF');

// Helper function to get or create cart - Fixed cart persistence bug
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
    // Get session ID from header (frontend managed) or create new one
    let sessionId = req.headers['x-guest-session-id'];
    
    // If no session ID from frontend, this is a new session
    if (!sessionId || !sessionId.startsWith('guest_')) {
      sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('Created new guest session:', sessionId);
    }
    
    // Clean up any duplicate carts for this session BEFORE creating/fetching
    const existingCarts = await Cart.find({ sessionId });
    if (existingCarts.length > 1) {
      console.warn(`Found ${existingCarts.length} carts for session ${sessionId}, cleaning up duplicates`);
      // Keep the most recently updated cart and delete the rest
      const sortedCarts = existingCarts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      const cartsToDelete = sortedCarts.slice(1);
      for (const cartToDelete of cartsToDelete) {
        await Cart.deleteOne({ _id: cartToDelete._id });
      }
    }
    
    // Get or create the cart - use findOneAndUpdate for atomic operation with fallback
    let cart;
    try {
      cart = await Cart.findOneAndUpdate(
        { sessionId },
        { 
          $setOnInsert: { sessionId, items: [] },
          $set: { lastAccessed: new Date() }
        },
        { 
          new: true, 
          upsert: true
        }
      );
    } catch (error) {
      console.warn('findOneAndUpdate failed, using fallback:', error.message);
      cart = null;
    }
    
    if (!cart) {
      // Fallback: try to find existing cart or create new one
      cart = await Cart.findOne({ sessionId });
      if (!cart) {
        cart = new Cart({ sessionId, items: [] });
        await cart.save();
        console.log('Created new guest cart for session (fallback):', sessionId);
      }
    }
    
    return { type: 'guest', cart, sessionId };
  }
};

// Get cart contents with performance optimization
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get cart data directly
    const cartData = await getOrCreateCart(req);
    
    const { type, cart, user } = cartData;
    
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

// Add item to cart with optimistic updates
router.post('/add', authenticateToken, validateCSRFToken, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Validation
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PRODUCT_ID',
          message: 'Product ID is required'
        }
      });
    }

    // Enhanced quantity validation to prevent integer overflow and other edge cases
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantity must be between 1 and 99'
        }
      });
    }

    // Additional safety check for potential integer overflow
    if (quantity > Number.MAX_SAFE_INTEGER) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantity value is too large'
        }
      });
    }

        // Validate product ID format
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PRODUCT_ID',
          message: 'Invalid product ID format'
        }
      });
    }

    // Check if product exists and is active
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }
    
    if (!product.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found or inactive'
        }
      });
    }

    // Check for existing item and validate maximum quantity
    const { type, cart, user } = await getOrCreateCart(req);
    
    if (type === 'user') {
      const existingItemIndex = user.cart.items.findIndex(item => 
        item.product.toString() === productId.toString()
      );
      
      if (existingItemIndex >= 0) {
        const currentQuantity = user.cart.items[existingItemIndex].quantity;
        const newQuantity = currentQuantity + quantity;
        
        // Check for integer overflow and maximum quantity
        if (newQuantity > 99 || newQuantity < currentQuantity) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'MAX_QUANTITY_EXCEEDED',
              message: 'Cannot exceed maximum quantity of 99'
            }
          });
        }
      }
    } else {
      const existingItemIndex = cart.items.findIndex(item => 
        item.product.toString() === productId.toString()
      );
      
      if (existingItemIndex >= 0) {
        const currentQuantity = cart.items[existingItemIndex].quantity;
        const newQuantity = currentQuantity + quantity;
        
        // Check for integer overflow and maximum quantity
        if (newQuantity > 99 || newQuantity < currentQuantity) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'MAX_QUANTITY_EXCEEDED',
              message: 'Cannot exceed maximum quantity of 99'
            }
          });
        }
      }
    }

    // Add item to cart directly
    const cartData = await getOrCreateCart(req);
    
    if (cartData.type === 'user') {
      // Add to user's cart
      const existingItemIndex = cartData.user.cart.items.findIndex(item => 
        item.product.toString() === productId.toString()
      );

      if (existingItemIndex >= 0) {
        cartData.user.cart.items[existingItemIndex].quantity += quantity;
        cartData.user.cart.items[existingItemIndex].addedAt = new Date();
      } else {
        cartData.user.cart.items.push({
          product: productId,
          quantity,
          price: product.price,
          addedAt: new Date()
        });
      }
      
      cartData.user.cart.updatedAt = new Date();
      await cartData.user.save();
    } else {
      // Add to guest cart
      const existingItemIndex = cartData.cart.items.findIndex(item => 
        item.product.toString() === productId.toString()
      );

      if (existingItemIndex >= 0) {
        cartData.cart.items[existingItemIndex].quantity += quantity;
        cartData.cart.items[existingItemIndex].addedAt = new Date();
      } else {
        cartData.cart.items.push({
          product: productId,
          quantity,
          price: product.price,
          addedAt: new Date()
        });
      }
      await cartData.cart.save();
    }

    // Return updated cart
    const updatedCartData = await getOrCreateCart(req);
    
    const populatedCart = await Promise.all(
      updatedCartData.cart.items.map(async (item) => {
        const prod = await Product.findById(item.product).select('-wholesaler');
        if (!prod) {
          return null; // Filter out missing products
        }
        return {
          _id: item.product,
          product: prod.toPublicJSON(),
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity
        };
      })
    ).then(items => items.filter(item => item !== null));

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
    console.error('Full stack:', error.stack);
    res.status(500).json({
      success: false,
      error: {
        code: 'CART_ADD_ERROR',
        message: 'Failed to add item to cart',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

// Update cart item quantity
router.put('/update', authenticateToken, validateCSRFToken, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    // Validation
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PRODUCT_ID',
          message: 'Product ID is required'
        }
      });
    }

    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantity must be between 0 and 99'
        }
      });
    }

    const { type, cart, user } = await getOrCreateCart(req);

    if (type === 'user') {
      // Update user's cart
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
      } else {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Item not found in cart'
          }
        });
      }
    } else {
      // Update guest cart
      const itemIndex = cart.items.findIndex(item => 
        item.product.toString() === productId.toString()
      );
      
      if (itemIndex >= 0) {
        // Always use direct database update for consistency
        let updatedItems = [...cart.items];
        
        if (quantity === 0) {
          updatedItems.splice(itemIndex, 1);
        } else {
          updatedItems[itemIndex] = {
            ...updatedItems[itemIndex],
            quantity,
            addedAt: new Date()
          };
        }
        
        // Use atomic update to prevent race conditions
        const updatedCart = await Cart.findByIdAndUpdate(
          cart._id,
          { 
            items: updatedItems, 
            updatedAt: new Date() 
          },
          { new: true }
        );
        cart.items = updatedCart.items;
      } else {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Item not found in cart'
          }
        });
      }
    }

    // Return updated cart - use the already modified data instead of refetching
    const cartItems = type === 'user' ? user.cart.items : cart.items;
    const populatedCart = await Promise.all(
      cartItems.map(async (item) => {
        const product = await Product.findById(item.product).select('-wholesaler');
        if (!product || !product.isActive) return null;
        
        return {
          _id: item.product,
          product: product.toPublicJSON(),
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity
        };
      })
    );

    const validCartItems = populatedCart.filter(item => item !== null);
    const itemCount = validCartItems.reduce((total, item) => total + item.quantity, 0);
    const subtotal = validCartItems.reduce((total, item) => total + item.subtotal, 0);

    // Check if item was removed (quantity was 0)
    const wasRemoved = quantity === 0;
    
    res.json({
      success: true,
      message: wasRemoved ? 'Item removed from cart' : 'Cart updated',
      data: {
        cart: {
          items: validCartItems,
          itemCount,
          subtotal: Math.round(subtotal * 100) / 100,
          total: Math.round(subtotal * 100) / 100
        }
      },
      cartItemCount: itemCount
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
router.delete('/remove', authenticateToken, validateCSRFToken, async (req, res) => {
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

    const { type, cart, user } = await getOrCreateCart(req);

    if (type === 'user') {
      // Remove from user's cart
      const itemIndex = user.cart.items.findIndex(item => 
        item.product.toString() === productId.toString()
      );

      if (itemIndex >= 0) {
        user.cart.items.splice(itemIndex, 1);
        user.cart.updatedAt = new Date();
        await user.save();
      } else {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Item not found in cart'
          }
        });
      }
    } else {
      // Remove from guest cart
      const itemIndex = cart.items.findIndex(item => 
        item.product.toString() === productId.toString()
      );
      
      if (itemIndex >= 0) {
        // Always use direct database update for consistency
        let updatedItems = [...cart.items];
        updatedItems.splice(itemIndex, 1);
        
        // Use atomic update to prevent race conditions
        const updatedCart = await Cart.findByIdAndUpdate(
          cart._id,
          { 
            items: updatedItems, 
            updatedAt: new Date() 
          },
          { new: true }
        );
        cart.items = updatedCart.items;
      } else {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Item not found in cart'
          }
        });
      }
    }

    // Return updated cart - use the already modified data instead of refetching
    const cartItems = type === 'user' ? user.cart.items : cart.items;
    const populatedCart = await Promise.all(
      cartItems.map(async (item) => {
        const product = await Product.findById(item.product).select('-wholesaler');
        if (!product || !product.isActive) return null;
        
        return {
          _id: item.product,
          product: product.toPublicJSON(),
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity
        };
      })
    );

    const validCartItems = populatedCart.filter(item => item !== null);
    const itemCount = validCartItems.reduce((total, item) => total + item.quantity, 0);
    const subtotal = validCartItems.reduce((total, item) => total + item.subtotal, 0);

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: {
        cart: {
          items: validCartItems,
          itemCount,
          subtotal: Math.round(subtotal * 100) / 100,
          total: Math.round(subtotal * 100) / 100
        }
      },
      cartItemCount: itemCount
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

// Clear cart
router.delete('/clear', authenticateToken, validateCSRFToken, async (req, res) => {
  try {
    const { type, cart, user } = await getOrCreateCart(req);

    if (type === 'user') {
      // Clear user's cart
      user.cart.items = [];
      user.cart.updatedAt = new Date();
      await user.save();
      console.log('Cleared user cart for user:', user._id);
    } else {
      // Clear guest cart - use atomic update instead of delete/recreate
      console.log('Clearing guest cart for session:', cart.sessionId);
      
      // First, delete ALL carts with this session ID to handle duplicates
      const deleteResult = await Cart.deleteMany({ sessionId: cart.sessionId });
      console.log(`Deleted ${deleteResult?.deletedCount || 0} cart(s) for session ${cart.sessionId}`);
      
      // Create a single fresh cart
      const newCart = new Cart({ sessionId: cart.sessionId, items: [] });
      await newCart.save();
      
      console.log('Created fresh guest cart for session:', cart.sessionId);
    }

    res.json({
      success: true,
      message: 'Cart cleared',
      data: {
        cart: {
          items: [],
          itemCount: 0,
          subtotal: 0,
          total: 0,
          isEmpty: true
        }
      },
      cartItemCount: 0
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

// Merge guest cart with user cart with conflict resolution
router.post('/merge', authenticateToken, async (req, res) => {
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

    const { guestCartItems, sessionId } = req.body;
    
    console.log('Cart merge request:', { 
      userId: req.user._id, 
      sessionId, 
      guestItemCount: guestCartItems?.length || 0 
    });
    
    // Merge cart logic directly
    const user = await User.findById(req.user._id);
    if (!user.cart) {
      user.cart = { items: [], updatedAt: new Date() };
    }

    let mergedItems = 0;

    // Process guest cart items - use either guestCartItems OR session-based cart, not both
    if (guestCartItems && Array.isArray(guestCartItems) && guestCartItems.length > 0) {
      // Frontend sent cart items directly, use those
      for (const guestItem of guestCartItems) {
        const product = await Product.findById(guestItem.productId || guestItem.product);
        if (!product || !product.isActive) {
          continue;
        }

        const productId = guestItem.productId || guestItem.product;
        const quantity = guestItem.quantity || 1;

        const existingItemIndex = user.cart.items.findIndex(item => 
          item.product.toString() === productId.toString()
        );

        if (existingItemIndex >= 0) {
          // Take the guest cart quantity (replace, don't add)
          user.cart.items[existingItemIndex].quantity = quantity;
          user.cart.items[existingItemIndex].addedAt = new Date();
        } else {
          user.cart.items.push({
            product: productId,
            quantity,
            price: product.price,
            addedAt: new Date()
          });
        }
        mergedItems++;
      }
      
      // Clean up the guest cart from database if sessionId provided
      if (sessionId) {
        await Cart.deleteOne({ sessionId });
        console.log('Deleted guest cart for session:', sessionId);
      }
    } else if (sessionId) {
      // No items sent from frontend, try to load from database
      const guestCart = await Cart.findOne({ sessionId });
      if (guestCart && guestCart.items.length > 0) {
        console.log('Found guest cart with', guestCart.items.length, 'items for session:', sessionId);
        
        for (const guestItem of guestCart.items) {
          const product = await Product.findById(guestItem.product);
          if (!product || !product.isActive) {
            continue;
          }

          const existingItemIndex = user.cart.items.findIndex(item => 
            item.product.toString() === guestItem.product.toString()
          );

          if (existingItemIndex >= 0) {
            // Take the guest cart quantity (replace, don't add)
            user.cart.items[existingItemIndex].quantity = guestItem.quantity;
            user.cart.items[existingItemIndex].addedAt = new Date();
          } else {
            user.cart.items.push({
              product: guestItem.product,
              quantity: guestItem.quantity,
              price: guestItem.price,
              addedAt: new Date()
            });
          }
          mergedItems++;
        }
        
        // Clean up the guest cart after merge
        await Cart.deleteOne({ sessionId });
        console.log('Deleted guest cart for session:', sessionId);
      } else {
        console.log('No guest cart found for session:', sessionId);
      }
    }

    user.cart.updatedAt = new Date();
    await user.save();
    
    const mergeResult = {
      mergedItems,
      conflicts: [],
      duration: 0
    };

    // Get updated cart data
    const updatedCartData = await getOrCreateCart(req);
    
    // Return updated user cart
    const populatedCart = await Promise.all(
      updatedCartData.cart.items.map(async (item) => {
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
    const itemCount = validCartItems.reduce((total, item) => total + item.quantity, 0);
    const subtotal = validCartItems.reduce((total, item) => total + item.subtotal, 0);

    res.json({
      success: true,
      message: `Successfully merged ${mergeResult.mergedItems} items into your cart`,
      data: {
        cart: {
          items: validCartItems,
          itemCount,
          subtotal: Math.round(subtotal * 100) / 100,
          total: Math.round(subtotal * 100) / 100,
          isEmpty: validCartItems.length === 0
        },
        merge: {
          mergedItems: mergeResult.mergedItems,
          conflicts: mergeResult.conflicts,
          duration: mergeResult.duration
        }
      }
    });

  } catch (error) {
    console.error('Error merging guest cart:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CART_MERGE_ERROR',
        message: 'Failed to merge guest cart',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// Reset guest cart session - helps fix cart persistence issues
router.post('/reset-guest-session', async (req, res) => {
  try {
    // Only allow this for non-authenticated users (guests)
    if (req.user) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NOT_GUEST_USER',
          message: 'This endpoint is only for guest users'
        }
      });
    }

    // Get the old session ID from header
    const oldSessionId = req.headers['x-guest-session-id'];
    
    // Delete old guest cart if it exists
    if (oldSessionId && oldSessionId.startsWith('guest_')) {
      const deleteResult = await Cart.deleteMany({ sessionId: oldSessionId });
      console.log(`Deleted ${deleteResult?.deletedCount || 0} guest cart(s) for old session ${oldSessionId}`);
    }

    // Create a fresh guest session ID
    const newSessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create a fresh empty cart
    const newCart = new Cart({ sessionId: newSessionId, items: [] });
    await newCart.save();

    res.json({
      success: true,
      message: 'Guest cart session reset successfully',
      data: {
        sessionId: newSessionId,
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
    console.error('Error resetting guest cart session:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RESET_SESSION_ERROR',
        message: 'Failed to reset guest cart session'
      }
    });
  }
});

// Debug endpoint to see all guest carts (development only)
if (process.env.NODE_ENV === 'development') {
  router.get('/debug', async (req, res) => {
    try {
      const guestCarts = await Cart.find({}).select('sessionId items createdAt updatedAt');
      const userCarts = await User.find({ 'cart.items.0': { $exists: true } })
        .select('email cart.items cart.updatedAt');
      
      res.json({
        success: true,
        data: {
          guestCarts: guestCarts.map(cart => ({
            sessionId: cart.sessionId,
            itemCount: cart.items.length,
            items: cart.items,
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt
          })),
          userCarts: userCarts.map(user => ({
            email: user.email,
            itemCount: user.cart?.items?.length || 0,
            items: user.cart?.items || [],
            updatedAt: user.cart?.updatedAt
          })),
          currentSession: {
            guestSessionId: req.headers['x-guest-session-id'],
            serverSessionId: req.sessionID
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

module.exports = router;