const mongoose = require('mongoose');

// One row imported from a project's marketing-leads Google Sheet (e.g. a
// Meta lead-form export). Rows are re-synced from the sheet, so rowKey is a
// stable hash of the row's identity (date + name + phone + email) - the
// feedback column can change between syncs without creating a duplicate.
const marketingLeadSchema = new mongoose.Schema({
  propertyId: { type: String, required: true, index: true },
  ownerUserId: { type: String, default: '', index: true },
  rowKey: { type: String, required: true },
  leadAt: { type: Date, default: null, index: true },
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  feedback: { type: String, default: '' },
  // Same name + phone found more than once in the sheet (merged into this
  // one lead), or the sales team already marked it "Repeated Lead".
  isRepeated: { type: Boolean, default: false },
  // Sheet tab name(s) this person came from, e.g. "Diwali Offer Leads".
  campaigns: { type: [String], default: [] },
  repeatCount: { type: Number, default: 1 },
  enquiryDates: { type: [Date], default: [] },
  // CRM - owned by the project's sales team, never written by the sheet
  // sync (sync only $sets the sheet fields above), so it survives re-syncs.
  crmStage: {
    type: String,
    enum: ['new', 'contacted', 'site_visit', 'negotiation', 'won', 'lost'],
    default: 'new'
  },
  nextFollowUpAt: { type: Date, default: null, index: true },
  notes: [{
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String, default: '' }
  }],
  // Every other sheet column (form answers, campaign, etc.) as label/value pairs.
  answers: {
    type: [{ _id: false, label: String, value: String }],
    default: []
  }
}, { timestamps: true });

marketingLeadSchema.index({ propertyId: 1, rowKey: 1 }, { unique: true });

module.exports = mongoose.model('MarketingLead', marketingLeadSchema);
