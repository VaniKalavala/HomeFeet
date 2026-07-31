import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Check, X, Loader2 } from 'lucide-react';
import { API_BASE } from '../lib/api';

type PaymentType = 'membership' | 'ownerplan' | 'buyercontact' | null;

const successMessageByType: Record<string, string> = {
  membership: 'Payment successful. Membership activated.',
  ownerplan: 'Payment successful. Your plan is now active.',
  buyercontact: 'Payment successful. Contact-reveal credits added to your account.'
};

export default function PaymentStatusPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(true);

  const status = searchParams.get('status') === 'success' ? 'success' : 'failed';
  const type = searchParams.get('type') as PaymentType;
  const redirectTo = searchParams.get('redirectTo');
  const reason = searchParams.get('reason');

  useEffect(() => {
    const refreshUser = async () => {
      if (status !== 'success') {
        setRefreshing(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) return;

        const user = data.user;
        if (type === 'membership') {
          localStorage.setItem('builderSubscriptionPlan', user.builderSubscriptionPlan || 'none');
          localStorage.setItem('builderSubscriptionExpiresAt', user.builderSubscriptionExpiresAt || '');
        } else if (type === 'ownerplan') {
          localStorage.setItem('ownerPlanTier', user.ownerPlanTier || 'none');
          localStorage.setItem('ownerPlanExpiresAt', user.ownerPlanExpiresAt || '');
        } else if (type === 'buyercontact') {
          localStorage.setItem('buyerContactCredits', String(user.buyerContactCredits || 0));
          localStorage.setItem('buyerFreeContactUsed', String(Boolean(user.buyerFreeContactUsed)));
        }
      } finally {
        setRefreshing(false);
      }
    };

    refreshUser();
  }, [status, type]);

  useEffect(() => {
    if (status !== 'success' || refreshing) return;
    const fallback = type === 'membership' ? (redirectTo || '/properties') : '/dashboard';
    const timer = window.setTimeout(() => navigate(fallback), 1500);
    return () => window.clearTimeout(timer);
  }, [status, refreshing, type, redirectTo, navigate]);

  const failureMessage = reason === 'invalid_signature'
    ? 'We could not verify this payment. If an amount was deducted, it will be refunded automatically.'
    : 'Payment was not completed. No amount has been charged.';

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {refreshing ? (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-teal-700" />
            <p className="mt-4 text-sm font-semibold text-slate-600">Confirming your payment...</p>
          </>
        ) : status === 'success' ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-7 w-7 text-emerald-600" />
            </div>
            <h1 className="mt-4 text-xl font-black text-slate-950">Payment successful</h1>
            <p className="mt-2 text-sm text-slate-600">{type ? successMessageByType[type] : 'Your payment was completed.'}</p>
            <p className="mt-4 text-xs text-slate-400">Redirecting you now...</p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <X className="h-7 w-7 text-red-600" />
            </div>
            <h1 className="mt-4 text-xl font-black text-slate-950">Payment not completed</h1>
            <p className="mt-2 text-sm text-slate-600">{failureMessage}</p>
            <Link to="/dashboard" className="ld-btn-primary mt-6 inline-flex">
              Back to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
