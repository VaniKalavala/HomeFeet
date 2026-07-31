const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const cleanEnv = (value = '') => String(value).trim().replace(/^['"]|['"]$/g, '');

const keyId = cleanEnv(process.env.RAZORPAY_KEY_ID);
const keySecret = cleanEnv(process.env.RAZORPAY_KEY_SECRET);
const razorpayApi = axios.create({
  baseURL: 'https://api.razorpay.com/v1',
  auth: {
    username: keyId || '',
    password: keySecret || ''
  },
  timeout: 15000
});

const isRazorpayConfigured = () => Boolean(keyId && keySecret);

module.exports = {
  keyId,
  keySecret,
  razorpayApi,
  isRazorpayConfigured
};
