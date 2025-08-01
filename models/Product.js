const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    required: true,
    maxlength: 200
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  compareAtPrice: {
    type: Number,
    min: 0
  },
  // Multi-currency support
  baseCurrency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'CNY', 'JPY', 'SAR', 'GBP', 'CAD']
  },
  prices: {
    USD: { type: Number },
    EUR: { type: Number },
    CNY: { type: Number },
    JPY: { type: Number },
    SAR: { type: Number },
    GBP: { type: Number },
    CAD: { type: Number }
  },
  images: [{
    url: { type: String, required: true },
    alt: { type: String, required: true },
    isPrimary: { type: Boolean, default: false }
  }],
  category: {
    type: String,
    required: true,
    enum: ['crystals', 'herbs', 'oils', 'supplements', 'books', 'accessories', 'other']
  },
  tags: [String],
  properties: {
    chakra: [String],
    element: [String],
    zodiac: [String],
    healing: [String],
    origin: String,
    size: String,
    weight: String
  },
  wholesaler: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    productCode: { type: String, required: true },
    cost: { type: Number, required: true },
    minOrderQty: { type: Number, default: 1 }
  },
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  crossSiteIntegration: {
    enabled: { type: Boolean, default: true },
    referenceKey: String, // For linking from sister sites
    relatedContent: [String] // URLs or content IDs from sister sites
  },
  // Inventory management
  inventory: {
    stock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    trackInventory: { type: Boolean, default: false },
    allowBackorder: { type: Boolean, default: false },
    sku: { type: String, trim: true }
  },
  // Internationalization support
  translations: {
    type: Map,
    of: {
      name: String,
      description: String,
      shortDescription: String,
      seo: {
        title: String,
        description: String,
        keywords: [String]
      }
    },
    default: new Map()
  },
  // Soft delete support
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ 'crossSiteIntegration.referenceKey': 1 });
productSchema.index({ tags: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ price: 1, isActive: 1 });
productSchema.index({ 'properties.chakra': 1, isActive: 1 });
productSchema.index({ createdAt: -1, isActive: 1 });

// Method to get public product data (excludes wholesaler info)
productSchema.methods.toPublicJSON = function() {
  const product = this.toObject();
  delete product.wholesaler;
  return product;
};

// Method to get localized content
productSchema.methods.getLocalizedContent = function(locale = 'en') {
  if (locale === 'en' || !this.translations || !this.translations.get(locale)) {
    return {
      localizedName: this.name,
      localizedDescription: this.description,
      localizedShortDescription: this.shortDescription
    };
  }

  const translation = this.translations.get(locale);
  return {
    localizedName: translation.name || this.name,
    localizedDescription: translation.description || this.description,
    localizedShortDescription: translation.shortDescription || this.shortDescription
  };
};

// Method for soft delete
productSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Method to restore soft-deleted product
productSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Static method to get products for public API
productSchema.statics.findPublic = function(query = {}) {
  return this.find({ ...query, isActive: true, isDeleted: { $ne: true } }).select('-wholesaler');
};

// Static method to find active products (excludes soft-deleted)
productSchema.statics.findActive = function(query = {}) {
  return this.find({ ...query, isDeleted: { $ne: true } });
};

// Method to get cross-site integration data
productSchema.methods.getCrossSiteData = function() {
  return {
    _id: this._id,
    name: this.name,
    slug: this.slug,
    shortDescription: this.shortDescription,
    price: this.price,
    compareAtPrice: this.compareAtPrice,
    images: this.images,
    category: this.category,
    properties: this.properties,
    seo: this.seo,
    crossSiteIntegration: this.crossSiteIntegration
  };
};

// Validation for cross-site integration
productSchema.pre('save', function(next) {
  if (this.crossSiteIntegration.enabled && !this.crossSiteIntegration.referenceKey) {
    this.crossSiteIntegration.referenceKey = this.slug;
  }
  
  // Ensure USD price is always set from base price
  if (!this.prices) {
    this.prices = {};
  }
  this.prices.USD = this.price;
  
  next();
});

module.exports = mongoose.model('Product', productSchema);