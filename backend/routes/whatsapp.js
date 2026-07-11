const express = require('express');
const jwt = require('jsonwebtoken');
const { createPendingPropertyFromIntake } = require('../lib/whatsappIntake');
const WhatsAppIntake = require('../models/WhatsAppIntake');
const { submitTemplate, getTemplates, getTemplateStatus, sendTemplateMessage, sendCampaign } = require('../lib/whatsappCampaign');

const router = express.Router();

// ── Auth middleware (admin only) ──────────────────────────────────────────────
const ADMIN_PHONES = (process.env.ADMIN_PHONES || '9014011885,7416995503')
  .split(',').map(p => p.trim()).filter(Boolean);
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'ashokreddy@inventorheads.com')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

const requireAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const isAdmin = ADMIN_PHONES.includes(decoded.phone) ||
                    ADMIN_EMAILS.includes((decoded.email || '').toLowerCase()) ||
                    decoded.accountType === 'admin';
    if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ── POST /api/whatsapp/send-template ─────────────────────────────────────────
// Send a single template message to one recipient.
// Body: { to, templateName, languageCode?, header?, bodyVariables?, buttons? }
router.post('/send-template', requireAdmin, async (req, res) => {
  const { to, templateName, languageCode, header, bodyVariables, buttons } = req.body;

  if (!to || !templateName) {
    return res.status(400).json({ error: '`to` and `templateName` are required.' });
  }

  try {
    const result = await sendTemplateMessage({
      to,
      templateName,
      languageCode: languageCode || 'en',
      header:        header        || null,
      bodyVariables: bodyVariables || [],
      buttons:       buttons       || []
    });

    if (!result.success) {
      return res.status(502).json({ error: result.error, raw: result.raw });
    }

    res.json({ success: true, messageId: result.messageId });
  } catch (err) {
    console.error('[send-template]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/whatsapp/send-campaign ─────────────────────────────────────────
// Bulk send a template to many recipients.
// Body: { recipients: string[], templateName, languageCode?, header?, bodyVariables?, buttons? }
router.post('/send-campaign', requireAdmin, async (req, res) => {
  const { recipients, templateName, languageCode, header, bodyVariables, buttons } = req.body;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: '`recipients` must be a non-empty array.' });
  }
  if (!templateName) {
    return res.status(400).json({ error: '`templateName` is required.' });
  }
  if (recipients.length > 1000) {
    return res.status(400).json({ error: 'Max 1000 recipients per request.' });
  }

  try {
    const summary = await sendCampaign(recipients, {
      templateName,
      languageCode: languageCode || 'en',
      header:        header        || null,
      bodyVariables: bodyVariables || [],
      buttons:       buttons       || []
    });

    res.json({ success: true, ...summary });
  } catch (err) {
    console.error('[send-campaign]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/whatsapp/submit-template ───────────────────────────────────────
// Submit a new template to Meta for review.
// Body: { name, category, languageCode, headerType, headerText, bodyText, footerText, buttons[] }
router.post('/submit-template', requireAdmin, async (req, res) => {
  const { name, category, languageCode, headerType, headerText, headerExampleUrl, bodyText, footerText, buttons } = req.body;

  if (!name || !bodyText) {
    return res.status(400).json({ error: '`name` and `bodyText` are required.' });
  }

  try {
    const result = await submitTemplate({
      name,
      category:        category        || 'MARKETING',
      languageCode:    languageCode    || 'en',
      headerType:      headerType      || '',
      headerText:      headerText      || '',
      headerExampleUrl: headerExampleUrl || '',
      bodyText,
      footerText:      footerText      || '',
      buttons:         buttons         || []
    });

    if (!result.success) {
      return res.status(502).json({ error: result.error, code: result.code, raw: result.raw });
    }

    res.json({ success: true, templateId: result.templateId, status: result.status, name: result.name });
  } catch (err) {
    console.error('[submit-template]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/whatsapp/templates ──────────────────────────────────────────────
// List all templates (optionally filter by status=APPROVED|PENDING|REJECTED).
router.get('/templates', requireAdmin, async (req, res) => {
  try {
    const templates = await getTemplates(req.query.status || '');
    res.json({ success: true, templates });
  } catch (err) {
    console.error('[templates]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/whatsapp/templates/:name/status ──────────────────────────────────
// Check status of a specific template by name.
router.get('/templates/:name/status', requireAdmin, async (req, res) => {
  try {
    const template = await getTemplateStatus(req.params.name);
    if (!template) return res.status(404).json({ error: 'Template not found.' });
    res.json({ success: true, template });
  } catch (err) {
    console.error('[template-status]', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'homefeet_whatsapp_verify';

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

router.post('/webhook', async (req, res) => {
  try {
    const entries = req.body?.entry || [];
    const created = [];

    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const contacts = value.contacts || [];
        const messages = value.messages || [];

        for (const message of messages) {
          const ownerPhone = message.from || contacts[0]?.wa_id || '';
          const ownerName = contacts.find((contact) => contact.wa_id === ownerPhone)?.profile?.name || contacts[0]?.profile?.name || '';
          const text = message.text?.body
            || message.image?.caption
            || message.document?.caption
            || message.video?.caption
            || message.button?.text
            || message.interactive?.button_reply?.title
            || message.interactive?.list_reply?.title
            || '';
          const mediaIds = [message.image?.id, message.document?.id, message.video?.id].filter(Boolean);

          if (!text.trim() && mediaIds.length === 0) continue;
          if (message.id) {
            const existing = await WhatsAppIntake.findOne({ whatsappMessageId: message.id }).select('_id');
            if (existing) continue;
          }

          const result = await createPendingPropertyFromIntake({
            summary: text || 'Property details shared through WhatsApp media. Admin review required.',
            ownerPhone,
            ownerName,
            mediaIds,
            source: 'whatsapp_webhook',
            whatsappMessageId: message.id || ''
          });
          created.push(result.property._id.toString());
        }
      }
    }

    res.json({ success: true, created });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({ error: 'Failed to process WhatsApp webhook' });
  }
});

module.exports = router;
