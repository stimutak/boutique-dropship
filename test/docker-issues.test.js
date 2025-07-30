const request = require('supertest');
const app = require('../server');

describe('Docker Environment Issues - Bug Reproduction', () => {
  // These tests focus on API communication issues, not database operations
  
  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Clean up without closing mongoose (handled by test setup)
  });

  describe('Issue #1: Products not displaying on frontend', () => {
    test('GET /api/products should return products list', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeInstanceOf(Array);
      expect(response.body.data.products.length).toBeGreaterThan(0);
      expect(response.body.data.products[0]).toHaveProperty('name');
      expect(response.body.data.products[0]).toHaveProperty('price');
    });

    test('Frontend API calls should work with proxy configuration', async () => {
      // This test simulates the frontend making an API call
      // In Docker, the frontend nginx needs to proxy /api calls to backend
      const response = await request(app)
        .get('/api/products')
        .set('Origin', 'http://localhost:3001')
        .set('Referer', 'http://localhost:3001/products')
        .expect(200);

      // Check CORS headers are set correctly
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Issue #2: User login not working', () => {
    const testUser = {
      email: 'docker-test@example.com',
      password: 'Password123!',
      firstName: 'Docker',
      lastName: 'Test'
    };

    test('POST /api/auth/register should create user and set httpOnly cookie', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
      
      // Check for httpOnly cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toContain('HttpOnly');
      expect(tokenCookie).toContain('Path=/');
    });

    test('POST /api/auth/login should authenticate user and set httpOnly cookie', async () => {
      // First register the user
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('email', testUser.email);
      
      // Check for httpOnly cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toContain('HttpOnly');
    });

    test('Protected routes should work with httpOnly cookie authentication', async () => {
      // Register and login to get cookie
      const loginResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const cookies = loginResponse.headers['set-cookie'];
      
      // Try to access protected route with cookie
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Cookie', cookies)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.user.email).toBe(testUser.email);
    });
  });

  describe('Issue #3: Frontend-Backend communication in Docker', () => {
    test('CORS should allow frontend origin', async () => {
      const response = await request(app)
        .options('/api/products')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('API should handle requests without VITE_API_URL', async () => {
      // When frontend uses relative URLs, they should work
      const response = await request(app)
        .get('/api/products')
        .set('Host', 'localhost:5001')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('CSRF token endpoint should work', async () => {
      const response = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('csrfToken');
    });
  });

  describe('Docker nginx proxy configuration issues', () => {
    test('API endpoints should be accessible through correct paths', async () => {
      const endpoints = [
        '/api/products',
        '/api/csrf-token',
        '/health'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);

        expect(response.body).toBeDefined();
      }
    });

    test('Static image paths should be configured correctly', async () => {
      // In Docker, /images should be served by backend
      const response = await request(app)
        .get('/images/test.jpg')
        .expect((res) => {
          // Should either return 200 (if exists) or 404 (if not exists)
          // but not 500 or other errors
          expect([200, 404]).toContain(res.status);
        });
    });
  });
});