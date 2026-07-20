// server.js
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const app = express();
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/property');
const adminRoutes = require('./routes/admin');
const whatsappRoutes = require('./routes/whatsapp');
const builderLogoRoutes = require('./routes/builderLogos');
const analyzeFloorPlanRoute = require('./routes/analyzeFloorPlan');
const Property = require('./models/Property');
const VisitorStats = require('./models/VisitorStats');
const Testimonial = require('./models/Testimonial');

require('./db');
require('./models/Interest');
require('./models/OTP'); // Add OTP model
require('./models/Message');
require('./models/ContactInquiry');
require('./models/MembershipPayment');
require('./models/VisitorStats');
require('./models/WhatsAppIntake');
require('./models/BuilderDigestLog');
require('./models/Testimonial');

app.use(cors());
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});
app.use(express.json({ limit: '2mb' }));
app.set('trust proxy', true);
app.use('/uploads', express.static('uploads'));
app.use('/api/admin', adminRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/builder-logos', builderLogoRoutes);

// Apply routes
app.use('/api', authRoutes);
app.use('/api', propertyRoutes);
app.use('/api', analyzeFloorPlanRoute);

const getIndiaDateKey = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const value = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
};

const getVisitorCounts = (stats) => {
  const today = getIndiaDateKey();
  const todayStats = stats?.dailyCounts?.find((item) => item.date === today);
  const todayCount = todayStats?.count || 0;
  return {
    dailyCount: todayCount,
    uniqueDailyCount: todayStats?.uniqueIpHashes?.length || 0,
    totalCount: stats?.totalCount || 0,
    date: today
  };
};

const getClientIpHash = (req) => {
  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const rawIp = forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown';
  return crypto
    .createHash('sha256')
    .update(`${rawIp}|${process.env.VISITOR_HASH_SALT || 'homefeet-visitor'}`)
    .digest('hex');
};

app.get('/api/visitors/stats', async (_req, res) => {
  try {
    const stats = await VisitorStats.findOne({ key: 'site' });
    res.json(getVisitorCounts(stats));
  } catch (error) {
    console.error('Visitor stats error:', error);
    res.json(getVisitorCounts(null));
  }
});

app.post('/api/visitors/track', async (req, res) => {
  try {
    const today = getIndiaDateKey();
    const ipHash = getClientIpHash(req);
    let updatedStats = await VisitorStats.findOne({ key: 'site' });

    if (!updatedStats) {
      updatedStats = new VisitorStats({
        key: 'site',
        totalCount: 0,
        dailyCounts: []
      });
    }

    updatedStats.totalCount = Number(updatedStats.totalCount || 0) + 1;

    let todayStats = updatedStats.dailyCounts.find((item) => item.date === today);
    if (!todayStats) {
      updatedStats.dailyCounts.push({ date: today, count: 0, uniqueIpHashes: [] });
      todayStats = updatedStats.dailyCounts[updatedStats.dailyCounts.length - 1];
    }

    todayStats.count = Number(todayStats.count || 0) + 1;
    todayStats.uniqueIpHashes = Array.isArray(todayStats.uniqueIpHashes) ? todayStats.uniqueIpHashes : [];
    if (!todayStats.uniqueIpHashes.includes(ipHash)) {
      todayStats.uniqueIpHashes.push(ipHash);
    }

    updatedStats = await updatedStats.save();

    res.json(getVisitorCounts(updatedStats));
  } catch (error) {
    console.error('Visitor tracking error:', error);
    res.json(getVisitorCounts(null));
  }
});

app.get('/api/testimonials', async (_req, res) => {
  try {
    const testimonials = await Testimonial
      .find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();
    res.json({ testimonials });
  } catch (error) {
    console.error('Testimonials fetch error:', error);
    res.status(500).json({ error: 'Unable to load testimonials' });
  }
});

app.post('/api/testimonials', async (req, res) => {
  try {
    const clean = (value = '') => String(value || '').trim();
    const name = clean(req.body.name);
    const role = clean(req.body.role) || 'Owner';
    const city = clean(req.body.city);
    const summary = clean(req.body.summary);
    const allowedRoles = ['Builder', 'Owner', 'Mediator', 'Buyer', 'Land Seeker', 'Other'];

    if (!name || !summary) {
      return res.status(400).json({ error: 'Name and testimonial summary are required' });
    }

    const testimonial = await Testimonial.create({
      name: name.slice(0, 80),
      role: allowedRoles.includes(role) ? role : 'Other',
      city: city.slice(0, 80),
      summary: summary.slice(0, 800),
      status: 'pending'
    });

    res.status(201).json({ testimonial });
  } catch (error) {
    console.error('Testimonials submit error:', error);
    res.status(500).json({ error: 'Unable to submit testimonial' });
  }
});

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const cleanType = (value = '') =>
  value ? value.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Property';

const formatMoney = (value = '') => {
  const num = Number(value || 0);
  if (!num) return 'Price on request';
  return `Rs. ${num.toLocaleString('en-IN')}`;
};

const absoluteUrl = (origin, path = '', fallbackOrigin = origin) => {
  if (!path) return `${fallbackOrigin}/HomeFeet_logo.png`;
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
};

app.get('/share/property/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property || property.status !== 'approved') {
      return res.status(404).send('Property not found');
    }

    const apiOrigin = process.env.API_PUBLIC_ORIGIN || `${req.protocol}://${req.get('host')}`;
    const frontendOrigin = (process.env.FRONTEND_ORIGIN || 'https://www.homefeet.in').replace(/\/$/, '');
    const propertyUrl = `${frontendOrigin}/property/${property._id}`;
    const imageUrl = absoluteUrl(apiOrigin, property.imageUrl || property.plotDiagramUrl, frontendOrigin);
    const type = cleanType(property.developmentType);
    const location = [property.locality, property.city, property.state].filter(Boolean).join(', ');
    const plotSize = property.totalArea ? `${property.totalArea} ${property.areaUnit || ''}`.trim() : 'Plot size available';
    const price = formatMoney(property.squareYardPrice || property.goodwill || property.advance);
    const title = property.projectName || `${type} Property in ${property.locality || property.city || 'India'}`;
    const description = `${price} | ${plotSize} | ${location || 'Location available'}`;
    const landmark = property.landmark ? `Near ${property.landmark}` : '';
    const intent = property.listingIntent === 'sell'
      ? 'Sell Plot'
      : property.listingIntent === 'buy'
        ? 'Buy Requirement'
        : 'For Developers';

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="HomeFeet" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />
    <meta property="og:url" content="${escapeHtml(propertyUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    <style>
      :root {
        color-scheme: light;
        --ink: #020617;
        --muted: #475569;
        --line: #dbe4ee;
        --brand: #0072ce;
        --teal: #0f8a83;
        --bg: #f4f8fb;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 28px;
        background: radial-gradient(circle at top, #ffffff 0, var(--bg) 52%, #eaf2f8 100%);
        color: var(--ink);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .card {
        width: min(920px, 100%);
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: #ffffff;
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.14);
      }
      .media {
        position: relative;
        min-height: 290px;
        background: #dbe4ee;
      }
      .media img {
        width: 100%;
        height: 360px;
        display: block;
        object-fit: cover;
      }
      .badge-row {
        position: absolute;
        left: 18px;
        top: 18px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .badge {
        border-radius: 999px;
        background: rgba(255,255,255,.94);
        padding: 7px 11px;
        color: var(--teal);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .02em;
      }
      .body { padding: 26px; }
      .eyebrow {
        margin: 0 0 8px;
        color: var(--brand);
        font-size: 13px;
        font-weight: 900;
        letter-spacing: .06em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: clamp(30px, 5vw, 52px);
        line-height: .98;
        letter-spacing: 0;
      }
      .location {
        margin: 14px 0 0;
        color: var(--muted);
        font-size: 16px;
        line-height: 1.6;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-top: 22px;
      }
      .fact {
        min-height: 86px;
        border-radius: 12px;
        background: #f8fafc;
        border: 1px solid #edf2f7;
        padding: 14px;
      }
      .fact span {
        display: block;
        color: #64748b;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .fact strong {
        display: block;
        margin-top: 7px;
        color: var(--ink);
        font-size: 16px;
      }
      .summary {
        margin-top: 20px;
        color: var(--muted);
        line-height: 1.7;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        margin-top: 24px;
        border-top: 1px solid var(--line);
        padding-top: 20px;
      }
      .brand {
        color: var(--brand);
        font-weight: 900;
      }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 46px;
        border-radius: 10px;
        background: var(--teal);
        padding: 0 22px;
        color: #ffffff;
        font-weight: 900;
        text-decoration: none;
      }
      @media (max-width: 720px) {
        body { padding: 14px; align-items: start; }
        .media img { height: 260px; }
        .body { padding: 20px; }
        .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .actions { align-items: stretch; }
        .button { width: 100%; }
      }
    </style>
  </head>
  <body>
    <main class="card">
      <section class="media">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" />
        <div class="badge-row">
          <span class="badge">Verified Listing</span>
          <span class="badge">${escapeHtml(intent)}</span>
        </div>
      </section>
      <section class="body">
        <p class="eyebrow">HomeFeet Listing</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="location">${escapeHtml(location || 'Location available')}${landmark ? ` · ${escapeHtml(landmark)}` : ''}</p>
        <div class="grid">
          <div class="fact"><span>Property Type</span><strong>${escapeHtml(type)}</strong></div>
          <div class="fact"><span>Area</span><strong>${escapeHtml(plotSize)}</strong></div>
          <div class="fact"><span>Facing</span><strong>${escapeHtml(property.facing || 'Available')}</strong></div>
          <div class="fact"><span>Price</span><strong>${escapeHtml(price)}</strong></div>
        </div>
        ${property.description ? `<p class="summary">${escapeHtml(property.description).slice(0, 260)}${property.description.length > 260 ? '...' : ''}</p>` : ''}
        <div class="actions">
          <span>Shared from <span class="brand">HomeFeet</span></span>
          <a class="button" href="${escapeHtml(propertyUrl)}">View full listing</a>
        </div>
      </section>
    </main>
  </body>
</html>`);
  } catch (err) {
    console.error('Share preview error:', err);
    res.status(500).send('Unable to create property preview');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5174;
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server running on http://localhost:5174');
  console.log('📱 Phone OTP authentication enabled');
});

module.exports = app;
