const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const axios = require('axios');
const Property = require('../models/Property');
const User = require('../models/User');
const Interest = require('../models/Interest');
const Message = require('../models/Message');
const ContactInquiry = require('../models/ContactInquiry');

const router = express.Router();
const ADMIN_PHONES = (process.env.ADMIN_PHONES || '9014011885,7416995503')
  .split(',')
  .map((phone) => phone.trim())
  .filter(Boolean);

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'ashokreddy@inventorheads.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const isAdminEmailMatch = (user) =>
  ADMIN_EMAILS.includes(String(user?.email || '').toLowerCase());

const isAdminUser = (user) =>
  Boolean(user && (user.accountType === 'admin' || ADMIN_PHONES.includes(user.phone) || isAdminEmailMatch(user)));

const normalizePhone = (value = '') =>
  String(value || '').replace(/\D/g, '').slice(-10);

const formatNumericArea = (value) => {
  if (!Number.isFinite(value)) return '';
  return Number(value.toFixed(2)).toString();
};

const normalizeAreaForStorage = (totalArea, areaUnit) => {
  const unit = String(areaUnit || 'Sq Yards').trim();
  const numericArea = Number(String(totalArea || '').replace(/,/g, ''));

  if (/^(sq\.?\s*ft|sq\s*feet|square\s*feet|square\s*ft)$/i.test(unit) && Number.isFinite(numericArea)) {
    return {
      totalArea: formatNumericArea(numericArea / 9),
      areaUnit: 'Sq Yards'
    };
  }

  return {
    totalArea,
    areaUnit: unit || 'Sq Yards'
  };
};

const parseCoordinatesFromMapText = (value = '') => {
  const decodedValue = (() => {
    try {
      return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
    } catch {
      return String(value || '').replace(/\+/g, ' ');
    }
  })();

  const patterns = [
    /(?:q=|ll=|center=|@)\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
    /!3d\s*(-?\d+(?:\.\d+)?)\s*!4d\s*(-?\d+(?:\.\d+)?)/i,
    /\b(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\b/
  ];

  for (const pattern of patterns) {
    const match = decodedValue.match(pattern);
    if (!match) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  return null;
};

const isAllowedGoogleMapHost = (hostname = '') =>
  /(^|\.)maps\.app\.goo\.gl$/i.test(hostname) ||
  /(^|\.)goo\.gl$/i.test(hostname) ||
  /(^|\.)google\.com$/i.test(hostname) ||
  /(^|\.)google\.[a-z.]+$/i.test(hostname) ||
  /(^|\.)maps\.google\.[a-z.]+$/i.test(hostname);

const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

const resolveListingOwnerForAdminUpload = async (req, adminUser) => {
  const isAdminAssistedUpload = req.body.adminAssistedUpload === 'true';
  if (!isAdminAssistedUpload) {
    return { listingOwner: adminUser, createdAssistedUser: false };
  }

  if (!isAdminUser(adminUser)) {
    const err = new Error('Only admins can upload a property on behalf of an owner or mediator');
    err.statusCode = 403;
    throw err;
  }

  const assistedPhone = normalizePhone(req.body.assistedOwnerPhone);
  const assistedAccountType = String(req.body.assistedOwnerAccountType || 'owner').trim().toLowerCase();
  const assistedFirstName = String(req.body.assistedOwnerFirstName || '').trim();
  const assistedLastName = String(req.body.assistedOwnerLastName || '').trim();
  const assistedEmail = String(req.body.assistedOwnerEmail || '').trim();

  if (!/^\d{10}$/.test(assistedPhone)) {
    const err = new Error('Owner or mediator phone number must be 10 digits');
    err.statusCode = 400;
    throw err;
  }

  if (!['owner', 'mediator'].includes(assistedAccountType)) {
    const err = new Error('Admin-assisted upload can only be assigned to an owner or mediator');
    err.statusCode = 400;
    throw err;
  }

  let listingOwner = await findUserByPhone(req.body.assistedOwnerPhone || assistedPhone);
  if (listingOwner) {
    if (!['owner', 'mediator'].includes(listingOwner.accountType)) {
      const err = new Error('This phone number belongs to a builder or admin account');
      err.statusCode = 400;
      throw err;
    }

    if (assistedFirstName) listingOwner.firstName = assistedFirstName;
    if (assistedLastName) listingOwner.lastName = assistedLastName;
    if (assistedEmail) listingOwner.email = assistedEmail;
    listingOwner.accountType = assistedAccountType;
    listingOwner.isVerified = true;
    await listingOwner.save();

    return { listingOwner, createdAssistedUser: false };
  }

  const fallbackFirstName = assistedAccountType === 'mediator' ? 'Mediator' : 'Owner';
  const fallbackLastName = assistedPhone.slice(-4);

  listingOwner = await User.create({
    phone: assistedPhone,
    firstName: assistedFirstName || fallbackFirstName,
    lastName: assistedLastName || fallbackLastName,
    email: assistedEmail || undefined,
    accountType: assistedAccountType,
    builderVerificationStatus: 'not_required',
    isVerified: true
  });

  return { listingOwner, createdAssistedUser: true };
};

const hasActiveMarketplaceSubscription = (user) =>
  user.builderSubscriptionPlan !== 'none' &&
  user.builderSubscriptionExpiresAt &&
  new Date(user.builderSubscriptionExpiresAt) > new Date();

const hasActiveBuilderSubscription = hasActiveMarketplaceSubscription;

const isOwnerOrAdmin = (user, property) =>
  Boolean(user && (
    user.phone === property.phone ||
    user._id?.toString() === String(property.userId || '') ||
    user.accountType === 'admin' ||
    ADMIN_PHONES.includes(user.phone) ||
    isAdminEmailMatch(user)
  ));

const unlockBuilderContact = async (user, interest) => {
  if (interest.contactUnlocked) {
    return { unlocked: true, via: interest.unlockedVia };
  }

  if (hasActiveBuilderSubscription(user)) {
    interest.contactUnlocked = true;
    interest.unlockedVia = 'subscription';
    await interest.save();
    return { unlocked: true, via: 'subscription' };
  }

  if ((user.contactUnlocksUsed || 0) < (user.freeContactCredits || 2)) {
    user.contactUnlocksUsed = (user.contactUnlocksUsed || 0) + 1;
    interest.contactUnlocked = true;
    interest.unlockedVia = 'free_credit';
    await Promise.all([user.save(), interest.save()]);
    return { unlocked: true, via: 'free_credit' };
  }

  return { unlocked: false, paymentRequired: true };
};

const stripOwnerContact = (property) => {
  const safe = typeof property.toObject === 'function' ? property.toObject() : { ...property };
  delete safe.contactPhone;
  delete safe.contactEmail;
  delete safe.phone;
  return safe;
};

const canSeePropertyOwnerContact = async (user, property) => {
  if (!user) return false;
  if (isOwnerOrAdmin(user, property)) return true;

  if (['owner', 'mediator'].includes(user.accountType)) {
    return hasActiveMarketplaceSubscription(user);
  }

  if (user.accountType !== 'builder') return false;
  if (user.builderVerificationStatus !== 'approved') return false;
  if (hasActiveMarketplaceSubscription(user)) return true;

  const interest = await Interest.findOne({
    userId: user._id.toString(),
    propertyId: property._id,
    status: 'accepted',
    contactUnlocked: true
  });
  return Boolean(interest);
};

const serializeInterestForUser = (interest, user) => {
  const record = typeof interest.toObject === 'function' ? interest.toObject() : { ...interest };
  const property = record.propertyId;

  if (property && user.accountType === 'builder' && !record.contactUnlocked) {
    record.propertyId = stripOwnerContact(property);
  }

  if (property && user.accountType === 'builder' && record.contactUnlocked) {
    record.contact = {
      phone: property.contactPhone || property.phone,
      email: property.contactEmail
    };
  }

  return record;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});
const propertyUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 10 },
  { name: 'plotDiagram', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'floorPlan', maxCount: 1 },
  { name: 'propertyForm', maxCount: 1 }
]);
const handlePropertyUpload = (req, res, next) => {
  propertyUpload(req, res, (err) => {
    if (!err) return next();

    console.error('Upload error:', err);
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Upload failed. Each file must be 50MB or smaller.'
      : err.code === 'LIMIT_UNEXPECTED_FILE'
        ? `Upload failed. Unsupported file field: ${err.field}`
        : 'Upload failed. Please try a smaller file or remove the video and submit again.';

    return res.status(400).json({ error: message, details: err.message });
  });
};

const getUploadBucket = () => {
  if (!mongoose.connection.db) {
    throw new Error('MongoDB connection is not ready for file upload');
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'propertyUploads'
  });
};

const abbreviateFilenamePart = (value, fallback, maxWords = 1) => {
  const words = String(value || '')
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .map((word) => word.slice(0, 3));
  return words.length ? words.join('_') : fallback;
};

const getFileExtension = (file) => {
  const originalExtension = String(file.originalname || '').match(/\.[a-zA-Z0-9]+$/)?.[0];
  if (originalExtension) return originalExtension.toLowerCase();

  const mimeExtensions = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/pdf': '.pdf',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/webm': '.webm'
  };
  return mimeExtensions[file.mimetype] || '';
};

const isDisplayableImageUpload = (file) => Boolean(file?.mimetype && /^image\//i.test(file.mimetype));

const buildUploadFilenameBase = (propertyData = {}) => {
  const postPropertyType = propertyData.developmentType || propertyData.listingIntent || 'Property';
  const location = propertyData.locality || propertyData.societyName || propertyData.landmark || 'Location';
  return [
    abbreviateFilenamePart(postPropertyType, 'Pro'),
    abbreviateFilenamePart(propertyData.state, 'Sta'),
    abbreviateFilenamePart(propertyData.city, 'Cit'),
    abbreviateFilenamePart(location, 'Loc', 4)
  ].join('_');
};

const getNextUploadSequence = async (bucket, base) => {
  const escapedBase = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const files = await bucket.find({ filename: { $regex: `^${escapedBase}_\\d{6}\\.` } }).toArray();
  const maxSequence = files.reduce((max, file) => {
    const match = String(file.filename || '').match(/_(\d{6})\.[^.]+$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return maxSequence + 1;
};

const saveFileToGridFS = async (file, propertyData = {}) => {
  if (!file) return '';

  const bucket = getUploadBucket();
  const base = buildUploadFilenameBase(propertyData);
  const sequence = await getNextUploadSequence(bucket, base);
  const generatedName = `${base}_${String(sequence).padStart(6, '0')}${getFileExtension(file)}`;

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(generatedName, {
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
        generatedName,
        fieldName: file.fieldname,
        namingConvention: 'Pro_Sta_Cit_Loc_000001'
      }
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve(`/api/files/${uploadStream.id.toString()}`));
    uploadStream.end(file.buffer);
  });
};

router.get('/files/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid file id' });
    }

    const bucket = getUploadBucket();
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files.length) return res.status(404).json({ error: 'File not found' });

    res.set('Content-Type', files[0].contentType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${String(files[0].filename || 'property-file').replace(/"/g, '')}"`);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    bucket.openDownloadStream(fileId).pipe(res);
  } catch (err) {
    console.error('File fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

router.get('/resolve-map-link', async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '').trim();
    if (!rawUrl) return res.status(400).json({ error: 'Map link is required' });

    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return res.status(400).json({ error: 'Enter a valid map link' });
    }

    if (!/^https?:$/i.test(parsedUrl.protocol) || !isAllowedGoogleMapHost(parsedUrl.hostname)) {
      return res.status(400).json({ error: 'Only Google Maps links can be resolved' });
    }

    const directCoords = parseCoordinatesFromMapText(rawUrl);
    if (directCoords) return res.json({ success: true, coordinates: directCoords, resolvedUrl: rawUrl });

    const response = await axios.get(rawUrl, {
      maxRedirects: 8,
      timeout: 8000,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        'User-Agent': 'Mozilla/5.0 HomeFeet map resolver'
      }
    });
    const resolvedUrl = response.request?.res?.responseUrl || rawUrl;
    const coords = parseCoordinatesFromMapText(resolvedUrl) || parseCoordinatesFromMapText(response.data);

    if (!coords) {
      return res.status(404).json({ error: 'Coordinates were not found in this map link', resolvedUrl });
    }

    res.json({ success: true, coordinates: coords, resolvedUrl });
  } catch (err) {
    console.error('Map link resolve error:', err.message || err);
    res.status(500).json({ error: 'Failed to resolve map link' });
  }
});

// POST /api/add - Add new property (pending approval)
router.post('/add', handlePropertyUpload, async (req, res) => {
  try {
    const {
      listingIntent = 'development',
      projectName, companyName,
      developmentType, totalArea, areaUnit, flatSize, flatFacing,
      northSideLength, southSideLength, eastSideLength, westSideLength,
      facing, roadFacingDirection, roadSize, frontageWidth, pincode, zoningClassification,
      developerRatio, partlySale, partlySaleUnit, partlySaleValue, partlySalePrice,
      state, city, locality, societyName, landmark, map, goodwill, advance,
      squareYardPrice, squareFeetPrice, totalBudget, purchaseTimeline, description, address, selectedAmenities, coordinates,
      bedrooms, bathrooms, floorNumber, totalFloors, furnishingStatus, possessionStatus
    } = req.body;

    // Get user details from token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.phone && !user.email) {
      return res.status(400).json({ error: 'User contact information not found. Please log in again.' });
    }

    const { listingOwner, createdAssistedUser } = await resolveListingOwnerForAdminUpload(req, user);
    const isAdminAssistedUpload = req.body.adminAssistedUpload === 'true';

    console.log(`Creating property for user: ${listingOwner.phone}${isAdminAssistedUpload ? ` assisted by admin ${user.phone}` : ''}`);

    const files = req.files || {};
    const normalizedArea = normalizeAreaForStorage(totalArea, areaUnit);
    const uploadNamingData = {
      listingIntent,
      developmentType,
      state,
      city,
      locality,
      societyName,
      landmark
    };
    const imageUrl = await saveFileToGridFS(files.image?.[0], uploadNamingData);
    const galleryImageUrls = (
      await Promise.all((files.images || []).slice(0, 10).map((file) => saveFileToGridFS(file, uploadNamingData)))
    ).filter(Boolean);
    const plotDiagramUrl = await saveFileToGridFS(files.plotDiagram?.[0], uploadNamingData);
    const listingImageUrl = galleryImageUrls[0] || imageUrl || (isDisplayableImageUpload(files.plotDiagram?.[0]) ? plotDiagramUrl : '');
    const videoUrl = await saveFileToGridFS(files.video?.[0], uploadNamingData);
    const floorPlanUrl = await saveFileToGridFS(files.floorPlan?.[0], uploadNamingData);
    const propertyFormUrl = await saveFileToGridFS(files.propertyForm?.[0], uploadNamingData);

    const newProperty = new Property({
      listingIntent,
      projectName: projectName || '',
      companyName: companyName || '',
      developmentType,
      totalArea: normalizedArea.totalArea,
      areaUnit: normalizedArea.areaUnit,
      flatSize: flatSize || '',
      flatFacing: flatFacing || '',
      northSideLength,
      southSideLength,
      eastSideLength,
      westSideLength,
      facing,
      roadFacingDirection,
      roadSize,
      frontageWidth,
      pincode,
      zoningClassification,
      bedrooms: bedrooms || '',
      bathrooms: bathrooms || '',
      floorNumber: floorNumber || '',
      totalFloors: totalFloors || '',
      furnishingStatus: furnishingStatus || '',
      possessionStatus: possessionStatus || '',
      developerRatio: listingIntent === 'development' ? developerRatio : '',
      partlySale: listingIntent === 'development' ? (partlySale || '') : '',
      partlySaleUnit: listingIntent === 'development' ? (partlySaleUnit || 'Square Yard') : '',
      partlySaleValue: listingIntent === 'development' ? (partlySaleValue || '0') : '0',
      partlySalePrice: listingIntent === 'development' ? (partlySalePrice || '') : '',
      state: state || '',
      city,
      locality,
      societyName: societyName || '',
      landmark,
      map,
      coordinates,
      goodwill: listingIntent === 'development' ? (goodwill || '') : '',
      advance: listingIntent === 'development' ? (advance || '') : '',
      squareYardPrice: listingIntent === 'development' ? '' : (squareYardPrice || ''),
      squareFeetPrice: squareFeetPrice || '',
      totalBudget: totalBudget || '',
      purchaseTimeline: listingIntent === 'buy' ? (purchaseTimeline || '') : '',
      description: description || '',
      address,
      selectedAmenities: selectedAmenities ? JSON.parse(selectedAmenities) : [],
      imageUrl: listingImageUrl,
      images: galleryImageUrls,
      plotDiagramUrl,
      floorPlanUrl,
      propertyFormUrl,
      videoUrl,
      contactEmail: listingOwner.email || '',
      contactPhone: listingOwner.phone,
      phone: listingOwner.phone,
      userId: listingOwner._id.toString(),
      status: 'pending',  // Set to pending for admin approval
    });

    await newProperty.save();
    
    console.log(`Property saved successfully with phone: ${newProperty.phone}, status: pending`);
    
    res.status(200).json({ 
      message: 'Property submitted successfully! It will be visible after admin approval.',
      property: newProperty,
      assistedOwner: isAdminAssistedUpload ? {
        id: listingOwner._id.toString(),
        phone: listingOwner.phone,
        accountType: listingOwner.accountType,
        fullName: `${listingOwner.firstName || ''} ${listingOwner.lastName || ''}`.trim()
      } : null,
      createdAssistedUser
    });
  } catch (err) {
    console.error('Save error:', err);
    res.status(err.statusCode || 500).json({
      error: err.statusCode ? err.message : 'Failed to save property',
      details: err.message 
    });
  }
});

// GET /api/all - Get all APPROVED properties only
router.get('/all', async (req, res) => {
  try {
    const properties = await Property.find({ status: 'approved' });
    res.json(properties.map(stripOwnerContact));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// GET /api/user-properties-by-phone/:phone - Get properties by phone (all statuses for user)
router.get('/user-properties-by-phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    console.log(`Fetching properties for phone: ${phone}`);
    
    const properties = await Property.find({ phone: phone });
    
    console.log(`Found ${properties.length} properties for phone: ${phone}`);
    
    res.json(properties);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user properties' });
  }
});

router.get('/marketplace-stats', async (_req, res) => {
  try {
    const [builders, owners, mediators, approvedProperties] = await Promise.all([
      User.countDocuments({ accountType: 'builder' }),
      User.countDocuments({ accountType: 'owner' }),
      User.countDocuments({ accountType: 'mediator' }),
      Property.countDocuments({ status: 'approved' })
    ]);

    res.json({
      builders,
      owners,
      mediators,
      ownersAndMediators: owners + mediators,
      approvedProperties
    });
  } catch (err) {
    console.error('Marketplace stats error:', err);
    res.status(500).json({ error: 'Failed to fetch marketplace stats' });
  }
});

// GET /api/properties/:id - Get single property
router.get('/properties/:id', async (req, res) => {
  try {
    const project = await Property.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    // Only return if approved (unless requested by owner)
    if (project.status !== 'approved') {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
          const user = await User.findById(decoded.id);
          
          // Allow owner or admin to see pending/rejected properties
          if (isOwnerOrAdmin(user, project)) {
            return res.json({ project });
          }
        } catch (err) {
          // Token invalid, proceed with rejection
        }
      }
      return res.status(404).json({ error: 'Project not found' });
    }
    const token = req.headers.authorization?.split(' ')[1];
    let user = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        user = await User.findById(decoded.id);
      } catch (err) {
        user = null;
      }
    }

    if (!isOwnerOrAdmin(user, project)) {
      if (!user) {
        return res.status(401).json({
          error: 'Login required to view complete property details.',
          accessRequired: 'login_required'
        });
      }

      if (!hasActiveMarketplaceSubscription(user)) {
        return res.status(403).json({
          error: 'Paid membership required to view complete property details.',
          accessRequired: ['owner', 'mediator'].includes(user.accountType)
            ? `${user.accountType}_subscription`
            : 'marketplace_subscription',
          listingIntent: project.listingIntent || 'development',
          propertyType: project.developmentType || ''
        });
      }
    }

    const canSeeContact = await canSeePropertyOwnerContact(user, project);
    res.json({ project: canSeeContact ? project : stripOwnerContact(project) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching project' });
  }
});

// GET /api/user-properties - Get current user's properties
router.get('/user-properties', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const ownerMatch = [{ userId: user._id.toString() }];
    if (user.phone) ownerMatch.push({ phone: user.phone });
    const properties = await Property.find({ $or: ownerMatch });

    console.log(`Found ${properties.length} properties for user ${user.phone || user.email}`);
    
    res.json(properties);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user properties' });
  }
});

// GET /api/agents - Public directory of agents (mediator accounts). Never returns phone/email.
router.get('/agents', async (req, res) => {
  try {
    const agents = await User.find({ accountType: 'mediator' })
      .select('firstName lastName city state createdAt')
      .sort({ createdAt: -1 });

    res.json(agents.map((agent) => ({
      id: agent._id.toString(),
      firstName: agent.firstName,
      lastName: agent.lastName,
      city: agent.city || '',
      state: agent.state || ''
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// GET /api/agents/:id - Agent public profile with their approved listings.
// Phone number is only included if the requester has an active membership,
// is the agent themselves, or is an admin.
router.get('/agents/:id', async (req, res) => {
  try {
    const agent = await User.findOne({ _id: req.params.id, accountType: 'mediator' });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    let requester = null;
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        requester = await User.findById(decoded.id);
      } catch {
        requester = null;
      }
    }

    const isSelfOrAdmin = Boolean(requester) && (
      requester._id.toString() === agent._id.toString() ||
      requester.accountType === 'admin' ||
      ADMIN_PHONES.includes(requester.phone) ||
      isAdminEmailMatch(requester)
    );
    const canSeePhone = isSelfOrAdmin || (requester && hasActiveMarketplaceSubscription(requester));

    const ownerMatch = [{ userId: agent._id.toString() }];
    if (agent.phone) ownerMatch.push({ phone: agent.phone });
    const properties = await Property.find({ $or: ownerMatch, status: 'approved' }).sort({ createdAt: -1 });

    res.json({
      id: agent._id.toString(),
      firstName: agent.firstName,
      lastName: agent.lastName,
      city: agent.city || '',
      state: agent.state || '',
      phone: canSeePhone ? agent.phone : '',
      phoneLocked: !canSeePhone,
      properties: properties.map(stripOwnerContact)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch agent profile' });
  }
});

// DELETE /api/properties/:id - Delete property
router.delete('/properties/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const property = await Property.findOneAndDelete({ 
      _id: req.params.id, 
      phone: user.phone
    });
    
    if (!property) {
      return res.status(404).json({ 
        error: 'Property not found or you do not have permission to delete it' 
      });
    }
    
    console.log(`Property deleted successfully by user: ${user.phone}`);
    
    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

// PUT /api/properties/:id - Update property
router.put('/properties/:id', handlePropertyUpload, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const files = req.files || {};
    const isAdminUser = user.accountType === 'admin' || ADMIN_PHONES.includes(user.phone) || isAdminEmailMatch(user);

    const updates = {
      ...req.body
    };

    if (updates.totalArea !== undefined || updates.areaUnit !== undefined) {
      const normalizedArea = normalizeAreaForStorage(updates.totalArea, updates.areaUnit);
      updates.totalArea = normalizedArea.totalArea;
      updates.areaUnit = normalizedArea.areaUnit;
    }

    if (isAdminUser) {
      delete updates.userId;
      if (updates.contactPhone !== undefined || updates.phone !== undefined) {
        const nextPhone = normalizePhone(updates.contactPhone || updates.phone);
        if (!/^\d{10}$/.test(nextPhone)) {
          return res.status(400).json({ error: 'Owner or mediator contact phone must be 10 digits' });
        }
        updates.contactPhone = nextPhone;
        updates.phone = nextPhone;
      }
      if (updates.contactEmail !== undefined) {
        updates.contactEmail = String(updates.contactEmail || '').trim();
      }
      if (!updates.status) delete updates.status;
    } else {
      delete updates.contactEmail;
      updates.phone = user.phone;
      updates.contactPhone = user.phone;
      updates.status = 'pending';  // Reset to pending when owner edits
    }

    if (typeof updates.selectedAmenities === 'string') {
      try {
        updates.selectedAmenities = JSON.parse(updates.selectedAmenities);
      } catch {
        updates.selectedAmenities = [];
      }
    }

    const uploadNamingData = {
      listingIntent: updates.listingIntent,
      developmentType: updates.developmentType,
      state: updates.state,
      city: updates.city,
      locality: updates.locality,
      societyName: updates.societyName,
      landmark: updates.landmark
    };

    if (files.image?.[0]) {
      updates.imageUrl = await saveFileToGridFS(files.image[0], uploadNamingData);
    }
    if (files.images?.length) {
      const galleryImageUrls = (
        await Promise.all(files.images.slice(0, 10).map((file) => saveFileToGridFS(file, uploadNamingData)))
      ).filter(Boolean);
      updates.images = galleryImageUrls;
      if (galleryImageUrls[0]) {
        updates.imageUrl = galleryImageUrls[0];
      }
    }
    if (files.plotDiagram?.[0]) {
      updates.plotDiagramUrl = await saveFileToGridFS(files.plotDiagram[0], uploadNamingData);
      if (!updates.imageUrl && isDisplayableImageUpload(files.plotDiagram[0])) {
        const currentProperty = await Property.findById(req.params.id).select('imageUrl');
        if (!currentProperty?.imageUrl) {
          updates.imageUrl = updates.plotDiagramUrl;
        }
      }
    }
    if (files.video?.[0]) {
      updates.videoUrl = await saveFileToGridFS(files.video[0], uploadNamingData);
    }
    if (files.floorPlan?.[0]) {
      updates.floorPlanUrl = await saveFileToGridFS(files.floorPlan[0], uploadNamingData);
    }
    if (files.propertyForm?.[0]) {
      updates.propertyFormUrl = await saveFileToGridFS(files.propertyForm[0], uploadNamingData);
    }

    const updated = await Property.findOneAndUpdate(
      isAdminUser ? { _id: req.params.id } : { _id: req.params.id, phone: user.phone },
      updates,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ 
        error: 'Property not found or you do not have permission to update it' 
      });
    }
    
    console.log(`Property updated successfully by user: ${user.phone}`);
    
    res.json({ success: true, updated });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

// POST /api/interests - Record interest
router.post('/interests', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.accountType !== 'builder') {
      return res.status(403).json({ error: 'Only builders can request owner contact' });
    }
    if (user.builderVerificationStatus !== 'approved') {
      return res.status(403).json({ error: 'Builder verification must be approved before contacting owners' });
    }

    const { propertyId, message } = req.body;
    const property = await Property.findById(propertyId);
    if (!property || property.status !== 'approved') {
      return res.status(404).json({ error: 'Property not found' });
    }
    if (property.userId === user._id.toString()) {
      return res.status(400).json({ error: 'You cannot request contact for your own listing' });
    }

    const paidBuilder = hasActiveBuilderSubscription(user);
    let interest = await Interest.findOne({ userId: user._id.toString(), propertyId });
    if (!interest) {
      interest = await Interest.create({
        userId: user._id.toString(),
        ownerId: property.userId,
        propertyId,
        message: message || '',
        status: paidBuilder ? 'accepted' : 'requested',
        respondedAt: paidBuilder ? new Date() : null
      });
    } else if (paidBuilder && (!interest.contactUnlocked || interest.status !== 'accepted')) {
      interest.status = 'accepted';
      interest.respondedAt = interest.respondedAt || new Date();
      if (message) interest.message = message;
      await interest.save();
    }

    let unlock = { unlocked: false };
    if (interest.status === 'accepted') {
      unlock = await unlockBuilderContact(user, interest);
    }

    const freeRemaining = Math.max((user.freeContactCredits || 2) - (user.contactUnlocksUsed || 0), 0);

    res.status(200).json({
      message: interest.status === 'accepted'
        ? unlock.unlocked
          ? paidBuilder
            ? 'Paid builder membership active. Owner contact details are available without owner approval.'
            : 'Owner approved your request. Contact details are available.'
          : 'Your free owner-contact credits are used. Please choose a builder plan to unlock more contacts.'
        : 'Interest sent to owner. Contact details unlock after owner accepts.',
      interest,
      contactUnlocked: interest.status === 'accepted' && unlock.unlocked,
      paymentRequired: interest.status === 'accepted' && Boolean(unlock.paymentRequired),
      subscription: {
        plan: user.builderSubscriptionPlan,
        expiresAt: user.builderSubscriptionExpiresAt,
        freeRemaining
      },
      contact: interest.status === 'accepted' && unlock.unlocked ? {
        phone: property.contactPhone || property.phone,
        email: property.contactEmail
      } : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save interest' });
  }
});

// GET /api/interests/:userId - Get user's interests
router.get('/interests/:userId', async (req, res) => {
  try {
    const interests = await Interest.find({ userId: req.params.userId }).populate('propertyId');
    res.json(interests.map((interest) => ({
      ...interest.toObject(),
      propertyId: interest.propertyId ? stripOwnerContact(interest.propertyId) : interest.propertyId
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch interests' });
  }
});

router.get('/my-interests', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const query = ['owner', 'mediator'].includes(user.accountType)
      ? { ownerId: user._id.toString() }
      : { userId: user._id.toString() };
    const interests = await Interest.find(query)
      .populate('propertyId')
      .sort({ timestamp: -1 });
    res.json(interests.map((interest) => serializeInterestForUser(interest, user)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch interests' });
  }
});

router.patch('/interests/:id/respond', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid response status' });
    }

    const interest = await Interest.findOneAndUpdate(
      { _id: req.params.id, ownerId: user._id.toString() },
      { status, respondedAt: new Date() },
      { new: true }
    ).populate('propertyId');
    if (!interest) return res.status(404).json({ error: 'Interest not found' });

    let unlock = { unlocked: false };
    if (status === 'accepted') {
      const builder = await User.findById(interest.userId);
      if (builder) {
        unlock = await unlockBuilderContact(builder, interest);
        await interest.populate('propertyId');
      }
    }

    res.json({
      success: true,
      interest,
      contactUnlocked: Boolean(unlock.unlocked),
      paymentRequired: Boolean(unlock.paymentRequired)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update interest' });
  }
});

router.get('/chat/:interestId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);
    const interest = await Interest.findById(req.params.interestId).populate('propertyId');
    if (!user || !interest) return res.status(404).json({ error: 'Chat not found' });
    if (interest.status !== 'accepted') return res.status(403).json({ error: 'Chat unlocks after mutual interest' });
    if (![interest.userId, interest.ownerId].includes(user._id.toString())) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const messages = await Message.find({ interestId: interest._id }).sort({ createdAt: 1 });
    res.json({ interest, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

router.post('/chat/:interestId/messages', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);
    const interest = await Interest.findById(req.params.interestId);
    if (!user || !interest) return res.status(404).json({ error: 'Chat not found' });
    if (interest.status !== 'accepted') return res.status(403).json({ error: 'Chat unlocks after mutual interest' });
    const senderId = user._id.toString();
    if (![interest.userId, interest.ownerId].includes(senderId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const recipientId = senderId === interest.userId ? interest.ownerId : interest.userId;
    const message = await Message.create({
      interestId: interest._id,
      propertyId: interest.propertyId,
      senderId,
      recipientId,
      body: req.body.body
    });
    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.post('/contact-inquiries', async (req, res) => {
  try {
    const { name, email, phone, companyName, website, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Name, email, subject, and message are required' });
    }
    const inquiry = await ContactInquiry.create({ name, email, phone, companyName, website, subject, message });
    res.status(201).json({ success: true, inquiry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit inquiry' });
  }
});

// GET /api/search - Search APPROVED properties only
router.get('/search', async (req, res) => {
  try {
    const { q = '', listingIntent, developmentType, minArea, maxArea, ratio, city, pincode, zoningClassification, minFrontage, maxFrontage, maxOwnerShare, bedrooms, possessionStatus, minBudget, maxBudget } = req.query;
    const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const locationFields = ['city', 'locality', 'societyName', 'projectName', 'address', 'landmark', 'pincode'];
    const ignoredLocationWords = new Set([
      'india', 'telangana', 'andhra', 'pradesh', 'karnataka', 'tamil', 'nadu',
      'maharashtra', 'west', 'bengal', 'gujarat', 'rajasthan',
      'kerala', 'uttar', 'punjab', 'near', 'road', 'street', 'new'
    ]);
    const queryText = String(q || '').trim();
    const regex = new RegExp(escapeRegex(queryText), 'i');

    const match = { status: 'approved' };  // Only show approved properties
    if (listingIntent && listingIntent !== 'All') {
      match.listingIntent = new RegExp(`^${escapeRegex(String(listingIntent))}$`, 'i');
    }
    
    if (queryText) {
      const locationTokens = queryText
        .split(/[\s,|/-]+/)
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token.length > 1 && !ignoredLocationWords.has(token));

      if (locationTokens.length > 1) {
        match.$and = locationTokens.map((token) => ({
          $or: locationFields.map((field) => ({ [field]: new RegExp(escapeRegex(token), 'i') }))
        }));
      } else if (locationTokens.length === 1) {
        const tokenRegex = new RegExp(escapeRegex(locationTokens[0]), 'i');
        match.$or = locationFields.map((field) => ({ [field]: tokenRegex }));
      } else {
        match.$or = locationFields.map((field) => ({ [field]: regex }));
      }
    }

    if (developmentType && developmentType !== 'All') {
      const typeValue = String(developmentType).toLowerCase();
      const developmentTypeAliases = {
        plotted: ['plotted', 'plot', 'development-plot', 'open-plot'],
        'open-plot': ['open-plot', 'plot', 'development-plot', 'plotted'],
        'hmda-layout': ['hmda-layout', 'hmda'],
        'gp-layout': ['gp-layout', 'gp'],
        'dtcp-layout': ['dtcp-layout', 'dtcp'],
        'commercial-plot': ['commercial-plot', 'commercial plot', 'office-space', 'retail', 'hospitality', 'industrial']
      };
      const aliases = developmentTypeAliases[typeValue] || [String(developmentType)];
      match.developmentType = {
        $in: aliases.map((value) => new RegExp(`^${escapeRegex(String(value))}$`, 'i'))
      };
    }
    if (ratio && ratio !== 'All') {
      match.developerRatio = new RegExp(`^${ratio}$`, 'i');
    }
    if (city && city !== 'All') {
      const cityValue = String(city).toLowerCase();
      const cityAliases = {
        hyderabad: [
          'hyderabad',
          'telangana',
          'secunderabad',
          'injapur',
          'miyapur',
          'nadergul',
          'nadargul',
          'maheshwaram',
          'tukkuguda',
          'turkayamjal',
          'bongulur',
          'isnapur',
          'tatti annaram',
          'lb nagar',
          'bowrampet',
          'kandlakoya',
          'mancherial',
          'agriculture colony',
          'avn colony'
        ]
      };
      const aliases = cityAliases[cityValue] || [String(city)];
      const cityRegexes = aliases.map((value) => new RegExp(escapeRegex(String(value)), 'i'));
      match.$and = [
        ...(match.$and || []),
        {
          $or: [
            { city: { $in: cityRegexes } },
            { state: { $in: cityRegexes } },
            { locality: { $in: cityRegexes } },
            { societyName: { $in: cityRegexes } },
            { projectName: { $in: cityRegexes } },
            { address: { $in: cityRegexes } },
            { landmark: { $in: cityRegexes } },
            { pincode: { $in: cityRegexes } }
          ]
        }
      ];
    }
    if (pincode) match.pincode = new RegExp(pincode, 'i');
    if (zoningClassification && zoningClassification !== 'All') {
      match.zoningClassification = new RegExp(`^${zoningClassification}$`, 'i');
    }
    if (bedrooms && bedrooms !== 'All') {
      match.bedrooms = new RegExp(`^${escapeRegex(String(bedrooms))}$`, 'i');
    }
    if (possessionStatus && possessionStatus !== 'All') {
      match.possessionStatus = new RegExp(`^${escapeRegex(String(possessionStatus))}$`, 'i');
    }

    const pipeline = [
      { $match: match },
      {
        $addFields: {
          totalAreaNum: {
            $convert: { input: '$totalArea', to: 'double', onError: null, onNull: null }
          },
          frontageNum: { $convert: { input: '$frontageWidth', to: 'double', onError: null, onNull: null } },
          ownerShareNum: {
            $convert: {
              input: { $arrayElemAt: [{ $split: ['$developerRatio', ':'] }, 1] },
              to: 'double',
              onError: null,
              onNull: null
            }
          },
          totalBudgetNum: {
            $let: {
              vars: {
                budget: { $convert: { input: '$totalBudget', to: 'double', onError: null, onNull: null } },
                sqftPrice: { $convert: { input: '$squareFeetPrice', to: 'double', onError: null, onNull: null } },
                flatSizeNum: { $convert: { input: '$flatSize', to: 'double', onError: null, onNull: null } }
              },
              in: {
                $cond: [
                  { $ne: ['$$budget', null] },
                  '$$budget',
                  {
                    $cond: [
                      { $and: [{ $ne: ['$$sqftPrice', null] }, { $ne: ['$$flatSizeNum', null] }] },
                      { $multiply: ['$$sqftPrice', '$$flatSizeNum'] },
                      null
                    ]
                  }
                ]
              }
            }
          }
        }
      }
    ];

    const and = [];
    if (minArea) and.push({ $gte: ['$totalAreaNum', Number(minArea)] });
    if (maxArea) and.push({ $lte: ['$totalAreaNum', Number(maxArea)] });
    if (minFrontage) and.push({ $gte: ['$frontageNum', Number(minFrontage)] });
    if (maxFrontage) and.push({ $lte: ['$frontageNum', Number(maxFrontage)] });
    if (maxOwnerShare) and.push({ $lte: ['$ownerShareNum', Number(maxOwnerShare)] });
    if (minBudget) and.push({ $gte: ['$totalBudgetNum', Number(minBudget)] });
    if (maxBudget) and.push({ $lte: ['$totalBudgetNum', Number(maxBudget)] });
    if (and.length) pipeline.push({ $match: { $expr: { $and: and } } });

    const results = await Property.aggregate(pipeline);
    res.json(results.map(stripOwnerContact));
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search properties' });
  }
});

// PATCH /api/properties/:id/close - Close deal
router.patch('/properties/:id/close', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = await Property.findOneAndUpdate(
      { 
        _id: req.params.id, 
        phone: user.phone
      },
      { dealStatus: 'closed' },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ 
        error: 'Property not found or you do not have permission to close this deal' 
      });
    }
    
    console.log(`Deal closed successfully by user: ${user.phone}`);
    
    res.json({ success: true, updated });
  } catch (err) {
    console.error('Close deal error:', err);
    res.status(500).json({ error: 'Failed to close deal' });
  }
});

module.exports = router;
