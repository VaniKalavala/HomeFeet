import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, KeyRound } from 'lucide-react';
import { API_BASE } from '../lib/api';
import { PLAN_TIERS, FEATURE_ROWS, BUYER_CONTACT_PACKS } from '../lib/plans';

type MarketplaceStats = {
  builders: number;
  owners: number;
  mediators: number;
  ownersAndMediators: number;
  approvedProperties: number;
};

export default function SubscriptionPlansPage() {
  const [marketplaceStats, setMarketplaceStats] = useState<MarketplaceStats>({
    builders: 0,
    owners: 0,
    mediators: 0,
    ownersAndMediators: 0,
    approvedProperties: 0,
  });

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

  const builderRedirect = encodeURIComponent('/properties?view=developers&listingIntent=sell');
  const ownerMediatorRedirect = encodeURIComponent('/properties');
  const buyerRedirect = encodeURIComponent('/properties?view=developers&listingIntent=sell');

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

      {/* Owner / Agent (Mediator) / Builder plans - one shared tier table */}
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
            with it.
          </p>

          <div className="mt-10 overflow-x-auto">
            <div className="grid min-w-[800px] grid-cols-[220px_repeat(3,1fr)] gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 shadow-xl shadow-slate-200/70">
              <div className="bg-white p-5" />
              {PLAN_TIERS.map((tier) => (
                <div
                  key={tier.value}
                  className={`relative bg-white p-5 text-center ${tier.mostPopular ? 'ring-2 ring-[#0AA6A6]' : ''}`}
                >
                  {tier.mostPopular && (
                    <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold uppercase text-pink-600">
                      Most Popular
                    </span>
                  )}
                  <p className="mt-3 text-lg font-black text-slate-950">{tier.label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">Rs. {tier.price.toLocaleString('en-IN')}</p>
                  <p className="mt-1 text-xs font-semibold text-teal-700">{tier.visibility} Listing Visibility</p>
                </div>
              ))}

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

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              to={`/owner-mediator-membership?redirect=${ownerMediatorRedirect}`}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-amber-400 bg-amber-300 px-6 py-3 text-center text-sm font-black leading-tight text-slate-950 shadow-md shadow-amber-100 transition hover:-translate-y-0.5 hover:bg-amber-400 hover:shadow-lg"
            >
              Subscribe as Owner / Agent (Mediator) <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to={`/builder-membership?redirect=${builderRedirect}`}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-blue-600 bg-white px-6 py-3 text-center text-sm font-black leading-tight text-blue-700 shadow-md shadow-blue-100 transition hover:-translate-y-0.5 hover:bg-blue-600 hover:text-white hover:shadow-lg"
            >
              Subscribe as Builder <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-500">
            {marketplaceStats.ownersAndMediators} Owners/Agents (Mediators) and {marketplaceStats.builders} Builders already onboarded.
          </p>
        </div>
      </section>

      {/* Buyer contact packs - a separate, pay-per-reveal model */}
      <section className="relative overflow-hidden bg-slate-50 py-20">
        <div className="ld-container">
          <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-slate-500">
            <span className="h-px w-9 bg-slate-400" />
            For Buyers | Property Seekers
          </div>
          <h2 className="mt-6 max-w-3xl text-3xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
            Pay only to unlock the owners you actually want to talk to.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700">
            Buyer accounts don't use the tier plan above - your first owner or mediator contact reveal is free, and
            after that you pay per pack to unlock a set number of contacts, no subscription required.
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
                  <Check className="h-4 w-4" /> Unlocks {pack.packSize} owner contact{pack.packSize === 1 ? '' : 's'}
                </p>
              </div>
            ))}
          </div>

          <Link
            to={`/owner-mediator-membership?useCase=buyer&redirect=${buyerRedirect}`}
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#0AA6A6] bg-[#0AA6A6] px-6 py-3 text-center text-sm font-black leading-tight text-white shadow-md shadow-teal-100 transition hover:-translate-y-0.5 hover:bg-[#088f8f] hover:shadow-lg"
          >
            Subscribe as Buyer <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-3 text-xs font-semibold text-slate-500">
            {marketplaceStats.approvedProperties} verified listings available to unlock right now.
          </p>
        </div>
      </section>
    </div>
  );
}
