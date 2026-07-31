const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const cleanEnv = (value = '') => String(value).trim().replace(/^['"]|['"]$/g, '');

const merchantKey = cleanEnv(process.env.PAYU_MERCHANT_KEY);
const merchantSalt = cleanEnv(process.env.PAYU_MERCHANT_SALT);
const mode = cleanEnv(process.env.PAYU_MODE).toLowerCase() === 'live' ? 'live' : 'test';

const payuBaseUrl = mode === 'live'
  ? 'https://secure.payu.in/_payment'
  : 'https://test.payu.in/_payment';

const isPayuConfigured = () => Boolean(merchantKey && merchantSalt);

// udf3-udf5 are unused by this integration but must still occupy their slot in both hash formulas.
const UNUSED_UDF = ['', '', '']; // udf3, udf4, udf5
// 5 further reserved slots (udf6-udf10) that the standard (non-extended) PayU hash always leaves empty.
const RESERVED_SLOTS = ['', '', '', '', ''];

// key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|<5 reserved>|SALT
const generateRequestHash = ({ txnid, amount, productinfo, firstname, email, udf1 = '', udf2 = '' }) => {
  const hashString = [
    merchantKey, txnid, amount, productinfo, firstname, email,
    udf1, udf2, ...UNUSED_UDF, ...RESERVED_SLOTS, merchantSalt
  ].join('|');
  return crypto.createHash('sha512').update(hashString).digest('hex');
};

// SALT|status|<5 reserved>|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
const verifyResponseHash = ({ status, udf1 = '', udf2 = '', email, firstname, productinfo, amount, txnid }, receivedHash) => {
  const hashString = [
    merchantSalt, status, ...RESERVED_SLOTS, ...[...UNUSED_UDF].reverse(),
    udf2, udf1, email, firstname, productinfo, amount, txnid, merchantKey
  ].join('|');
  const expected = crypto.createHash('sha512').update(hashString).digest('hex');
  return Boolean(receivedHash) && expected === receivedHash;
};

module.exports = {
  merchantKey,
  merchantSalt,
  payuBaseUrl,
  isPayuConfigured,
  generateRequestHash,
  verifyResponseHash
};
