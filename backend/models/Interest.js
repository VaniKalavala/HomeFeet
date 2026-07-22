// models/Interest.js
const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema({
  userId: String,
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'rejected'],
    default: 'requested',
    index: true
  },
  ownerId: String,
  message: { type: String, default: '' },
  contactUnlocked: { type: Boolean, default: false },
  unlockedVia: {
    type: String,
    enum: ['none', 'free_credit', 'subscription', 'buyer_free', 'buyer_credit'],
    default: 'none'
  },
  contactUnlockedAt: { type: Date, default: null, index: true },
  timestamp: { type: Date, default: Date.now },
  respondedAt: { type: Date, default: null }
});

interestSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

module.exports = mongoose.model('Interest', interestSchema);
