const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  addresses: [{
    type: {
      type: String,
      enum: ['shipping', 'billing'],
      required: true
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true, default: 'US' },
    phone: String,
    isDefault: { type: Boolean, default: false }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  permissions: {
    type: [String],
    default: []
  },
  lastLogin: Date,
  passwordResetToken: String,
  passwordResetExpiry: Date,
  version: {
    type: Number,
    default: 0
  },
  preferences: {
    newsletter: { type: Boolean, default: false },
    notifications: { type: Boolean, default: true },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'USD' },
    emailPreferences: {
      orderConfirmations: { type: Boolean, default: true },
      paymentReceipts: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      promotionalEmails: { type: Boolean, default: false },
      welcomeEmails: { type: Boolean, default: true }
    }
  },
  cart: {
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
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  gdprConsent: {
    currentConsentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GDPRConsent',
      default: null
    },
    dataProcessingAgreement: {
      type: Boolean,
      default: false
    },
    consentWithdrawnAt: {
      type: Date,
      default: null
    },
    dataExportRequests: [{
      requestedAt: { type: Date, required: true },
      completedAt: { type: Date, default: null },
      downloadUrl: { type: String, default: null },
      expiresAt: { type: Date, default: null }
    }],
    deletionRequests: [{
      requestedAt: { type: Date, required: true },
      scheduledFor: { type: Date, required: true },
      completedAt: { type: Date, default: null },
      reason: { type: String, default: '' },
      status: {
        type: String,
        enum: ['pending', 'scheduled', 'processing', 'completed', 'cancelled'],
        default: 'pending'
      }
    }]
  }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ isActive: 1 });
userSchema.index({ lastLogin: -1 });

// Pre-save middleware
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {return next();}
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Authentication method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get default shipping address
userSchema.methods.getDefaultShippingAddress = function () {
  return this.addresses.find(addr => addr.type === 'shipping' && addr.isDefault) ||
         this.addresses.find(addr => addr.type === 'shipping');
};

// Method to get default billing address
userSchema.methods.getDefaultBillingAddress = function () {
  return this.addresses.find(addr => addr.type === 'billing' && addr.isDefault) ||
         this.addresses.find(addr => addr.type === 'billing') ||
         this.getDefaultShippingAddress(); // Fallback to shipping if no billing
};

// Method to add or update address
userSchema.methods.addAddress = function (addressData) {
  // If this is set as default, unset other defaults of the same type
  if (addressData.isDefault) {
    this.addresses.forEach(addr => {
      if (addr.type === addressData.type) {
        addr.isDefault = false;
      }
    });
  }
  
  this.addresses.push(addressData);
  return this.save();
};

// Method to update address
userSchema.methods.updateAddress = function (addressId, updateData) {
  const address = this.addresses.id(addressId);
  if (!address) {return null;}
  
  // If setting as default, unset other defaults of the same type
  if (updateData.isDefault) {
    this.addresses.forEach(addr => {
      if (addr.type === address.type && addr._id.toString() !== addressId) {
        addr.isDefault = false;
      }
    });
  }
  
  Object.assign(address, updateData);
  return this.save();
};

// Method to remove address
userSchema.methods.removeAddress = function (addressId) {
  this.addresses.pull(addressId);
  return this.save();
};

// Method to set default address
userSchema.methods.setDefaultAddress = function (addressId) {
  const address = this.addresses.id(addressId);
  if (!address) {return null;}
  
  // Unset other defaults of the same type
  this.addresses.forEach(addr => {
    if (addr.type === address.type && addr._id.toString() !== addressId) {
      addr.isDefault = false;
    }
  });
  
  // Set this address as default
  address.isDefault = true;
  return this.save();
};

// Method to update email preferences
userSchema.methods.updateEmailPreferences = function (preferences) {
  Object.assign(this.preferences.emailPreferences, preferences);
  return this.save();
};

// Method to check if user wants specific email type
userSchema.methods.wantsEmail = function (emailType) {
  if (!this.preferences.notifications) {return false;}
  return this.preferences.emailPreferences[emailType] !== false;
};

// Method to get public user data (excludes sensitive info)
userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    phone: this.phone,
    addresses: this.addresses,
    preferences: this.preferences,
    isAdmin: this.isAdmin,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('User', userSchema);