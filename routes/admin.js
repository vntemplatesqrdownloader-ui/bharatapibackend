const express = require('express');
const router = express.Router();
const {
  createApiKey,
  updateApiKey,
  deleteApiKey,
  getAllUsers,
  getDashboardStats
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimit');

// All routes are protected and require admin role
router.use(protect);
router.use(adminOnly);
router.use(adminLimiter);

// API Key management
router.post('/keys', createApiKey);
router.put('/keys/:id', updateApiKey);
router.delete('/keys/:id', deleteApiKey);

// User management
router.get('/users', getAllUsers);

// Dashboard statistics
router.get('/stats', getDashboardStats);

module.exports = router;