/**
 * Meta WhatsApp Cloud API — Template Submission + Campaign Sender
 *
 * Phone Number ID : 1215866064942202
 * WABA ID        : 1362232019149375
 * API version    : v20.0
 */

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1215866064942202';
const WABA_ID         = process.env.WHATSAPP_WABA_ID         || '1362232019149375';
const API_VERSION     = 'v20.0';
const MESSAGES_URL    = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
const TEMPLATES_URL   = `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates`;

const getToken = () => {
  const t = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!t) throw new Error('WHATSAPP_ACCESS_TOKEN env var is not set.');
  return t;
};

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA UPLOAD (WhatsApp Cloud API /media endpoint)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a file to the WhatsApp Cloud API media endpoint and return the media ID.
 * The ID is used as example.header_handle when creating IMAGE/VIDEO/DOCUMENT templates.
 *
 * Uses native Node 18+ FormData + fetch — no extra npm packages required.
 *
 * @param {Buffer} fileBuffer  – raw file bytes
 * @param {string} mimeType   – e.g. "image/jpeg"
 * @param {string} [fileName] – optional display name
 * @returns {Promise<string>}  – WhatsApp media ID
 */
async function uploadWhatsAppMedia(fileBuffer, mimeType, fileName) {
  const token = getToken();

  // Node 18+ native FormData + Blob
  const blob = new Blob([fileBuffer], { type: mimeType });
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append('file', blob, fileName || 'header_media');

  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/media`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    }
  );

  const data = await res.json();
  console.log('[upload-whatsapp-media] response:', JSON.stringify(data));

  if (!res.ok || data.error) {
    const detail = data.error?.error_data?.details || data.error?.error_user_msg || '';
    throw new Error(
      `WhatsApp media upload failed: ${data.error?.message || res.status}${detail ? ' — ' + detail : ''}`
    );
  }

  return data.id; // WhatsApp media ID used as header_handle
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE CREATION (Submit for Meta review)
// ─────────────────────────────────────────────────────────────────────────────


/**
 * Build the components[] array for template CREATION (different schema from sending).
 *
 * @param {{ headerType, headerText, headerMediaHandle, bodyText, footerText, buttons }} opts
 * headerMediaHandle – Facebook media handle from uploadMediaToMeta() (preferred for IMAGE/VIDEO/DOCUMENT)
 */
function buildTemplateComponents({ headerType, headerText, headerMediaHandle, bodyText, footerText, buttons = [] }) {
  const components = [];

  // ── HEADER ──────────────────────────────────────────────────────────────────
  if (headerType && headerType !== 'none') {
    const fmt = headerType.toUpperCase(); // TEXT | IMAGE | VIDEO | DOCUMENT
    // TEXT with no text is invalid — skip silently
    if (!(fmt === 'TEXT' && !headerText)) {
      const headerComp = { type: 'HEADER', format: fmt };
      if (fmt === 'TEXT') {
        headerComp.text = headerText;
      } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(fmt)) {
        // Meta REQUIRES a Facebook media handle in example.header_handle.
        // The handle comes from uploadMediaToMeta() called before template submission.
        if (!headerMediaHandle) {
          throw new Error(`Please upload a ${fmt.toLowerCase()} file for the header before submitting.`);
        }
        headerComp.example = { header_handle: [headerMediaHandle] };
      }
      components.push(headerComp);
    }
  }

  // ── BODY ────────────────────────────────────────────────────────────────────
  if (bodyText) {
    const bodyComp = { type: 'BODY', text: bodyText };
    // Meta REQUIRES example.body_text when body contains {{n}} variables
    const vars = bodyText.match(/\{\{\d+\}\}/g) || [];
    if (vars.length) {
      bodyComp.example = {
        body_text: [vars.map((_, i) => `value${i + 1}`)]
      };
    }
    components.push(bodyComp);
  }

  // ── FOOTER ──────────────────────────────────────────────────────────────────
  if (footerText) {
    components.push({ type: 'FOOTER', text: footerText });
  }

  // ── BUTTONS ─────────────────────────────────────────────────────────────────
  if (buttons.length) {
    const metaButtons = buttons.map(btn => {
      if (btn.type === 'url') {
        const isDynamic = btn.urlType === 'Dynamic';
        const baseUrl   = (btn.url || '').replace(/\/$/, '');
        const metaUrl   = isDynamic ? `${baseUrl}/{{1}}` : baseUrl;
        const btnObj    = { type: 'URL', text: btn.label || 'Visit', url: metaUrl };
        // Meta REQUIRES example[] for dynamic URL buttons ({{1}} suffix)
        if (isDynamic) {
          btnObj.example = [`${baseUrl}/home`];
        }
        return btnObj;
      }
      if (btn.type === 'phone_number') {
        return {
          type: 'PHONE_NUMBER',
          text: btn.label || 'Call Us',
          phone_number: btn.url || ''
        };
      }
      // quick_reply / custom
      return { type: 'QUICK_REPLY', text: btn.label || btn.text || 'Reply' };
    });
    components.push({ type: 'BUTTONS', buttons: metaButtons });
  }

  return components;
}

/**
 * Submit a template to Meta for review.
 *
 * @param {object} opts
 * @param {string} opts.name           – snake_case template name (e.g. "builder_promo_v1")
 * @param {string} opts.category       – MARKETING | UTILITY | AUTHENTICATION
 * @param {string} opts.languageCode   – e.g. "en"
 * @param {string} [opts.headerType]   – 'text' | 'image' | 'video' | 'document' | ''
 * @param {string} [opts.headerText]   – only used when headerType = 'text'
 * @param {string} opts.bodyText       – message body with optional {{1}} vars
 * @param {string} [opts.footerText]
 * @param {Array}  [opts.buttons]      – [{type,label,urlType,url}]
 * @returns {Promise<{ success:boolean; templateId?:string; status?:string; error?:string }>}
 */
async function submitTemplate({
  name,
  category = 'MARKETING',
  languageCode = 'en',
  headerType = '',
  headerText = '',
  headerMediaHandle = '',
  bodyText,
  footerText = '',
  buttons = []
}) {
  if (!name)     throw new Error('`name` is required');
  if (!bodyText) throw new Error('`bodyText` is required');

  // Meta: snake_case, lowercase, no leading/trailing/consecutive underscores, max 512 chars
  const safeName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')   // replace invalid chars with _
    .replace(/_+/g, '_')            // collapse consecutive underscores
    .replace(/^_+|_+$/g, '')        // strip leading/trailing underscores
    .slice(0, 512) || 'template';

  const components = buildTemplateComponents({ headerType, headerText, headerMediaHandle, bodyText, footerText, buttons });

  const payload = {
    name: safeName,
    language: languageCode,
    category: category.toUpperCase(),
    components
  };

  console.log('[submit-template] payload →', JSON.stringify(payload, null, 2));

  const res = await fetch(TEMPLATES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    // Surface the most useful fields from Meta's error response
    const metaErr   = data.error || {};
    const detail    = metaErr.error_data?.details || metaErr.error_user_msg || '';
    const errorMsg  = [metaErr.message, detail].filter(Boolean).join(' — ');
    console.error('[submit-template] Meta error:', JSON.stringify(data, null, 2));
    return {
      success: false,
      error: errorMsg || `HTTP ${res.status}`,
      code:  metaErr.code,
      raw:   data
    };
  }

  return { success: true, templateId: data.id, status: data.status, name: safeName };
}

/**
 * Update an existing template by ID (PATCH).
 * Meta re-sends it for review; status changes back to PENDING.
 * Name, category and language cannot be changed — only components.
 */
async function updateTemplate({ templateId, headerType, headerText, headerMediaHandle, bodyText, footerText, buttons }) {
  if (!templateId) throw new Error('`templateId` is required');
  if (!bodyText)   throw new Error('`bodyText` is required');

  const components = buildTemplateComponents({ headerType, headerText, headerMediaHandle, bodyText, footerText, buttons });

  const url = `https://graph.facebook.com/${API_VERSION}/${templateId}`;
  const payload = { components };

  console.log('[update-template] PATCH', templateId, JSON.stringify(payload, null, 2));

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    const metaErr  = data.error || {};
    const detail   = metaErr.error_data?.details || metaErr.error_user_msg || '';
    const errorMsg = [metaErr.message, detail].filter(Boolean).join(' — ');
    console.error('[update-template] Meta error:', JSON.stringify(data, null, 2));
    return { success: false, error: errorMsg || `HTTP ${res.status}`, code: metaErr.code, raw: data };
  }

  // PATCH returns { success: true } on success — status resets to PENDING
  return { success: true, templateId, status: 'PENDING' };
}

/**
 * Fetch all templates for the WABA (with optional status filter).
 *
 * @param {'APPROVED'|'PENDING'|'REJECTED'|''} [statusFilter]
 */
async function getTemplates(statusFilter = '') {
  const url = new URL(TEMPLATES_URL);
  url.searchParams.set('fields', 'id,name,status,category,language,components,rejected_reason');
  url.searchParams.set('limit', '50');
  if (statusFilter) url.searchParams.set('status', statusFilter);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }
  return data.data || [];
}

/**
 * Get status of a single template by name.
 */
async function getTemplateStatus(name) {
  const url = new URL(TEMPLATES_URL);
  url.searchParams.set('name', name);
  url.searchParams.set('fields', 'id,name,status,rejected_reason');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return (data.data || [])[0] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE SENDING (Single + Bulk)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the components[] for SENDING an approved template.
 */
function buildSendComponents({ headerType, headerValue, bodyVariables = [], buttons = [] }) {
  const components = [];

  if (headerType && headerValue) {
    if (headerType.toUpperCase() === 'TEXT') {
      components.push({ type: 'header', parameters: [{ type: 'text', text: headerValue }] });
    } else {
      const mediaKey = headerType.toLowerCase();
      components.push({
        type: 'header',
        parameters: [{ type: mediaKey, [mediaKey]: { link: headerValue } }]
      });
    }
  }

  if (bodyVariables.length) {
    components.push({
      type: 'body',
      parameters: bodyVariables.map(text => ({ type: 'text', text: String(text) }))
    });
  }

  for (const btn of buttons) {
    if (btn.type === 'url') {
      // Dynamic URL buttons need a suffix — skip if empty to avoid Meta validation error
      if (!btn.value && btn.value !== 0) continue;
      components.push({
        type: 'button', sub_type: 'url', index: String(btn.index),
        parameters: [{ type: 'text', text: String(btn.value) }]
      });
    } else if (btn.type === 'quick_reply') {
      components.push({
        type: 'button', sub_type: 'quick_reply', index: String(btn.index),
        parameters: [{ type: 'payload', payload: btn.value }]
      });
    }
  }

  return components;
}

/**
 * Send one approved template to one recipient.
 */
async function sendTemplateMessage({
  to,
  templateName,
  languageCode = 'en',
  header = null,
  bodyVariables = [],
  buttons = []
}) {
  let phone = String(to).replace(/[\s\-().+]/g, '');
  // Auto-add India country code for 10-digit numbers starting with 6-9
  if (/^\d{10}$/.test(phone) && /^[6-9]/.test(phone)) phone = '91' + phone;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: buildSendComponents({
        headerType:  header?.type  || null,
        headerValue: header?.value || null,
        bodyVariables,
        buttons
      })
    }
  };

  const res = await fetch(MESSAGES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    const metaErr = data.error || {};
    const detail  = metaErr.error_data?.details || metaErr.error_user_msg || '';
    const msg     = [metaErr.message, detail].filter(Boolean).join(' — ');
    console.error('[send-template] Meta error to', phone, ':', JSON.stringify(data));
    return { success: false, error: msg || `HTTP ${res.status}`, raw: data };
  }
  return { success: true, messageId: data.messages?.[0]?.id || null };
}

/**
 * Bulk-send an approved template to many recipients.
 * 100 ms gap between calls → stays well under Meta's 80 msg/s limit.
 *
 * @param {string[]} recipients
 * @param {object}   templateOpts  – everything except `to`
 * @returns {Promise<{ sent, failed, results }>}
 */
async function sendCampaign(recipients, templateOpts) {
  const results = [];
  let sent = 0, failed = 0;

  for (const phone of recipients) {
    try {
      const result = await sendTemplateMessage({ to: phone, ...templateOpts });
      results.push({ phone, ...result });
      if (result.success) sent++; else failed++;
    } catch (err) {
      results.push({ phone, success: false, error: err.message });
      failed++;
    }
    await new Promise(r => setTimeout(r, 100));
  }

  return { sent, failed, results };
}

module.exports = { uploadWhatsAppMedia, submitTemplate, updateTemplate, getTemplates, getTemplateStatus, sendTemplateMessage, sendCampaign };
