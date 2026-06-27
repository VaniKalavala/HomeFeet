import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import ListingsSidebar from './ListingsSidebar';
import LoginModal from './LoginModal';
import { API_BASE } from '../lib/api';
import { RAZORPAY_CHECKOUT_URL, razorpayConfig } from '../config/razorpay.config';
import { isAdminUser } from '../lib/admin';

type PlanTier = {
  value: string;
  label: string;
  price: number;
  validity: string;
  visibility: string;
  slot: string;
  relationshipManager: boolean;
  fieldVisit: boolean;
  photoshoot: boolean;
  assuredRank: string;
  socialMedia: boolean;
  shorts: boolean;
  propertyReport: boolean;
  matchingBuyers: string;
  mostPopular?: boolean;
};

const PLAN_TIERS: PlanTier[] = [
  {
    value: 'basic',
    label: 'Basic',
    price: 2970,
    validity: '30 Days',
    visibility: '75%',
    slot: 'Medium Slot',
    relationshipManager: false,
    fieldVisit: false,
    photoshoot: false,
    assuredRank: '',
    socialMedia: false,
    shorts: false,
    propertyReport: false,
    matchingBuyers: ''
  },
  {
    value: 'premium_plus',
    label: 'Premium +',
    price: 6750,
    validity: '120 Days',
    visibility: '86%',
    slot: 'Medium Slot',
    relationshipManager: false,
    fieldVisit: false,
    photoshoot: true,
    assuredRank: '',
    socialMedia: false,
    shorts: false,
    propertyReport: false,
    matchingBuyers: '',
    mostPopular: true
  },
  {
    value: 'assist',
    label: 'Assist',
    price: 9900,
    validity: '120 Days',
    visibility: '92%',
    slot: 'Top Slot',
    relationshipManager: true,
    fieldVisit: false,
    photoshoot: true,
    assuredRank: '3 Boosts',
    socialMedia: false,
    shorts: true,
    propertyReport: false,
    matchingBuyers: ''
  },
  {
    value: 'super_assist',
    label: 'Super Assist',
    price: 16200,
    validity: '150 Days',
    visibility: '98%',
    slot: 'Top Slot',
    relationshipManager: true,
    fieldVisit: false,
    photoshoot: true,
    assuredRank: '5 Boosts',
    socialMedia: true,
    shorts: true,
    propertyReport: true,
    matchingBuyers: 'Upto 50'
  }
];

const FEATURE_ROWS: Array<{
  label: string;
  render: (tier: PlanTier) => React.ReactNode;
}> = [
  { label: 'Plan Validity', render: (tier) => tier.validity },
  { label: 'Position in search result', render: (tier) => tier.slot },
  { label: 'Relationship Manager Assistance', render: (tier) => (tier.relationshipManager ? <Check className="mx-auto h-4 w-4 text-teal-600" /> : <X className="mx-auto h-4 w-4 text-slate-300" />) },
  { label: 'Field Visit Assistance', render: (tier) => (tier.fieldVisit ? <Check className="mx-auto h-4 w-4 text-teal-600" /> : <X className="mx-auto h-4 w-4 text-slate-300" />) },
  { label: 'Professional Photoshoot', render: (tier) => (tier.photoshoot ? <Check className="mx-auto h-4 w-4 text-teal-600" /> : <X className="mx-auto h-4 w-4 text-slate-300" />) },
  { label: 'Assured 1st Rank in Search Results', render: (tier) => tier.assuredRank || <X className="mx-auto h-4 w-4 text-slate-300" /> },
  { label: 'Social Media Marketing', render: (tier) => (tier.socialMedia ? <Check className="mx-auto h-4 w-4 text-teal-600" /> : <X className="mx-auto h-4 w-4 text-slate-300" />) },
  { label: 'Shorts', render: (tier) => (tier.shorts ? <Check className="mx-auto h-4 w-4 text-teal-600" /> : <X className="mx-auto h-4 w-4 text-slate-300" />) },
  { label: 'Property Report', render: (tier) => (tier.propertyReport ? <Check className="mx-auto h-4 w-4 text-teal-600" /> : <X className="mx-auto h-4 w-4 text-slate-300" />) },
  { label: 'Matching Buyers', render: (tier) => tier.matchingBuyers || <X className="mx-auto h-4 w-4 text-slate-300" /> }
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const paymentInProgressRef = useRef(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [accountType, setAccountType] = useState('owner');
  const [currentTier, setCurrentTier] = useState('none');
  const [currentExpiresAt, setCurrentExpiresAt] = useState('');
  const [loadingTier, setLoadingTier] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    if (!isAdminUser(localStorage.getItem('phone'), localStorage.getItem('accountType'), localStorage.getItem('email'))) {
      navigate('/');
      return;
    }
    setAccountType(localStorage.getItem('accountType') || 'owner');
    setCurrentTier(localStorage.getItem('ownerPlanTier') || 'none');
    setCurrentExpiresAt(localStorage.getItem('ownerPlanExpiresAt') || '');
  }, [navigate]);

  const isActiveTier = (tierValue: string) =>
    currentTier === tierValue && currentExpiresAt && new Date(currentExpiresAt) > new Date();

  const loadRazorpayCheckout = () =>
    new Promise<void>((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = RAZORPAY_CHECKOUT_URL;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Unable to load Razorpay Checkout'));
      document.body.appendChild(script);
    });

  const handleUpgrade = async (tier: PlanTier) => {
    if (paymentInProgressRef.current) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    if (!['owner', 'mediator'].includes(accountType)) {
      setMessage('These plans are available for Owner and Agent (Mediator) accounts only.');
      return;
    }

    paymentInProgressRef.current = true;
    setLoadingTier(tier.value);
    setMessage('');

    try {
      await loadRazorpayCheckout();

      const orderResponse = await fetch(`${API_BASE}/owner-plan-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tier: tier.value })
      });
      const orderData = await orderResponse.json();
      if (!orderResponse.ok) {
        throw new Error(orderData.message || 'Failed to create Razorpay order');
      }
      if (!window.Razorpay) {
        throw new Error('Razorpay Checkout is not available');
      }

      const checkout = new window.Razorpay({
        key: orderData.keyId || razorpayConfig.keyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency || 'INR',
        name: razorpayConfig.businessName,
        description: `${tier.label} Plan`,
        image: `${window.location.origin}${razorpayConfig.logoPath}`,
        order_id: orderData.order.id,
        prefill: {
          name: localStorage.getItem('name') || 'HomeFeet User',
          email: localStorage.getItem('email') || '',
          contact: localStorage.getItem('phone') ? `+91${localStorage.getItem('phone')}` : ''
        },
        notes: {
          tier: tier.value,
          address: razorpayConfig.notesAddress
        },
        theme: {
          color: razorpayConfig.themeColor
        },
        handler: async (response) => {
          try {
            const verifyResponse = await fetch(`${API_BASE}/owner-plan-payment/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token') || ''}`
              },
              body: JSON.stringify(response)
            });
            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok) {
              throw new Error(verifyData.message || 'Payment verification failed');
            }

            localStorage.setItem('ownerPlanTier', verifyData.user.ownerPlanTier || 'none');
            localStorage.setItem('ownerPlanExpiresAt', verifyData.user.ownerPlanExpiresAt || '');
            setCurrentTier(verifyData.user.ownerPlanTier || 'none');
            setCurrentExpiresAt(verifyData.user.ownerPlanExpiresAt || '');
            setMessage('Payment successful. Your plan is now active.');
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Payment verification failed');
          } finally {
            paymentInProgressRef.current = false;
            setLoadingTier('');
          }
        },
        modal: {
          ondismiss: () => {
            paymentInProgressRef.current = false;
            setLoadingTier('');
          }
        }
      });

      checkout.open();
    } catch (error) {
      paymentInProgressRef.current = false;
      setLoadingTier('');
      setMessage(error instanceof Error ? error.message : 'Unable to start Razorpay payment');
    }
  };

  return (
    <div className="bg-slate-50">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
        <ListingsSidebar activePage="dashboard" />
        <main className="min-w-0 flex-1">
          <h1 className="text-2xl font-black text-slate-950">Subscription Plans</h1>
          <p className="mt-1 text-sm text-slate-600">Boost your property's visibility with a plan built for Owners and Agents.</p>

          {message && (
            <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-teal-800">
              {message}
            </div>
          )}

          <div className="mt-6 overflow-x-auto">
            <div className="grid min-w-[860px] grid-cols-[220px_repeat(4,1fr)] gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
              <div className="bg-white p-4" />
              {PLAN_TIERS.map((tier) => (
                <div
                  key={tier.value}
                  className={`relative bg-white p-4 text-center ${tier.mostPopular ? 'ring-2 ring-[#0AA6A6]' : ''}`}
                >
                  {tier.mostPopular && (
                    <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold uppercase text-pink-600">
                      Most Popular
                    </span>
                  )}
                  <p className="mt-3 text-lg font-black text-slate-950">{tier.label}</p>
                  <p className="mt-1 text-xs font-semibold text-teal-700">{tier.visibility} Listing Visibility</p>
                </div>
              ))}

              {FEATURE_ROWS.map((row) => (
                <React.Fragment key={row.label}>
                  <div className="bg-white p-4 text-sm font-semibold text-slate-700">{row.label}</div>
                  {PLAN_TIERS.map((tier) => (
                    <div key={`${row.label}-${tier.value}`} className="bg-white p-4 text-center text-sm text-slate-700">
                      {row.render(tier)}
                    </div>
                  ))}
                </React.Fragment>
              ))}

              <div className="bg-white p-4" />
              {PLAN_TIERS.map((tier) => (
                <div key={`${tier.value}-price`} className="bg-white p-4 text-center">
                  <p className="text-xl font-black text-slate-950">Rs. {tier.price.toLocaleString('en-IN')}</p>
                  <button
                    type="button"
                    disabled={loadingTier === tier.value || Boolean(isActiveTier(tier.value))}
                    onClick={() => handleUpgrade(tier)}
                    className={`mt-3 w-full rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      tier.mostPopular ? 'bg-[#0AA6A6] text-white hover:bg-[#088f8f]' : 'border border-[#0AA6A6] text-[#0AA6A6] hover:bg-teal-50'
                    }`}
                  >
                    {isActiveTier(tier.value) ? 'Current Plan' : loadingTier === tier.value ? 'Processing...' : 'Upgrade'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {showLoginModal && (
        <LoginModal stayOnPage onClose={() => setShowLoginModal(false)} onLoginSuccess={() => setShowLoginModal(false)} />
      )}
    </div>
  );
};

export default Dashboard;
