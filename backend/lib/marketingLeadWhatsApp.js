// Auto WhatsApp for new marketing leads.
//
// Every 30 minutes: for each project with auto-WhatsApp switched on,
// re-import its leads sheet, then send each NEW lead (one that arrived after
// auto-WhatsApp was switched on, has a phone, and hasn't been messaged yet)
// a WhatsApp template with the project's description, price, type, size,
// possession and amenities, its brochure, Google Maps and project page links,
// and the builder/owner's contact number.
//
// WhatsApp only allows business-initiated messages through an approved
// template, so this needs WHATSAPP_LEAD_WELCOME_TEMPLATE set to a template
// approved in Meta with 14 body variables (see LEAD_TEMPLATE_BODY below).
const Property = require('../models/Property');
const User = require('../models/User');
const MarketingLead = require('../models/MarketingLead');
const { syncPropertyMarketingLeads } = require('./marketingLeads');

const INTERVAL_MS = 30 * 60 * 1000;
// Never message leads older than this, even if they turn up in the sheet late.
const MAX_LEAD_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const API_VERSION = 'v20.0';

// Text to submit in Meta WhatsApp Manager (category: Marketing). Same layout
// as the project's "Share on WhatsApp" message. 14 body variables; a missing
// value is sent as "-" (WhatsApp does not allow empty ones).
const LEAD_TEMPLATE_BODY = [
  '🏠 Hi {{1}}, thank you for your interest!',
  '',
  '📍 Checkout *{{2}}* in *{{3}}* - an amazing project worth exploring!',
  '',
  '📝 {{4}}',
  '',
  '*Key details -*',
  '💰 Price: {{5}}',
  '🛏️ Type: *{{6}}*',
  '📐 Size: {{7}}',
  '',
  '*Additional info -*',
  '📅 Possession: {{8}}',
  '🎯 Top Amenities: {{9}}',
  '',
  '📄 Brochure: {{10}}',
  '🗺️ Location: {{11}}',
  '🚀 Floor plans, photos & more details: {{12}}',
  '',
  '📞 For a site visit or any questions, call {{13}} at {{14}}.'
].join('\n');

const REQUIRED_ENV = ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_LEAD_WELCOME_TEMPLATE'];
const getMissingConfig = () => REQUIRED_ENV.filter((key) => !process.env[key]);

// WhatsApp rejects template parameters with newlines, tabs or 4+ spaces.
const param = (value, fallback = '-', max = 300) => {
  const text = String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim();
  const out = text || fallback;
  return out.length > max ? `${out.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : out;
};

const toNumber = (value) => Number(String(value ?? '').replace(/[^\d.]/g, '')) || 0;
const formatRs = (num) => (num ? `Rs. ${Math.round(num).toLocaleString('en-IN')}` : '');

const priceText = (property) => {
  const prices = (property.floorPlanUnits || []).map((u) => toNumber(u.price)).filter((n) => n > 0);
  if (prices.length) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatRs(min) : `${formatRs(min)} - ${formatRs(max)}`;
  }
  if (property.priceRange) return property.priceRange;
  const budget = formatRs(toNumber(property.totalBudget));
  if (budget) return `${budget}${property.totalBudgetOnwards ? ' onwards' : ''}`;
  const perSft = formatRs(toNumber(property.squareFeetPrice));
  return perSft ? `${perSft} per sq.ft.` : 'Price on request';
};

const cleanType = (value) => String(value || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const typeText = (property) => {
  const bhks = [...new Set((property.floorPlanUnits || []).map((u) => String(u.bedrooms || '').trim()).filter(Boolean))]
    .map((b) => (/bhk/i.test(b) ? b.replace(/\s*bhk/i, ' BHK') : `${b} BHK`));
  const bedrooms = bhks.length ? bhks.join(', ')
    : property.bedrooms ? (/bhk/i.test(property.bedrooms) ? property.bedrooms : `${property.bedrooms} BHK`) : '';
  return [bedrooms, cleanType(property.developmentType)].filter(Boolean).join(' ');
};

const sizeText = (property) => {
  if (property.flatSizeMin && property.flatSizeMax) return `${property.flatSizeMin} - ${property.flatSizeMax} sq.ft.`;
  if (property.flatSize) return `${property.flatSize} sq.ft.`;
  if (property.totalArea) return `${property.totalArea} ${property.areaUnit || 'Sq Yd'}`;
  return '';
};

// Uploaded files (the brochure is propertyFormUrl) are "/uploads/..." paths
// on the API server.
const absoluteFileUrl = (url) => {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const api = (process.env.API_PUBLIC_ORIGIN || 'https://homefeet.onrender.com').replace(/\/$/, '');
  return `${api}${value.startsWith('/') ? '' : '/'}${value}`;
};

// Google Maps link: the saved map link, else the map pin, else the address.
const mapsLink = (property) => {
  const map = String(property.map || '').trim();
  if (/^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(map)) return map;
  let query = '';
  try {
    const c = JSON.parse(property.coordinates || '');
    if (c && c.lat && c.lng) query = `${c.lat},${c.lng}`;
  } catch { /* not JSON */ }
  if (!query) {
    const m = map.match(/(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/);
    if (m) query = `${m[1]},${m[2]}`;
  }
  if (!query) query = [property.projectName, property.address || property.landmark, property.locality, property.city].filter(Boolean).join(', ');
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : '';
};

const descriptionText = (property) => property.description || property.projectHighlights
  || `${cleanType(property.developmentType) || 'Project'} by ${property.companyName || 'a trusted builder'}`;

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
  const possession = property.possessionDate || property.possessionStatus;
  const amenities = (property.selectedAmenities || []).slice(0, 3).join(', ');
  return [
    param(lead.name?.split(/\s+/)[0], 'there'),
    param(property.projectName, 'our project'),
    param([property.locality, property.city].filter(Boolean).join(', '), 'Hyderabad'),
    param(descriptionText(property), '-', 250),
    param(priceText(property)),
    param(typeText(property)),
    param(sizeText(property)),
    param(possession),
    param(amenities),
    param(absoluteFileUrl(property.propertyFormUrl), 'on the project page'),
    param(mapsLink(property), 'on the project page'),
    param(`${site}/share/property/${property._id}`),
    param(contact.name),
    param(contact.phone, 'the number on the project page')
  ];
};

// The template's header is an image: the project's display image (WhatsApp
// takes JPG/PNG only, from a public https link), else the HomeFeet logo.
const FALLBACK_IMAGE = 'https://www.homefeet.in/HomeFeet_logo.png';
const headerImageUrl = async (property) => {
  const candidates = [
    property.imageUrl,
    ...(property.images || []),
    property.plotDiagramUrl,
    ...(property.floorPlanUnits || []).flatMap((u) => [u.imageUrl, ...(u.imageUrls || [])])
  ];
  for (const raw of candidates) {
    const url = absoluteFileUrl(typeof raw === 'string' ? raw : raw?.url);
    if (!url || !/^https:\/\//i.test(url) || /\.(webp|gif|svg|heic|avif|pdf)(\?|#|$)/i.test(url)) continue;
    // Uploaded files (/api/files/<id>) have no extension: ask the server.
    if (await isJpegOrPng(url)) return url;
  }
  return FALLBACK_IMAGE;
};

const isJpegOrPng = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    const type = String(res.headers.get('content-type') || '');
    const size = Number(res.headers.get('content-length') || 0);
    return res.ok && /image\/(jpe?g|png)/i.test(type) && (!size || size <= 5 * 1024 * 1024);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const sendLeadWelcome = async (to, params, imageUrl = FALLBACK_IMAGE) => {
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
        components: [
          { type: 'header', parameters: [{ type: 'image', image: { link: imageUrl } }] },
          { type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }
        ]
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
        lead.whatsappMessageId = await sendLeadWelcome(to, buildTemplateParams(property, owner, lead), await headerImageUrl(property));
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
  headerImageUrl,
  runAutoWhatsAppCycle,
  startAutoWhatsAppScheduler
};
