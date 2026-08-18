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
  respondedAt: { type: Date, default: null },
  // CRM fields - the requester's own personal pipeline tracking for this
  // lead. Deliberately separate from `status` above: `status` still
  // drives real access control (owner approval, contact unlock), while
  // `crmStage` is just how the requester (e.g. a builder) organizes their
  // own follow-up work and is never touched by the owner-response flow.
  crmStage: {
    type: String,
    enum: ['new', 'contacted', 'site_visit', 'negotiation', 'won', 'lost'],
    default: 'new'
  },
  notes: [{
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String, default: '' }
  }],
  nextFollowUpAt: { type: Date, default: null, index: true },
  followUpNote: { type: String, default: '' }
});

interestSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

module.exports = mongoose.model('Interest', interestSchema);
