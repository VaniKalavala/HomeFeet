/**
 * Meta WhatsApp Cloud API — Campaign Template Sender
 *
 * Phone Number ID : 1215866064942202
 * WABA ID        : 1362232019149375
 * API version    : v20.0
 *
 * Required env var:
 *   WHATSAPP_ACCESS_TOKEN  – permanent system-user token from Meta Business Manager
 */

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1215866064942202';
const API_VERSION     = 'v20.0';
const BASE_URL        = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

/**
 * Build the "components" array that Meta requires.
 *
 * @param {object} opts
 * @param {'IMAGE'|'VIDEO'|'DOCUMENT'|'TEXT'|null} opts.headerType
 * @param {string|null}  opts.headerValue   – media URL for IMAGE/VIDEO/DOCUMENT; plain text for TEXT
 * @param {string[]}     opts.bodyVariables  – ordered list of {{1}}, {{2}}… substitutions
 * @param {string|null}  opts.footerText    – plain text footer (informational only)
 * @param {{ type:'url'|'phone_number'|'quick_reply'; index:number; value:string }[]} opts.buttons
 */
function buildComponents({ headerType, headerValue, bodyVariables = [], buttons = [] }) {
  const components = [];

  // ── Header ──────────────────────────────────────────────────────────────────
  if (headerType && headerValue) {
    if (headerType === 'TEXT') {
      components.push({
        type: 'header',
        parameters: [{ type: 'text', text: headerValue }]
      });
    } else {
      const mediaKey = headerType.toLowerCase(); // 'image' | 'video' | 'document'
      components.push({
        type: 'header',
        parameters: [{
          type: mediaKey,
          [mediaKey]: { link: headerValue }
        }]
      });
    }
  }

  // ── Body ────────────────────────────────────────────────────────────────────
  if (bodyVariables.length) {
    components.push({
      type: 'body',
      parameters: bodyVariables.map((text) => ({ type: 'text', text: String(text) }))
    });
  }

  // ── Buttons ─────────────────────────────────────────────────────────────────
  for (const btn of buttons) {
    if (btn.type === 'url') {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: String(btn.index),
        parameters: [{ type: 'text', text: btn.value }]   // dynamic URL suffix
      });
    } else if (btn.type === 'quick_reply') {
      components.push({
        type: 'button',
        sub_type: 'quick_reply',
        index: String(btn.index),
        parameters: [{ type: 'payload', payload: btn.value }]
      });
    }
    // phone_number buttons are static — no component needed
  }

  return components;
}

/**
 * Send a single WhatsApp template message to one recipient.
 *
 * @param {object}  opts
 * @param {string}  opts.to               – E.164 phone (e.g. "919100000000")
 * @param {string}  opts.templateName     – approved template name
 * @param {string}  opts.languageCode     – e.g. "en" | "hi" | "te"
 * @param {object}  [opts.header]         – { type, value } — see buildComponents
 * @param {string[]}[opts.bodyVariables]  – substitution values for {{1}}, {{2}}…
 * @param {Array}   [opts.buttons]        – dynamic button payloads
 * @returns {Promise<{ success: boolean; messageId?: string; error?: string }>}
 */
async function sendTemplateMessage({
  to,
  templateName,
  languageCode = 'en',
  header = null,
  bodyVariables = [],
  buttons = []
}) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error('WHATSAPP_ACCESS_TOKEN env var is not set.');

  // Normalise phone: strip spaces/dashes, ensure no leading +
  const phone = String(to).replace(/[\s\-().+]/g, '');

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: buildComponents({
        headerType:    header?.type  || null,
        headerValue:   header?.value || null,
        bodyVariables,
        buttons
      })
    }
  };

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    const msg = data.error?.message || `HTTP ${res.status}`;
    return { success: false, error: msg, raw: data };
  }

  return {
    success: true,
    messageId: data.messages?.[0]?.id || null
  };
}

/**
 * Send a template to many recipients and collect per-number results.
 * Adds a 100 ms delay between calls to stay under Meta rate limits.
 *
 * @param {string[]} recipients  – list of E.164 phone numbers
 * @param {object}   templateOpts – same shape as sendTemplateMessage minus `to`
 * @returns {Promise<{ sent:number; failed:number; results: Array }>}
 */
async function sendCampaign(recipients, templateOpts) {
  const results = [];
  let sent = 0;
  let failed = 0;

  for (const phone of recipients) {
    try {
      const result = await sendTemplateMessage({ to: phone, ...templateOpts });
      results.push({ phone, ...result });
      if (result.success) sent++; else failed++;
    } catch (err) {
      results.push({ phone, success: false, error: err.message });
      failed++;
    }

    // Polite 100 ms gap — keeps us well below the 80 msg/s default limit
    await new Promise((r) => setTimeout(r, 100));
  }

  return { sent, failed, results };
}

module.exports = { sendTemplateMessage, sendCampaign };
