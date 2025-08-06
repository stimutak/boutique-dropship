const mongoose = require('mongoose');

const gdprConsentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for anonymous users
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  consentVersion: {
    type: String,
    required: true,
    default: '1.0'
  },
  purposes: {
    necessary: {
      granted: { type: Boolean, default: true },
      timestamp: { type: Date, default: Date.now }
    },
    analytics: {
      granted: { type: Boolean, default: false },
      timestamp: { type: Date, default: null }
    },
    marketing: {
      granted: { type: Boolean, default: false },
      timestamp: { type: Date, default: null }
    },
    preferences: {
      granted: { type: Boolean, default: false },
      timestamp: { type: Date, default: null }
    }
  },
  legalBasis: {
    type: String,
    enum: ['consent', 'contract', 'legitimate_interest', 'legal_obligation'],
    default: 'consent'
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  withdrawnAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for efficient queries
gdprConsentSchema.index({ userId: 1, createdAt: -1 });
gdprConsentSchema.index({ sessionId: 1, createdAt: -1 });
gdprConsentSchema.index({ consentVersion: 1 });

// Update timestamp on save
gdprConsentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  
  // Update individual purpose timestamps when granted changes
  ['analytics', 'marketing', 'preferences'].forEach(purpose => {
    if (this.isModified(`purposes.${purpose}.granted`)) {
      this.purposes[purpose].timestamp = this.purposes[purpose].granted ? new Date() : null;
    }
  });
  
  next();
});

// Instance method to check if consent is valid
gdprConsentSchema.methods.isValid = function () {
  return !this.withdrawnAt && this.purposes.necessary.granted;
};

// Instance method to check specific purpose consent
gdprConsentSchema.methods.hasConsent = function (purpose) {
  if (!this.isValid()) {return false;}
  if (!this.purposes[purpose]) {return false;}
  return this.purposes[purpose].granted;
};

// Instance method to withdraw consent
gdprConsentSchema.methods.withdraw = function () {
  this.withdrawnAt = new Date();
  Object.keys(this.purposes).forEach(purpose => {
    if (purpose !== 'necessary') {
      this.purposes[purpose].granted = false;
      this.purposes[purpose].timestamp = null;
    }
  });
  return this.save();
};

// Static method to get latest consent for user
gdprConsentSchema.statics.getLatestForUser = function (userId) {
  return this.findOne({ 
    userId, 
    withdrawnAt: null 
  }).sort({ createdAt: -1 });
};

// Static method to get latest consent for session
gdprConsentSchema.statics.getLatestForSession = function (sessionId) {
  return this.findOne({ 
    sessionId, 
    withdrawnAt: null 
  }).sort({ createdAt: -1 });
};

// Static method to record new consent
gdprConsentSchema.statics.recordConsent = async function (consentData) {
  // Withdraw any existing consent for this user/session
  if (consentData.userId) {
    await this.updateMany(
      { userId: consentData.userId, withdrawnAt: null },
      { withdrawnAt: new Date() }
    );
  } else if (consentData.sessionId) {
    await this.updateMany(
      { sessionId: consentData.sessionId, withdrawnAt: null },
      { withdrawnAt: new Date() }
    );
  }
  
  // Create new consent record
  return this.create(consentData);
};

// Virtual for consent age in days
gdprConsentSchema.virtual('ageInDays').get(function () {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Transform for JSON output
gdprConsentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.ipAddress; // Don't expose IP to frontend
  delete obj.userAgent; // Don't expose user agent to frontend
  return obj;
};

const GDPRConsent = mongoose.model('GDPRConsent', gdprConsentSchema);

module.exports = GDPRConsent;