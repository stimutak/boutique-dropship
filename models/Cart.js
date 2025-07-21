const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 99
    },
    price: {
      type: Number,
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  expiresAt: {
    type: Date,
    default: Date.now,
    expires: 2592000 // 30 days in seconds
  }
}, {
  timestamps: true
});

// Indexes for performance
cartSchema.index({ sessionId: 1 });
cartSchema.index({ expiresAt: 1 });

// Method to calculate cart totals
cartSchema.methods.calculateTotals = function() {
  const subtotal = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  return {
    itemCount: this.items.reduce((total, item) => total + item.quantity, 0),
    subtotal: Math.round(subtotal * 100) / 100,
    total: Math.round(subtotal * 100) / 100 // Can add tax/shipping later
  };
};

// Method to add item to cart
cartSchema.methods.addItem = function(productId, quantity, price) {
  const existingItemIndex = this.items.findIndex(item => 
    item.product.toString() === productId.toString()
  );

  if (existingItemIndex >= 0) {
    // Update existing item
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].addedAt = new Date();
  } else {
    // Add new item
    this.items.push({
      product: productId,
      quantity,
      price,
      addedAt: new Date()
    });
  }
  
  this.updatedAt = new Date();
  // Only extend expiry if cart is not already expired and hasn't been extended recently
  const now = new Date();
  if (!this.expiresAt || this.expiresAt < now) {
    this.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  }
};

// Method to update item quantity
cartSchema.methods.updateItem = function(productId, quantity) {
  const itemIndex = this.items.findIndex(item => 
    item.product.toString() === productId.toString()
  );

  if (itemIndex >= 0) {
    if (quantity <= 0) {
      this.items.splice(itemIndex, 1);
    } else {
      this.items[itemIndex].quantity = quantity;
      this.items[itemIndex].addedAt = new Date();
    }
    this.updatedAt = new Date();
    return true;
  }
  return false;
};

// Method to remove item
cartSchema.methods.removeItem = function(productId) {
  const itemIndex = this.items.findIndex(item => 
    item.product.toString() === productId.toString()
  );

  if (itemIndex >= 0) {
    this.items.splice(itemIndex, 1);
    this.updatedAt = new Date();
    return true;
  }
  return false;
};

// Method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  this.updatedAt = new Date();
};

module.exports = mongoose.model('Cart', cartSchema);