const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult, param } = require('express-validator');
const Review = require('../models/Review');
const Product = require('../models/Product');
const { requireAuth } = require('../middleware/auth');
const { _ErrorCodes } = require('../utils/errorHandler');
const router = express.Router();

// Validation middleware for review creation
const validateReview = [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters')
    .trim()
    .escape()
];

// Validation middleware for product ID parameter
const validateProductId = [
  param('productId')
    .isMongoId()
    .withMessage('Valid product ID is required')
];

// POST /api/reviews - Create a new review (requires authentication)
router.post('/', requireAuth, validateReview, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { productId, rating, comment } = req.body;
    const userId = req.user.id;
    const locale = req.headers['x-locale'] || 'en';

    // Check if product exists
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user can review this product (must have purchased it)
    const reviewCheck = await Review.canUserReview(userId, productId);
    if (!reviewCheck.canReview) {
      const messages = {
        'not_purchased': 'You can only review products you have purchased',
        'already_reviewed': 'You have already reviewed this product'
      };
      
      return res.status(403).json({
        success: false,
        message: messages[reviewCheck.reason] || 'You cannot review this product'
      });
    }

    // Create the review
    const review = await Review.create({
      product: productId,
      user: userId,
      rating,
      comment,
      locale,
      status: 'pending' // All reviews start as pending
    });

    // Populate user info for response
    await review.populate('user', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will be visible after admin approval.',
      review: {
        _id: review._id,
        product: review.product,
        user: review.user._id,
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        locale: review.locale,
        createdAt: review.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating review:', error);
    
    // Handle duplicate review error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/reviews/:productId - Get approved reviews for a product
router.get('/:productId', validateProductId, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
        errors: errors.array()
      });
    }

    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if product exists
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get approved reviews with pagination
    const reviews = await Review.findApproved({ product: productId })
      .populate('user', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const totalReviews = await Review.countDocuments({ 
      product: productId, 
      status: 'approved' 
    });

    // Get review statistics
    const stats = await Review.getProductReviewStats(new mongoose.Types.ObjectId(productId));

    res.json({
      success: true,
      reviews: reviews.map(review => ({
        _id: review._id,
        user: {
          firstName: review.user.firstName,
          lastName: review.user.lastName
        },
        rating: review.rating,
        comment: review.comment,
        helpful: review.helpful,
        createdAt: review.createdAt,
        status: review.status
      })),
      stats,
      pagination: {
        page,
        limit,
        total: totalReviews,
        pages: Math.ceil(totalReviews / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/reviews/user/my-reviews - Get all reviews by authenticated user
router.get('/user/my-reviews', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get user's reviews with product information
    const reviews = await Review.find({ user: userId })
      .populate('product', 'name slug images price')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const totalReviews = await Review.countDocuments({ user: userId });

    res.json({
      success: true,
      reviews: reviews.map(review => ({
        _id: review._id,
        product: {
          _id: review.product._id,
          name: review.product.name,
          slug: review.product.slug,
          images: review.product.images,
          price: review.product.price
        },
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        helpful: review.helpful,
        createdAt: review.createdAt,
        adminNotes: review.adminNotes
      })),
      pagination: {
        page,
        limit,
        total: totalReviews,
        pages: Math.ceil(totalReviews / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/reviews/:reviewId/helpful - Mark review as helpful (requires authentication)
router.put('/:reviewId/helpful', requireAuth, [
  param('reviewId').isMongoId().withMessage('Valid review ID is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review ID',
        errors: errors.array()
      });
    }

    const { reviewId } = req.params;
    const userId = req.user.id;

    // Find the review
    const review = await Review.findOne({ _id: reviewId, status: 'approved' });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user already marked this review as helpful
    const alreadyHelpful = review.helpful.users.includes(userId);
    
    if (alreadyHelpful) {
      // Unmark as helpful
      await review.unmarkHelpful(userId);
      res.json({
        success: true,
        message: 'Review unmarked as helpful',
        helpful: {
          count: review.helpful.count,
          marked: false
        }
      });
    } else {
      // Mark as helpful
      await review.markHelpful(userId);
      res.json({
        success: true,
        message: 'Review marked as helpful',
        helpful: {
          count: review.helpful.count,
          marked: true
        }
      });
    }

  } catch (error) {
    console.error('Error updating review helpfulness:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review helpfulness',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;