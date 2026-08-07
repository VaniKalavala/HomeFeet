import React from 'react';
import { Check, X } from 'lucide-react';

// Single source of truth for every subscription/pack plan in the app.
// Dashboard.tsx (the real purchase flow) and AdminPanel.tsx (the admin-only
// overview) both import from here, so the two views can never show
// different prices or features for the same plan.

export type PlanTier = {
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
  matchingBuyers: boolean;
  mostPopular?: boolean;
};

// Shared by Owner, Agent (Mediator), and Builder accounts - all three
// account types purchase from this same tier list.
export const PLAN_TIERS: PlanTier[] = [
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
    matchingBuyers: true
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
    propertyReport: true,
    matchingBuyers: true
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
    assuredRank: '1st Rank',
    socialMedia: true,
    shorts: false,
    propertyReport: true,
    matchingBuyers: true,
    mostPopular: true
  }
];

// Pay-per-reveal packs for unlocking another listing's owner/mediator
// contact details - works the same way for every account type (owner,
// mediator, builder, buyer). This is now the only paid path to unlock
// contacts beyond the free allowance; the old marketplace-wide
// subscription tier (Quarterly/Half-Yearly/Yearly) has been retired.
export const BUYER_CONTACT_PACKS = [
  { packSize: 1, price: 199, label: '1 Property' },
  { packSize: 5, price: 1000, label: '5 Properties' },
  { packSize: 10, price: 2000, label: '10 Properties' }
];

export const FEATURE_ROWS: Array<{
  label: string;
  render: (tier: PlanTier) => React.ReactNode;
}> = [
  { label: 'Plan Validity', render: (tier) => tier.validity },
  { label: 'Position in search result', render: (tier) => tier.slot },
  { label: 'Privacy of Your Phone Number', render: (tier) => (tier.phonePrivacy ? <Check className="mx-auto h-4 w-4 text-teal-600" /> : <X className="mx-auto h-4 w-4 text-slate-300" />) },
  { label: 'Assured 1st Rank in Search Results', render: (tier) => (tier.assuredRank ? <Check className="mx-auto h-4 w-4 text-teal-600" /> : <X className="mx-auto h-4 w-4 text-slate-300" />) },
  { label: 'Social Media Marketing', render: (tier) => (tier.socialMedia ? <Check className="mx-auto h-4 w-4 text-teal-600" /> : <X className="mx-auto h-4 w-4 text-slate-300" />) },
  { label: 'Property Report', render: (tier) => (tier.propertyReport ? <Check className="mx-auto h-4 w-4 text-teal-600" /> : <X className="mx-auto h-4 w-4 text-slate-300" />) },
  { label: 'Matching Buyers', render: (tier) => (tier.matchingBuyers ? <Check className="mx-auto h-4 w-4 text-teal-600" /> : <X className="mx-auto h-4 w-4 text-slate-300" />) }
];
