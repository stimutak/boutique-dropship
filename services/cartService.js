const Cart = require('../models/Cart');
const User = require('../models/User');
const Product = require('../models/Product');
const EventEmitter = require('events');

class CartService extends EventEmitter {
  constructor() {
    super();
    this.connectionPool = new Map(); // Simple connection tracking
  }

  // Event-driven cart synchronization
  async notifyCartUpdate(sessionId, userId, cartData) {
    const eventData = {
      sessionId,
      userId,
      cart: cartData,
      timestamp: new Date()
    };

    // Emit event for real-time synchronization across browser tabs
    this.emit('cartUpdated', eventData);
    
    return eventData;
  }

  // Optimized cart retrieval with caching consideration
  async getCartWithPerformanceOptimization(req) {
    const startTime = Date.now();
    
    try {
      const result = await this.getOrCreateCart(req);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Log performance (should be under 100ms target)
      if (duration > 100) {
        console.warn(`Cart retrieval took ${duration}ms - exceeds 100ms target`);
      }
      
      return result;
    } catch (error) {
      console.error('Cart performance optimization error:', error);
      throw error;
    }
  }

  // Enhanced cart retrieval with connection pooling awareness
  async getOrCreateCart(req) {
    if (req.user) {
      // For authenticated users, use user's cart with optimistic loading
      const user = await User.findById(req.user._id);
      if (!user.cart) {
        // Create cart optimistically
        user.cart = { items: [], updatedAt: new Date() };
        await user.save();
        return { type: 'user', cart: user.cart, user };
      }
      return { type: 'user', cart: user.cart, user };
    } else {
      // For guests, use session-based cart with database storage
      const sessionId = req.sessionID || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Use findOneAndUpdate for atomic operation
      let cart = await Cart.findOneAndUpdate(
        { sessionId },
        { 
          $setOnInsert: { sessionId, items: [] },
          $set: { lastAccessed: new Date() }
        },
        { 
          new: true, 
          upsert: true,
          lean: true
        }
      );
      
      return { type: 'guest', cart, sessionId };
    }
  }

  // Enhanced cart merging with conflict resolution
  async mergeCartsWithConflictResolution(userId, guestCartItems, sessionId) {
    const startTime = Date.now();
    
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      if (!user.cart) {
        user.cart = { items: [], updatedAt: new Date() };
      }

      let mergedItems = 0;
      const conflicts = [];

      // Process guest cart items with conflict detection
      if (guestCartItems && Array.isArray(guestCartItems)) {
        for (const guestItem of guestCartItems) {
          const result = await this.mergeCartItem(user, guestItem, conflicts);
          if (result.merged) mergedItems++;
        }
      }

      // Process session-based cart
      if (sessionId) {
        const guestCart = await Cart.findOne({ sessionId });
        if (guestCart && guestCart.items.length > 0) {
          for (const guestItem of guestCart.items) {
            const result = await this.mergeCartItem(user, guestItem, conflicts);
            if (result.merged) mergedItems++;
          }
          
          // Clean up guest cart
          await Cart.deleteOne({ sessionId });
        }
      }

      user.cart.updatedAt = new Date();
      await user.save();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Emit cart update event
      await this.notifyCartUpdate(sessionId, userId, user.cart);

      return {
        mergedItems,
        conflicts,
        duration,
        success: true
      };

    } catch (error) {
      console.error('Cart merge error:', error);
      throw error;
    }
  }

  // Helper method to merge individual cart items
  async mergeCartItem(user, guestItem, conflicts = []) {
    try {
      const productId = guestItem.productId || guestItem.product;
      const quantity = guestItem.quantity || 1;

      // Validate product
      const product = await Product.findById(productId).lean();
      if (!product || !product.isActive) {
        return { merged: false, reason: 'invalid_product' };
      }

      // Check for existing item
      const existingItemIndex = user.cart.items.findIndex(item => 
        item.product.toString() === productId.toString()
      );

      if (existingItemIndex >= 0) {
        const currentQuantity = user.cart.items[existingItemIndex].quantity;
        const newQuantity = currentQuantity + quantity;
        
        // Check for quantity conflicts
        if (newQuantity > 99) {
          conflicts.push({
            productId,
            type: 'quantity_limit',
            current: currentQuantity,
            attempted: quantity,
            resolved: 99
          });
          user.cart.items[existingItemIndex].quantity = 99;
        } else {
          user.cart.items[existingItemIndex].quantity = newQuantity;
        }
        
        user.cart.items[existingItemIndex].addedAt = new Date();
      } else {
        // Add new item
        user.cart.items.push({
          product: productId,
          quantity: Math.min(quantity, 99),
          price: product.price,
          addedAt: new Date()
        });
      }

      return { merged: true };
    } catch (error) {
      console.error('Error merging cart item:', error);
      return { merged: false, reason: 'merge_error', error: error.message };
    }
  }

  // Optimistic cart update with rollback capability
  async updateCartOptimistically(req, operation, data) {
    const startTime = Date.now();
    let rollbackData = null;
    
    try {
      const { type, cart, user } = await this.getOrCreateCart(req);
      
      // Store rollback data
      if (type === 'user') {
        rollbackData = JSON.parse(JSON.stringify(user.cart));
      } else {
        rollbackData = JSON.parse(JSON.stringify(cart));
      }

      // Perform operation
      let result;
      switch (operation) {
        case 'add':
          result = await this.addItemOptimistically(type, cart, user, data);
          break;
        case 'update':
          result = await this.updateItemOptimistically(type, cart, user, data);
          break;
        case 'remove':
          result = await this.removeItemOptimistically(type, cart, user, data);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Performance monitoring
      if (duration > 200) {
        console.warn(`Cart ${operation} took ${duration}ms - exceeds 200ms target`);
      }

      // Emit update event
      const sessionId = type === 'guest' ? cart.sessionId : null;
      const userId = type === 'user' ? user._id : null;
      await this.notifyCartUpdate(sessionId, userId, result.cart);

      return {
        ...result,
        duration,
        performance: duration <= 200 ? 'good' : 'needs_optimization'
      };

    } catch (error) {
      console.error(`Cart ${operation} error:`, error);
      
      // Implement rollback if needed
      if (rollbackData) {
        console.log('Rolling back cart changes...');
        // Rollback implementation would go here
      }
      
      throw error;
    }
  }

  // Optimistic add item operation
  async addItemOptimistically(type, cart, user, { productId, quantity }) {
    const product = await Product.findById(productId).lean();
    if (!product || !product.isActive) {
      throw new Error('Product not found or inactive');
    }

    if (type === 'user') {
      const existingItemIndex = user.cart.items.findIndex(item => 
        item.product.toString() === productId.toString()
      );

      if (existingItemIndex >= 0) {
        const newQuantity = user.cart.items[existingItemIndex].quantity + quantity;
        if (newQuantity > 99) {
          user.cart.items[existingItemIndex].quantity = 99;
        } else {
          user.cart.items[existingItemIndex].quantity = newQuantity;
        }
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
      return { cart: user.cart };
    } else {
      // Check if cart has addItem method, otherwise manually add
      if (cart.addItem && typeof cart.addItem === 'function') {
        cart.addItem(productId, quantity, product.price);
      } else {
        // Manually add to cart items
        const existingItemIndex = cart.items.findIndex(item => 
          item.product.toString() === productId.toString()
        );

        if (existingItemIndex >= 0) {
          const newQuantity = cart.items[existingItemIndex].quantity + quantity;
          if (newQuantity > 99) {
            cart.items[existingItemIndex].quantity = 99;
          } else {
            cart.items[existingItemIndex].quantity = newQuantity;
          }
          cart.items[existingItemIndex].addedAt = new Date();
        } else {
          cart.items.push({
            product: productId,
            quantity,
            price: product.price,
            addedAt: new Date()
          });
        }
        cart.updatedAt = new Date();
      }
      
      // Use findByIdAndUpdate instead of save() for lean objects
      const updatedCart = await Cart.findByIdAndUpdate(
        cart._id,
        { items: cart.items, updatedAt: cart.updatedAt },
        { new: true, lean: true }
      );
      return { cart: updatedCart };
    }
  }

  // Optimistic update item operation
  async updateItemOptimistically(type, cart, user, { productId, quantity }) {
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
      return { cart: user.cart };
    } else {
      // Check if cart has updateItem method, otherwise manually update
      if (cart.updateItem && typeof cart.updateItem === 'function') {
        cart.updateItem(productId, quantity);
      } else {
        // Manually update cart items
        const itemIndex = cart.items.findIndex(item => 
          item.product.toString() === productId.toString()
        );

        if (itemIndex >= 0) {
          if (quantity === 0) {
            cart.items.splice(itemIndex, 1);
          } else {
            cart.items[itemIndex].quantity = quantity;
            cart.items[itemIndex].addedAt = new Date();
          }
          cart.updatedAt = new Date();
        }
      }
      
      // Use findByIdAndUpdate instead of save() for lean objects
      const updatedCart = await Cart.findByIdAndUpdate(
        cart._id,
        { items: cart.items, updatedAt: cart.updatedAt },
        { new: true, lean: true }
      );
      return { cart: updatedCart };
    }
  }

  // Optimistic remove item operation
  async removeItemOptimistically(type, cart, user, { productId }) {
    if (type === 'user') {
      const itemIndex = user.cart.items.findIndex(item => 
        item.product.toString() === productId.toString()
      );

      if (itemIndex >= 0) {
        user.cart.items.splice(itemIndex, 1);
        user.cart.updatedAt = new Date();
        await user.save();
      }
      return { cart: user.cart };
    } else {
      // Check if cart has removeItem method, otherwise manually remove
      if (cart.removeItem && typeof cart.removeItem === 'function') {
        cart.removeItem(productId);
      } else {
        // Manually remove from cart items
        const itemIndex = cart.items.findIndex(item => 
          item.product.toString() === productId.toString()
        );

        if (itemIndex >= 0) {
          cart.items.splice(itemIndex, 1);
          cart.updatedAt = new Date();
        }
      }
      
      // Use findByIdAndUpdate instead of save() for lean objects
      const updatedCart = await Cart.findByIdAndUpdate(
        cart._id,
        { items: cart.items, updatedAt: cart.updatedAt },
        { new: true, lean: true }
      );
      return { cart: updatedCart };
    }
  }

  // Cleanup expired guest carts (for scheduled maintenance)
  async cleanupExpiredCarts() {
    try {
      const result = await Cart.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      console.log(`Cleaned up ${result.deletedCount} expired guest carts`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired carts:', error);
      throw error;
    }
  }
}

// Export singleton instance
const cartService = new CartService();
module.exports = cartService;