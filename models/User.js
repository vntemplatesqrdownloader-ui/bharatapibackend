const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscription: {
    type: String,
    enum: ['free', 'premium', 'enterprise'],
    default: 'free'
  },
  copyCount: {
    type: Number,
    default: 0
  },
  maxCopyLimit: {
    type: Number,
    default: 2
  },
  copiedApiIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'APIKey'
  }],
  lastCopyReset: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Reset copy count monthly
userSchema.methods.resetCopyCountIfNeeded = function() {
  const now = new Date();
  const lastReset = new Date(this.lastCopyReset);
  
  // Reset if more than 30 days have passed
  if ((now - lastReset) > (30 * 24 * 60 * 60 * 1000)) {
    this.copyCount = 0;
    this.copiedApiIds = [];
    this.lastCopyReset = now;
    return true;
  }
  return false;
};

// Update copy limit based on subscription
userSchema.pre('save', function(next) {
  if (this.subscription === 'free') {
    this.maxCopyLimit = 2;
  } else if (this.subscription === 'premium') {
    this.maxCopyLimit = 50;
  } else if (this.subscription === 'enterprise') {
    this.maxCopyLimit = Infinity;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);