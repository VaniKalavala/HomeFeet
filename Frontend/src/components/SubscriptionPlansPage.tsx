import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, FileText, KeyRound } from 'lucide-react';
import { API_BASE } from '../lib/api';
import { PLAN_TIERS, FEATURE_ROWS, BUYER_CONTACT_PACKS, PlanTier } from '../lib/plans';
import { RAZORPAY_CHECKOUT_URL, razorpayConfig } from '../config/razorpay.config';
import LoginModal from './LoginModal';

type MarketplaceStats = {
  builders: number;
  owners: number;
  mediators: number;
  ownersAndMediators: number;
  approvedProperties: number;
};

// This page hosts the two real Subscribe/Buy paths in the app: the
// Owner/Agent/Builder visibility-boost tiers (PLAN_TIERS) and the Contact
// Reveal Packs (pay-per-reveal, works the same way for every account type).
// A third product - a marketplace-wide "unlock everything" subscription -
// used to live here too (and, before that, on its own /owner-mediator-
// membership and /builder-membership pages); it's been retired in favor
// of Contact Reveal Packs / free credits for everyone. Both remaining
// flows run real Razorpay checkouts against the same backend endpoints
// Dashboard.tsx already used.
export default function SubscriptionPlansPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [marketplaceStats, setMarketplaceStats] = useState<MarketplaceStats>({
    builders: 0,
    owners: 0,
    mediators: 0,
    ownersAndMediators: 0,
    approvedProperties: 0,
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  // Whichever "Subscribe"/"Buy" action was blocked by a missing login gets
  // stored here and re-run automatically once the login modal succeeds -
  // so the user doesn't have to click Subscribe twice.
  const pendingActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMarketplaceStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/marketplace-stats`);
        const data = await response.json();
        if (!response.ok) throw new Error('Unable to load marketplace stats');
        if (!cancelled) {
          setMarketplaceStats({
            builders: Number(data.builders || 0),
            owners: Number(data.owners || 0),
            mediators: Number(data.mediators || 0),
            ownersAndMediators: Number(data.ownersAndMediators || 0),
            approvedProperties: Number(data.approvedProperties || 0),
          });
        }
      } catch (error) {
        console.error('Marketplace stats load error:', error);
      }
    };

    loadMarketplaceStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const redirectParam = searchParams.get('redirect');
  const redirectTo = redirectParam && redirectParam.startsWith('/') ? redirectParam : '';

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

  // ---------------------------------------------------------------------
  // Owner / Agent (Mediator) / Builder visibility-boost plans (PLAN_TIERS)
  // ---------------------------------------------------------------------
  const [selectedOwnerTierValue, setSelectedOwnerTierValue] = useState(
    () => PLAN_TIERS.find((tier) => tier.mostPopular)?.value || PLAN_TIERS[0].value
  );
  const [ownerPlanLoadingTier, setOwnerPlanLoadingTier] = useState('');
  const [ownerPlanMessage, setOwnerPlanMessage] = useState('');
  const ownerPlanPaymentInProgressRef = useRef(false);
  const selectedOwnerTier = PLAN_TIERS.find((tier) => tier.value === selectedOwnerTierValue) || PLAN_TIERS[0];

  const handleSubscribeOwnerPlan = async (tier: PlanTier) => {
    if (ownerPlanPaymentInProgressRef.current) return;

    const token = localStorage.getItem('token');
    if (!token) {
      pendingActionRef.current = () => handleSubscribeOwnerPlan(tier);
      setShowLoginModal(true);
      return;
    }

    const accountType = localStorage.getItem('accountType') || '';
    if (!['owner', 'mediator', 'builder'].includes(accountType)) {
      setOwnerPlanMessage('These plans are available for Owner, Agent (Mediator), and Builder accounts only.');
      return;
    }

    ownerPlanPaymentInProgressRef.current = true;
    setOwnerPlanLoadingTier(tier.value);
    setOwnerPlanMessage('');

    try {
      await loadRazorpayCheckout();

      const orderResponse = await fetch(`${API_BASE}/owner-plan-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier: tier.value })
      });
      const orderData = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(orderData.message || 'Failed to create Razorpay order');
      if (!window.Razorpay) throw new Error('Razorpay Checkout is not available');

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
        notes: { tier: tier.value, address: razorpayConfig.notesAddress },
        theme: { color: razorpayConfig.themeColor },
        handler: async (response: any) => {
          try {
            const verifyResponse = await fetch(`${API_BASE}/owner-plan-payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
              body: JSON.stringify(response)
            });
            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok) throw new Error(verifyData.message || 'Payment verification failed');

            localStorage.setItem('ownerPlanTier', verifyData.user.ownerPlanTier || 'none');
            localStorage.setItem('ownerPlanExpiresAt', verifyData.user.ownerPlanExpiresAt || '');
            setOwnerPlanMessage('Payment successful. Your plan is now active.');
            if (redirectTo) window.setTimeout(() => navigate(redirectTo), 800);
          } catch (error) {
            setOwnerPlanMessage(error instanceof Error ? error.message : 'Payment verification failed');
          } finally {
            ownerPlanPaymentInProgressRef.current = false;
            setOwnerPlanLoadingTier('');
          }
        },
        modal: {
          ondismiss: () => {
            ownerPlanPaymentInProgressRef.current = false;
            setOwnerPlanLoadingTier('');
          }
        }
      });

      checkout.open();
    } catch (error) {
      ownerPlanPaymentInProgressRef.current = false;
      setOwnerPlanLoadingTier('');
      setOwnerPlanMessage(error instanceof Error ? error.message : 'Unable to start Razorpay payment');
    }
  };

  // ---------------------------------------------------------------------
  // Contact Reveal Packs - pay-per-reveal, works the same way for every
  // account type (owner/mediator/builder/buyer): 1-2 free reveals, then
  // top up with a pack. This is now the only way to unlock someone else's
  // contact details beyond the free allowance - no marketplace-wide
  // subscription tier anymore.
  // ---------------------------------------------------------------------
  const [loadingPackSize, setLoadingPackSize] = useState(0);
  const [buyerPackMessage, setBuyerPackMessage] = useState('');
  const buyerPackPaymentInProgressRef = useRef(false);

  const handleBuyPack = async (pack: { packSize: number; price: number; label: string }) => {
    if (buyerPackPaymentInProgressRef.current) return;

    const token = localStorage.getItem('token');
    if (!token) {
      pendingActionRef.current = () => handleBuyPack(pack);
      setShowLoginModal(true);
      return;
    }

    buyerPackPaymentInProgressRef.current = true;
    setLoadingPackSize(pack.packSize);
    setBuyerPackMessage('');

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
        notes: { packSize: String(pack.packSize), address: razorpayConfig.notesAddress },
        theme: { color: razorpayConfig.themeColor },
        handler: async (response: any) => {
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
            setBuyerPackMessage(`Payment successful. You now have ${verifyData.user.buyerContactCredits || 0} contact-reveal credit(s).`);
            if (redirectTo) window.setTimeout(() => navigate(redirectTo), 800);
          } catch (error) {
            setBuyerPackMessage(error instanceof Error ? error.message : 'Payment verification failed');
          } finally {
            buyerPackPaymentInProgressRef.current = false;
            setLoadingPackSize(0);
          }
        },
        modal: {
          ondismiss: () => {
            buyerPackPaymentInProgressRef.current = false;
            setLoadingPackSize(0);
          }
        }
      });

      checkout.open();
    } catch (error) {
      buyerPackPaymentInProgressRef.current = false;
      setLoadingPackSize(0);
      setBuyerPackMessage(error instanceof Error ? error.message : 'Unable to start Razorpay payment');
    }
  };

  return (
    <div className="bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=85"
          alt="Real estate marketplace"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/40" />
        <div className="ld-container relative py-20">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-300">Subscription Plans</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
            Choose the right access for the HomeFeet marketplace.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
            Builders, owners, mediators, and buyers get focused access paths while property posting and contact access stay controlled.
          </p>
        </div>
      </section>

      {/* Owner / Agent (Mediator) / Builder visibility-boost plans */}
      <section className="bg-white py-20">
        <div className="ld-container">
          <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-slate-500">
            <span className="h-px w-9 bg-slate-400" />
            For Owners, Agents (Mediators) &amp; Builders
          </div>
          <h2 className="mt-6 max-w-3xl text-3xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
            Post for free. Pay only to boost{' '}
            <span className="bg-gradient-to-r from-[#0AA6A6] to-[#0077CC] bg-clip-text text-transparent">visibility</span>.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700">
            The same three plans apply whether you sign up as an Owner, an Agent (Mediator), or a Builder - property
            posting is always free, these plans just control how visible your listing is and what extra support comes
            with it. Pick a plan below, then Subscribe Now.
          </p>

          <div className="mt-10 overflow-x-auto">
            <div className="grid min-w-[800px] grid-cols-[220px_repeat(3,1fr)] gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 shadow-xl shadow-slate-200/70">
              <div className="bg-white p-5" />
              {PLAN_TIERS.map((tier) => {
                const isSelected = tier.value === selectedOwnerTierValue;
                return (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => setSelectedOwnerTierValue(tier.value)}
                    className={`relative bg-white p-5 text-center transition ${isSelected ? 'ring-2 ring-[#0AA6A6]' : 'hover:bg-slate-50'}`}
                  >
                    {tier.mostPopular && (
                      <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold uppercase text-pink-600">
                        Most Popular
                      </span>
                    )}
                    <span className={`mx-auto mt-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${isSelected ? 'border-[#0AA6A6]' : 'border-slate-300'}`}>
                      <span className={`h-2.5 w-2.5 rounded-full transition ${isSelected ? 'bg-[#0AA6A6]' : 'bg-transparent'}`} />
                    </span>
                    <p className="mt-2 text-lg font-black text-slate-950">{tier.label}</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">Rs. {tier.price.toLocaleString('en-IN')}</p>
                    <p className="mt-1 text-xs font-semibold text-teal-700">{tier.visibility} Listing Visibility</p>
                  </button>
                );
              })}

              {FEATURE_ROWS.map((row) => (
                <div key={row.label} className="contents">
                  <div className="bg-white p-4 text-sm font-semibold text-slate-700">{row.label}</div>
                  {PLAN_TIERS.map((tier) => (
                    <div key={`${row.label}-${tier.value}`} className="bg-white p-4 text-center text-sm text-slate-700">
                      {row.render(tier)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-600">Selected plan:</span>
              <span className="font-black text-slate-950">{selectedOwnerTier.label}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3 text-sm">
              <span className="font-semibold text-slate-600">Total Amount:</span>
              <span className="text-lg font-black text-slate-950">Rs. {selectedOwnerTier.price.toLocaleString('en-IN')}</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
              <FileText className="h-4 w-4 text-slate-500" />
              GST Invoice Available
            </div>
            <button
              type="button"
              onClick={() => handleSubscribeOwnerPlan(selectedOwnerTier)}
              disabled={Boolean(ownerPlanLoadingTier)}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0AA6A6] px-6 py-3 text-center text-sm font-black leading-tight text-white shadow-md shadow-teal-100 transition hover:-translate-y-0.5 hover:bg-[#088f8f] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
            >
              {ownerPlanLoadingTier ? 'Opening Razorpay...' : 'Subscribe Now'} <ArrowRight className="h-5 w-5" />
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-slate-600">
              <span>Secured by</span>
              <span className="inline-flex items-center gap-0.5 font-black italic text-[#1f5fbf]">Razorpay</span>
            </p>
          </div>
          {ownerPlanMessage && (
            <p className="mx-auto mt-4 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-800">
              {ownerPlanMessage}
            </p>
          )}
          <p className="mt-4 text-center text-xs font-semibold text-slate-500">
            {marketplaceStats.ownersAndMediators} Owners/Agents (Mediators) and {marketplaceStats.builders} Builders already onboarded.
          </p>
        </div>
      </section>

      {/* Contact Reveal Packs - pay-per-reveal, same mechanism for every account type */}
      <section className="relative overflow-hidden bg-slate-50 py-20">
        <div className="ld-container">
          <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-slate-500">
            <span className="h-px w-9 bg-slate-400" />
            For Owners, Agents (Mediators), Builders &amp; Buyers
          </div>
          <h2 className="mt-6 max-w-3xl text-3xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
            Pay only to unlock the contacts you actually need.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700">
            Viewing another listing's full property and owner-contact details starts with a free reveal or two - after
            that, top up with a pack. No subscription required, and it works the same way whether you're an Owner,
            Agent (Mediator), Builder, or Buyer.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {BUYER_CONTACT_PACKS.map((pack) => (
              <div key={pack.packSize} className="flex flex-col rounded-xl border border-teal-200 bg-white p-6 text-center shadow-xl shadow-slate-200/70">
                <KeyRound className="mx-auto h-7 w-7 text-[#0AA6A6]" />
                <p className="mt-3 text-sm font-bold uppercase tracking-wide text-slate-500">{pack.label}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">Rs. {pack.price.toLocaleString('en-IN')}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Rs. {Math.round(pack.price / pack.packSize).toLocaleString('en-IN')} per property
                </p>
                <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-teal-700">
                  <Check className="h-4 w-4" /> Unlocks {pack.packSize} contact{pack.packSize === 1 ? '' : 's'}
                </p>
                <button
                  type="button"
                  onClick={() => handleBuyPack(pack)}
                  disabled={loadingPackSize === pack.packSize}
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0AA6A6] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#088f8f] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loadingPackSize === pack.packSize ? 'Opening Razorpay...' : 'Subscribe Now'}
                </button>
              </div>
            ))}
          </div>

          {buyerPackMessage && (
            <p className="mx-auto mt-6 max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-800">
              {buyerPackMessage}
            </p>
          )}
          <p className="mt-6 text-xs font-semibold text-slate-500">
            {marketplaceStats.approvedProperties} verified listings available to unlock right now.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Not ready to pay per property? <Link to="/properties" className="font-semibold text-teal-700 hover:underline">Browse listings</Link> first.
          </p>
        </div>
      </section>

      {showLoginModal && (
        <LoginModal
          stayOnPage
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false);
            pendingActionRef.current?.();
            pendingActionRef.current = null;
          }}
        />
      )}
    </div>
  );
}
