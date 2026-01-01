const mongoose = require('mongoose');

const usageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  apiKey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'APIKey',
    required: true
  },
  action: {
    type: String,
    enum: ['copy', 'view'],
    required: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for analytics queries
usageSchema.index({ user: 1, timestamp: -1 });
usageSchema.index({ apiKey: 1, action: 1 });
usageSchema.index({ timestamp: -1 });

// Static method to get user statistics
usageSchema.statics.getUserStats = async function(userId) {
  return await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to get API key statistics
usageSchema.statics.getApiKeyStats = async function(apiKeyId) {
  return await this.aggregate([
    { $match: { apiKey: mongoose.Types.ObjectId(apiKeyId) } },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastUsed: { $max: '$timestamp' }
      }
    }
  ]);
};

module.exports = mongoose.model('Usage', usageSchema);