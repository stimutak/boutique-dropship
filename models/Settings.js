const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Unique key for the setting
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Category for grouping settings
  category: {
    type: String,
    required: true,
    enum: [
      'general',
      'store',
      'payment',
      'shipping',
      'email',
      'security',
      'internationalization',
      'integration',
      'analytics',
      'maintenance'
    ],
    default: 'general'
  },
  
  // Display information
  label: {
    type: String,
    required: true,
    trim: true
  },
  
  description: {
    type: String,
    trim: true
  },
  
  // Setting value (flexible storage)
  value: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Default value for reset functionality
  defaultValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Data type and validation
  dataType: {
    type: String,
    required: true,
    enum: ['string', 'number', 'boolean', 'array', 'object', 'json'],
    default: 'string'
  },
  
  // Input type for frontend rendering
  inputType: {
    type: String,
    enum: [
      'text', 'textarea', 'number', 'boolean', 'select', 
      'multiselect', 'email', 'url', 'password', 'color',
      'file', 'json', 'currency', 'language'
    ],
    default: 'text'
  },
  
  // Options for select/multiselect inputs
  options: [{
    label: String,
    value: mongoose.Schema.Types.Mixed
  }],
  
  // Validation rules
  validation: {
    required: { type: Boolean, default: false },
    min: { type: Number },
    max: { type: Number },
    minLength: { type: Number },
    maxLength: { type: Number },
    pattern: { type: String }, // Regex pattern
    custom: { type: String }   // Custom validation function name
  },
  
  // Access control
  isPublic: {
    type: Boolean,
    default: false // Most settings should be admin-only
  },
  
  // Whether this setting requires system restart
  requiresRestart: {
    type: Boolean,
    default: false
  },
  
  // Whether this setting is currently active
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Sorting order within category
  sortOrder: {
    type: Number,
    default: 0
  },
  
  // Who last modified this setting
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Change history (last 5 changes)
  changeHistory: [{
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }]
}, {
  timestamps: true
});

// Indexes for performance
settingsSchema.index({ key: 1 }, { unique: true });
settingsSchema.index({ category: 1, sortOrder: 1 });
settingsSchema.index({ isActive: 1 });
settingsSchema.index({ isPublic: 1 });

// Pre-save middleware to track changes
settingsSchema.pre('save', function (next) {
  // Track value changes
  if (this.isModified('value') && !this.isNew) {
    const change = {
      oldValue: this._original?.value,
      newValue: this.value,
      changedBy: this.lastModifiedBy,
      changedAt: new Date()
    };
    
    // Keep only last 5 changes
    this.changeHistory.unshift(change);
    if (this.changeHistory.length > 5) {
      this.changeHistory = this.changeHistory.slice(0, 5);
    }
  }
  
  next();
});

// Store original value before modifications
settingsSchema.pre('findOneAndUpdate', function () {
  this._original = this.getQuery();
});

// Method to get typed value
settingsSchema.methods.getTypedValue = function () {
  if (this.value === null || this.value === undefined) {
    return this.defaultValue;
  }
  
  switch (this.dataType) {
    case 'number':
      return Number(this.value);
    case 'boolean':
      return Boolean(this.value);
    case 'array':
      return Array.isArray(this.value) ? this.value : [];
    case 'object':
    case 'json':
      return typeof this.value === 'object' ? this.value : {};
    case 'string':
    default:
      return String(this.value);
  }
};

// Method to validate value against rules
settingsSchema.methods.validateValue = function (value) {
  const { validation } = this;
  const errors = [];
  
  // Required check
  if (validation.required && (value === null || value === undefined || value === '')) {
    errors.push(`${this.label} is required`);
    return errors;
  }
  
  // Skip other validations if value is empty and not required
  if (!validation.required && (value === null || value === undefined || value === '')) {
    return errors;
  }
  
  // Type-specific validations
  switch (this.dataType) {
    case 'string':
      if (validation.minLength && value.length < validation.minLength) {
        errors.push(`${this.label} must be at least ${validation.minLength} characters`);
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        errors.push(`${this.label} must be no more than ${validation.maxLength} characters`);
      }
      if (validation.pattern) {
        // eslint-disable-next-line security/detect-non-literal-regexp
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          errors.push(`${this.label} format is invalid`);
        }
      }
      break;
      
    case 'number': {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push(`${this.label} must be a valid number`);
      } else {
        if (validation.min !== undefined && numValue < validation.min) {
          errors.push(`${this.label} must be at least ${validation.min}`);
        }
        if (validation.max !== undefined && numValue > validation.max) {
          errors.push(`${this.label} must be no more than ${validation.max}`);
        }
      }
      break;
    }
      
    case 'array':
      if (!Array.isArray(value)) {
        errors.push(`${this.label} must be an array`);
      } else {
        if (validation.min !== undefined && value.length < validation.min) {
          errors.push(`${this.label} must have at least ${validation.min} items`);
        }
        if (validation.max !== undefined && value.length > validation.max) {
          errors.push(`${this.label} must have no more than ${validation.max} items`);
        }
      }
      break;
  }
  
  return errors;
};

// Method to reset to default value
settingsSchema.methods.resetToDefault = function (userId, reason = 'Reset to default') {
  this.value = this.defaultValue;
  this.lastModifiedBy = userId;
  
  // Add to change history
  this.changeHistory.unshift({
    oldValue: this.value,
    newValue: this.defaultValue,
    changedBy: userId,
    changedAt: new Date(),
    reason: reason
  });
  
  return this.save();
};

// Static method to get setting value by key
settingsSchema.statics.getValue = async function (key, defaultValue = null) {
  const setting = await this.findOne({ key, isActive: true });
  return setting ? setting.getTypedValue() : defaultValue;
};

// Static method to set setting value
settingsSchema.statics.setValue = async function (key, value, userId, reason) {
  const setting = await this.findOne({ key });
  if (!setting) {
    throw new Error(`Setting with key '${key}' not found`);
  }
  
  // Validate the value
  const validationErrors = setting.validateValue(value);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }
  
  setting.value = value;
  setting.lastModifiedBy = userId;
  
  // Add reason if provided
  if (reason && setting.changeHistory[0]) {
    setting.changeHistory[0].reason = reason;
  }
  
  return setting.save();
};

// Static method to get settings by category
settingsSchema.statics.getByCategory = async function (category, includeInactive = false) {
  const query = { category };
  if (!includeInactive) {
    query.isActive = true;
  }
  
  return this.find(query).sort({ sortOrder: 1, label: 1 });
};

// Static method to get public settings (for frontend)
settingsSchema.statics.getPublicSettings = async function () {
  const settings = await this.find({ isPublic: true, isActive: true });
  const publicSettings = {};
  
  settings.forEach(setting => {
    publicSettings[setting.key] = setting.getTypedValue();
  });
  
  return publicSettings;
};

// Method to get public JSON (excludes sensitive data)
settingsSchema.methods.toPublicJSON = function () {
  return {
    key: this.key,
    category: this.category,
    label: this.label,
    description: this.description,
    value: this.getTypedValue(),
    dataType: this.dataType,
    inputType: this.inputType,
    options: this.options,
    validation: this.validation,
    sortOrder: this.sortOrder,
    requiresRestart: this.requiresRestart,
    updatedAt: this.updatedAt
  };
};

// Method to get admin JSON (includes change history)
settingsSchema.methods.toAdminJSON = function () {
  return {
    ...this.toPublicJSON(),
    defaultValue: this.defaultValue,
    isPublic: this.isPublic,
    isActive: this.isActive,
    lastModifiedBy: this.lastModifiedBy,
    changeHistory: this.changeHistory.slice(0, 3), // Last 3 changes
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('Settings', settingsSchema);