const APIKey = require('../models/APIKey');
const User = require('../models/User');
const Usage = require('../models/Usage');
const { db } = require('../config/firebase-admin');

// @desc    Create new API key (Admin only)
// @route   POST /api/admin/keys
// @access  Private/Admin
exports.createApiKey = async (req, res) => {
  try {
    const { apiKey, toolName, category, details } = req.body;

    // Validation
    if (!apiKey || !toolName || !category || !details) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if API key already exists
    const existingKey = await APIKey.findOne({ apiKey });
    if (existingKey) {
      return res.status(400).json({
        success: false,
        message: 'This API key already exists'
      });
    }

    // Create API key in MongoDB
    const newApiKey = await APIKey.create({
      apiKey,
      toolName,
      category,
      details,
      uploadedBy: req.user.id,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    // Push to Firebase Realtime Database for instant frontend update
    const firebaseRef = db.ref('apiKeys');
    const firebaseKey = await firebaseRef.push({
      _id: newApiKey._id.toString(),
      apiKey: newApiKey.apiKey,
      toolName: newApiKey.toolName,
      category: newApiKey.category,
      details: newApiKey.details,
      expiryDate: newApiKey.expiryDate.toISOString(),
      isActive: newApiKey.isActive,
      copyCount: newApiKey.copyCount,
      createdAt: newApiKey.createdAt.toISOString()
    });

    // Save Firebase ID to MongoDB
    newApiKey.firebaseId = firebaseKey.key;
    await newApiKey.save();

    console.log('✅ API Key created and synced to Firebase');

    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      data: newApiKey
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating API key',
      error: error.message
    });
  }
};

// @desc    Update API key (Admin only)
// @route   PUT /api/admin/keys/:id
// @access  Private/Admin
exports.updateApiKey = async (req, res) => {
  try {
    const { apiKey, toolName, category, details, isActive } = req.body;

    let apiKeyDoc = await APIKey.findById(req.params.id);

    if (!apiKeyDoc) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    // Update fields
    if (apiKey) apiKeyDoc.apiKey = apiKey;
    if (toolName) apiKeyDoc.toolName = toolName;
    if (category) apiKeyDoc.category = category;
    if (details) apiKeyDoc.details = details;
    if (typeof isActive !== 'undefined') apiKeyDoc.isActive = isActive;

    await apiKeyDoc.save();

    // Update in Firebase
    if (apiKeyDoc.firebaseId) {
      await db.ref(`apiKeys/${apiKeyDoc.firebaseId}`).update({
        apiKey: apiKeyDoc.apiKey,
        toolName: apiKeyDoc.toolName,
        category: apiKeyDoc.category,
        details: apiKeyDoc.details,
        isActive: apiKeyDoc.isActive,
        updatedAt: new Date().toISOString()
      });
    }

    console.log('✅ API Key updated and synced to Firebase');

    res.status(200).json({
      success: true,
      message: 'API key updated successfully',
      data: apiKeyDoc
    });
  } catch (error) {
    console.error('Update API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating API key',
      error: error.message
    });
  }
};

// @desc    Delete API key (Admin only)
// @route   DELETE /api/admin/keys/:id
// @access  Private/Admin
exports.deleteApiKey = async (req, res) => {
  try {
    const apiKey = await APIKey.findById(req.params.id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    // Delete from Firebase
    if (apiKey.firebaseId) {
      await db.ref(`apiKeys/${apiKey.firebaseId}`).remove();
    }

    // Delete from MongoDB
    await apiKey.deleteOne();

    console.log('✅ API Key deleted from both MongoDB and Firebase');

    res.status(200).json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting API key',
      error: error.message
    });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// @desc    Get dashboard statistics (Admin only)
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalApiKeys = await APIKey.countDocuments({ isActive: true });
    const totalCopies = await Usage.countDocuments({ action: 'copy' });
    const totalViews = await Usage.countDocuments({ action: 'view' });

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('email subscription createdAt');

    const popularKeys = await APIKey.find({ isActive: true })
      .sort({ copyCount: -1 })
      .limit(5)
      .select('toolName category copyCount');

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalApiKeys,
        totalCopies,
        totalViews,
        recentUsers,
        popularKeys
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};