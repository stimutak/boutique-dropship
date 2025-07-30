const request = require('supertest');
const app = require('../server');

// Helper to generate unique test emails
const getUniqueEmail = () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`;

describe('Authentication Issues Tests', () => {
  let testUser;
  
  beforeEach(() => {
    testUser = {
      email: getUniqueEmail(),
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      phone: '1234567890'
    };
  });

  // Issue #12: Login sync error
  describe('Issue #12: Login returns user data properly', () => {
    test('Login response should include complete user data', async () => {
      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      console.log('Login response:', JSON.stringify(loginRes.body, null, 2));

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      
      // Check for proper response structure
      expect(loginRes.body.data).toBeDefined();
      expect(loginRes.body.data.token).toBeDefined();
      expect(loginRes.body.data.user).toBeDefined();
      
      // Check user data
      expect(loginRes.body.data.user.firstName).toBe(testUser.firstName);
      expect(loginRes.body.data.user.lastName).toBe(testUser.lastName);
      expect(loginRes.body.data.user.email).toBe(testUser.email);
    });
  });

  // Issue #11: Registration login state
  describe('Issue #11: Registration returns proper auth state', () => {
    test('Registration should return token and user data', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      console.log('Register response:', JSON.stringify(registerRes.body, null, 2));

      expect(registerRes.status).toBe(201);
      expect(registerRes.body.success).toBe(true);
      
      // Check response structure
      expect(registerRes.body.data).toBeDefined();
      expect(registerRes.body.data.token).toBeDefined();
      expect(registerRes.body.data.user).toBeDefined();
      
      // Verify token works
      const profileRes = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${registerRes.body.data.token}`);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.success).toBe(true);
    });
  });

  // Issue #10: Bad login state
  describe('Issue #10: Failed login should not return auth data', () => {
    test('Bad password should return error without token', async () => {
      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Try bad login
      const badLoginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      console.log('Bad login response:', JSON.stringify(badLoginRes.body, null, 2));

      expect(badLoginRes.status).toBe(401);
      expect(badLoginRes.body.success).toBe(false);
      expect(badLoginRes.body.data?.token).toBeUndefined();
      expect(badLoginRes.body.data?.user).toBeUndefined();
      expect(badLoginRes.body.error).toBeDefined();
    });
  });

  // Issue #9: Profile update authentication
  describe('Issue #9: Profile update should maintain auth', () => {
    test('Profile update should not require re-authentication', async () => {
      // Register and get token
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const token = registerRes.body.data.token;

      // Update profile
      const updateRes = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name'
        });

      console.log('Update response:', JSON.stringify(updateRes.body, null, 2));

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      
      // Verify still authenticated
      const profileRes = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(profileRes.status).toBe(200);
      expect(profileRes.body.data.user.firstName).toBe('Updated');
    });
  });
});