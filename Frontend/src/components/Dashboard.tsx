import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Check, KeyRound, MapPin, Pencil, X } from 'lucide-react';
import ListingsSidebar from './ListingsSidebar';
import LoginModal from './LoginModal';
import { API_BASE, API_ORIGIN } from '../lib/api';
import { RAZORPAY_CHECKOUT_URL, razorpayConfig } from '../config/razorpay.config';
import { isAdminUser } from '../lib/admin';

type PlanTier = {
  value: string;
  label: string;
  price: number;
  validity: string;
  visibility: string;
  slot: string;
  phonePrivacy: boolean;
  relationshipManager: boolean;
  fieldVisit: boolean;
  propertyShowing: boolean;
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
    price: 2500,
    validity: '30 Days',
    visibility: '75%',
    slot: 'Medium Slot',
    phonePrivacy: true,
    relationshipManager: false,
    fieldVisit: false,
    propertyShowing: false,
    photoshoot: false,
    assuredRank: '',
    socialMedia: false,
    shorts: false,
    propertyReport: false,
    matchingBuyers: ''
  },
  {
    value: 'standard',
    label: 'Standard',
    price: 5000,
    validity: '60 Days',
    visibility: '85%',
    slot: 'Medium Slot',
    phonePrivacy: true,
    relationshipManager: false,
    fieldVisit: false,
    propertyShowing: false,
    photoshoot: false,
    assuredRank: '',
    socialMedia: false,
    shorts: false,
    propertyReport: false,
    matchingBuyers: ''
  },
  {
    value: 'premium',
    label: 'Premium Plan',
    price: 7500,
    validity: '120 Days',
    visibility: '100%',
    slot: 'Medium Slot',
    phonePrivacy: true,
    relationshipManager: false,
    fieldVisit: false,
    propertyShowing: false,
    photoshoot: true,
    assuredRank: '',
    socialMedia: false,
    shorts: false,
    propertyReport: false,
    matchingBuyers: '',
    mostPopular: true
  }
];

const BUYER_CONTACT_PACKS = [
  { packSize: 1, price: 199, label: '1 Property' },
  { packSize: 5, price: 1000, label: '5 Properties' },
  { packSize: 10, price: 2000, label: '10 Properties' }
];

const FEATURE_ROWS: Array<{
  label: string;
  render: (tier: PlanTier) => React.ReactNode;
}> = [
  { label: 'Plan Validity', render: (tier) => tier.validity },
  { label: 'Position in search result', render: (tier) => tier.slot },
  { label: 'Privacy of Your Phone Number', render: (tier) => (tier.phonePrivacy ? <Check className="mx-auto h-4 w-4 text-teal-600" /> : <X className="mx-auto h-4 w-4 text-slate-300" />) },
  { label: 'Assured 1st Rank in Search Results', render: (tier) => tier.assuredRank || <X className="mx-auto h-4 w-4 text-slate-300" /> },
  { label: 'Social Media Marketing', render: (tier) => (tier.socialMedia ? <Check className="mx-auto h-4 w-4 text-teal-600" /> : <X className="mx-auto h-4 w-4 text-slate-300" />) },
  { label: 'Property Report', render: (tier) => (tier.propertyReport ? <Check className="mx-auto h-4 w-4 text-teal-600" /> : <X className="mx-auto h-4 w-4 text-slate-300" />) },
  { label: 'Matching Buyers', render: (tier) => tier.matchingBuyers || <X className="mx-auto h-4 w-4 text-slate-300" /> }
];

const COMMERCIAL_TYPES = ['office-space', 'retail', 'hospitality', 'industrial', 'commercial-plot'];

const SUB_CATEGORY_LABELS: Record<string, string> = {
  development: 'Development',
  sell: 'Sell',
  buy: 'Buy Requirement'
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  expired: 'Expired',
  under_review: 'Under Review',
  rejected: 'Rejected'
};

type StatusBucket = 'active' | 'expired' | 'under_review' | 'rejected';

const fallbackImage = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80';
const isDisplayableImage = (url = '') => Boolean(url) && !url.toLowerCase().includes('.pdf');
const getCardImageUrl = (property: any) =>
  property.imageUrl || (isDisplayableImage(property.plotDiagramUrl) ? property.plotDiagramUrl : '');
const isGeneratedDiagramPreview = (property: any) => !property.imageUrl && Boolean(getCardImageUrl(property));

const formatPrice = (price: unknown) => {
  if (!price) return 'Price on request';
  const num = parseInt(String(price).replace(/,/g, ''), 10);
  if (Number.isNaN(num)) return 'Price on request';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)} L`;
  return `₹${num.toLocaleString('en-IN')}`;
};

const getDisplayPrice = (property: any) => {
  if (property.totalBudget) return formatPrice(property.totalBudget);
  if (property.squareFeetPrice) return formatPrice(property.squareFeetPrice);
  if (property.squareYardPrice) return formatPrice(property.squareYardPrice);
  if (property.goodwill) return formatPrice(property.goodwill);
  return 'Price on request';
};

const getStatusBucket = (property: any): StatusBucket => {
  if (property.status === 'pending') return 'under_review';
  if (property.status === 'rejected') return 'rejected';
  if (property.expiresAt && new Date(property.expiresAt) <= new Date()) return 'expired';
  return 'active';
};

const getCategory = (property: any): 'residential' | 'commercial' =>
  COMMERCIAL_TYPES.includes(String(property.developmentType || '').toLowerCase()) ? 'commercial' : 'residential';

const getSubCategory = (property: any): string => property.listingIntent || 'development';

const formatDate = (value?: string | null) => {
  if (!value) return 'No expiry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No expiry';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const paymentInProgressRef = useRef(false);
  const isAdmin = isAdminUser(localStorage.getItem('phone'), localStorage.getItem('accountType'), localStorage.getItem('email'));

  const [activeTab, setActiveTab] = useState<'posted' | 'subscription' | 'shortlisted' | 'contacted'>('posted');
  const [defaultTabApplied, setDefaultTabApplied] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [accountType, setAccountType] = useState('owner');
  const [currentTier, setCurrentTier] = useState('none');
  const [currentExpiresAt, setCurrentExpiresAt] = useState('');
  const [loadingTier, setLoadingTier] = useState('');
  const [message, setMessage] = useState('');

  const [properties, setProperties] = useState<any[]>([]);
  const [interestCounts, setInterestCounts] = useState<Record<string, number>>({});
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'residential' | 'commercial'>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | StatusBucket>('all');
  const [localityFilter, setLocalityFilter] = useState('All');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('All');
  const [bhkFilter, setBhkFilter] = useState('All');
  const [buyerFreeContactUsed, setBuyerFreeContactUsed] = useState(false);
  const [buyerContactCredits, setBuyerContactCredits] = useState(0);
  const [loadingPack, setLoadingPack] = useState(0);
  const [buyerPlanMessage, setBuyerPlanMessage] = useState('');
  const buyerPaymentInProgressRef = useRef(false);
  const [shortlistEntries, setShortlistEntries] = useState<any[]>([]);
  const [loadingShortlist, setLoadingShortlist] = useState(true);
  const [contactedEntries, setContactedEntries] = useState<any[]>([]);
  const [loadingContacted, setLoadingContacted] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    const storedAccountType = localStorage.getItem('accountType') || 'owner';
    setAccountType(storedAccountType);
    setCurrentTier(localStorage.getItem('ownerPlanTier') || 'none');
    setCurrentExpiresAt(localStorage.getItem('ownerPlanExpiresAt') || '');
    setBuyerFreeContactUsed(localStorage.getItem('buyerFreeContactUsed') === 'true');
    setBuyerContactCredits(Number(localStorage.getItem('buyerContactCredits') || 0));
    if (!defaultTabApplied) {
      setDefaultTabApplied(true);
      if (storedAccountType === 'buyer') setActiveTab('shortlisted');
    }
  }, [navigate, defaultTabApplied]);

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setPropertiesError('Please log in again.');
        return;
      }

      let res = await fetch(`${API_BASE}/user-properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const phone = localStorage.getItem('phone');
        if (phone) {
          res = await fetch(`${API_BASE}/user-properties-by-phone/${phone}`);
        }
        if (!res.ok) {
          res = await fetch(`${API_BASE}/all`);
          const all = await res.json();
          const filtered = all.filter((p: any) => p.phone === phone || p.contactPhone === phone);
          setProperties(filtered);
          setPropertiesError(null);
          return;
        }
      }

      const data = await res.json();
      setProperties(data);
      setPropertiesError(null);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setPropertiesError('Failed to fetch properties. Please try again.');
    } finally {
      setLoadingProperties(false);
    }
  };

  const fetchInterestCounts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE}/my-interests?as=owner`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const interests = await res.json();
      const counts: Record<string, number> = {};
      interests.forEach((interest: any) => {
        const propertyId = interest.propertyId?._id || interest.propertyId;
        if (!propertyId) return;
        counts[propertyId] = (counts[propertyId] || 0) + 1;
      });
      setInterestCounts(counts);
    } catch (err) {
      console.error('Error fetching interest counts:', err);
    }
  };

  const fetchShortlist = async () => {
    try {
      setLoadingShortlist(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE}/my-shortlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      setShortlistEntries(await res.json());
    } catch (err) {
      console.error('Error fetching shortlist:', err);
    } finally {
      setLoadingShortlist(false);
    }
  };

  const removeFromShortlist = async (propertyId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`${API_BASE}/shortlist/${propertyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setShortlistEntries((prev) => prev.filter((entry) => entry.property?._id !== propertyId));
    } catch (err) {
      console.error('Error removing shortlist entry:', err);
    }
  };

  const fetchContacted = async () => {
    try {
      setLoadingContacted(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_BASE}/my-interests?as=buyer`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      setContactedEntries(await res.json());
    } catch (err) {
      console.error('Error fetching contacted properties:', err);
    } finally {
      setLoadingContacted(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    fetchInterestCounts();
    fetchShortlist();
    fetchContacted();
  }, []);

  const handleCloseDeal = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to close the deal.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/properties/${id}/close`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setProperties((prev) => prev.map((p) => (p._id === id ? { ...p, dealStatus: 'closed' } : p)));
      } else {
        alert(data.error || 'Failed to close deal.');
      }
    } catch (err) {
      console.error('Error closing deal:', err);
      alert('Error closing the deal. Please try again.');
    }
  };

  const handleDeleteProperty = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to delete the property.');
      return;
    }
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/properties/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProperties((prev) => prev.filter((p) => p._id !== id));
      } else {
        alert(data.error || 'Failed to delete property.');
      }
    } catch (err) {
      console.error('Error deleting property:', err);
      alert('Error deleting the property. Please try again.');
    }
  };

  const categoryCounts = useMemo(() => ({
    all: properties.length,
    residential: properties.filter((p) => getCategory(p) === 'residential').length,
    commercial: properties.filter((p) => getCategory(p) === 'commercial').length
  }), [properties]);

  const propertiesInCategory = useMemo(
    () => properties.filter((p) => categoryFilter === 'all' || getCategory(p) === categoryFilter),
    [properties, categoryFilter]
  );

  const subCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: propertiesInCategory.length };
    propertiesInCategory.forEach((p) => {
      const key = getSubCategory(p);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [propertiesInCategory]);

  const propertiesInSubCategory = useMemo(
    () => propertiesInCategory.filter((p) => subCategoryFilter === 'all' || getSubCategory(p) === subCategoryFilter),
    [propertiesInCategory, subCategoryFilter]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: propertiesInSubCategory.length, active: 0, expired: 0, under_review: 0, rejected: 0 };
    propertiesInSubCategory.forEach((p) => {
      const bucket = getStatusBucket(p);
      counts[bucket] = (counts[bucket] || 0) + 1;
    });
    return counts;
  }, [propertiesInSubCategory]);

  const propertiesInStatus = useMemo(
    () => propertiesInSubCategory.filter((p) => statusFilter === 'all' || getStatusBucket(p) === statusFilter),
    [propertiesInSubCategory, statusFilter]
  );

  const localityOptions = useMemo(
    () => Array.from(new Set(propertiesInStatus.map((p) => p.locality).filter(Boolean))),
    [propertiesInStatus]
  );
  const propertyTypeOptions = useMemo(
    () => Array.from(new Set(propertiesInStatus.map((p) => p.developmentType).filter(Boolean))),
    [propertiesInStatus]
  );
  const bhkOptions = useMemo(
    () => Array.from(new Set(propertiesInStatus.map((p) => p.bedrooms).filter(Boolean))),
    [propertiesInStatus]
  );

  const visibleProperties = useMemo(
    () => propertiesInStatus.filter((p) =>
      (localityFilter === 'All' || p.locality === localityFilter) &&
      (propertyTypeFilter === 'All' || p.developmentType === propertyTypeFilter) &&
      (bhkFilter === 'All' || p.bedrooms === bhkFilter)
    ),
    [propertiesInStatus, localityFilter, propertyTypeFilter, bhkFilter]
  );

  const resetFilters = () => {
    setCategoryFilter('all');
    setSubCategoryFilter('all');
    setStatusFilter('all');
    setLocalityFilter('All');
    setPropertyTypeFilter('All');
    setBhkFilter('All');
  };

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

  const handleBuyPack = async (pack: { packSize: number; price: number; label: string }) => {
    if (buyerPaymentInProgressRef.current) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    buyerPaymentInProgressRef.current = true;
    setLoadingPack(pack.packSize);
    setBuyerPlanMessage('');

    try {
      await loadRazorpayCheckout();

      const orderResponse = await fetch(`${API_BASE}/buyer-contact-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packSize: pack.packSize })
      });
      const orderData = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(orderData.message || 'Failed to create Razorpay order');
      if (!window.Razorpay) throw new Error('Razorpay Checkout is not available');

      const checkout = new window.Razorpay({
        key: orderData.keyId || razorpayConfig.keyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency || 'INR',
        name: razorpayConfig.businessName,
        description: `Contact Access - ${pack.label}`,
        image: `${window.location.origin}${razorpayConfig.logoPath}`,
        order_id: orderData.order.id,
        prefill: {
          name: localStorage.getItem('name') || 'HomeFeet User',
          email: localStorage.getItem('email') || '',
          contact: localStorage.getItem('phone') ? `+91${localStorage.getItem('phone')}` : ''
        },
        notes: {
          packSize: String(pack.packSize),
          address: razorpayConfig.notesAddress
        },
        theme: { color: razorpayConfig.themeColor },
        handler: async (response) => {
          try {
            const verifyResponse = await fetch(`${API_BASE}/buyer-contact-payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
              body: JSON.stringify(response)
            });
            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok) throw new Error(verifyData.message || 'Payment verification failed');

            localStorage.setItem('buyerContactCredits', String(verifyData.user.buyerContactCredits || 0));
            localStorage.setItem('buyerFreeContactUsed', String(Boolean(verifyData.user.buyerFreeContactUsed)));
            setBuyerContactCredits(verifyData.user.buyerContactCredits || 0);
            setBuyerFreeContactUsed(Boolean(verifyData.user.buyerFreeContactUsed));
            setBuyerPlanMessage(`Payment successful. You now have ${verifyData.user.buyerContactCredits || 0} contact-reveal credit(s).`);
          } catch (error) {
            setBuyerPlanMessage(error instanceof Error ? error.message : 'Payment verification failed');
          } finally {
            buyerPaymentInProgressRef.current = false;
            setLoadingPack(0);
          }
        },
        modal: {
          ondismiss: () => {
            buyerPaymentInProgressRef.current = false;
            setLoadingPack(0);
          }
        }
      });

      checkout.open();
    } catch (error) {
      buyerPaymentInProgressRef.current = false;
      setLoadingPack(0);
      setBuyerPlanMessage(error instanceof Error ? error.message : 'Unable to start Razorpay payment');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
        <ListingsSidebar activePage="dashboard" />
        <main className="min-w-0 flex-1">
          <div className="mb-6 flex gap-2 border-b border-slate-200">
            {accountType === 'buyer' ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('shortlisted')}
                  className={`px-4 py-2 text-sm font-bold transition ${
                    activeTab === 'shortlisted' ? 'border-b-2 border-[#0AA6A6] text-[#0AA6A6]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Shortlisted Properties
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('contacted')}
                  className={`px-4 py-2 text-sm font-bold transition ${
                    activeTab === 'contacted' ? 'border-b-2 border-[#0AA6A6] text-[#0AA6A6]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Contacted Properties
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('posted')}
                className={`px-4 py-2 text-sm font-bold transition ${
                  activeTab === 'posted' ? 'border-b-2 border-[#0AA6A6] text-[#0AA6A6]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Posted Properties
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('subscription')}
              className={`px-4 py-2 text-sm font-bold transition ${
                activeTab === 'subscription' ? 'border-b-2 border-[#0AA6A6] text-[#0AA6A6]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Subscription Plans
            </button>
          </div>

          {activeTab === 'posted' && (
            <div>
              <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg bg-slate-950 p-6 text-white shadow-xl md:flex-row md:items-center">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-amber-300">Owner Desk</p>
                  <h1 className="mt-1 text-2xl font-black">Posted Properties</h1>
                  <p className="mt-2 text-slate-300">Track moderation status, edit submissions, and manage your listings.</p>
                </div>
                <button
                  onClick={() => navigate('/post-property')}
                  className="ld-btn-primary bg-white text-slate-950 hover:bg-teal-50"
                >
                  + Post New Property
                </button>
              </div>

              {loadingProperties ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-teal-600" />
                    <p className="mt-4 text-gray-600">Loading your properties...</p>
                  </div>
                </div>
              ) : propertiesError ? (
                <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
                  <p className="mb-4 text-red-600">{propertiesError}</p>
                  <button onClick={fetchProperties} className="rounded bg-teal-600 px-4 py-2 text-white hover:bg-teal-700">
                    Try Again
                  </button>
                </div>
              ) : properties.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
                  <p className="mb-4 text-lg text-gray-600">You haven't posted any properties yet.</p>
                  <button onClick={() => navigate('/post-property')} className="ld-btn-primary">
                    Post Your First Property
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 lg:flex-row">
                  <aside className="w-full shrink-0 rounded-lg border border-slate-200 bg-white p-4 lg:w-60">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Show</p>
                    <div className="space-y-2 text-sm font-semibold text-slate-700">
                      {(['all', 'residential', 'commercial'] as const).map((value) => (
                        <label key={value} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="category"
                            checked={categoryFilter === value}
                            onChange={() => { setCategoryFilter(value); setSubCategoryFilter('all'); }}
                            className="accent-[#0AA6A6]"
                          />
                          {value === 'all' ? 'All Properties' : value === 'residential' ? 'Residential Properties' : 'Commercial Properties'}
                          <span className="text-slate-400">({categoryCounts[value]})</span>
                        </label>
                      ))}
                    </div>

                    <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-slate-500">Sub-Category</p>
                    <div className="space-y-1.5 text-sm">
                      <button
                        type="button"
                        onClick={() => setSubCategoryFilter('all')}
                        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left font-semibold ${
                          subCategoryFilter === 'all' ? 'bg-teal-50 text-[#0AA6A6]' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        All <span>({subCategoryCounts.all || 0})</span>
                      </button>
                      {Object.entries(SUB_CATEGORY_LABELS).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSubCategoryFilter(value)}
                          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left font-semibold ${
                            subCategoryFilter === value ? 'bg-teal-50 text-[#0AA6A6]' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {label} <span>({subCategoryCounts[value] || 0})</span>
                        </button>
                      ))}
                    </div>

                    <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-slate-500">Status</p>
                    <div className="space-y-1.5 text-sm">
                      <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left font-semibold ${
                          statusFilter === 'all' ? 'bg-teal-50 text-[#0AA6A6]' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        All <span>({statusCounts.all || 0})</span>
                      </button>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setStatusFilter(value as StatusBucket)}
                          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left font-semibold ${
                            statusFilter === value ? 'bg-teal-50 text-[#0AA6A6]' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {label} <span>({statusCounts[value] || 0})</span>
                        </button>
                      ))}
                    </div>
                  </aside>

                  <div className="min-w-0 flex-1">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={localityFilter}
                          onChange={(e) => setLocalityFilter(e.target.value)}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
                        >
                          <option value="All">Locality</option>
                          {localityOptions.map((locality) => (
                            <option key={locality} value={locality}>{locality}</option>
                          ))}
                        </select>
                        <select
                          value={propertyTypeFilter}
                          onChange={(e) => setPropertyTypeFilter(e.target.value)}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
                        >
                          <option value="All">Property Type</option>
                          {propertyTypeOptions.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <select
                          value={bhkFilter}
                          onChange={(e) => setBhkFilter(e.target.value)}
                          className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
                        >
                          <option value="All">BHK</option>
                          {bhkOptions.map((bhk) => (
                            <option key={bhk} value={bhk}>{bhk}</option>
                          ))}
                        </select>
                        <button type="button" onClick={resetFilters} className="text-sm font-semibold text-teal-700 underline-offset-2 hover:underline">
                          Reset
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-slate-600">
                        Showing {visibleProperties.length} of {properties.length} properties
                      </p>
                    </div>

                    {visibleProperties.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
                        No properties match these filters.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {visibleProperties.map((property) => {
                          const bucket = getStatusBucket(property);
                          const statusStyles: Record<StatusBucket, string> = {
                            active: 'bg-emerald-100 text-emerald-700',
                            expired: 'bg-slate-200 text-slate-600',
                            under_review: 'bg-amber-100 text-amber-700',
                            rejected: 'bg-red-100 text-red-700'
                          };
                          const interestedCount = interestCounts[property._id] || 0;
                          return (
                            <div key={property._id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:flex">
                              <div className="relative h-44 w-full shrink-0 sm:h-auto sm:w-56">
                                <img
                                  src={getCardImageUrl(property) ? `${API_ORIGIN}${getCardImageUrl(property)}` : fallbackImage}
                                  alt={property.projectName || 'Property'}
                                  className={`h-full w-full ${isGeneratedDiagramPreview(property) ? 'bg-white object-contain p-2' : 'object-cover'}`}
                                  onError={(e) => {
                                    e.currentTarget.src = fallbackImage;
                                    e.currentTarget.className = 'h-full w-full object-cover';
                                  }}
                                />
                              </div>
                              <div className="flex-1 p-4">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-xs font-semibold text-slate-400">ID: {String(property._id).slice(-8).toUpperCase()}</p>
                                    <h3 className="text-lg font-bold text-slate-950">{property.projectName || 'Untitled Property'}</h3>
                                  </div>
                                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[bucket]}`}>
                                    {STATUS_LABELS[bucket]}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                                  <MapPin className="h-4 w-4 shrink-0" />
                                  <span className="truncate">{property.locality}, {property.city}</span>
                                </div>
                                <p className="mt-2 text-lg font-black text-[#0AA6A6]">{getDisplayPrice(property)}</p>

                                {property.status === 'rejected' && (
                                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <p>{property.rejectionReason || 'This listing was rejected by admin. Please edit and resubmit.'}</p>
                                  </div>
                                )}

                                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-500">
                                  <span>Posted: {formatDate(property.createdAt)}</span>
                                  <span>Expiring On: {formatDate(property.expiresAt)}</span>
                                  {interestedCount > 0 && (
                                    <Link to="/interested-in-your-properties" className="font-semibold text-teal-700 hover:underline">
                                      {interestedCount} interested buyer{interestedCount === 1 ? '' : 's'}
                                    </Link>
                                  )}
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Link to={`/project/${property._id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                    Advanced Details
                                  </Link>
                                  <button
                                    onClick={() => navigate(`/edit-property/${property._id}`)}
                                    className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"
                                  >
                                    <Pencil className="h-3.5 w-3.5" /> Edit
                                  </button>
                                  {property.dealStatus === 'open' ? (
                                    <button
                                      onClick={() => handleCloseDeal(property._id)}
                                      className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                                    >
                                      Close Deal
                                    </button>
                                  ) : (
                                    <button disabled className="cursor-not-allowed rounded-lg bg-slate-400 px-3 py-1.5 text-sm font-semibold text-white">
                                      Closed
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteProperty(property._id)}
                                    className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'shortlisted' && (
            <div>
              <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg bg-slate-950 p-6 text-white shadow-xl md:flex-row md:items-center">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-amber-300">Buyer Desk</p>
                  <h1 className="mt-1 text-2xl font-black">Shortlisted Properties</h1>
                  <p className="mt-2 text-slate-300">Properties you've saved for later. Use the heart icon on any property page to add more.</p>
                </div>
              </div>

              {loadingShortlist ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-teal-600" />
                </div>
              ) : shortlistEntries.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
                  <p className="text-lg text-gray-600">You haven't shortlisted any properties yet.</p>
                  <button onClick={() => navigate('/properties')} className="ld-btn-primary mt-4">
                    Browse Properties
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {shortlistEntries.map((entry) => {
                    const property = entry.property || {};
                    return (
                      <div key={entry._id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                        <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                          <img
                            src={getCardImageUrl(property) ? `${API_ORIGIN}${getCardImageUrl(property)}` : fallbackImage}
                            alt={property.projectName || 'Property'}
                            className={`h-full w-full ${isGeneratedDiagramPreview(property) ? 'bg-white object-contain p-2' : 'object-cover'}`}
                            onError={(e) => { e.currentTarget.src = fallbackImage; e.currentTarget.className = 'h-full w-full object-cover'; }}
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="text-base font-bold text-slate-950">{property.projectName || 'Untitled Property'}</h3>
                          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                            <MapPin className="h-3.5 w-3.5 shrink-0" /> {property.locality}, {property.city}
                          </p>
                          <p className="mt-2 text-base font-black text-[#0AA6A6]">{getDisplayPrice(property)}</p>
                          <div className="mt-3 flex gap-2">
                            <Link to={`/property/${property._id}`} className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">
                              View Details
                            </Link>
                            <button
                              onClick={() => removeFromShortlist(property._id)}
                              className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'contacted' && (
            <div>
              <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg bg-slate-950 p-6 text-white shadow-xl md:flex-row md:items-center">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-amber-300">Buyer Desk</p>
                  <h1 className="mt-1 text-2xl font-black">Contacted Properties</h1>
                  <p className="mt-2 text-slate-300">Owners you've requested contact for, and the status of each request.</p>
                </div>
              </div>

              {loadingContacted ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-teal-600" />
                </div>
              ) : contactedEntries.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
                  <p className="text-lg text-gray-600">You haven't requested owner contact for any property yet.</p>
                  <button onClick={() => navigate('/properties')} className="ld-btn-primary mt-4">
                    Browse Properties
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {contactedEntries.map((entry) => {
                    const property = entry.propertyId || {};
                    const statusStyles: Record<string, string> = {
                      requested: 'bg-amber-100 text-amber-700',
                      accepted: 'bg-emerald-100 text-emerald-700',
                      rejected: 'bg-red-100 text-red-700'
                    };
                    return (
                      <div key={entry._id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                        <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                          <img
                            src={getCardImageUrl(property) ? `${API_ORIGIN}${getCardImageUrl(property)}` : fallbackImage}
                            alt={property.projectName || 'Property'}
                            className={`h-full w-full ${isGeneratedDiagramPreview(property) ? 'bg-white object-contain p-2' : 'object-cover'}`}
                            onError={(e) => { e.currentTarget.src = fallbackImage; e.currentTarget.className = 'h-full w-full object-cover'; }}
                          />
                          <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[entry.status] || 'bg-slate-200 text-slate-600'}`}>
                            {entry.status}
                          </span>
                        </div>
                        <div className="p-4">
                          <h3 className="text-base font-bold text-slate-950">{property.projectName || 'Untitled Property'}</h3>
                          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                            <MapPin className="h-3.5 w-3.5 shrink-0" /> {property.locality}, {property.city}
                          </p>
                          {entry.contact?.phone && (
                            <p className="mt-2 text-sm font-bold text-teal-700">{entry.contact.phone}</p>
                          )}
                          <div className="mt-3 flex gap-2">
                            <Link to={`/property/${property._id}`} className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">
                              View Details
                            </Link>
                            {entry.contactUnlocked && (
                              <Link to={`/chat/${entry._id}`} className="rounded-lg bg-slate-950 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">
                                Chat
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!isAdmin && activeTab === 'subscription' && ['owner', 'mediator', 'buyer'].includes(accountType) && (
            <div>
              <h1 className="text-2xl font-black text-slate-950">Owner Contact Access</h1>
              <p className="mt-1 text-sm text-slate-600">
                Your first property's owner contact number is free. After that, send a request and wait for the owner
                to approve it, or buy a contact-reveal pack below for instant access without waiting.
              </p>

              <div className="mt-4 rounded-lg bg-teal-50 p-4 text-sm font-semibold text-teal-800">
                {buyerFreeContactUsed
                  ? 'Your free reveal has been used.'
                  : 'Your free reveal is available for your next property.'}
                {' '}You have {buyerContactCredits} paid credit{buyerContactCredits === 1 ? '' : 's'} remaining.
              </div>

              {buyerPlanMessage && (
                <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-teal-800">
                  {buyerPlanMessage}
                </div>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {BUYER_CONTACT_PACKS.map((pack) => (
                  <div key={pack.packSize} className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm">
                    <KeyRound className="mx-auto h-6 w-6 text-teal-700" />
                    <p className="mt-3 text-sm font-bold uppercase tracking-wide text-slate-500">{pack.label}</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">Rs. {pack.price.toLocaleString('en-IN')}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Rs. {Math.round(pack.price / pack.packSize).toLocaleString('en-IN')} per property
                    </p>
                    <button
                      type="button"
                      disabled={loadingPack === pack.packSize}
                      onClick={() => handleBuyPack(pack)}
                      className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0AA6A6] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#088f8f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingPack === pack.packSize ? 'Processing...' : <><Check className="h-4 w-4" /> Buy</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isAdmin && activeTab === 'subscription' && !['owner', 'mediator', 'buyer', 'builder'].includes(accountType) && (
            <div>
              <h1 className="text-2xl font-black text-slate-950">Subscription Plans</h1>
              <div className="mt-6 rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
                <p className="text-lg font-bold text-slate-800">Coming soon</p>
                <p className="mt-2 text-sm text-slate-500">Subscription plan details are not available to view yet. Check back soon.</p>
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (isAdmin || accountType === 'builder') && (
            <div>
              <h1 className="text-2xl font-black text-slate-950">Subscription Plans</h1>
              <p className="mt-1 text-sm text-slate-600">Boost your property's visibility with a plan built for Owners and Agents.</p>

              {message && (
                <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-teal-800">
                  {message}
                </div>
              )}

              <div className="mt-6 overflow-x-auto">
                <div className="grid min-w-[800px] grid-cols-[220px_repeat(3,1fr)] gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
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
            </div>
          )}
        </main>
      </div>

      {showLoginModal && (
        <LoginModal stayOnPage onClose={() => setShowLoginModal(false)} onLoginSuccess={() => setShowLoginModal(false)} />
      )}
    </div>
  );
};

export default Dashboard;
