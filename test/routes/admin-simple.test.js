const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Product = require('../../models/Product');

// Import server after environment is set up in test/setup.js
let app;

describe('Admin Routes - Simple Tests', () => {
  let adminToken;
  let regularUserToken;
  let adminUser;
  let regularUser;

  beforeAll(async () => {
    // Import app after setup
    app = require('../../server');
    
    // Create admin user
    adminUser = await User.create({
      email: 'admin@test.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true
    });

    // Create regular user
    regularUser = await User.create({
      email: 'user@test.com',
      password: 'password123',
      firstName: 'Regular',
      lastName: 'User',
      isAdmin: false
    });

    // Generate tokens
    adminToken = jwt.sign(
      { userId: adminUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    regularUserToken = jwt.sign(
      { userId: regularUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('Authentication and Authorization', () => {
    test('should deny access without token', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    test('should deny access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('should allow access for admin users', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products).toBeDefined();
    });
  });

  describe('Product Management', () => {
    test('should get all products with admin data', async () => {
      const response = await request(app)
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    test('should export products to CSV', async () => {
      const response = await request(app)
        .get('/api/admin/products/export')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    test('should require file for bulk import', async () => {
      const response = await request(app)
        .post('/api/admin/products/bulk-import')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE');
    });
  });

  describe('Analytics', () => {
    test('should get dashboard analytics', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.analytics.metrics).toBeDefined();
      expect(response.body.analytics.metrics.sales).toBeDefined();
      expect(response.body.analytics.metrics.products).toBeDefined();
      expect(response.body.analytics.metrics.users).toBeDefined();
    });
  });

  describe('User Management', () => {
    test('should get all users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      
      // Check that passwords are not included
      response.body.users.forEach(user => {
        expect(user.password).toBeUndefined();
      });
    });

    test('should update user status', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${regularUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.isActive).toBe(false);
    });

    test('should reject invalid user status update', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${regularUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});