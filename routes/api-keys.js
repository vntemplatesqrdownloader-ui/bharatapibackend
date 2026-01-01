const express = require('express');
const router = express.Router();
const {
  getAllKeys,
  getKeyById,
  copyKey,
  trackView
} = require('../controllers/apiKeyController');
const { protect } = require('../middleware/auth');
const { apiLimiter, copyLimiter } = require('../middleware/rateLimit');

// Public routes
router.get('/', apiLimiter, getAllKeys);
router.get('/:id', apiLimiter, getKeyById);

// Protected routes
router.post('/:id/copy', protect, copyLimiter, copyKey);
router.post('/:id/view', apiLimiter, trackView);

module.exports = router;