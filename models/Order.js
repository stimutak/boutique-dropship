const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow guest checkout
  },
  guestInfo: {
    email: {
      type: String,
      required: function () { return !this.customer; },
      lowercase: true,
      trim: true
    },
    firstName: {
      type: String,
      required: function () { return !this.customer; },
      trim: true
    },
    lastName: {
      type: String,
      required: function () { return !this.customer; },
      trim: true
    },
    phone: {
      type: String,
      trim: true
    }
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
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    wholesaler: {
      name: String,
      email: String,
      productCode: String,
      notified: { type: Boolean, default: false },
      notifiedAt: Date,
      notificationAttempts: { type: Number, default: 0 },
      lastNotificationError: String
    }
  }],
  shippingAddress: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true, default: 'US' },
    phone: String
  },
  billingAddress: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true, default: 'US' }
  },
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  shipping: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  payment: {
    method: {
      type: String,
      enum: ['card', 'crypto', 'other'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    molliePaymentId: String,
    transactionId: String,
    paidAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  shipDate: Date,
  estimatedDeliveryDate: Date,
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true
    },
    notes: String,
    trackingNumber: String,
    shippingCarrier: String,
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  notes: String,
  referralSource: String, // Track which sister site referred this order
  // Refunds support
  refunds: [{
    _id: mongoose.Schema.Types.ObjectId,
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
    mollieRefundId: String,
    processedAt: Date,
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['full', 'partial'], default: 'full' },
    items: [{ productId: mongoose.Schema.Types.ObjectId, quantity: Number }],
    notifyCustomer: { type: Boolean, default: true }
  }],
  // Enhanced shipping support
  shipping: {
    trackingNumber: String,
    labelUrl: String,
    carrier: String,
    labelGeneratedAt: Date,
    cost: { type: Number, default: 0 }
  },
  // Multi-currency support
  currency: {
    type: String,
    required: true,
    default: 'USD',
    enum: ['USD', 'EUR', 'CNY', 'JPY', 'SAR', 'GBP', 'CAD']
  },
  exchangeRate: {
    type: Number,
    required: true,
    default: 1
  }
}, {
  timestamps: true
});

// Indexes for performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ 'guestInfo.email': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ referralSource: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'items.wholesaler.notified': 1 });

// Pre-save middleware
orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    this.orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  
  // Initialize status history for new orders
  if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
    this.statusHistory = [{
      status: this.status || 'pending',
      timestamp: new Date(),
      notes: 'Order created'
    }];
  }
  
  next();
});

// Method to get customer email (works for both guest and registered users)
orderSchema.methods.getCustomerEmail = function () {
  if (this.customer && this.populated('customer')) {
    return this.customer.email;
  }
  return this.guestInfo.email;
};

// Method to get customer name
orderSchema.methods.getCustomerName = function () {
  if (this.customer && this.populated('customer')) {
    return `${this.customer.firstName} ${this.customer.lastName}`;
  }
  return `${this.guestInfo.firstName} ${this.guestInfo.lastName}`;
};

// Method to check if all wholesalers have been notified
orderSchema.methods.allWholesalersNotified = function () {
  return this.items.every(item => item.wholesaler.notified);
};

// Method to get pending wholesaler notifications
orderSchema.methods.getPendingNotifications = function () {
  return this.items.filter(item => !item.wholesaler.notified);
};

// Method to update wholesaler notification status
orderSchema.methods.updateWholesalerNotification = function (itemId, success, error = null) {
  const item = this.items.id(itemId);
  if (item) {
    item.wholesaler.notificationAttempts += 1;
    if (success) {
      item.wholesaler.notified = true;
      item.wholesaler.notifiedAt = new Date();
      item.wholesaler.lastNotificationError = null;
    } else {
      item.wholesaler.lastNotificationError = error;
    }
  }
  return this.save();
};

// Static method to find orders needing wholesaler notification
orderSchema.statics.findPendingNotifications = function () {
  return this.find({
    'payment.status': 'paid',
    'items.wholesaler.notified': false
  });
};

// Method to validate status transitions
orderSchema.methods.canTransitionTo = function (newStatus) {
  const validTransitions = {
    'pending': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered'],
    'delivered': [], // No transitions from delivered
    'cancelled': [] // No transitions from cancelled
  };
  
  return validTransitions[this.status]?.includes(newStatus) || false;
};

// Method to add status history entry
orderSchema.methods.addStatusHistory = function (newStatus, options = {}) {
  const { notes, trackingNumber, shippingCarrier, admin } = options;
  
  // Validate transition
  if (!this.canTransitionTo(newStatus)) {
    throw new Error(`Cannot transition from ${this.status} to ${newStatus}`);
  }
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    notes,
    trackingNumber,
    shippingCarrier,
    admin
  });
  
  // Update current status
  this.status = newStatus;
  
  // Update main order fields if provided
  if (trackingNumber) {this.trackingNumber = trackingNumber;}
  if (shippingCarrier) {this.shippingCarrier = shippingCarrier;}
  
  // Set dates based on status
  if (newStatus === 'shipped' && !this.shipDate) {
    this.shipDate = new Date();
  }
};

// Method to get public order data (excludes sensitive wholesaler info)
orderSchema.methods.toPublicJSON = function () {
  const order = this.toObject();
  
  // Remove sensitive wholesaler information from items
  if (order.items) {
    order.items = order.items.map(item => {
      const publicItem = { ...item };
      if (publicItem.wholesaler) {
        // Keep only notification status, remove sensitive details
        publicItem.wholesaler = {
          notified: item.wholesaler.notified,
          notifiedAt: item.wholesaler.notifiedAt
        };
      }
      return publicItem;
    });
  }
  
  return order;
};

// Hook trigger comment - wholesaler notification check
// Referral tracking hook test

module.exports = mongoose.model('Order', orderSchema);