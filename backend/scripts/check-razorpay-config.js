const { keyId, keySecret, isRazorpayConfigured } = require('../config/razorpay.config');

const maskValue = (value = '') => {
  if (!value) return '';
  if (value.length <= 8) return 'set';
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
};

console.log(JSON.stringify({
  configured: isRazorpayConfigured(),
  keyId: maskValue(keyId),
  hasSecret: Boolean(keySecret)
}, null, 2));
