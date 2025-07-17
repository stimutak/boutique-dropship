const request = require('supertest');
const { createTestApp } = require('../helpers/testApp');

describe('Health Check Routes', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should return consistent response format', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(typeof response.body.status).toBe('string');
      expect(typeof response.body.timestamp).toBe('string');
    });
  });
});