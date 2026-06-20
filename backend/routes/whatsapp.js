const express = require('express');
const { createPendingPropertyFromIntake } = require('../lib/whatsappIntake');
const WhatsAppIntake = require('../models/WhatsAppIntake');

const router = express.Router();

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
