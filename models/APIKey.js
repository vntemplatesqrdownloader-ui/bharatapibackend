const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  apiKey: {
    type: String,
    required: [true, 'API Key is required'],
    trim: true
  },
  toolName: {
    type: String,
    required: [true, 'Tool name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Gemini', 'GPT', 'Claude', 'Bharat Cloud AI'],
    trim: true
  },
  details: {
    type: String,
    required: [true, 'Details are required'],
    trim: true
  },
  expiryDate: {
    type: Date,
    required: true,
    default: function() {
      // Default: 30 days from now
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  copyCount: {
    type: Number,
    default: 0
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  firebaseId: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Check if API key is expired
apiKeySchema.methods.isExpired = function() {
  return new Date() > this.expiryDate;
};

// Auto-deactivate expired keys before queries
apiKeySchema.pre(/^find/, function(next) {
  this.where({ 
    $or: [
      { expiryDate: { $gt: new Date() } },
      { isActive: true }
    ]
  });
  next();
});

// Index for faster queries
apiKeySchema.index({ category: 1, isActive: 1 });
apiKeySchema.index({ expiryDate: 1 });
apiKeySchema.index({ firebaseId: 1 });

module.exports = mongoose.model('APIKey', apiKeySchema);