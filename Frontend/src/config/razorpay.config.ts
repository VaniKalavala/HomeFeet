export const RAZORPAY_CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

export const razorpayConfig = {
  keyId: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
  businessName: 'HomeFeet',
  logoPath: '/HomeFeet_logo.png',
  themeColor: '#3399cc',
  notesAddress: 'HomeFeet Membership'
};
