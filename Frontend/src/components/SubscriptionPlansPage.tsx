import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Crown, Search, Users } from 'lucide-react';
import { API_BASE } from '../lib/api';

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

  const membershipOfferings = [
    {
      icon: Users,
      title: 'For Builders',
      text: 'Access verified apartment and commercial space inventory for sale conversations and outright purchase.',
      stat: `${marketplaceStats.builders} Builders Onboarded`,
      action: 'Subscribe',
      to: `/builder-membership?redirect=${encodeURIComponent('/properties?view=developers&listingIntent=sell')}`,
      className: 'border-blue-200 bg-blue-50',
      buttonClassName: 'border-blue-600 bg-white text-blue-700 shadow-blue-100 hover:bg-blue-600 hover:text-white'
    },
    {
      icon: Crown,
      title: 'For Owners|Agents (Mediators)',
      text: 'Post property for free. Membership is only for viewing complete details from other owners and agents.',
      stat: `${marketplaceStats.ownersAndMediators} Owners/Agents (Mediators) Onboarded`,
      action: 'Subscribe',
      to: `/owner-mediator-membership?redirect=${encodeURIComponent('/properties')}`,
      className: 'border-amber-200 bg-amber-50',
      buttonClassName: 'border-amber-400 bg-amber-300 text-slate-950 shadow-amber-100 hover:bg-amber-400'
    },
    {
      icon: Search,
      title: 'Buyers | Property Seekers',
      text: 'Subscribe to explore sale flats and commercial space with controlled owner and mediator contact access.',
      stat: 'Sale flats and commercial space access',
      action: 'Subscribe',
      to: `/owner-mediator-membership?useCase=buyer&redirect=${encodeURIComponent('/properties?view=developers&listingIntent=sell')}`,
      className: 'border-teal-200 bg-teal-50',
      buttonClassName: 'border-[#0AA6A6] bg-[#0AA6A6] text-white shadow-teal-100 hover:bg-[#088f8f]'
    },
    {
      icon: Building2,
      title: 'For Corporates',
      text: 'Commercial space acquisition support for larger budgets, verified supply, and professional deal flow.',
      stat: `${marketplaceStats.approvedProperties} Verified Listings`,
      action: 'Corporate Space Acquisition',
      to: '/contact',
      className: 'border-emerald-200 bg-emerald-50',
      buttonClassName: 'border-blue-600 bg-white text-blue-700 shadow-blue-100 hover:bg-blue-600 hover:text-white'
    },
  ];

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
            Builders, owners, mediators, buyers, and corporates get focused access paths while property posting and contact access stay controlled.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-20">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-br from-[#E7FAF8] via-[#F8FCFF] to-[#EAF3FF] lg:block" />
        <div className="ld-container relative grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-slate-500">
              <span className="h-px w-9 bg-slate-400" />
              Subscription Plans
            </div>
            <h2 className="mt-6 max-w-2xl text-4xl font-black leading-[1.05] tracking-tight text-slate-950 md:text-6xl">
              Choose the right access for a more{' '}
              <span className="bg-gradient-to-r from-[#0AA6A6] to-[#0077CC] bg-clip-text text-transparent">
                transparent
              </span>{' '}
              market.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700">
              Builders, owners, mediators, and corporates get focused access paths while property posting and contact access stay controlled.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {membershipOfferings.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`flex min-h-[260px] flex-col rounded-lg border p-6 shadow-xl shadow-slate-200/70 ${item.className}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-7 w-7 shrink-0 text-[#0AA6A6]" />
                    <h3 className="min-w-0 whitespace-nowrap text-lg font-black leading-tight text-slate-950 sm:text-xl">{item.title}</h3>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-slate-800">{item.text}</p>
                  <p className="mt-auto pt-6 text-sm font-black text-slate-950">{item.stat}</p>
                  <Link
                    to={item.to}
                    className={`mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-center text-sm font-black leading-tight shadow-md transition hover:-translate-y-0.5 hover:shadow-lg ${item.buttonClassName}`}
                  >
                    {item.action} <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
