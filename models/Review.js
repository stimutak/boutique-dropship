const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 1000,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  adminNotes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  // Admin approval tracking
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  // Internationalization support
  locale: {
    type: String,
    default: 'en'
  },
  // Review helpfulness tracking
  helpful: {
    count: { type: Number, default: 0 },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }
}, {
  timestamps: true
});

// Indexes for performance
reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ user: 1, product: 1 }, { unique: true }); // One review per user per product
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });

// Instance method to approve review
reviewSchema.methods.approve = async function (adminId, notes = '') {
  this.status = 'approved';
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  if (notes) {
    this.adminNotes = notes;
  }
  return this.save();
};

// Instance method to reject review
reviewSchema.methods.reject = async function (adminId, notes = '') {
  this.status = 'rejected';
  this.rejectedBy = adminId;
  this.rejectedAt = new Date();
  if (notes) {
    this.adminNotes = notes;
  }
  return this.save();
};

// Static method to find approved reviews
reviewSchema.statics.findApproved = function (query = {}) {
  return this.find({ ...query, status: 'approved' })
    .populate('user', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Static method to get average rating for a product
reviewSchema.statics.getAverageRating = async function (productId) {
  const result = await this.aggregate([
    { $match: { product: productId, status: 'approved' } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  
  if (result.length === 0) {
    return { average: 0, count: 0 };
  }
  
  return {
    average: Math.round(result[0].average * 10) / 10, // Round to 1 decimal place
    count: result[0].count
  };
};

// Static method to check if user can review product (must have purchased it)
reviewSchema.statics.canUserReview = async function (userId, productId) {
  const Order = require('./Order');
  
  // Check if user has purchased this product
  const purchaseExists = await Order.findOne({
    $or: [
      { customer: userId }, // Registered user order
      { 'guestInfo.email': await this.getUserEmail(userId) } // Guest order with same email
    ],
    'items.product': productId,
    'payment.status': 'paid'
  });
  
  if (!purchaseExists) {
    return false;
  }
  
  // Check if user already reviewed this product
  const existingReview = await this.findOne({
    user: userId,
    product: productId
  });
  
  return !existingReview;
};

// Helper method to get user email
reviewSchema.statics.getUserEmail = async function (userId) {
  const User = require('./User');
  const user = await User.findById(userId).select('email');
  return user ? user.email : null;
};

// Method to get review statistics for a product
reviewSchema.statics.getProductReviewStats = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: productId, status: 'approved' } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);
  
  if (stats.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
  
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  stats[0].ratingDistribution.forEach(rating => {
    distribution[rating]++;
  });
  
  return {
    totalReviews: stats[0].totalReviews,
    averageRating: Math.round(stats[0].averageRating * 10) / 10,
    ratingDistribution: distribution
  };
};

// Method to mark review as helpful
reviewSchema.methods.markHelpful = async function (userId) {
  if (!this.helpful.users.includes(userId)) {
    this.helpful.users.push(userId);
    this.helpful.count++;
    return this.save();
  }
  return this;
};

// Method to unmark review as helpful
reviewSchema.methods.unmarkHelpful = async function (userId) {
  const index = this.helpful.users.indexOf(userId);
  if (index > -1) {
    this.helpful.users.splice(index, 1);
    this.helpful.count--;
    return this.save();
  }
  return this;
};

module.exports = mongoose.model('Review', reviewSchema);