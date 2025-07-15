const express = require('express');
const router = express.Router();

// Test route to trigger hook
router.get('/test', (req, res) => {
  res.json({ message: 'Auth test endpoint' });
});

module.exports = router;