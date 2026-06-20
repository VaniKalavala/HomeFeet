const express = require('express');
const BuilderContact = require('../models/BuilderContact');

const router = express.Router();

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeDomain = (website = '') => {
  const raw = String(website || '').trim();
  if (!raw) return '';

  try {
    const value = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(value).hostname.replace(/^www\./i, '');
  } catch (_error) {
    return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
  }
};

router.get('/', async (req, res) => {
  try {
    const city = String(req.query.city || '').trim();
    const query = {
      logoDataUrl: { $nin: ['', null] },
      isGenuineContact: { $ne: false }
    };

    if (city && city.toLowerCase() !== 'all') {
      query.city = new RegExp(`^${escapeRegex(city)}$`, 'i');
    }

    const contacts = await BuilderContact.find(query)
      .sort({ city: 1, companyName: 1 })
      .limit(80)
      .lean();

    res.json(contacts.map((contact) => ({
      name: contact.companyName,
      domain: normalizeDomain(contact.website) || 'homefeet.in',
      logo: contact.logoDataUrl,
      city: contact.city,
      website: contact.website || ''
    })));
  } catch (error) {
    console.error('Error fetching builder logos:', error);
    res.status(500).json({ error: 'Failed to fetch builder logos' });
  }
});

module.exports = router;
