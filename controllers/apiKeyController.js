const APIKey = require('../models/APIKey');
const User = require('../models/User');
const Usage = require('../models/Usage');
const { db } = require('../config/firebase-admin');

// @desc    Get all API keys
// @route   GET /api/keys
// @access  Public
exports.getAllKeys = async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = { isActive: true };
    
    if (category && category !== 'All') {
      query.category = category;
    }

    const apiKeys = await APIKey.find(query)
      .sort({ createdAt: -1 })
      .select('-__v');

    // Check expiry for each key
    const validKeys = apiKeys.filter(key => !key.isExpired());

    res.status(200).json({
      success: true,
      count: validKeys.length,
      data: validKeys
    });
  } catch (error) {
    console.error('Get keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching API keys',
      error: error.message
    });
  }
};

// @desc    Get single API key
// @route   GET /api/keys/:id
// @access  Public
exports.getKeyById = async (req, res) => {
  try {
    const apiKey = await APIKey.findById(req.params.id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    if (apiKey.isExpired()) {
      return res.status(410).json({
        success: false,
        message: 'This API key has expired'
      });
    }

    res.status(200).json({
      success: true,
      data: apiKey
    });
  } catch (error) {
    console.error('Get key error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching API key',
      error: error.message
    });
  }
};

// @desc    Copy API key (requires login)
// @route   POST /api/keys/:id/copy
// @access  Private
exports.copyKey = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const apiKey = await APIKey.findById(req.params.id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    if (apiKey.isExpired()) {
      return res.status(410).json({
        success: false,
        message: 'This API key has expired'
      });
    }

    // Check if user already copied this key
    if (user.copiedApiIds.includes(apiKey._id)) {
      return res.status(200).json({
        success: true,
        message: 'API key already copied',
        data: {
          apiKey: apiKey.apiKey,
          copyCount: user.copyCount,
          maxCopyLimit: user.maxCopyLimit
        }
      });
    }

    // Reset copy count if needed
    user.resetCopyCountIfNeeded();

    // Check copy limit
    if (user.copyCount >= user.maxCopyLimit) {
      return res.status(403).json({
        success: false,
        message: 'Copy limit reached. Upgrade your subscription for more copies.',
        copyCount: user.copyCount,
        maxCopyLimit: user.maxCopyLimit,
        subscription: user.subscription
      });
    }

    // Update user copy count
    user.copyCount += 1;
    user.copiedApiIds.push(apiKey._id);
    await user.save();

    // Update API key copy count
    apiKey.copyCount += 1;
    await apiKey.save();

    // Log usage
    await Usage.create({
      user: user._id,
      apiKey: apiKey._id,
      action: 'copy',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(200).json({
      success: true,
      message: 'API key copied successfully',
      data: {
        apiKey: apiKey.apiKey,
        toolName: apiKey.toolName,
        copyCount: user.copyCount,
        maxCopyLimit: user.maxCopyLimit,
        remainingCopies: user.maxCopyLimit - user.copyCount
      }
    });
  } catch (error) {
    console.error('Copy key error:', error);
    res.status(500).json({
      success: false,
      message: 'Error copying API key',
      error: error.message
    });
  }
};

// @desc    Track API key view
// @route   POST /api/keys/:id/view
// @access  Public
exports.trackView = async (req, res) => {
  try {
    const apiKey = await APIKey.findById(req.params.id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    // Log view (if user is logged in)
    if (req.user) {
      await Usage.create({
        user: req.user.id,
        apiKey: apiKey._id,
        action: 'view',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    res.status(200).json({
      success: true,
      message: 'View tracked'
    });
  } catch (error) {
    console.error('Track view error:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking view',
      error: error.message
    });
  }
};