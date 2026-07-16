// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { keyId, keySecret, razorpayApi, isRazorpayConfigured } = require('../config/razorpay.config');

const User = require('../models/User');
const OTP = require('../models/OTP');
const MembershipPayment = require('../models/MembershipPayment');
const OwnerPlanPayment = require('../models/OwnerPlanPayment');
const BuyerContactPayment = require('../models/BuyerContactPayment');
const LoginHistory = require('../models/LoginHistory');
const { OWNER_PLAN_TIERS } = require('../config/ownerPlans');
const { BUYER_CONTACT_PACKS } = require('../config/buyerContactPacks');
const speechUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

// ====== Helpers ======
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const recordLogin = (user, req, method) => {
  LoginHistory.create({
    userId: String(user._id),
    phone: user.phone || '',
    email: user.email || '',
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    accountType: user.accountType || 'owner',
    method,
    ip: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || '',
    userAgent: req.headers['user-agent'] || ''
  }).catch((err) => console.error('Login history record error:', err.message || err));
};

const publicUser = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  city: user.city || '',
  state: user.state || '',
  accountType: user.accountType,
  builderVerificationStatus: user.builderVerificationStatus,
  builderCompanyName: user.builderCompanyName,
  builderReraId: user.builderReraId,
  builderSubscriptionPlan: user.builderSubscriptionPlan,
  builderSubscriptionExpiresAt: user.builderSubscriptionExpiresAt,
  ownerPlanTier: user.ownerPlanTier,
  ownerPlanExpiresAt: user.ownerPlanExpiresAt,
  agentCompanyName: user.agentCompanyName,
  agentExperienceYears: user.agentExperienceYears,
  agentLanguages: user.agentLanguages,
  agentSpecializations: user.agentSpecializations,
  freeContactCredits: user.freeContactCredits,
  contactUnlocksUsed: user.contactUnlocksUsed,
  buyerFreeContactUsed: user.buyerFreeContactUsed,
  buyerContactCredits: user.buyerContactCredits
});

const subscriptionMonths = {
  '3_months': 3,
  '6_months': 6,
  '12_months': 12
};

const builderSubscriptionPrices = {
  '3_months': 15000,
  '6_months': 30000,
  '12_months': 50000
};

const ownerMediatorSubscriptionPrices = {
  '3_months': 50000,
  '6_months': 100000,
  '12_months': 150000
};

const subscriptionPricesForAccount = (accountType) =>
  ['owner', 'mediator', 'buyer'].includes(accountType)
    ? ownerMediatorSubscriptionPrices
    : builderSubscriptionPrices;

const subscriptionAudienceForAccount = (accountType) =>
  ['owner', 'mediator', 'buyer'].includes(accountType) ? 'owner_mediator' : 'builder';

const subscriptionExpiry = (plan) => {
  const months = subscriptionMonths[plan];
  if (!months) return null;
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);
  return expiresAt;
};

const ownerPlanExpiry = (tier) => {
  const config = OWNER_PLAN_TIERS[tier];
  if (!config) return null;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.validityDays);
  return expiresAt;
};

const requireUser = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    res.status(401).json({ message: 'Your login session has expired. Please login again.' });
    return null;
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return null;
  }

  return user;
};

router.post('/speech', speechUpload.single('file'), async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (!req.file) {
      return res.status(400).json({ message: 'Audio file is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(501).json({
        message: 'Whisper speech recognition is not configured. Set OPENAI_API_KEY in hosting environment.'
      });
    }

    const formData = new FormData();
    const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });
    formData.append('file', audioBlob, req.file.originalname || 'property-voice.webm');
    formData.append('model', process.env.OPENAI_SPEECH_MODEL || 'whisper-1');
    formData.append('language', 'en');
    formData.append(
      'prompt',
      [
        'Real estate property summary in India.',
        'Common phrases: square yards, square feet, acres, frontage, road size, east facing, north facing, south facing, west facing.',
        'Locations: Miyapur, Gachibowli, Nadargul, Maheshwaram, Turkayamjal, Tukkuguda, Isnapur, Bongulur, Hyderabad, Telangana.',
        'Types: standalone, high-rise, villa, plotted, open plot, HMDA, DTCP, GP layout.'
      ].join(' ')
    );

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        message: data.error?.message || 'Speech recognition failed'
      });
    }

    res.json({ text: data.text || '' });
  } catch (err) {
    console.error('Speech recognition error:', err);
    res.status(500).json({ message: 'Speech recognition failed' });
  }
});

// ====== SMS Sender (Airtel IQ) ======

const sendOTPViaSMS = async (phone, otp) => {
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_OTP === 'true') {
    const mock = { mock: true, note: 'Skipped SMS send in dev (MOCK_OTP=true)' };
    console.log(`MOCK OTP -> ${otp} to ${phone}`, mock);
    return mock;
  }

  const endpoint = 'https://api.uniquedigitaloutreach.com/v1/sms';
  const apiKey = process.env.SMS_API_KEY || 'D9r9oeGFhxDiIL1PMKZABnWZUUZokI';
  const sender = process.env.SMS_SENDER || 'INVHFF';
  const templateId = process.env.SMS_TEMPLATE_ID || '1007269523823781675';

  // The DLT-registered template uses {#var#} as the OTP placeholder.
  const text = `${otp} One time Password(OTP) for phone verification on www.homefeet.com real estate platform,Inventor Heads Animation studios Pvt Ltd`;

  const payload = {
    sender,
    to: `91${phone}`,       // prepend country code
    text,
    type: 'OTP',
    templateId
  };

  const headers = {
    'Content-Type': 'application/json',
    'apikey': apiKey
  };

  console.log(`📤 Sending OTP ${otp} to 91${phone}...`);

  const resp = await axios.post(endpoint, payload, { headers, timeout: 15000 });
  console.log('SMS API response:', resp.status, JSON.stringify(resp.data));

  if (resp.status < 200 || resp.status >= 300) {
    throw new Error(`SMS API returned non-2xx: ${resp.status}`);
  }

  return resp.data;
};

// ====== Email Sender (Resend) ======
const sendEmail = async ({ to, subject, html }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`MOCK EMAIL -> to ${to}, subject "${subject}":\n${html}`);
    return { mock: true };
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'HomeFeet <onboarding@resend.dev>';

  const resp = await axios.post(
    'https://api.resend.com/emails',
    { from: fromAddress, to, subject, html },
    { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 }
  );

  return resp.data;
};

// ====== Routes ======

// Send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number. Please enter 10 digits.' });
    }

    const otp = generateOTP();

    // Remove any existing OTPs for this phone
    await OTP.deleteMany({ phone });

    // Save new OTP
    await new OTP({
      phone,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    }).save();

    console.log(`🔐 OTP for ${phone} is: ${otp}`);

    // Send via SMS
    await sendOTPViaSMS(phone, otp);

    return res.json({
      success: true,
      message: 'OTP sent successfully to your phone number'
      // ⚠️  Do NOT return otp in production — remove the line below if you add it back
    });

  } catch (err) {
    console.error('Send OTP error:', err.response ? JSON.stringify(err.response.data) : err.message || err);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP are required' });
    }

    const otpRecord = await OTP.findOne({
      phone,
      otp,
      verified: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    otpRecord.verified = true;
    await otpRecord.save();

    const existingUser = await User.findOne({ phone });

    if (existingUser) {
      const token = jwt.sign(
        { id: existingUser._id, phone: existingUser.phone },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );

      recordLogin(existingUser, req, 'otp');

      return res.json({
        success: true,
        userExists: true,
        token,
        user: publicUser(existingUser)
      });
    }

    // New user → front-end will collect details
    return res.json({
      success: true,
      userExists: false,
      message: 'OTP verified. Please complete your profile.'
    });

  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: 'OTP verification failed' });
  }
});

// Complete Signup
router.post('/complete-signup', async (req, res) => {
  try {
    const { phone, firstName, lastName, email, accountType, builderCompanyName, builderReraId, builderSubscriptionPlan } = req.body;

    if (!phone || !firstName || !['owner', 'mediator', 'builder', 'buyer'].includes(accountType)) {
      return res.status(400).json({ message: 'Phone, first name, and account type are required' });
    }

    // Ensure OTP was verified recently (within last 10 minutes)
    const verifiedOTP = await OTP.findOne({
      phone,
      verified: true,
      expiresAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) }
    });

    if (!verifiedOTP) {
      return res.status(400).json({ message: 'Phone number not verified or verification expired' });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const selectedPlan = 'none';
    const newUser = new User({
      phone,
      firstName: firstName.trim(),
      lastName: lastName?.trim() || '',
      email: email?.trim() || undefined,
      accountType,
      builderVerificationStatus: accountType === 'builder' ? 'pending' : 'not_required',
      builderCompanyName: builderCompanyName?.trim() || '',
      builderReraId: builderReraId?.trim() || '',
      builderSubscriptionPlan: selectedPlan,
      builderSubscriptionExpiresAt: subscriptionExpiry(selectedPlan),
      isVerified: true
    });

    await newUser.save();
    await OTP.deleteMany({ phone });

    const token = jwt.sign(
      { id: newUser._id, phone: newUser.phone },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: publicUser(newUser)
    });

  } catch (err) {
    console.error('Complete signup error:', err);
    res.status(500).json({ message: 'Signup failed' });
  }
});

// Register with Email + Password (optional alternative to phone OTP)
router.post('/register-email', async (req, res) => {
  try {
    const { email, password, firstName, lastName, accountType, builderCompanyName, builderReraId } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!firstName || !['owner', 'mediator', 'builder', 'buyer'].includes(accountType)) {
      return res.status(400).json({ message: 'First name and account type are required' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = new User({
      email: normalizedEmail,
      password: passwordHash,
      firstName: firstName.trim(),
      lastName: lastName?.trim() || '',
      accountType,
      builderVerificationStatus: accountType === 'builder' ? 'pending' : 'not_required',
      builderCompanyName: builderCompanyName?.trim() || '',
      builderReraId: builderReraId?.trim() || '',
      isVerified: true
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: publicUser(newUser)
    });
  } catch (err) {
    console.error('Register email error:', err);
    res.status(500).json({ message: 'Signup failed' });
  }
});

// Login with Email + Password (optional alternative to phone OTP)
router.post('/login-email', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    recordLogin(user, req, 'email_password');

    res.json({
      success: true,
      token,
      user: publicUser(user)
    });
  } catch (err) {
    console.error('Login email error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Request a password reset link (sent via email)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Please enter your email address' });
    }

    const genericResponse = {
      success: true,
      message: 'If an account exists for that email, a password reset link has been sent.'
    };

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Don't reveal whether the email exists
      return res.json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetOrigin = (process.env.FRONTEND_ORIGIN || 'https://www.homefeet.in').replace(/\/$/, '');
    const resetUrl = `${resetOrigin}/reset-password?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

    await sendEmail({
      to: normalizedEmail,
      subject: 'Reset your HomeFeet password',
      html: `
        <p>Hi ${user.firstName || ''},</p>
        <p>We received a request to reset your HomeFeet account password. Click the link below to set a new password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `
    });

    res.json(genericResponse);
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Failed to process password reset request' });
  }
});

// Reset password using the token emailed via /forgot-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !token || !newPassword) {
      return res.status(400).json({ message: 'Email, token, and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');

    const user = await User.findOne({
      email: normalizedEmail,
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    res.json({ success: true, message: 'Password has been reset. Please login with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

router.post('/membership-order', async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (!['owner', 'builder', 'mediator', 'buyer'].includes(user.accountType)) {
      return res.status(403).json({ message: 'Only owner, builder, mediator, and buyer accounts can subscribe' });
    }

    const { plan, membershipAudience } = req.body;
    const expectedAudience = subscriptionAudienceForAccount(user.accountType);
    if (membershipAudience && membershipAudience !== expectedAudience) {
      return res.status(403).json({
        message: expectedAudience === 'owner_mediator'
          ? 'Please select the Owner/Mediator membership for this account.'
          : 'Please select the Builder membership for this account.'
      });
    }

    const subscriptionPrices = subscriptionPricesForAccount(user.accountType);
    if (!subscriptionMonths[plan] || !subscriptionPrices[plan]) {
      return res.status(400).json({ message: 'Please select a valid 3, 6, or 12 month plan' });
    }

    if (!isRazorpayConfigured()) {
      return res.status(500).json({ message: 'Razorpay credentials are not configured' });
    }

    const amount = subscriptionPrices[plan] * 100;
    const receipt = `membership_${plan}_${user._id}_${Date.now()}`.slice(0, 40);
    const response = await razorpayApi.post('/orders', {
      amount,
      currency: 'INR',
      receipt,
      notes: {
        plan,
        membershipAudience: expectedAudience,
        accountType: user.accountType,
        userId: String(user._id),
        phone: user.phone || ''
      }
    });

    await MembershipPayment.create({
      user: user._id,
      plan,
      amount,
      currency: 'INR',
      razorpayOrderId: response.data.id,
      status: 'created'
    });

    res.json({
      success: true,
      keyId,
      order: response.data,
      plan,
      amount
    });
  } catch (err) {
    const razorpayError = err.response?.data?.error;
    console.error('Membership order error:', razorpayError || err.message || err);

    if (err.name === 'MongooseError' || err.name === 'MongoServerSelectionError') {
      return res.status(503).json({ message: 'Database connection is not ready. Please try again in a moment.' });
    }

    if (razorpayError?.description === 'Authentication failed') {
      return res.status(err.response?.status || 502).json({
        message: 'Razorpay authentication failed. Please use a matching Razorpay key id and secret, then restart the backend server.'
      });
    }

    if (razorpayError?.description) {
      return res.status(err.response?.status || 502).json({ message: razorpayError.description });
    }

    res.status(500).json({ message: 'Failed to create Razorpay order' });
  }
});

router.post('/membership-payment/verify', async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing Razorpay payment verification data' });
    }

    if (!keySecret) {
      return res.status(500).json({ message: 'Razorpay credentials are not configured' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Razorpay payment verification failed' });
    }

    const payment = await MembershipPayment.findOne({
      razorpayOrderId: razorpay_order_id,
      user: user._id,
      status: 'created'
    });
    if (!payment) {
      return res.status(400).json({ message: 'Matching pending membership order was not found' });
    }

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    user.builderSubscriptionPlan = payment.plan;
    user.builderSubscriptionExpiresAt = subscriptionExpiry(payment.plan);
    await user.save();

    res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    console.error('Membership payment verify error:', err);
    res.status(500).json({ message: 'Failed to verify Razorpay payment' });
  }
});

router.post('/owner-plan-order', async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (!['owner', 'mediator', 'builder'].includes(user.accountType)) {
      return res.status(403).json({ message: 'Only owner, agent (mediator), and builder accounts can subscribe to these plans' });
    }

    const { tier } = req.body;
    const planConfig = OWNER_PLAN_TIERS[tier];
    if (!planConfig) {
      return res.status(400).json({ message: 'Please select a valid plan' });
    }

    if (!isRazorpayConfigured()) {
      return res.status(500).json({ message: 'Razorpay credentials are not configured' });
    }

    const amount = planConfig.price * 100;
    const receipt = `ownerplan_${tier}_${user._id}_${Date.now()}`.slice(0, 40);
    const response = await razorpayApi.post('/orders', {
      amount,
      currency: 'INR',
      receipt,
      notes: {
        tier,
        accountType: user.accountType,
        userId: String(user._id),
        phone: user.phone || ''
      }
    });

    await OwnerPlanPayment.create({
      user: user._id,
      tier,
      amount,
      currency: 'INR',
      razorpayOrderId: response.data.id,
      status: 'created'
    });

    res.json({
      success: true,
      keyId,
      order: response.data,
      tier,
      amount
    });
  } catch (err) {
    const razorpayError = err.response?.data?.error;
    console.error('Owner plan order error:', razorpayError || err.message || err);

    if (err.name === 'MongooseError' || err.name === 'MongoServerSelectionError') {
      return res.status(503).json({ message: 'Database connection is not ready. Please try again in a moment.' });
    }

    if (razorpayError?.description === 'Authentication failed') {
      return res.status(err.response?.status || 502).json({
        message: 'Razorpay authentication failed. Please use a matching Razorpay key id and secret, then restart the backend server.'
      });
    }

    if (razorpayError?.description) {
      return res.status(err.response?.status || 502).json({ message: razorpayError.description });
    }

    res.status(500).json({ message: 'Failed to create Razorpay order' });
  }
});

router.post('/owner-plan-payment/verify', async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing Razorpay payment verification data' });
    }

    if (!keySecret) {
      return res.status(500).json({ message: 'Razorpay credentials are not configured' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Razorpay payment verification failed' });
    }

    const payment = await OwnerPlanPayment.findOne({
      razorpayOrderId: razorpay_order_id,
      user: user._id,
      status: 'created'
    });
    if (!payment) {
      return res.status(400).json({ message: 'Matching pending plan order was not found' });
    }

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    user.ownerPlanTier = payment.tier;
    user.ownerPlanExpiresAt = ownerPlanExpiry(payment.tier);
    await user.save();

    res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    console.error('Owner plan payment verify error:', err);
    res.status(500).json({ message: 'Failed to verify Razorpay payment' });
  }
});

router.post('/buyer-contact-order', async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (!['owner', 'mediator', 'buyer'].includes(user.accountType)) {
      return res.status(403).json({ message: 'Only owner, agent (mediator), and buyer accounts can buy contact-reveal packs' });
    }

    const { packSize } = req.body;
    const packConfig = BUYER_CONTACT_PACKS[packSize];
    if (!packConfig) {
      return res.status(400).json({ message: 'Please select a valid contact pack' });
    }

    if (!isRazorpayConfigured()) {
      return res.status(500).json({ message: 'Razorpay credentials are not configured' });
    }

    const amount = packConfig.price * 100;
    const receipt = `buyerpack_${packConfig.count}_${user._id}_${Date.now()}`.slice(0, 40);
    const response = await razorpayApi.post('/orders', {
      amount,
      currency: 'INR',
      receipt,
      notes: {
        packSize: String(packConfig.count),
        accountType: user.accountType,
        userId: String(user._id),
        phone: user.phone || ''
      }
    });

    await BuyerContactPayment.create({
      user: user._id,
      packSize: packConfig.count,
      amount,
      currency: 'INR',
      razorpayOrderId: response.data.id,
      status: 'created'
    });

    res.json({
      success: true,
      keyId,
      order: response.data,
      packSize: packConfig.count,
      amount
    });
  } catch (err) {
    const razorpayError = err.response?.data?.error;
    console.error('Buyer contact pack order error:', razorpayError || err.message || err);

    if (err.name === 'MongooseError' || err.name === 'MongoServerSelectionError') {
      return res.status(503).json({ message: 'Database connection is not ready. Please try again in a moment.' });
    }

    if (razorpayError?.description === 'Authentication failed') {
      return res.status(err.response?.status || 502).json({
        message: 'Razorpay authentication failed. Please use a matching Razorpay key id and secret, then restart the backend server.'
      });
    }

    if (razorpayError?.description) {
      return res.status(err.response?.status || 502).json({ message: razorpayError.description });
    }

    res.status(500).json({ message: 'Failed to create Razorpay order' });
  }
});

router.post('/buyer-contact-payment/verify', async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing Razorpay payment verification data' });
    }

    if (!keySecret) {
      return res.status(500).json({ message: 'Razorpay credentials are not configured' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Razorpay payment verification failed' });
    }

    const payment = await BuyerContactPayment.findOne({
      razorpayOrderId: razorpay_order_id,
      user: user._id,
      status: 'created'
    });
    if (!payment) {
      return res.status(400).json({ message: 'Matching pending order was not found' });
    }

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    user.buyerContactCredits = (user.buyerContactCredits || 0) + payment.packSize;
    await user.save();

    res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    console.error('Buyer contact payment verify error:', err);
    res.status(500).json({ message: 'Failed to verify Razorpay payment' });
  }
});

router.post('/builder-subscription', async (req, res) => {
  res.status(410).json({
    message: 'Direct membership activation is disabled. Please complete payment through the membership page.'
  });
});

// Get user by phone
router.get('/user/:phone', async (req, res) => {
  try {
    const user = await User.findOne({ phone: req.params.phone });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      ...publicUser(user)
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// PATCH /api/profile - Update the logged-in user's own profile (currently city/state)
router.patch('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { city, state, agentCompanyName, agentExperienceYears, agentLanguages, agentSpecializations } = req.body;
    if (typeof city === 'string') user.city = city.trim();
    if (typeof state === 'string') user.state = state.trim();
    if (typeof agentCompanyName === 'string') user.agentCompanyName = agentCompanyName.trim();
    if (agentExperienceYears !== undefined) {
      const years = Number(agentExperienceYears);
      user.agentExperienceYears = Number.isFinite(years) && years >= 0 ? years : null;
    }
    if (Array.isArray(agentLanguages)) user.agentLanguages = agentLanguages.filter(Boolean);
    if (Array.isArray(agentSpecializations)) user.agentSpecializations = agentSpecializations.filter(Boolean);
    await user.save();

    res.json(publicUser(user));
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Legacy stub
router.post('/login', async (_req, res) => {
  res.status(400).json({
    message: 'Please use phone number login',
    redirectTo: '/phone-login'
  });
});

module.exports = router;
