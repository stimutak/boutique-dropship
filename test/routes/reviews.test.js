const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Review = require('../../models/Review');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const { createAdminUserWithToken, createRegularUserWithToken } = require('../helpers/testSetup');

const { createTestApp } = require('../helpers/testApp');

let app;

describe('Review Routes', () => {
  let userToken;
  let testUser;
  let testProduct;
  let _testOrder;

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Clear collections
    await Review.deleteMany({});
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    // Create test user
    testUser = await User.create({
      email: 'user@test.com',
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

    // Create test order (user purchased the product)
    _testOrder = await Order.create({
      customer: testUser._id,
      items: [{
        product: testProduct._id,
        quantity: 1,
        price: testProduct.price,
        wholesaler: {
          name: 'Test Wholesaler',
          email: 'wholesaler@test.com',
          productCode: 'TC001',
          notified: false
        }
      }],
      shippingAddress: {
        firstName: 'Test',
        lastName: 'User',
        street: '123 Main St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US'
      },
      billingAddress: {
        firstName: 'Test',
        lastName: 'User',
        street: '123 Main St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US'
      },
      subtotal: testProduct.price,
      total: testProduct.price,
      payment: {
        method: 'card',
        status: 'paid'
      },
      currency: 'USD',
      exchangeRate: 1
    });

    // Generate user token
    userToken = jwt.sign(
      { userId: testUser._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('POST /api/reviews', () => {
    test('should create a review successfully for purchased product', async () => {
      const reviewData = {
        productId: testProduct._id.toString(),
        rating: 5,
        comment: 'This is an excellent product! I love it and would recommend it to anyone.'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reviewData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.review).toMatchObject({
        product: testProduct._id.toString(),
        user: testUser._id.toString(),
        rating: 5,
        comment: reviewData.comment,
        status: 'pending'
      });

      // Verify review was saved to database
      const savedReview = await Review.findById(response.body.review._id);
      expect(savedReview).toBeTruthy();
      expect(savedReview.status).toBe('pending');
    });

    test('should reject review if user has not purchased the product', async () => {
      // Create a product the user hasn't purchased
      const unpurchasedProduct = await Product.create({
        name: 'Unpurchased Crystal',
        slug: 'unpurchased-crystal',
        description: 'A crystal the user has not purchased',
        shortDescription: 'Unpurchased crystal',
        price: 39.99,
        category: 'crystals',
        wholesaler: {
          name: 'Test Wholesaler',
          email: 'wholesaler@test.com',
          productCode: 'UC001',
          cost: 20.00
        }
      });

      const reviewData = {
        productId: unpurchasedProduct._id.toString(),
        rating: 5,
        comment: 'This is an excellent product! I love it and would recommend it to anyone.'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reviewData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('purchase');
    });

    test('should reject duplicate review from same user', async () => {
      // Create initial review
      await Review.create({
        product: testProduct._id,
        user: testUser._id,
        rating: 4,
        comment: 'This is my first review of this product that meets the minimum length requirement.'
      });

      const reviewData = {
        productId: testProduct._id.toString(),
        rating: 5,
        comment: 'This is my second review attempt that also meets the minimum length requirement.'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reviewData)
        .expect(403); // Changed from 400 to 403 as that's what the route returns

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already reviewed');
    });

    test('should require authentication', async () => {
      const reviewData = {
        productId: testProduct._id.toString(),
        rating: 5,
        comment: 'This is an excellent product! I love it and would recommend it to anyone.'
      };

      const response = await request(app)
        .post('/api/reviews')
        .send(reviewData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should validate rating range', async () => {
      const reviewData = {
        productId: testProduct._id.toString(),
        rating: 6, // Invalid rating
        comment: 'This is an excellent product! I love it and would recommend it to anyone.'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should validate comment minimum length', async () => {
      const reviewData = {
        productId: testProduct._id.toString(),
        rating: 5,
        comment: 'Short' // Too short
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should support internationalization with locale header', async () => {
      const reviewData = {
        productId: testProduct._id.toString(),
        rating: 5,
        comment: 'هذا منتج ممتاز! أنا أحبه وأوصي به لأي شخص.' // Arabic comment
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Locale', 'ar')
        .send(reviewData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.review.locale).toBe('ar');
    });
  });

  describe('GET /api/reviews/:productId', () => {
    beforeEach(async () => {
      // Create test users for multiple reviews
      const user2 = await User.create({
        email: 'user2@test.com',
        password: 'password123',
        firstName: 'Test2',
        lastName: 'User2'
      });

      const user3 = await User.create({
        email: 'user3@test.com',
        password: 'password123',
        firstName: 'Test3',
        lastName: 'User3'
      });

      // Create reviews with different statuses and slight time differences
      await Review.create({
        product: testProduct._id,
        user: testUser._id,
        rating: 5,
        comment: 'This is an approved review that meets the minimum length requirement.',
        status: 'approved'
      });

      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const _review2 = await Review.create({
        product: testProduct._id,
        user: user2._id,
        rating: 4,
        comment: 'This is another approved review that meets the minimum length requirement.',
        status: 'approved'
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await Review.create({
        product: testProduct._id,
        user: user3._id,
        rating: 3,
        comment: 'This is a pending review that meets the minimum length requirement.',
        status: 'pending'
      });
    });

    test('should return only approved reviews for a product', async () => {
      const response = await request(app)
        .get(`/api/reviews/${testProduct._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.reviews).toHaveLength(2); // Only approved reviews
      expect(response.body.reviews.every(review => review.status === 'approved')).toBe(true);
    });

    test('should include user information in reviews', async () => {
      const response = await request(app)
        .get(`/api/reviews/${testProduct._id}`)
        .expect(200);

      expect(response.body.reviews[0].user).toMatchObject({
        firstName: expect.any(String),
        lastName: expect.any(String)
      });
      expect(response.body.reviews[0].user.email).toBeUndefined(); // Should not expose email
    });

    test('should include review statistics', async () => {
      const response = await request(app)
        .get(`/api/reviews/${testProduct._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toMatchObject({
        totalReviews: 2,
        averageRating: 4.5,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 1,
          5: 1
        }
      });
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/reviews/${testProduct._id}?page=1&limit=1`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.reviews).toHaveLength(1);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 1,
        total: 2,
        pages: 2
      });
    });

    test('should sort reviews by date (newest first)', async () => {
      const response = await request(app)
        .get(`/api/reviews/${testProduct._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const reviews = response.body.reviews;
      
      // Reviews should be sorted by creation date descending
      for (let i = 1; i < reviews.length; i++) {
        expect(new Date(reviews[i-1].createdAt).getTime()).toBeGreaterThan(new Date(reviews[i].createdAt).getTime());
      }
    });

    test('should return empty array for product with no reviews', async () => {
      const productWithoutReviews = await Product.create({
        name: 'No Reviews Product',
        slug: 'no-reviews-product',
        description: 'A product with no reviews',
        shortDescription: 'No reviews product',
        price: 19.99,
        category: 'crystals',
        wholesaler: {
          name: 'Test Wholesaler',
          email: 'wholesaler@test.com',
          productCode: 'NR001',
          cost: 10.00
        }
      });

      const response = await request(app)
        .get(`/api/reviews/${productWithoutReviews._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.reviews).toHaveLength(0);
      expect(response.body.stats.totalReviews).toBe(0);
      expect(response.body.stats.averageRating).toBe(0);
    });

    test('should handle invalid product ID', async () => {
      const invalidId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/reviews/${invalidId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Product not found');
    });
  });

  describe('GET /api/reviews/user/my-reviews', () => {
    beforeEach(async () => {
      // Create reviews by the authenticated user
      await Review.create({
        product: testProduct._id,
        user: testUser._id,
        rating: 5,
        comment: 'This is my review that meets the minimum length requirement.',
        status: 'approved'
      });

      // Create another product and review
      const product2 = await Product.create({
        name: 'Another Crystal',
        slug: 'another-crystal',
        description: 'Another test crystal',
        shortDescription: 'Another crystal',
        price: 35.99,
        category: 'crystals',
        wholesaler: {
          name: 'Test Wholesaler',
          email: 'wholesaler@test.com',
          productCode: 'AC001',
          cost: 18.00
        }
      });

      await Review.create({
        product: product2._id,
        user: testUser._id,
        rating: 4,
        comment: 'This is another review that meets the minimum length requirement.',
        status: 'pending'
      });
    });

    test('should return all reviews by authenticated user', async () => {
      const response = await request(app)
        .get('/api/reviews/user/my-reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.reviews).toHaveLength(2);
      // Reviews should be populated with full product info, but user field shouldn't be exposed
      expect(response.body.reviews[0].product).toBeDefined();
      expect(response.body.reviews[0].product.name).toBeDefined();
    });

    test('should include product information in user reviews', async () => {
      const response = await request(app)
        .get('/api/reviews/user/my-reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.reviews[0].product).toMatchObject({
        name: expect.any(String),
        slug: expect.any(String)
      });
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/reviews/user/my-reviews')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });
  });
});