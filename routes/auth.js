const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  upgradeSubscription
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

// Public routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/upgrade', protect, upgradeSubscription);

module.exports = router;