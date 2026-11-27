// Small site-wide settings admins change from the Admin Panel
// (e.g. the shared Google Sheets write-back script). One document per key.
const mongoose = require('mongoose');

const appSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

module.exports = mongoose.models.AppSetting || mongoose.model('AppSetting', appSettingSchema);
