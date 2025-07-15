// Simple API test without starting full server
const express = require('express');
const wholesalerRoutes = require('./routes/wholesalers');

const app = express();
app.use(express.json());
app.use('/api/wholesalers', wholesalerRoutes);

// Test the test endpoint
const request = require('http');

const testEndpoint = () => {
  const server = app.listen(3001, () => {
    console.log('Test server started on port 3001');
    
    // Make a test request
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/wholesalers/test',
      method: 'GET'
    };

    const req = request.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('API Response:', JSON.parse(data));
        server.close();
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e.message);
      server.close();
    });

    req.end();
  });
};

testEndpoint();