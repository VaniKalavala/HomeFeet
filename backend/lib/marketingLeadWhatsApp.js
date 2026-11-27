// Auto WhatsApp for new marketing leads.
//
// Every 30 minutes: for each project with auto-WhatsApp switched on,
// re-import its leads sheet, then send each NEW lead (one that arrived after
// auto-WhatsApp was switched on, has a phone, and hasn't been messaged yet)
// a WhatsApp template with the project's details and the builder/owner's
// contact number.
//
// WhatsApp only allows business-initiated messages through an approved
// template, so this needs WHATSAPP_LEAD_WELCOME_TEMPLATE set to a template
// approved in Meta with 7 body variables (see LEAD_TEMPLATE_BODY below).
const Property = require('../models/Property');
const User = require('../models/User');
const MarketingLead = require('../models/MarketingLead');
const { syncPropertyMarketingLeads } = require('./marketingLeads');

const INTERVAL_MS = 30 * 60 * 1000;
// Never message leads older than this, even if they turn up in the sheet late.
const MAX_LEAD_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const API_VERSION = 'v20.0';

// Text to submit in Meta WhatsApp Manager (category: Marketing or Utility).
const LEAD_TEMPLATE_BODY = [
  'Hi {{1}}, thank you for your interest in {{2}}.',
  '',
  'Project details: {{3}}',
  'Location: {{4}}',
  'Photos, floor plans & price: {{5}}',
  '',
  'For a site visit or any questions, call {{6}} at {{7}}.',
  '',
  '- Team HomeFeet'
].join('\n');

const REQUIRED_ENV = ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_LEAD_WELCOME_TEMPLATE'];
const getMissingConfig = () => REQUIRED_ENV.filter((key) => !process.env[key]);

// WhatsApp rejects template parameters with newlines, tabs or 4+ spaces.
const param = (value, fallback = '-') => {
  const text = String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim();
  return (text || fallback).slice(0, 300);
};

const formatInr = (value) => {
  const num = parseInt(String(value || '').replace(/,/g, ''), 10);
  if (!num || Number.isNaN(num)) return '';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1).replace(/\.0$/, '')} L`;
  return `₹${num.toLocaleString('en-IN')}`;
};

const projectDetailsText = (property) => {
  const parts = [];
  if (property.bedrooms) parts.push(/bhk/i.test(property.bedrooms) ? property.bedrooms : `${property.bedrooms} BHK`);
  if (property.flatSizeMin && property.flatSizeMax) parts.push(`${property.flatSizeMin}-${property.flatSizeMax} sft`);
  else if (property.flatSize) parts.push(`${property.flatSize} sft`);
  const price = formatInr(property.totalBudget);
  if (price) parts.push(`${price}${property.totalBudgetOnwards ? ' onwards' : ''}`);
  else if (property.squareFeetPrice) parts.push(`${formatInr(property.squareFeetPrice)}/sft`);
  if (property.possessionStatus) parts.push(property.possessionStatus);
  if (property.reraId) parts.push(`RERA ${property.reraId}`);
  return parts.join(' | ') || property.developmentType || 'Details on the project page';
};

const contactFor = (property, owner) => {
  const name = owner?.builderCompanyName || owner?.agentCompanyName || property.companyName
    || [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || 'our sales team';
  const phone = property.contactPhone || property.phone || owner?.phone || '';
  return { name, phone };
};

const toWhatsAppNumber = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits.length >= 11 ? digits : '';
};

const buildTemplateParams = (property, owner, lead) => {
  const site = (process.env.PUBLIC_SITE_URL || 'https://www.homefeet.in').replace(/\/$/, '');
  const contact = contactFor(property, owner);
  return [
    param(lead.name?.split(/\s+/)[0], 'there'),
    param(property.projectName, 'our project'),
    param(projectDetailsText(property)),
    param([property.locality, property.city].filter(Boolean).join(', ')),
    param(`${site}/project/${property._id}`),
    param(contact.name),
    param(contact.phone, 'the number on the project page')
  ];
};

const sendLeadWelcome = async (to, params) => {
  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: process.env.WHATSAPP_LEAD_WELCOME_TEMPLATE,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en' },
        components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }]
      }
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(String(data.error?.error_data?.details || data.error?.message || `WhatsApp API error ${res.status}`).slice(0, 300));
  }
  return data.messages?.[0]?.id || '';
};

// Send to the new leads of one project. Returns { sent, failed, skipped }.
const sendForProperty = async (property) => {
  const since = property.marketingAutoWhatsAppSince;
  if (!since) return { sent: 0, failed: 0, skipped: 0 };
  const owner = property.userId ? await User.findById(property.userId).catch(() => null) : null;
  const minLeadAt = new Date(Math.max(new Date(since).getTime(), Date.now() - MAX_LEAD_AGE_MS));

  const pending = await MarketingLead.find({
    propertyId: String(property._id),
    whatsappStatus: { $in: [null, ''] },
    leadAt: { $gte: minLeadAt }
  }).limit(100);

  const counts = { sent: 0, failed: 0, skipped: 0 };
  for (const lead of pending) {
    const to = toWhatsAppNumber(lead.phone);
    if (!to) {
      lead.whatsappStatus = 'skipped';
      lead.whatsappError = 'No valid phone number';
      counts.skipped += 1;
    } else {
      // Claim the lead first so an overlapping run can never send twice.
      const claimed = await MarketingLead.updateOne(
        { _id: lead._id, whatsappStatus: { $in: [null, ''] } },
        { $set: { whatsappStatus: 'sending' } }
      );
      if (!claimed.modifiedCount) continue;
      try {
        lead.whatsappMessageId = await sendLeadWelcome(to, buildTemplateParams(property, owner, lead));
        lead.whatsappStatus = 'sent';
        lead.whatsappError = '';
        counts.sent += 1;
      } catch (err) {
        lead.whatsappStatus = 'failed';
        lead.whatsappError = err.message;
        counts.failed += 1;
      }
    }
    lead.whatsappSentAt = new Date();
    await lead.save();
    await new Promise((r) => setTimeout(r, 200)); // stay well under Meta rate limits
  }
  return counts;
};

let running = false;

// One cycle: re-import each auto-WhatsApp project's sheet, then message new leads.
const runAutoWhatsAppCycle = async () => {
  if (running) return { skipped: 'already running' };
  running = true;
  const summary = { projects: 0, sent: 0, failed: 0, skipped: 0, errors: [] };
  try {
    const missing = getMissingConfig();
    const properties = await Property.find({ marketingAutoWhatsApp: true, marketingSheetUrl: { $ne: '' } });
    for (const property of properties) {
      summary.projects += 1;
      try {
        await syncPropertyMarketingLeads(property);
      } catch (err) {
        summary.errors.push(`${property.projectName}: sheet sync failed - ${err.message}`);
      }
      if (missing.length) {
        summary.errors.push(`WhatsApp not configured (missing ${missing.join(', ')}) - nothing sent`);
        continue;
      }
      const counts = await sendForProperty(property);
      summary.sent += counts.sent;
      summary.failed += counts.failed;
      summary.skipped += counts.skipped;
      property.marketingAutoWhatsAppLastRunAt = new Date();
      property.marketingAutoWhatsAppLastResult = `${counts.sent} sent, ${counts.failed} failed`;
      await property.save().catch(() => {});
    }
  } catch (err) {
    summary.errors.push(err.message);
  } finally {
    running = false;
  }
  if (summary.projects) console.log('[marketing auto-whatsapp]', JSON.stringify(summary));
  return summary;
};

const startAutoWhatsAppScheduler = () => {
  if (process.env.MARKETING_AUTO_WHATSAPP_DISABLED === 'true') return;
  // First run shortly after boot (DB connects asynchronously), then every 30 min.
  setTimeout(() => runAutoWhatsAppCycle().catch(() => {}), 60 * 1000);
  setInterval(() => runAutoWhatsAppCycle().catch(() => {}), INTERVAL_MS);
};

module.exports = {
  LEAD_TEMPLATE_BODY,
  getMissingConfig,
  buildTemplateParams,
  runAutoWhatsAppCycle,
  startAutoWhatsAppScheduler
};
