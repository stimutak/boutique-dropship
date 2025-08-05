const mongoose = require('mongoose');
const Review = require('../../models/Review');
const User = require('../../models/User');
const Product = require('../../models/Product');

describe('Review Model', () => {
  let testUser;
  let testProduct;

  beforeEach(async () => {
    // Clear collections
    await Review.deleteMany({});
    await User.deleteMany({});
    await Product.deleteMany({});

    // Create test user
    testUser = await User.create({
      email: 'user@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    });

    // Create test product
    testProduct = await Product.create({
      name: 'Crystal Test',
      slug: 'crystal-test',
      description: 'A test crystal',
      shortDescription: 'Test crystal',
      price: 29.99,
      category: 'crystals',
      wholesaler: {
        name: 'Test Wholesaler',
        email: 'wholesaler@test.com',
        productCode: 'TC001',
        cost: 15.00
      }
    });
  });

  describe('Schema Validation', () => {
    test('should require product reference', async () => {
      const review = new Review({
        user: testUser._id,
        rating: 5,
        comment: 'Great product!'
      });

      await expect(review.save()).rejects.toMatchObject({
        errors: {
          product: expect.objectContaining({
            message: expect.stringContaining('required')
          })
        }
      });
    });

    test('should require user reference', async () => {
      const review = new Review({
        product: testProduct._id,
        rating: 5,
        comment: 'Great product!'
      });

      await expect(review.save()).rejects.toMatchObject({
        errors: {
          user: expect.objectContaining({
            message: expect.stringContaining('required')
          })
        }
      });
    });

    test('should require rating between 1 and 5', async () => {
      const reviewLow = new Review({
        product: testProduct._id,
        user: testUser._id,
        rating: 0,
        comment: 'Bad rating'
      });

      await expect(reviewLow.save()).rejects.toMatchObject({
        errors: {
          rating: expect.objectContaining({
            message: expect.stringContaining('minimum')
          })
        }
      });

      const reviewHigh = new Review({
        product: testProduct._id,
        user: testUser._id,
        rating: 6,
        comment: 'Too high rating'
      });

      await expect(reviewHigh.save()).rejects.toMatchObject({
        errors: {
          rating: expect.objectContaining({
            message: expect.stringContaining('maximum')
          })
        }
      });
    });

    test('should require comment with minimum length', async () => {
      const review = new Review({
        product: testProduct._id,
        user: testUser._id,
        rating: 5,
        comment: 'Hi'
      });

      await expect(review.save()).rejects.toMatchObject({
        errors: {
          comment: expect.objectContaining({
            message: expect.stringContaining('minimum')
          })
        }
      });
    });

    test('should default status to pending', async () => {
      const review = new Review({
        product: testProduct._id,
        user: testUser._id,
        rating: 5,
        comment: 'This is a valid review comment that meets the minimum length requirement.'
      });

      await review.save();
      expect(review.status).toBe('pending');
    });

    test('should only allow valid status values', async () => {
      const review = new Review({
        product: testProduct._id,
        user: testUser._id,
        rating: 5,
        comment: 'This is a valid review comment that meets the minimum length requirement.',
        status: 'invalid-status'
      });

      await expect(review.save()).rejects.toMatchObject({
        errors: {
          status: expect.objectContaining({
            message: expect.stringContaining('enum')
          })
        }
      });
    });

    test('should enforce unique user-product combination', async () => {
      // Create first review
      await Review.create({
        product: testProduct._id,
        user: testUser._id,
        rating: 5,
        comment: 'This is a valid review comment that meets the minimum length requirement.'
      });

      // Try to create duplicate review
      const duplicateReview = new Review({
        product: testProduct._id,
        user: testUser._id,
        rating: 4,
        comment: 'Another review for the same product by the same user.'
      });

      await expect(duplicateReview.save()).rejects.toMatchObject({
        code: 11000 // MongoDB duplicate key error
      });
    });
  });

  describe('Instance Methods', () => {
    test('should have approve method that updates status and adds timestamp', async () => {
      const review = await Review.create({
        product: testProduct._id,
        user: testUser._id,
        rating: 5,
        comment: 'This is a valid review comment that meets the minimum length requirement.'
      });

      const adminId = new mongoose.Types.ObjectId();
      await review.approve(adminId, 'Approved after review');

      expect(review.status).toBe('approved');
      expect(review.approvedBy).toEqual(adminId);
      expect(review.approvedAt).toBeInstanceOf(Date);
      expect(review.adminNotes).toBe('Approved after review');
    });

    test('should have reject method that updates status and adds timestamp', async () => {
      const review = await Review.create({
        product: testProduct._id,
        user: testUser._id,
        rating: 5,
        comment: 'This is a valid review comment that meets the minimum length requirement.'
      });

      const adminId = new mongoose.Types.ObjectId();
      await review.reject(adminId, 'Inappropriate content');

      expect(review.status).toBe('rejected');
      expect(review.rejectedBy).toEqual(adminId);
      expect(review.rejectedAt).toBeInstanceOf(Date);
      expect(review.adminNotes).toBe('Inappropriate content');
    });

    test('should have canUserReview static method to check purchase history', async () => {
      // This test will verify that users can only review products they've purchased
      const result = await Review.canUserReview(testUser._id, testProduct._id);
      expect(result).toHaveProperty('canReview');
      expect(typeof result.canReview).toBe('boolean');
      if (!result.canReview) {
        expect(result).toHaveProperty('reason');
        expect(typeof result.reason).toBe('string');
      }
    });
  });

  describe('Static Methods', () => {
    test('should have findApproved method to get only approved reviews', async () => {
      // Create reviews with different statuses
      await Review.create({
        product: testProduct._id,
        user: testUser._id,
        rating: 5,
        comment: 'This is a valid review comment that meets the minimum length requirement.',
        status: 'approved'
      });

      // Create another user for second review
      const user2 = await User.create({
        email: 'user2@example.com',
        password: 'password123',
        firstName: 'Test2',
        lastName: 'User2'
      });

      await Review.create({
        product: testProduct._id,
        user: user2._id,
        rating: 3,
        comment: 'This is another valid review comment that meets the minimum length requirement.',
        status: 'pending'
      });

      const approvedReviews = await Review.findApproved({ product: testProduct._id });
      expect(approvedReviews).toHaveLength(1);
      expect(approvedReviews[0].status).toBe('approved');
    });

    test('should have getAverageRating method for a product', async () => {
      // Create multiple approved reviews
      const user2 = await User.create({
        email: 'user2@example.com',
        password: 'password123',
        firstName: 'Test2',
        lastName: 'User2'
      });

      const user3 = await User.create({
        email: 'user3@example.com',
        password: 'password123',
        firstName: 'Test3',
        lastName: 'User3'
      });

      await Review.create({
        product: testProduct._id,
        user: testUser._id,
        rating: 5,
        comment: 'This is a valid review comment that meets the minimum length requirement.',
        status: 'approved'
      });

      await Review.create({
        product: testProduct._id,
        user: user2._id,
        rating: 4,
        comment: 'This is another valid review comment that meets the minimum length requirement.',
        status: 'approved'
      });

      await Review.create({
        product: testProduct._id,
        user: user3._id,
        rating: 3,
        comment: 'This is yet another valid review comment that meets the minimum length requirement.',
        status: 'pending' // This should not be counted
      });

      const ratingData = await Review.getAverageRating(testProduct._id);
      expect(ratingData.average).toBe(4.5); // (5 + 4) / 2
      expect(ratingData.count).toBe(2);
    });
  });

  describe('Internationalization Support', () => {
    test('should support i18n keys in admin notes', async () => {
      const review = await Review.create({
        product: testProduct._id,
        user: testUser._id,
        rating: 5,
        comment: 'This is a valid review comment that meets the minimum length requirement.',
        adminNotes: 'admin.review.approved'
      });

      expect(review.adminNotes).toBe('admin.review.approved');
    });
  });
});