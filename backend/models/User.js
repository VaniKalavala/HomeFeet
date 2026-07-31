// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    unique: true,
    sparse: true, // Field must be omitted (not set to null) for sparse to skip indexing it
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v);
      },
      message: 'Phone number must be 10 digits'
    }
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    default: '',
    trim: true
  },
  city: {
    type: String,
    default: '',
    trim: true
  },
  state: {
    type: String,
    default: '',
    trim: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Field must be omitted (not set to null) for sparse to skip indexing it
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  password: {
    type: String,
    default: null,
    select: false
  },
  passwordResetTokenHash: {
    type: String,
    default: null,
    select: false
  },
  passwordResetExpiresAt: {
    type: Date,
    default: null,
    select: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  accountType: {
    type: String,
    enum: ['owner', 'mediator', 'builder', 'buyer', 'admin'],
    required: true,
    default: 'owner',
    index: true
  },
  builderVerificationStatus: {
    type: String,
    enum: ['not_required', 'pending', 'approved', 'rejected'],
    default: 'not_required',
    index: true
  },
  builderCompanyName: {
    type: String,
    default: '',
    trim: true
  },
  builderReraId: {
    type: String,
    default: '',
    trim: true
  },
  builderRejectionReason: {
    type: String,
    default: ''
  },
  agentCompanyName: {
    type: String,
    default: '',
    trim: true
  },
  agentExperienceYears: {
    type: Number,
    default: null
  },
  agentLanguages: {
    type: [String],
    default: []
  },
  agentSpecializations: {
    type: [String],
    default: []
  },
  builderSubscriptionPlan: {
    type: String,
    enum: ['none', '3_months', '6_months', '12_months'],
    default: 'none'
  },
  builderSubscriptionExpiresAt: {
    type: Date,
    default: null
  },
  ownerPlanTier: {
    type: String,
    enum: ['none', 'basic', 'premium_plus', 'assist', 'super_assist'],
    default: 'none'
  },
  ownerPlanExpiresAt: {
    type: Date,
    default: null
  },
  freeContactCredits: {
    type: Number,
    default: 2
  },
  contactUnlocksUsed: {
    type: Number,
    default: 0
  },
  buyerFreeContactUsed: {  // Buyers get one free owner-contact reveal across the platform; this flips true after it's used.
    type: Boolean,
    default: false
  },
  buyerContactCredits: {  // Paid contact-reveal credits purchased via the buyer contact packs (1/5/10 properties).
    type: Number,
    default: 0
  },
  responseScore: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

module.exports = mongoose.model('User', userSchema);
