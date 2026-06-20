const BuilderContact = require('../models/BuilderContact');
const Property = require('../models/Property');
const BuilderDigestLog = require('../models/BuilderDigestLog');

const REQUIRED_WHATSAPP_ENV = [
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_DAILY_DIGEST_TEMPLATE'
];

const getMissingWhatsAppConfig = () => REQUIRED_WHATSAPP_ENV
  .filter((key) => !String(process.env[key] || '').trim());

const normalizePhone = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length > 12) return `91${digits.slice(-10)}`;
  return '';
};

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const pickValue = (property, keys) => {
  for (const key of keys) {
    const value = property?.[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
};

const formatArea = (property) => {
  const area = pickValue(property, ['totalArea']);
  const unit = pickValue(property, ['areaUnit']);
  return [area, unit].filter(Boolean).join(' ');
};

const formatPrice = (property) => {
  const squareYardPrice = pickValue(property, ['squareYardPrice']);
  const advance = pickValue(property, ['advance']);
  const goodwill = pickValue(property, ['goodwill']);
  if (squareYardPrice) return `Price: ${squareYardPrice}`;
  if (advance) return `Advance: ${advance}`;
  if (goodwill) return `Goodwill: ${goodwill}`;
  return '';
};

const propertyTitle = (property) => {
  const type = pickValue(property, ['developmentType']) || 'Property';
  const locality = pickValue(property, ['locality']) || pickValue(property, ['city']);
  return locality ? `${type} in ${locality}` : type;
};

const formatListingLine = (property, index) => {
  const area = formatArea(property);
  const location = [property.locality, property.city].filter(Boolean).join(', ');
  const price = formatPrice(property);
  return [
    `${index + 1}. ${propertyTitle(property)}`,
    area,
    location,
    price
  ].filter(Boolean).join(' | ');
};

const buildDigestMessage = (properties, city, publicSiteUrl) => {
  const listingsUrl = `${publicSiteUrl.replace(/\/$/, '')}/properties?city=${encodeURIComponent(city || 'Hyderabad')}`;
  const lines = properties.slice(0, 8).map(formatListingLine);
  const extra = properties.length > 8 ? `\n+${properties.length - 8} more listings available on HomeFeet.` : '';

  return {
    listingsUrl,
    digestText: `${lines.join('\n')}${extra}`
  };
};

const getWhatsAppErrorHint = (message = '') => {
  const normalized = String(message).toLowerCase();
  if (normalized.includes('unsupported post request') || normalized.includes('does not exist')) {
    return 'Check WHATSAPP_PHONE_NUMBER_ID. Meta Cloud API needs the Phone Number ID from WhatsApp Manager > API Setup, not the WhatsApp Business Account ID.';
  }
  if (normalized.includes('template') && normalized.includes('does not exist')) {
    return 'Check WHATSAPP_DAILY_DIGEST_TEMPLATE and make sure the template is approved for the configured WhatsApp Business account.';
  }
  if (normalized.includes('authentication') || normalized.includes('oauth') || normalized.includes('access token') || normalized.includes('invalid token')) {
    return 'Check WHATSAPP_ACCESS_TOKEN. The token may be expired, copied incorrectly, or missing whatsapp_business_messaging permission.';
  }
  return '';
};

const sendWhatsAppTemplate = async ({ to, city, propertyCount, digestText, listingsUrl }) => {
  const response = await fetch(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: process.env.WHATSAPP_DAILY_DIGEST_TEMPLATE,
        language: {
          code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en'
        },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: city || 'Hyderabad' },
            { type: 'text', text: String(propertyCount) },
            { type: 'text', text: digestText.slice(0, 900) },
            { type: 'text', text: listingsUrl }
          ]
        }]
      }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerError = data?.error || {};
    const message = providerError.message || `WhatsApp API failed with status ${response.status}`;
    const error = new Error(message.slice(0, 300));
    error.whatsappError = {
      status: response.status,
      message: error.message,
      type: providerError.type,
      code: providerError.code,
      errorSubcode: providerError.error_subcode,
      fbtraceId: providerError.fbtrace_id
    };
    error.hint = getWhatsAppErrorHint(message);
    throw error;
  }

  return data?.messages?.[0]?.id || '';
};

const sendTodayBuilderDigest = async ({ city = 'Hyderabad', period = 'manual', fallbackToRecent = false } = {}) => {
  const missingConfig = getMissingWhatsAppConfig();
  if (missingConfig.length) {
    const error = new Error('WhatsApp digest environment values are not configured');
    error.missingConfig = missingConfig;
    throw error;
  }

  const normalizedCity = city && city !== 'all' ? city : 'Hyderabad';
  const today = startOfToday();
  const publicSiteUrl = process.env.PUBLIC_SITE_URL || 'https://www.homefeet.in';
  const cityFilter = { $regex: `^${escapeRegExp(normalizedCity)}$`, $options: 'i' };

  const basePropertyQuery = {
    status: { $regex: '^approved$', $options: 'i' },
    dealStatus: { $ne: 'closed' },
    city: cityFilter
  };

  const propertyQuery = {
    ...basePropertyQuery,
    $or: [
      { approvedAt: { $gte: today } },
      { createdAt: { $gte: today } },
      { updatedAt: { $gte: today } }
    ]
  };

  let propertySource = 'today';
  let properties = await Property.find(propertyQuery).sort({ approvedAt: -1, updatedAt: -1, createdAt: -1 }).limit(12);

  if (!properties.length && fallbackToRecent) {
    propertySource = 'recent';
    properties = await Property.find(basePropertyQuery).sort({ approvedAt: -1, updatedAt: -1, createdAt: -1 }).limit(12);
  }

  const contacts = await BuilderContact.find({
    city: cityFilter,
    dailyDigestEnabled: true,
    isGenuineContact: { $ne: false },
    mobile: { $nin: ['', null] }
  }).sort({ companyName: 1 });

  const result = {
    city: normalizedCity,
    period,
    propertyCount: properties.length,
    propertySource,
    usedFallback: propertySource === 'recent',
    builderCount: contacts.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    invalidPhones: 0,
    failures: []
  };

  if (!properties.length) {
    return result;
  }

  for (const contact of contacts) {
    const to = normalizePhone(contact.mobile);
    if (!to) {
      result.invalidPhones += 1;
      result.skipped += 1;
      continue;
    }

    const previousLogs = await BuilderDigestLog.find({
      builderContact: contact._id,
      sentAt: { $gte: today },
      status: 'sent'
    }).select('propertyIds');

    const alreadySent = new Set(previousLogs.flatMap((log) => log.propertyIds.map(String)));
    const freshProperties = properties.filter((property) => !alreadySent.has(String(property._id)));

    if (!freshProperties.length) {
      result.skipped += 1;
      continue;
    }

    const { digestText, listingsUrl } = buildDigestMessage(freshProperties, normalizedCity, publicSiteUrl);

    try {
      const providerMessageId = await sendWhatsAppTemplate({
        to,
        city: normalizedCity,
        propertyCount: freshProperties.length,
        digestText,
        listingsUrl
      });

      await BuilderDigestLog.create({
        builderContact: contact._id,
        city: normalizedCity,
        period,
        propertyIds: freshProperties.map((property) => property._id),
        status: 'sent',
        providerMessageId,
        messagePreview: digestText.slice(0, 300)
      });

      contact.lastDigestSentAt = new Date();
      await contact.save();
      result.sent += 1;
    } catch (error) {
      await BuilderDigestLog.create({
        builderContact: contact._id,
        city: normalizedCity,
        period,
        propertyIds: freshProperties.map((property) => property._id),
        status: 'failed',
        error: error.message || 'Unable to send digest',
        messagePreview: digestText.slice(0, 300)
      });

      result.failed += 1;
      result.failures.push({
        builder: contact.companyName,
        mobile: contact.mobile,
        error: error.message || 'Unable to send digest',
        hint: error.hint || '',
        whatsappError: error.whatsappError || null
      });
    }
  }

  result.failures = result.failures.slice(0, 5);
  return result;
};

module.exports = {
  sendTodayBuilderDigest,
  getMissingWhatsAppConfig
};
