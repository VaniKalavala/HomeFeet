const { merchantKey, merchantSalt, isPayuConfigured } = require('../config/payu.config');

const maskValue = (value = '') => {
  if (!value) return '';
  if (value.length <= 8) return 'set';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

console.log(JSON.stringify({
  configured: isPayuConfigured(),
  merchantKey: maskValue(merchantKey),
  hasSalt: Boolean(merchantSalt)
}, null, 2));
