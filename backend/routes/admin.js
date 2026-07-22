// routes/admin.js
const express = require('express');
const jwt = require('jsonwebtoken');
const Property = require('../models/Property');
const User = require('../models/User');
const Interest = require('../models/Interest');
const Message = require('../models/Message');
const MembershipPayment = require('../models/MembershipPayment');
const ContactInquiry = require('../models/ContactInquiry');
const WhatsAppIntake = require('../models/WhatsAppIntake');
const BuilderContact = require('../models/BuilderContact');
const Testimonial = require('../models/Testimonial');
const LoginHistory = require('../models/LoginHistory');
const { createPendingPropertyFromIntake } = require('../lib/whatsappIntake');
const { sendTodayBuilderDigest, getMissingWhatsAppConfig } = require('../lib/builderDigest');
const hyderabadBuilderContacts = require('../data/hyderabadBuilderContacts');
const mumbaiBuilderContacts = require('../data/mumbaiBuilderContacts');
const { OWNER_PLAN_TIERS } = require('../config/ownerPlans');

const router = express.Router();

const ADMIN_PHONES = (process.env.ADMIN_PHONES || '9014011885,7416995503')
  .split(',')
  .map((phone) => phone.trim())
  .filter(Boolean);

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'ashokreddy@inventorheads.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const membershipMonths = {
  '3_months': 3,
  '6_months': 6,
  '12_months': 12
};

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);

    if (!user || !(user.accountType === 'admin' || ADMIN_PHONES.includes(user.phone) || ADMIN_EMAILS.includes(String(user.email || '').toLowerCase()))) {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// GET all properties for admin (including pending)
router.get('/properties', isAdmin, async (req, res) => {
  try {
    const properties = await Property.find()
      .sort({ createdAt: -1 }); // Most recent first
    
    res.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

const computePropertyExpiry = async (property, approvedAt) => {
  if (!property.userId) return null;
  const owner = await User.findById(property.userId).select('ownerPlanTier ownerPlanExpiresAt');
  if (!owner || owner.ownerPlanTier === 'none' || !owner.ownerPlanTier) return null;
  if (!owner.ownerPlanExpiresAt || new Date(owner.ownerPlanExpiresAt) <= new Date()) return null;

  const planConfig = OWNER_PLAN_TIERS[owner.ownerPlanTier];
  if (!planConfig) return null;

  const expiresAt = new Date(approvedAt);
  expiresAt.setDate(expiresAt.getDate() + planConfig.validityDays);
  return expiresAt;
};

// PATCH approve property
router.patch('/properties/:id/approve', isAdmin, async (req, res) => {
  try {
    const existing = await Property.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const approvedAt = new Date();
    const expiresAt = await computePropertyExpiry(existing, approvedAt);

    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', rejectionReason: '', approvedAt, expiresAt },
      { new: true }
    );

    res.json({ success: true, property });
  } catch (error) {
    console.error('Error approving property:', error);
    res.status(500).json({ error: 'Failed to approve property' });
  }
});

// PATCH reject property
router.patch('/properties/:id/reject', isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: reason || 'Listing did not meet platform requirements.' },
      { new: true }
    );

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({ success: true, property });
  } catch (error) {
    console.error('Error rejecting property:', error);
    res.status(500).json({ error: 'Failed to reject property' });
  }
});

router.get('/users', isAdmin, async (req, res) => {
  try {
    const autoApprovalCutoff = new Date(Date.now() - 60 * 1000);
    await User.updateMany(
      {
        accountType: 'builder',
        builderVerificationStatus: 'pending',
        builderCompanyName: { $exists: true, $ne: '' },
        createdAt: { $lte: autoApprovalCutoff }
      },
      {
        $set: {
          builderVerificationStatus: 'approved',
          builderRejectionReason: ''
        }
      }
    );

    const users = await User.find().sort({ createdAt: -1 }).lean();
    const userIds = users.map((user) => String(user._id));
    const phones = users.map((user) => normalizePhone(user.phone)).filter(Boolean);
    const listedProperties = await Property.find({
      $or: [
        { userId: { $in: userIds } },
        { phone: { $in: phones } }
      ]
    }).select('_id userId phone').lean();

    const usersWithListingCounts = users.map((user) => {
      const userId = String(user._id);
      const phone = normalizePhone(user.phone);
      const propertyIds = new Set();

      listedProperties.forEach((property) => {
        const propertyPhone = normalizePhone(property.phone);
        if (String(property.userId || '') === userId || (phone && propertyPhone === phone)) {
          propertyIds.add(String(property._id));
        }
      });

      return {
        ...user,
        propertyListingCount: propertyIds.size
      };
    });

    res.json(usersWithListingCounts);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET recent login history for all users
router.get('/login-history', isAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const entries = await LoginHistory.find().sort({ loggedInAt: -1 }).limit(limit).lean();
    res.json(entries);
  } catch (error) {
    console.error('Error fetching login history:', error);
    res.status(500).json({ error: 'Failed to fetch login history' });
  }
});

// GET log of buyers/builders who unlocked an owner's contact details, for admin oversight
router.get('/owner-contact-access', isAdmin, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const interests = await Interest.find({ contactUnlocked: true })
      .populate('propertyId', 'projectName companyName city locality')
      .sort({ contactUnlockedAt: -1 })
      .limit(limit)
      .lean();

    const buyerIds = [...new Set(interests.map((entry) => entry.userId).filter(Boolean))];
    const buyers = await User.find({ _id: { $in: buyerIds } })
      .select('firstName lastName phone email accountType')
      .lean();
    const buyersById = new Map(buyers.map((buyer) => [String(buyer._id), buyer]));

    const entries = interests.map((entry) => {
      const buyer = buyersById.get(String(entry.userId));
      const property = entry.propertyId;
      return {
        _id: entry._id,
        propertyId: property?._id || entry.propertyId || null,
        propertyName: property?.projectName || property?.companyName || 'Untitled property',
        propertyLocation: [property?.locality, property?.city].filter(Boolean).join(', '),
        buyerName: buyer ? `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() : '',
        buyerPhone: buyer?.phone || '',
        buyerEmail: buyer?.email || '',
        buyerAccountType: buyer?.accountType || '',
        unlockedVia: entry.unlockedVia,
        accessedAt: entry.contactUnlockedAt || entry.respondedAt || entry.timestamp
      };
    });

    res.json(entries);
  } catch (error) {
    console.error('Error fetching owner contact access log:', error);
    res.status(500).json({ error: 'Failed to fetch owner contact access log' });
  }
});

const normalizePhone = (value = '') =>
  String(value || '').replace(/\D/g, '').slice(-10);

const normalizeImportKey = (value = '') =>
  String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const getImportValue = (row = {}, keys = []) => {
  const normalizedRow = Object.entries(row).reduce((acc, [key, value]) => {
    acc[normalizeImportKey(key)] = value;
    return acc;
  }, {});

  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim()) {
      return row[key];
    }

    const normalizedValue = normalizedRow[normalizeImportKey(key)];
    if (normalizedValue !== undefined && normalizedValue !== null && String(normalizedValue).trim()) {
      return normalizedValue;
    }
  }

  return '';
};

const getImportValueByPattern = (row = {}, patterns = [], rejectPatterns = []) => {
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeImportKey(key);
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) continue;
    if (rejectPatterns.some((pattern) => pattern.test(normalizedKey))) continue;
    if (patterns.some((pattern) => pattern.test(normalizedKey))) {
      return value;
    }
  }

  return '';
};

const compactImportRow = (row = {}) =>
  Object.entries(row).reduce((acc, [key, value]) => {
    const normalizedValue = String(value || '').trim();
    if (normalizedValue) acc[key] = normalizedValue;
    return acc;
  }, {});

const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const legacyMumbaiBuilderContactCities = [
  'Maharashtra / Mumbai',
  'Maharashtra/Mumbai',
  'Maharastra / Mumbai',
  'Maharastra/Mumbai'
];

const builderContactCityAliases = {
  mumbai: ['Mumbai', ...legacyMumbaiBuilderContactCities]
};

const legacyMumbaiBuilderContactCityQuery = () => ({
  $or: [
    {
      city: {
        $in: legacyMumbaiBuilderContactCities.map((value) => new RegExp(`^${escapeRegex(value)}$`, 'i'))
      }
    },
    {
      city: new RegExp(`^${escapeRegex('Hyderabad')}$`, 'i'),
      sourceNote: /Mumbai builder contact list/i
    },
    {
      city: new RegExp(`^${escapeRegex('Hyderabad')}$`, 'i'),
      companyName: /\bMumbai\b/i
    },
    {
      sourceNote: /T-RERA\s*\/\s*CREDAI official public registry/i
    }
  ]
});

const normalizeMumbaiBuilderContactCities = () =>
  BuilderContact.updateMany(legacyMumbaiBuilderContactCityQuery(), { $set: { city: 'Mumbai' } });

const normalizeMumbaiBuilderContactSourceNotes = () =>
  BuilderContact.updateMany(
    { city: new RegExp(`^${escapeRegex('Mumbai')}$`, 'i'), sourceNote: /T-RERA\s*\/\s*CREDAI official public registry/i },
    { $set: { sourceNote: 'User-provided Mumbai builder contact list' } }
  );

const getBuilderContactCityQuery = (city = 'all') => {
  const cityValue = String(city || 'all').trim();
  if (!cityValue || cityValue === 'all') return {};

  const aliases = builderContactCityAliases[cityValue.toLowerCase()] || [cityValue];
  return {
    city: {
      $in: aliases.map((value) => new RegExp(`^${escapeRegex(value)}$`, 'i'))
    }
  };
};

const findUserByPhone = (value) => {
  const phone = normalizePhone(value);
  if (!/^\d{10}$/.test(phone)) return null;

  const candidates = Array.from(new Set([
    String(value || '').trim(),
    phone,
    `91${phone}`,
    `+91${phone}`
  ].filter(Boolean)));

  return User.findOne({
    $or: [
      { phone: { $in: candidates } },
      { phone: { $regex: `${escapeRegex(phone)}$` } }
    ]
  });
};

router.get('/users/lookup/:phone', isAdmin, async (req, res) => {
  try {
    const phone = normalizePhone(req.params.phone);
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
    }

    const user = await findUserByPhone(req.params.phone).select(
      'phone firstName lastName email accountType isVerified builderVerificationStatus builderSubscriptionPlan builderSubscriptionExpiresAt'
    );

    if (!user) {
      return res.json({ exists: false });
    }

    const canAssignProperty = ['owner', 'mediator', 'builder'].includes(user.accountType);
    res.json({
      exists: true,
      canAssignProperty,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        accountType: user.accountType,
        isVerified: user.isVerified,
        builderVerificationStatus: user.builderVerificationStatus,
        builderSubscriptionPlan: user.builderSubscriptionPlan,
        builderSubscriptionExpiresAt: user.builderSubscriptionExpiresAt
      }
    });
  } catch (error) {
    console.error('Error looking up user by phone:', error);
    res.status(500).json({ error: 'Failed to check user registration' });
  }
});

router.patch('/builders/:id/verify', isAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid builder verification status' });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, accountType: 'builder' },
      {
        builderVerificationStatus: status,
        builderRejectionReason: status === 'rejected' ? (reason || 'Builder verification could not be completed.') : ''
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'Builder not found' });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error updating builder:', error);
    res.status(500).json({ error: 'Failed to update builder verification' });
  }
});

router.delete('/builders/:id', isAdmin, async (req, res) => {
  try {
    const builder = await User.findOne({ _id: req.params.id, accountType: 'builder' });
    if (!builder) return res.status(404).json({ error: 'Builder not found' });

    const builderId = builder._id.toString();
    const interests = await Interest.find({ userId: builderId }).select('_id').lean();
    const interestIds = interests.map((interest) => interest._id);

    await Promise.all([
      Message.deleteMany({
        $or: [
          { senderId: builderId },
          { recipientId: builderId },
          { interestId: { $in: interestIds } }
        ]
      }),
      Interest.deleteMany({ userId: builderId }),
      BuilderContact.updateMany({ loginUserId: builderId }, { $set: { loginUserId: '' } }),
      User.deleteOne({ _id: builder._id })
    ]);

    res.json({ success: true, deletedBuilderId: builderId });
  } catch (error) {
    console.error('Error deleting builder:', error);
    res.status(500).json({ error: 'Failed to delete builder user' });
  }
});

router.get('/builder-contacts', isAdmin, async (req, res) => {
  try {
    const { city = 'all' } = req.query;
    await normalizeMumbaiBuilderContactCities();
    await normalizeMumbaiBuilderContactSourceNotes();
    const query = getBuilderContactCityQuery(city);
    const contacts = await BuilderContact.find(query).sort({ city: 1, companyName: 1 }).lean();
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching builder contacts:', error);
    res.status(500).json({ error: 'Failed to fetch builder contacts' });
  }
});

router.post('/builder-contacts', isAdmin, async (req, res) => {
  try {
    const {
      city,
      companyName,
      contactPersonName = '',
      mobile = '',
      email = '',
      website = '',
      logoDataUrl = '',
      logoFileName = '',
      sourceNote = 'Official or consented business contact',
      isGenuineContact = true,
      dailyDigestEnabled = false
    } = req.body;

    if (!city?.trim() || !companyName?.trim()) {
      return res.status(400).json({ error: 'City and company name are required' });
    }

    const normalizedMobile = normalizePhone(mobile);
    const contact = await BuilderContact.findOneAndUpdate(
      {
        city: city.trim(),
        companyName: companyName.trim()
      },
      {
        city: city.trim(),
        companyName: companyName.trim(),
        contactPersonName: contactPersonName.trim(),
        mobile: normalizedMobile || String(mobile || '').trim(),
        email: String(email || '').trim(),
        website: String(website || '').trim(),
        logoDataUrl: String(logoDataUrl || '').trim(),
        logoFileName: String(logoFileName || '').trim(),
        sourceNote: String(sourceNote || '').trim() || 'Official or consented business contact',
        isGenuineContact: Boolean(isGenuineContact),
        dailyDigestEnabled: Boolean(dailyDigestEnabled)
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, contact });
  } catch (error) {
    console.error('Error saving builder contact:', error);
    res.status(500).json({ error: 'Failed to save builder contact' });
  }
});

router.post('/builder-contacts/import', isAdmin, async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    const sourceNote = String(req.body?.sourceNote || 'Official public registry import').trim();
    const defaultCity = String(req.body?.defaultCity || '').trim();

    if (!rows.length) {
      return res.status(400).json({ error: 'No builder contacts found to import' });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (const row of rows.slice(0, 1000)) {
      const compactRow = compactImportRow(row);
      const explicitCity = getImportValue(row, [
        'city',
        'capitalCity',
        'capital city',
        'metroCity',
        'metro city'
      ]);
      const locationCity = getImportValue(row, [
        'district',
        'projectDistrict',
        'project district',
        'promoterDistrict',
        'promoter district',
        'officeDistrict',
        'office district'
      ]);
      const city = String(explicitCity || defaultCity || locationCity || 'Hyderabad').trim();
      const companyName = String(getImportValue(row, [
        'companyName',
        'company name',
        'promoterName',
        'promoter name',
        'name of promoter',
        'name of the promoter',
        'builderName',
        'builder name',
        'builder',
        'developer',
        'developerName',
        'developer name',
        'builderCompany',
        'builder company',
        'company',
        'firm',
        'firmName',
        'firm name',
        'projectName',
        'project name',
        'organizationName',
        'organization name',
        'applicantName',
        'applicant name',
        'name'
      ]) || getImportValueByPattern(row, [/builder/, /developer/, /company/, /firm/, /promoter/, /organization/, /organisation/, /project/], [/mobile/, /phone/, /email/, /mail/, /contactperson/])).trim();

      if (!city || !companyName) {
        results.skipped += 1;
        continue;
      }

      try {
        const mobile = getImportValue(row, [
          'mobile',
          'mobileNo',
          'mobile no',
          'mobileNumber',
          'mobile number',
          'phone',
          'phoneNumber',
          'phone number',
          'contact',
          'contactNo',
          'contact no',
          'contactNumber',
          'contact number',
          'contact mobile',
          'contactMobile',
          'contact phone',
          'contactPhone',
          'whatsapp',
          'whatsApp',
          'whatsappNumber',
          'whatsapp number',
          'mobile1',
          'mobile 1',
          'mobile2',
          'mobile 2',
          'phone1',
          'phone 1',
          'telephone',
          'telephoneNo',
          'telephone no',
          'tel',
          'cell',
          'promoterMobile',
          'promoter mobile',
          'authorizedSignatoryMobile',
          'authorized signatory mobile',
          'authorisedSignatoryMobile',
          'authorised signatory mobile'
        ]) || getImportValueByPattern(row, [/mobile/, /phone/, /contactno/, /contactnumber/, /whatsapp/, /telephone/, /^tel$/, /cell/], [/email/, /mail/, /rera/, /registration/]);
        const email = getImportValue(row, [
          'email',
          'emailId',
          'email id',
          'e-mail',
          'mail',
          'mailId',
          'mail id',
          'emailAddress',
          'email address',
          'contactEmail',
          'contact email',
          'officialMail',
          'official mail',
          'promoterEmail',
          'promoter email',
          'officialEmail',
          'official email'
        ]) || getImportValueByPattern(row, [/email/, /mail/], [/mobile/, /phone/, /contactno/]);
        const website = getImportValue(row, [
          'website',
          'webSite',
          'web site',
          'url',
          'webUrl',
          'web url',
          'site',
          'link',
          'websiteUrl',
          'website url',
          'promoterWebsite',
          'promoter website'
        ]) || getImportValueByPattern(row, [/website/, /web/, /url/, /site/, /link/], [/email/, /mail/]);
        const contactPersonName = getImportValue(row, [
          'contactPersonName',
          'contact person name',
          'contactPerson',
          'contact person',
          'personName',
          'person name',
          'authorizedSignatory',
          'authorized signatory',
          'authorisedSignatory',
          'authorised signatory',
          'director',
          'directorName',
          'director name',
          'owner',
          'ownerName',
          'owner name',
          'representative',
          'representativeName',
          'representative name',
          'manager',
          'managerName',
          'manager name',
          'salesPerson',
          'sales person',
          'salesPersonName',
          'sales person name',
          'promoterContactPerson',
          'promoter contact person'
        ]) || getImportValueByPattern(row, [/contactperson/, /personname/, /authori[sz]edsignatory/, /director/, /owner/, /representative/, /manager/, /sales/], [/mobile/, /phone/, /email/, /mail/]);
        const registrationNumber = getImportValue(row, [
          'registrationNumber',
          'registration number',
          'registrationNo',
          'registration no',
          'reraNumber',
          'rera number',
          'reraRegistrationNo',
          'rera registration no',
          'promoterRegistrationNumber',
          'promoter registration number'
        ]) || getImportValueByPattern(row, [/registration/, /rera/], [/mobile/, /phone/, /email/, /mail/]);
        const rowSourceNote = [
          sourceNote && sourceNote !== defaultCity ? sourceNote : `User-provided ${defaultCity || city} builder contact list`,
          registrationNumber ? `Registration: ${registrationNumber}` : ''
        ].filter(Boolean).join(' | ');
        const normalizedMobile = normalizePhone(mobile) || String(mobile || '').trim();
        const update = {
          city,
          companyName,
          sourceNote: rowSourceNote,
          isGenuineContact: true,
          dailyDigestEnabled: false
        };

        if (contactPersonName) update.contactPersonName = String(contactPersonName).trim();
        if (normalizedMobile) update.mobile = normalizedMobile;
        if (email) update.email = String(email).trim();
        if (website) update.website = String(website).trim();

        await BuilderContact.findOneAndUpdate(
          { city, companyName },
          { $set: update, $setOnInsert: compactRow },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        results.imported += 1;
      } catch (error) {
        results.skipped += 1;
        if (results.errors.length < 10) {
          results.errors.push(`${companyName}: ${error.message}`);
        }
      }
    }

    res.json({ success: true, ...results });
  } catch (error) {
    console.error('Error importing builder contacts:', error);
    res.status(500).json({ error: 'Failed to import builder contacts' });
  }
});

router.post('/builder-contacts/seed-hyderabad', isAdmin, async (_req, res) => {
  try {
    const results = {
      imported: 0,
      skipped: 0,
      totalSeedContacts: hyderabadBuilderContacts.length
    };

    for (const contact of hyderabadBuilderContacts) {
      try {
        await BuilderContact.findOneAndUpdate(
          { city: contact.city, companyName: contact.companyName },
          contact,
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        results.imported += 1;
      } catch (error) {
        results.skipped += 1;
      }
    }

    res.json({ success: true, ...results });
  } catch (error) {
    console.error('Error seeding Hyderabad builder contacts:', error);
    res.status(500).json({ error: 'Failed to load Hyderabad builder contacts' });
  }
});

router.post('/builder-contacts/seed-mumbai', isAdmin, async (_req, res) => {
  try {
    const results = {
      imported: 0,
      skipped: 0,
      totalSeedContacts: mumbaiBuilderContacts.length
    };

    const migration = await normalizeMumbaiBuilderContactCities();
    await normalizeMumbaiBuilderContactSourceNotes();
    results.migratedToMumbai = migration.modifiedCount ?? migration.nModified ?? 0;

    for (const contact of mumbaiBuilderContacts) {
      try {
        await BuilderContact.findOneAndUpdate(
          { city: contact.city, companyName: contact.companyName },
          contact,
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        results.imported += 1;
      } catch (error) {
        results.skipped += 1;
      }
    }

    res.json({ success: true, ...results });
  } catch (error) {
    console.error('Error seeding Mumbai builder contacts:', error);
    res.status(500).json({ error: 'Failed to load Mumbai builder contacts' });
  }
});

router.patch('/builder-contacts/daily-digest', isAdmin, async (req, res) => {
  try {
    const { city = 'all', enabled = false } = req.body || {};
    const query = getBuilderContactCityQuery(city);

    const result = await BuilderContact.updateMany(query, {
      $set: { dailyDigestEnabled: Boolean(enabled) }
    });
    const contacts = await BuilderContact.find(query).sort({ city: 1, companyName: 1 }).lean();

    res.json({
      message: `Daily digest ${enabled ? 'enabled' : 'disabled'} for builder contacts`,
      matchedCount: result.matchedCount ?? result.n ?? 0,
      modifiedCount: result.modifiedCount ?? result.nModified ?? 0,
      contacts
    });
  } catch (error) {
    console.error('Update builder contact daily digest error:', error);
    res.status(500).json({ error: 'Unable to update builder contact daily digest access' });
  }
});

router.delete('/builder-contacts', isAdmin, async (req, res) => {
  try {
    const { city = 'all' } = req.body || {};
    const query = getBuilderContactCityQuery(city);
    const result = await BuilderContact.deleteMany(query);

    res.json({
      success: true,
      deletedCount: result.deletedCount ?? 0
    });
  } catch (error) {
    console.error('Delete builder contacts error:', error);
    res.status(500).json({ error: 'Unable to delete builder contacts' });
  }
});

router.patch('/builder-contacts/:id', isAdmin, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.mobile !== undefined) updates.mobile = normalizePhone(updates.mobile) || String(updates.mobile || '').trim();
    ['city', 'companyName', 'contactPersonName', 'email', 'website', 'sourceNote', 'logoDataUrl', 'logoFileName'].forEach((key) => {
      if (updates[key] !== undefined) updates[key] = String(updates[key] || '').trim();
    });
    ['isGenuineContact', 'dailyDigestEnabled'].forEach((key) => {
      if (updates[key] !== undefined) updates[key] = Boolean(updates[key]);
    });

    const contact = await BuilderContact.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!contact) return res.status(404).json({ error: 'Builder contact not found' });
    res.json({ success: true, contact });
  } catch (error) {
    console.error('Error updating builder contact:', error);
    res.status(500).json({ error: 'Failed to update builder contact' });
  }
});

router.post('/builder-contacts/:id/create-login', isAdmin, async (req, res) => {
  try {
    const contact = await BuilderContact.findById(req.params.id);
    if (!contact) return res.status(404).json({ error: 'Builder contact not found' });

    const phone = normalizePhone(contact.mobile);
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'A valid 10-digit mobile number is required to create builder login' });
    }

    const nameParts = String(contact.contactPersonName || contact.companyName || 'Builder').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Builder';
    const lastName = nameParts.slice(1).join(' ');

    let user = await findUserByPhone(phone);
    if (user && user.accountType !== 'builder') {
      return res.status(400).json({ error: 'This mobile number already belongs to a non-builder account' });
    }

    if (!user) {
      user = new User({
        phone,
        firstName,
        lastName,
        email: contact.email || undefined,
        accountType: 'builder',
        isVerified: true,
        builderVerificationStatus: 'pending',
        builderCompanyName: contact.companyName,
        builderSubscriptionPlan: 'none'
      });
    } else {
      user.firstName = user.firstName || firstName;
      user.lastName = user.lastName || lastName;
      user.email = user.email || contact.email || null;
      user.builderCompanyName = user.builderCompanyName || contact.companyName;
      user.builderVerificationStatus = user.builderVerificationStatus || 'pending';
      user.isVerified = true;
    }

    await user.save();
    contact.loginUserId = String(user._id);
    contact.loginCreatedAt = contact.loginCreatedAt || new Date();
    await contact.save();

    res.json({ success: true, contact, user });
  } catch (error) {
    console.error('Error creating builder login:', error);
    res.status(500).json({ error: 'Failed to create builder login' });
  }
});

router.patch('/users/:id/reset-membership', isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        builderSubscriptionPlan: 'none',
        builderSubscriptionExpiresAt: null,
        freeContactCredits: 2,
        contactUnlocksUsed: 0
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error resetting membership:', error);
    res.status(500).json({ error: 'Failed to reset membership access' });
  }
});

router.delete('/users/:id/membership', isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        builderSubscriptionPlan: 'none',
        builderSubscriptionExpiresAt: null,
        freeContactCredits: 2,
        contactUnlocksUsed: 0
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    await MembershipPayment.deleteMany({ user: user._id });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Error deleting membership:', error);
    res.status(500).json({ error: 'Failed to delete membership' });
  }
});

router.patch('/users/:id/extend-membership', isAdmin, async (req, res) => {
  try {
    const { plan } = req.body;
    const months = membershipMonths[plan];
    if (!months) return res.status(400).json({ error: 'Invalid membership plan' });

    const existingUser = await User.findById(req.params.id);
    if (!existingUser) return res.status(404).json({ error: 'User not found' });

    const startDate = existingUser.builderSubscriptionExpiresAt && new Date(existingUser.builderSubscriptionExpiresAt) > new Date()
      ? new Date(existingUser.builderSubscriptionExpiresAt)
      : new Date();
    const expiresAt = new Date(startDate);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    existingUser.builderSubscriptionPlan = plan;
    existingUser.builderSubscriptionExpiresAt = expiresAt;
    existingUser.freeContactCredits = existingUser.freeContactCredits ?? 2;
    existingUser.contactUnlocksUsed = existingUser.contactUnlocksUsed ?? 0;
    await existingUser.save();

    res.json({ success: true, user: existingUser });
  } catch (error) {
    console.error('Error extending membership:', error);
    res.status(500).json({ error: 'Failed to extend membership access' });
  }
});

router.get('/inquiries', isAdmin, async (req, res) => {
  try {
    const inquiries = await ContactInquiry.find().sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

router.patch('/inquiries/:id', isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['new', 'in_review', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid inquiry status' });
    }
    const inquiry = await ContactInquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    res.json({ success: true, inquiry });
  } catch (error) {
    console.error('Error updating inquiry:', error);
    res.status(500).json({ error: 'Failed to update inquiry' });
  }
});

router.get('/testimonials', isAdmin, async (_req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 }).lean();
    res.json(testimonials);
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

router.patch('/testimonials/:id', isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'hidden'].includes(status)) {
      return res.status(400).json({ error: 'Invalid testimonial status' });
    }
    const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!testimonial) return res.status(404).json({ error: 'Testimonial not found' });
    res.json({ success: true, testimonial });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    res.status(500).json({ error: 'Failed to update testimonial' });
  }
});

router.get('/whatsapp-intakes', isAdmin, async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    const propertyQuery = {
      source: { $in: ['whatsapp_webhook', 'whatsapp_manual'] },
      status: 'pending'
    };
    if (['morning', 'evening'].includes(period)) propertyQuery.intakePeriod = period;

    const [intakes, pendingProperties, morningPending, eveningPending] = await Promise.all([
      WhatsAppIntake.find().sort({ createdAt: -1 }).limit(100),
      Property.find(propertyQuery).sort({ createdAt: -1 }).limit(100),
      Property.countDocuments({ source: { $in: ['whatsapp_webhook', 'whatsapp_manual'] }, status: 'pending', intakePeriod: 'morning' }),
      Property.countDocuments({ source: { $in: ['whatsapp_webhook', 'whatsapp_manual'] }, status: 'pending', intakePeriod: 'evening' })
    ]);

    res.json({
      intakes,
      pendingProperties,
      counts: {
        morningPending,
        eveningPending,
        totalPending: morningPending + eveningPending
      }
    });
  } catch (error) {
    console.error('Error fetching WhatsApp intakes:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp property intake' });
  }
});

router.post('/whatsapp-intakes/manual', isAdmin, async (req, res) => {
  try {
    const { summary, ownerPhone, ownerName } = req.body;
    if (!summary || !String(summary).trim()) {
      return res.status(400).json({ error: 'Property summary is required' });
    }

    const result = await createPendingPropertyFromIntake({
      summary: String(summary).trim(),
      ownerPhone,
      ownerName,
      source: 'whatsapp_manual'
    });

    res.status(201).json({ success: true, intake: result.intake, property: result.property });
  } catch (error) {
    console.error('Error creating manual WhatsApp intake:', error);
    res.status(500).json({ error: error.message || 'Failed to create WhatsApp property intake' });
  }
});

// GET property stats for admin dashboard
router.get('/stats', isAdmin, async (req, res) => {
  try {
    const total = await Property.countDocuments();
    const pending = await Property.countDocuments({ status: 'pending' });
    const approved = await Property.countDocuments({ status: 'approved' });
    const rejected = await Property.countDocuments({ status: 'rejected' });
    const buildersPending = await User.countDocuments({ accountType: 'builder', builderVerificationStatus: 'pending' });
    const inquiriesNew = await ContactInquiry.countDocuments({ status: 'new' });

    res.json({
      total,
      pending,
      approved,
      rejected,
      buildersPending,
      inquiriesNew
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/builder-digest/config', isAdmin, async (_req, res) => {
  const missingConfig = getMissingWhatsAppConfig();
  res.json({
    configured: missingConfig.length === 0,
    missingConfig
  });
});

router.post('/builder-digest/send-now', isAdmin, async (req, res) => {
  try {
    const result = await sendTodayBuilderDigest({
      city: req.body?.city || 'Hyderabad',
      period: req.body?.period || 'manual',
      fallbackToRecent: req.body?.fallbackToRecent !== false
    });
    res.json(result);
  } catch (error) {
    if (error.missingConfig) {
      return res.status(400).json({
        error: 'WhatsApp digest environment values are not configured',
        missingConfig: error.missingConfig
      });
    }

    res.status(500).json({
      error: error.message || "Unable to send today's digest",
      hint: error.hint || '',
      whatsappError: error.whatsappError || null
    });
  }
});

module.exports = router;
