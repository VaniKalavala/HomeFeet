import { Link, Navigate, Routes, Route, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BedDouble,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  Filter,
  Heart,
  LockKeyhole,
  Landmark,
  MapPin,
  MapPinned,
  Newspaper,
  Rocket,
  Ruler,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  X,
  FileText
} from 'lucide-react';

import Navbar from './components/Navbar';
import ResetPassword from './components/ResetPassword';
import PostProperty from './components/PostProperty';
import PostPropertyChoice from './components/PostPropertyChoice';
import BuyerExpectedPropertyForm from './components/BuyerExpectedPropertyForm';
import PropertySummary from './components/PropertySummary';
import PropertyDetails from './components/PropertyDetails';
import AboutUs from './components/AboutUs';
import UserProfile from './components/UserProfile';
import InterestShown from './components/InterestShown';
import InterestedInYourProperties from './components/InterestedInYourProperties';
import UserPostedProperties from './components/UserPostedProperties';
import SearchBar from './components/SearchBar';
import Footer from './components/footer';
import AdminPanel from './components/AdminPanel';
import AdminChatbot from './components/AdminChatbot';
import PropertiesListingPage from './components/PropertiesListingPage';
import Dashboard from './components/Dashboard';
import { fetchHappeningProjects, getBuilderInitial, getBuilderLabel, getBuilderLogo, getProjectConfiguration, getProjectImage, getProjectPriceRange } from './lib/happeningProjects';
import ContactPage from './components/ContactPage';
import ChatPage from './components/ChatPage';
import LoginModal from './components/LoginModal';
import BrandName from './components/BrandName';
import LegalPage from './components/LegalPage';
import TestimonialsPage from './components/TestimonialsPage';
import SubscriptionPlansPage from './components/SubscriptionPlansPage';
import ComparisonPage from './components/ComparisonPage';
import AgentDirectory from './components/AgentDirectory';
import AgentProfile from './components/AgentProfile';
import { RAZORPAY_CHECKOUT_URL, razorpayConfig } from './config/razorpay.config';
import { API_BASE, API_ORIGIN } from './lib/api';

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color: string;
  };
  handler: (response: RazorpayCheckoutResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

type SeoConfig = {
  title: string;
  description: string;
  keywords?: string;
  noIndex?: boolean;
  image?: string;
};

const SITE_URL = 'https://www.homefeet.in';
const SITE_NAME = 'HomeFeet';
const DEFAULT_IMAGE = '/HomeFeet_Logo_Name.png';
const DEFAULT_KEYWORDS =
  'real estate, real estate near me, real estate for sale, real estate listings, real estate agent, real estate agency, real estate broker, real estate brokerage, real estate marketplace, ' +
  'apartment for sale, flats for sale, sale flats, house for sale, property for sale, luxury homes for sale, residential real estate, commercial real estate, commercial space for sale, investment property, ' +
  'verified property listings, verified real estate listings, builder listings, owner listings, mediator listings, buyer requirements, real estate investment, real estate market trends, best real estate agents, ' +
  'real estate Hyderabad, real estate Bengaluru, real estate Mumbai, Hyderabad apartments, Bengaluru flats, Mumbai commercial space, real estate agents in Hyderabad, ' +
  'property for sale in Hyderabad, flats for sale in Bengaluru, houses for sale in Hyderabad, Hyderabad real estate market';

const PROPERTIES_KEYWORDS =
  'apartment for sale, flats for sale, sale flats, commercial space for sale, property for sale, house for sale, luxury homes for sale, condos for sale, single-family homes, townhomes for sale, ' +
  'real estate listings, property listings, verified property listings, homes for sale in Hyderabad, flats for sale in Bengaluru, houses for sale in Mumbai, real estate market trends';

const POST_PROPERTY_KEYWORDS =
  'sell your home, sell your apartment, sell your flat, how to sell a home, sell your house, real estate listing agent, home selling process, home selling checklist, pricing your home to sell, ' +
  'real estate marketing, list your property, post property online, owner listings, real estate broker';

const BUYER_REQUIREMENT_KEYWORDS =
  'home for sale, how to buy a home, property for sale, house for sale, real estate agent, real estate buyers, first-time homebuyer, home buying process, home buying checklist, ' +
  'affordable homes for sale, move-in ready homes, buyer requirement, real estate agents in Hyderabad';

const DEFAULT_SEO: SeoConfig = {
  title: 'HomeFeet | Verified Marketplace for Apartments, Commercial Space & Buyers',
  description:
    'HomeFeet helps owners, mediators, builders, buyers, and property seekers share verified apartment sales, commercial space, and buyer information with admin-reviewed listings.',
  keywords: DEFAULT_KEYWORDS
};

const seoByPath: Record<string, SeoConfig> = {
  '/': {
    title: 'HomeFeet | Verified Marketplace for Apartments, Commercial Space & Buyers',
    description:
      'Discover verified owner listings, apartment sales, commercial space, buyer requirements, and builder contacts across Hyderabad, Bengaluru, Mumbai, and India.'
  },
  '/properties': {
    title: 'Verified Apartments, Flats & Commercial Space | HomeFeet',
    description:
      'Explore verified apartment sales, sale flats, commercial space, and buyer requirements with map view, filters, and controlled owner contact access.',
    keywords: PROPERTIES_KEYWORDS
  },
  '/properties-map': {
    title: 'Properties Map View | HomeFeet',
    description:
      'View verified apartment sales, sale flats, buyer requirements, and commercial space opportunities on an interactive city-wise map.'
  },
  '/post-property-options': {
    title: 'Post Property Options | HomeFeet',
    description:
      'Choose the full property form or quick property details flow to submit an apartment, flat, or commercial space for admin approval.'
  },
  '/post-property-summary': {
    title: 'Share Property Details Quickly | HomeFeet',
    description:
      'Paste a property summary, map link, and dimension image so HomeFeet can prepare a structured property listing for review.'
  },
  '/post-property': {
    title: 'Post a Verified Property | HomeFeet',
    description:
      'Submit apartment, flat, and commercial space details for admin review and verified listing publication.',
    keywords: POST_PROPERTY_KEYWORDS
  },
  '/buyer-requirement': {
    title: 'Buyer Requirement Form | HomeFeet',
    description:
      'Share buyer or property seeker requirements by property type, location, city, budget, area, and expected price range.',
    keywords: BUYER_REQUIREMENT_KEYWORDS
  },
  '/membership': {
    title: 'HomeFeet Membership Plans',
    description:
      'Choose membership access for builders, owners, mediators, buyers, property seekers, and corporate property acquisition teams.'
  },
  '/builder-membership': {
    title: 'Builder Membership | HomeFeet',
    description:
      'Builder membership for verified apartment sales opportunities, owner conversations, and commercial space workflows.'
  },
  '/owner-mediator-membership': {
    title: 'Owner & Agent (Mediator) Membership | HomeFeet',
    description:
      'Owner and agent (mediator) membership for controlled access to complete listing details from other verified property owners and agents.'
  },
  '/dashboard': {
    title: 'Dashboard | HomeFeet',
    description:
      'Manage your HomeFeet account and choose a subscription plan to boost your property listing visibility.',
    noIndex: true
  },
  '/about': {
    title: 'About HomeFeet | Verified Marketplace for Apartments, Commercial Space & Buyers',
    description:
      'Learn about HomeFeet, a professional platform for verified apartment sales, commercial space, moderated listings, and trusted buyer conversations.'
  },
  '/testimonials': {
    title: 'HomeFeet Testimonials | Marketplace Feedback',
    description:
      'Read city-wise testimonials from builders, owners, mediators, buyers, and property seekers using HomeFeet.'
  },
  '/subscription-plans': {
    title: 'Subscription Plans | HomeFeet',
    description:
      'Choose the right HomeFeet access plan for builders, owners, mediators, buyers, and corporates with controlled property posting and contact access.'
  },
  '/compare': {
    title: 'HomeFeet vs Housing.com, 99acres, MagicBricks, CommonFloor, NoBroker, Square Yards',
    description:
      'Compare HomeFeet to Housing.com, 99acres, MagicBricks, CommonFloor, NoBroker, and Square Yards. See why admin-reviewed listings and controlled owner contact access make HomeFeet a focused alternative for apartments and commercial space.',
    keywords:
      'HomeFeet vs Housing.com, HomeFeet vs 99acres, HomeFeet vs MagicBricks, HomeFeet vs CommonFloor, HomeFeet vs NoBroker, HomeFeet vs Square Yards, ' +
      'Housing.com alternative, 99acres alternative, MagicBricks alternative, CommonFloor alternative, NoBroker alternative, Square Yards alternative, ' +
      'best real estate portal India, verified real estate listings, real estate portal comparison'
  },
  '/contact': {
    title: 'Contact HomeFeet',
    description:
      'Contact HomeFeet for verified apartment and commercial space listings, owner and mediator support, builder contacts, and buyer information help.'
  },
  '/terms-and-conditions': {
    title: 'Terms and Conditions | HomeFeet',
    description: 'Review the HomeFeet terms and conditions for using the verified apartment, commercial space, and buyer information marketplace.'
  },
  '/privacy-policy': {
    title: 'Privacy Policy | HomeFeet',
    description: 'Read how HomeFeet handles privacy, controlled contact access, and marketplace user information.'
  },
  '/refund-and-cancellation': {
    title: 'Refund and Cancellation Policy | HomeFeet',
    description: 'Review the HomeFeet refund and cancellation policy for memberships and marketplace services.'
  }
};

const privateSeoPaths = [
  '/admin',
  '/profile',
  '/edit-property',
  '/chat',
  '/interest-shown',
  '/interested-in-your-properties',
  '/user-posted-properties',
  '/compare'
];

const getSeoConfig = (pathname: string): SeoConfig => {
  if (pathname.startsWith('/property/') || pathname.startsWith('/project/')) {
    return {
      title: 'Property Details | HomeFeet',
      description:
        'View verified property details, development terms, location, area, road access, and controlled owner contact access on HomeFeet.'
    };
  }

  if (privateSeoPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return {
      ...DEFAULT_SEO,
      title: 'Account Area | HomeFeet',
      description: 'Private HomeFeet account area.',
      noIndex: true
    };
  }

  return seoByPath[pathname] || DEFAULT_SEO;
};

const upsertMeta = (attribute: 'name' | 'property', key: string, content: string) => {
  let element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const upsertLink = (rel: string, href: string) => {
  let element = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
};

function SEOManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = getSeoConfig(pathname);
    const canonicalUrl = `${SITE_URL}${pathname === '/' ? '' : pathname}`;
    const imagePath = seo.image || DEFAULT_IMAGE;
    const imageUrl = imagePath.startsWith('http') ? imagePath : `${SITE_URL}${imagePath}`;
    const robots = seo.noIndex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';

    document.title = seo.title;
    upsertMeta('name', 'description', seo.description);
    upsertMeta('name', 'keywords', seo.keywords || DEFAULT_KEYWORDS);
    upsertMeta('name', 'author', SITE_NAME);
    upsertMeta('name', 'robots', robots);
    upsertMeta('name', 'theme-color', '#0f9f9a');
    upsertMeta('property', 'og:title', seo.title);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', 'en_IN');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', seo.title);
    upsertMeta('name', 'twitter:description', seo.description);
    upsertMeta('name', 'twitter:image', imageUrl);
    upsertLink('canonical', canonicalUrl);

    let jsonLd = document.getElementById('homefeet-jsonld') as HTMLScriptElement | null;
    if (!jsonLd) {
      jsonLd = document.createElement('script');
      jsonLd.id = 'homefeet-jsonld';
      jsonLd.type = 'application/ld+json';
      document.head.appendChild(jsonLd);
    }

    jsonLd.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: `${SITE_URL}/HomeFeet_logo.png`,
          contactPoint: [
            {
              '@type': 'ContactPoint',
              telephone: '+91 80190 08351',
              contactType: 'customer support',
              areaServed: 'IN',
              availableLanguage: ['English', 'Telugu', 'Hindi']
            }
          ]
        },
        {
          '@type': 'WebSite',
          name: SITE_NAME,
          url: SITE_URL,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE_URL}/properties?search={search_term_string}`,
            'query-input': 'required name=search_term_string'
          }
        }
      ]
    });
  }, [pathname]);

  return null;
}

const fallbackExclusiveProjectImage = 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80';

const hotSellingZones = ['All', 'West Zone', 'South Zone', 'Central Zone', 'East Zone', 'North Zone'];

// TODO: dummy hot-selling projects until real listings carry a zone tag; will be replaced once builder properties are added.
const hotSellingProjects = [
  { name: 'Prestige Golden Grove', location: 'Tellapur, Hyderabad', priceRange: 'Rs. 93.00 Lac to 2.48 Cr', zone: 'West Zone', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80' },
  { name: 'Brigade Enclave', location: 'Erragadda, Hyderabad', priceRange: 'Rs. 2.10 Cr to 3.15 Cr', zone: 'West Zone', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80' },
  { name: 'Brigade Manor', location: 'Moti Nagar, Hyderabad', priceRange: 'Rs. 2.35 Cr to 3.59 Cr', zone: 'West Zone', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' },
  { name: 'The Prestige City Hyderabad', location: 'Rajendra Nagar, Hyderabad', priceRange: 'Rs. 1.11 Cr to 3.19 Cr', zone: 'South Zone', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80' },
  { name: 'My Home Avatar', location: 'Narsingi, Hyderabad', priceRange: 'Rs. 1.50 Cr to 2.90 Cr', zone: 'South Zone', image: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=600&q=80' },
  { name: 'Ramky One Galaxia', location: 'Nallagandla, Hyderabad', priceRange: 'Rs. 85.00 Lac to 1.60 Cr', zone: 'West Zone', image: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=600&q=80' },
];

const cleanDevelopmentType = (value?: string) =>
  value ? value.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Project';

// TODO: dummy newly launched projects until real listings carry a launch date/status; will be replaced once builder properties are added.
const newlyLaunchedProjects = [
  { name: 'Prestige Sun Crest', location: 'Electronic City Phase 1, Bangalore', priceRange: 'Rs. 67.60 L Onwards', configuration: '1, 2, 3', sizeRange: '650 - 2005', builder: 'Prestige Group', image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80' },
  { name: 'Logipark Pristine O2 World', location: 'Wagholi, Pune', priceRange: 'Rs. 76.30 L Onwards', configuration: '1, 2, 3', sizeRange: '590 - 1220', builder: 'Logipark Warehousing', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' },
  { name: 'Brigade Insignia', location: 'Yelahanka, Bangalore', priceRange: 'Rs. 3.80 Cr Onwards', configuration: '3, 4', sizeRange: '1415 - 2180', builder: 'Brigade Group', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80' },
  { name: 'Max Estate 360', location: 'Sector 36A, Gurgaon', priceRange: 'Rs. 5.22 Cr Onwards', configuration: '3, 4', sizeRange: '2611 - 3531', builder: 'Max Estates', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80' },
];

// TODO: dummy curated picks until real listings carry builder logo/price-range metadata; will be replaced once builder properties are added.
const homeBannerSlides = [
  {
    title: 'Construction site illustration',
    image: '/banners/illustration-construction-site.jpg',
  },
  {
    title: 'Clean city skyline',
    image: '/banners/clean-city-skyline-banner.svg',
  },
  {
    title: 'Luxury villa evening',
    image: '/banners/luxury-villa-evening-banner.png',
  },
];

type PopularLocation = {
  name: string;
  image: string;
  note: string;
  count?: number;
  city?: string;
};

type MarketplaceStats = {
  builders: number;
  owners: number;
  mediators: number;
  ownersAndMediators: number;
  approvedProperties: number;
};

type MarketNewsUpdate = {
  category: string;
  title: string;
  summary: string;
  source: string;
  href: string;
};

type BuilderLogo = {
  name: string;
  domain: string;
  logo?: string;
  city?: string;
  website?: string;
};

const builderLogoUrls = (builder: BuilderLogo) => [
  ...(builder.logo ? [builder.logo] : []),
  ...(builder.domain ? [
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(builder.domain)}&sz=256`,
    `https://logo.clearbit.com/${builder.domain}?size=512`,
  ] : []),
];

const BuilderLogoCard = ({ builder, index }: { builder: BuilderLogo; index: number }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [logoIndex, setLogoIndex] = useState(0);
  const priorityLogo = index < 24;
  const logoSources = builderLogoUrls(builder);
  const logoSrc = logoSources[logoIndex];
  const hasMoreLogoSources = logoIndex < logoSources.length - 1;

  useEffect(() => {
    setLogoIndex(0);
    setIsLoaded(false);
  }, [builder.name, builder.domain, builder.logo]);

  useEffect(() => {
    setIsLoaded(false);
  }, [logoSrc]);

  useEffect(() => {
    if (!logoSrc || isLoaded || !hasMoreLogoSources) return;

    const fallbackTimer = window.setTimeout(() => {
      setLogoIndex((currentIndex) => (
        currentIndex < logoSources.length - 1 ? currentIndex + 1 : currentIndex
      ));
    }, 1400);

    return () => window.clearTimeout(fallbackTimer);
  }, [hasMoreLogoSources, isLoaded, logoSources.length, logoSrc]);

  return (
    <a
      href={builder.website || (builder.domain ? `https://${builder.domain}` : '#')}
      target="_blank"
      rel="noreferrer"
      className="ld-builder-logo-card"
      aria-label={`Open ${builder.name} website`}
    >
      <div className="ld-builder-logo-visual">
        <div className={`ld-builder-logo-fallback ${isLoaded ? 'opacity-0' : 'opacity-100'}`} />
        {logoSrc && (
          <img
            src={logoSrc}
            alt={`${builder.name} logo`}
            className={`ld-builder-logo-image ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading={priorityLogo ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priorityLogo ? 'high' : 'auto'}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setIsLoaded(false);
              if (hasMoreLogoSources) {
                setLogoIndex((currentIndex) => currentIndex + 1);
              }
            }}
          />
        )}
      </div>
      <span className="mt-3 line-clamp-1 max-w-[210px] text-center text-xs font-black leading-4 text-slate-700">
        {builder.name}
      </span>
    </a>
  );
};

type TopDeveloperHighlight = BuilderLogo & {
  tagline?: string;
  totalProjects?: number;
  experience?: number;
  readyToMove?: number;
  underConstruction?: number;
  newLaunch?: number;
};

// TODO: dummy stats until builder project inventory is tracked per-developer; will be replaced by real counts once builders start posting properties.
const topDeveloperHighlights: TopDeveloperHighlight[] = [
  { name: 'Aparna Constructions', domain: 'aparnaconstructions.com', tagline: 'Lead the future', totalProjects: 66, experience: 23, readyToMove: 47, underConstruction: 19 },
  { name: 'Ramky Estates', domain: 'ramkyestates.com', tagline: 'Towards sustainable growth', totalProjects: 31, experience: 20, readyToMove: 20, underConstruction: 8, newLaunch: 3 },
  { name: 'My Home Constructions', domain: 'myhomeconstructions.com', totalProjects: 29, readyToMove: 23, underConstruction: 5, newLaunch: 2 },
];

const TopDeveloperLogoBox = ({ builder }: { builder: BuilderLogo }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [logoIndex, setLogoIndex] = useState(0);
  const logoSources = builderLogoUrls(builder);
  const logoSrc = logoSources[logoIndex];
  const hasMoreLogoSources = logoIndex < logoSources.length - 1;

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className={`flex h-full w-full items-center justify-center text-sm font-black text-slate-400 ${isLoaded ? 'hidden' : ''}`}>
        {builder.name.charAt(0)}
      </div>
      {logoSrc && (
        <img
          src={logoSrc}
          alt={`${builder.name} logo`}
          className={`h-full w-full object-contain p-1.5 ${isLoaded ? '' : 'hidden'}`}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setIsLoaded(false);
            if (hasMoreLogoSources) setLogoIndex((current) => current + 1);
          }}
        />
      )}
    </div>
  );
};

const buildersByCity: Record<string, BuilderLogo[]> = {
  Hyderabad: [
    { name: 'Alterra Projects Pvt Ltd', domain: 'alterraprojects.com', logo: '/builders/alterra-projects-logo.png' },
    { name: 'Aparna Constructions', domain: 'aparnaconstructions.com' },
    { name: 'My Home Constructions', domain: 'myhomeconstructions.com' },
    { name: 'Rajapushpa Properties', domain: 'rajapushpa.in' },
    { name: 'Ramky Estates', domain: 'ramkyestates.com' },
    { name: 'SAS Infra', domain: 'sasinfra.com' },
    { name: 'Sumadhura Group', domain: 'sumadhuragroup.com' },
    { name: 'Vasavi Group', domain: 'vasavigroup.com' },
    { name: 'Vasavi Atlantis', domain: 'vasaviatlantis.com' },
    { name: 'Candeur Constructions', domain: 'candeurconstructions.com' },
    { name: 'Pacifica Companies', domain: 'pacificacompanies.co.in' },
    { name: 'Lansum Properties', domain: 'lansumproperties.com' },
    { name: 'Praneeth Group', domain: 'praneeth.com' },
    { name: 'Vertex Homes', domain: 'vertexhomes.com' },
    { name: 'Sattva Group', domain: 'sattvagroup.in' },
    { name: 'Brigade Group', domain: 'brigadegroup.com' },
    { name: 'Prestige Group', domain: 'prestigeconstructions.com' },
    { name: 'Godrej Properties', domain: 'godrejproperties.com' },
    { name: 'Lodha', domain: 'lodhagroup.in' },
    { name: 'Mahindra Lifespaces', domain: 'mahindralifespaces.com' },
    { name: 'Sobha', domain: 'sobha.com' },
    { name: 'NCC Urban', domain: 'nccurban.com' },
    { name: 'DSR Builders', domain: 'dsrbuilders.com' },
    { name: 'Hallmark Builders', domain: 'hallmarkbuilders.in' },
    { name: 'Srias Life Spaces', domain: 'sriaslifespaces.com' },
    { name: 'GHR Infra', domain: 'ghrinfra.com' },
    { name: 'Urbanrise', domain: 'urbanrise.in' },
    { name: 'Cybercity Builders', domain: 'cybercity.in' },
    { name: 'Raghava Projects', domain: 'raghavaprojects.com' },
    { name: 'Vajra Builders', domain: 'vajrabuilders.com' },
    { name: 'Janapriya', domain: 'janapriya.com' },
    { name: 'Team4 Life Spaces', domain: 'team4lifespaces.com' },
    { name: 'Sunshine Developers', domain: 'sunshine.co.in' },
    { name: 'One Developers', domain: 'onedevelopers.in' },
    { name: 'Meenakshi Group', domain: 'meenakshigroup.com' },
    { name: 'Legend Estates', domain: 'legendestates.com' },
    { name: 'Modi Builders', domain: 'modibuilders.com' },
    { name: 'Anuhar Homes', domain: 'anuhar.com' },
    { name: 'SMR Holdings', domain: 'smrholdings.in' },
    { name: 'Jayabheri Group', domain: 'jayabherigroup.com' },
    { name: 'Auro Realty', domain: 'aurorealty.com' },
    { name: 'EIPL Group', domain: 'eiplgroup.com' },
    { name: 'Western Constructions', domain: 'westernconstructions.com' },
    { name: 'Northstar Homes', domain: 'northstar.in' },
    { name: 'Greenmark Developers', domain: 'greenmarkdevelopers.com' },
    { name: 'Muppa Projects', domain: 'muppaprojects.com' },
    { name: 'IRA Realty', domain: 'irarealty.in' },
    { name: 'Aditya Construction', domain: 'adityacc.com' },
    { name: 'Manbhum Construction', domain: 'manbhum.com' },
    { name: 'Aakriti Housing', domain: 'aakritihousing.com' },
    { name: 'Sri Aditya Homes', domain: 'sriadityahomes.com' }
  ],
  Bengaluru: [
    { name: 'Prestige Group', domain: 'prestigeconstructions.com' },
    { name: 'Brigade Group', domain: 'brigadegroup.com' },
    { name: 'Sobha', domain: 'sobha.com' },
    { name: 'Sattva Group', domain: 'sattvagroup.in' },
    { name: 'Puravankara', domain: 'puravankara.com' },
    { name: 'Godrej Properties', domain: 'godrejproperties.com' },
    { name: 'Mahindra Lifespaces', domain: 'mahindralifespaces.com' },
    { name: 'Shriram Properties', domain: 'shriramproperties.com' },
    { name: 'Assetz Property Group', domain: 'assetzproperty.com' },
    { name: 'Provident Housing', domain: 'providenthousing.com' },
    { name: 'Total Environment', domain: 'total-environment.com' },
    { name: 'Century Real Estate', domain: 'centuryrealestate.in' },
    { name: 'Arvind SmartSpaces', domain: 'arvindsmartspaces.com' },
    { name: 'Adarsh Developers', domain: 'adarshdevelopers.com' },
    { name: 'Rohan Builders', domain: 'rohanbuilders.com' },
    { name: 'SNN Raj Corp', domain: 'snnrajcorp.com' },
    { name: 'Mana Projects', domain: 'manaprojects.com' },
    { name: 'DS-MAX Properties', domain: 'dsmaxproperties.com' },
    { name: 'Bren Corporation', domain: 'bren.com' },
    { name: 'Concorde Group', domain: 'concordegroup.in' },
    { name: 'Salarpuria Sattva', domain: 'sattvagroup.in' },
    { name: 'Embassy Group', domain: 'embassyindia.com' },
    { name: 'DivyaSree Developers', domain: 'divyasree.com' },
    { name: 'RMZ Corp', domain: 'rmzcorp.com' },
    { name: 'Vaishnavi Group', domain: 'vaishnavigroup.com' },
    { name: 'Nitesh Estates', domain: 'niteshestates.com' },
    { name: 'Sumadhura Group', domain: 'sumadhuragroup.com' },
    { name: 'Casagrand', domain: 'casagrand.co.in' },
    { name: 'Urbanrise', domain: 'urbanrise.in' },
    { name: 'Goyal & Co', domain: 'goyalco.com' }
  ],
  Chennai: [
    { name: 'Casagrand', domain: 'casagrand.co.in' },
    { name: 'Radiance Realty', domain: 'radiancerealty.in' },
    { name: 'Appaswamy Real Estates', domain: 'appaswamy.com' },
    { name: 'TVS Emerald', domain: 'tvsemerald.com' },
    { name: 'Puravankara', domain: 'puravankara.com' },
    { name: 'Sobha', domain: 'sobha.com' },
    { name: 'Godrej Properties', domain: 'godrejproperties.com' },
    { name: 'Mahindra Lifespaces', domain: 'mahindralifespaces.com' },
    { name: 'Brigade Group', domain: 'brigadegroup.com' },
    { name: 'Prestige Group', domain: 'prestigeconstructions.com' },
    { name: 'Akshaya', domain: 'akshaya.com' },
    { name: 'Arun Excello', domain: 'arunexcello.com' },
    { name: 'Baashyaam Constructions', domain: 'baashyaamgroup.com' },
    { name: 'DRA Homes', domain: 'drahomes.in' },
    { name: 'Urbanrise', domain: 'urbanrise.in' },
    { name: 'Lancor Holdings', domain: 'lancor.in' },
    { name: 'KG Builders', domain: 'kgbuilders.com' },
    { name: 'VGN Homes', domain: 'vgn.in' },
    { name: 'Alliance Group', domain: 'alliancein.com' },
    { name: 'SPR India', domain: 'sprindia.com' },
    { name: 'DAC Developers', domain: 'dacdevelopers.com' },
    { name: 'Navins', domain: 'navins.in' },
    { name: 'SIS Group', domain: 'southindiashelters.com' },
    { name: 'Jones Foundations', domain: 'jonesfoundations.com' },
    { name: 'Isha Homes', domain: 'ishahomes.com' },
    { name: 'ETA Star', domain: 'etastar.com' },
    { name: 'Pacifica Companies', domain: 'pacificacompanies.co.in' },
    { name: 'Shriram Properties', domain: 'shriramproperties.com' }
  ],
  Pune: [
    { name: 'Kolte Patil', domain: 'koltepatil.com' },
    { name: 'Gera Developments', domain: 'gera.in' },
    { name: 'Kumar Properties', domain: 'kumarproperties.com' },
    { name: 'Godrej Properties', domain: 'godrejproperties.com' },
    { name: 'Mahindra Lifespaces', domain: 'mahindralifespaces.com' },
    { name: 'Lodha', domain: 'lodhagroup.in' },
    { name: 'VTP Realty', domain: 'vtprealty.in' },
    { name: 'Nyati Group', domain: 'nyatigroup.com' },
    { name: 'Puraniks', domain: 'puraniks.in' },
    { name: 'Kohinoor Group', domain: 'kohinoorpune.com' },
    { name: 'Rohan Builders', domain: 'rohanbuilders.com' },
    { name: 'Rohan Abhilasha', domain: 'rohanbuilders.com' },
    { name: 'Panchshil Realty', domain: 'panchshil.com' },
    { name: 'Marvel Realtors', domain: 'marvelrealtors.com' },
    { name: 'Goel Ganga Group', domain: 'goelgangagroup.com' },
    { name: 'Mittal Brothers', domain: 'mittalbrothers.com' },
    { name: 'Kasturi Housing', domain: 'kasturi.com' },
    { name: 'Mantra Properties', domain: 'mantraproperties.in' },
    { name: 'Majestique Landmarks', domain: 'majestiqueproperties.com' },
    { name: 'Paranjape Schemes', domain: 'pscl.in' },
    { name: 'Naiknavare Developers', domain: 'naiknavare.com' },
    { name: 'Pharande Spaces', domain: 'pharandespaces.com' },
    { name: 'Tejraj Group', domain: 'tejrajgroup.com' },
    { name: 'BramhaCorp', domain: 'bramhacorp.in' },
    { name: 'K Raheja Corp Homes', domain: 'krahejacorphomes.com' },
    { name: 'Yashada Realty', domain: 'yashadarealty.com' },
    { name: 'Vilas Javdekar', domain: 'vilasjavdekar.com' },
    { name: 'Ceratec Group', domain: 'ceratecgroup.com' }
  ],
  Mumbai: [
    { name: 'Lodha', domain: 'lodhagroup.in' },
    { name: 'Godrej Properties', domain: 'godrejproperties.com' },
    { name: 'Oberoi Realty', domain: 'oberoirealty.com' },
    { name: 'Runwal', domain: 'runwal.com' },
    { name: 'Rustomjee', domain: 'rustomjee.com' },
    { name: 'Hiranandani', domain: 'hiranandani.com' },
    { name: 'Kalpataru', domain: 'kalpataru.com' },
    { name: 'Mahindra Lifespaces', domain: 'mahindralifespaces.com' },
    { name: 'Prestige Group', domain: 'prestigeconstructions.com' },
    { name: 'Piramal Realty', domain: 'piramalrealty.com' },
    { name: 'K Raheja Corp Homes', domain: 'krahejacorphomes.com' },
    { name: 'Hiranandani Group', domain: 'hiranandani.com' },
    { name: 'Adani Realty', domain: 'adanirealty.com' },
    { name: 'Tata Housing', domain: 'tatahousing.in' },
    { name: 'Tata Realty', domain: 'tatarealty.in' },
    { name: 'Wadhwa Group', domain: 'thewadhwagroup.com' },
    { name: 'Marathon Realty', domain: 'marathonrealty.com' },
    { name: 'Nahar Group', domain: 'nahargroup.co.in' },
    { name: 'Kanakia Spaces', domain: 'kanakia.com' },
    { name: 'Sheth Creators', domain: 'shethcreators.com' },
    { name: 'Arkade Developers', domain: 'arkade.in' },
    { name: 'Ajmera Realty', domain: 'ajmera.com' },
    { name: 'Sunteck Realty', domain: 'sunteckindia.com' },
    { name: 'Hubtown', domain: 'hubtown.co.in' },
    { name: 'Dosti Realty', domain: 'dostirealty.com' },
    { name: 'Ekta World', domain: 'ektaworld.com' },
    { name: 'Radius Developers', domain: 'radiusdevelopers.com' },
    { name: 'Runwal Realty', domain: 'runwal.com' }
  ],
  'Delhi NCR': [
    { name: 'DLF', domain: 'dlf.in' },
    { name: 'Godrej Properties', domain: 'godrejproperties.com' },
    { name: 'M3M India', domain: 'm3mindia.com' },
    { name: 'ATS Infrastructure', domain: 'atsgreens.com' },
    { name: 'Mahagun Group', domain: 'mahagunindia.com' },
    { name: 'Tata Realty', domain: 'tatarealty.in' },
    { name: 'Emaar India', domain: 'emaar-india.com' },
    { name: 'Sobha', domain: 'sobha.com' },
    { name: 'Experion Developers', domain: 'experion.co' },
    { name: 'Signature Global', domain: 'signatureglobal.in' },
    { name: 'Birla Estates', domain: 'birlaestates.com' },
    { name: 'Central Park', domain: 'centralpark.in' },
    { name: 'TARC', domain: 'tarc.in' },
    { name: 'BPTP', domain: 'bptp.com' },
    { name: 'County Group', domain: 'countygroup.in' },
    { name: 'AIPL', domain: 'aipl.com' },
    { name: 'Whiteland Corporation', domain: 'whitelandcorp.com' },
    { name: 'Smart World Developers', domain: 'smartworlddevelopers.com' },
    { name: 'Elan Group', domain: 'elangroup.co.in' },
    { name: 'Trehan Iris', domain: 'trehaniris.com' },
    { name: 'Suncity Projects', domain: 'suncityprojects.com' },
    { name: 'Omaxe', domain: 'omaxe.com' },
    { name: 'Supertech', domain: 'supertechlimited.com' },
    { name: 'ATS Homekraft', domain: 'homekraft.in' },
    { name: 'Max Estates', domain: 'maxestates.in' },
    { name: 'Gaursons', domain: 'gaursonsindia.com' },
    { name: 'Saya Homes', domain: 'sayahomes.com' },
    { name: 'Ace Group', domain: 'acegroupindia.com' }
  ]
};

const marketNewsUpdates: MarketNewsUpdate[] = [
  {
    category: 'Government Update',
    title: 'PMAY-U 2.0 approvals expanded',
    summary: 'MoHUA approved 2.88 lakh additional urban houses in February 2026, taking PMAY-U 2.0 sanctioned homes above 13.61 lakh.',
    source: 'PIB',
    href: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2231861'
  },
  {
    category: 'Policy Watch',
    title: 'PMAY-Urban completion window extended',
    summary: 'The earlier PMAY-U scheme period was extended up to September 30, 2026 for completing under-construction houses and fund release.',
    source: 'PIB',
    href: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2239027'
  },
  {
    category: 'India Market',
    title: 'Housing value rises across 75 cities',
    summary: "Housing sales value in India's top 75 cities rose 16% to Rs. 9.33 lakh crore in FY26, according to Liases Foras data.",
    source: 'Moneycontrol',
    href: 'https://www.moneycontrol.com/news/business/real-estate/housing-sales-in-top-75-cities-rise-16-to-rs-9-33-lakh-crore-in-fy26-liases-foras-13930288.html'
  },
  {
    category: 'Market Signal',
    title: 'Sales soften, prices stay firm',
    summary: 'A March 2026 residential market report noted lower sales and launches, while pricing remained resilient across major markets.',
    source: 'Financial Express',
    href: 'https://www.financialexpress.com/business/industry/real-estate-realty-check-sales-fall-7-launches-drop-17-but-prices-hold-firm/4251255/'
  },
  {
    category: 'Hyderabad',
    title: 'Q1 demand remains active',
    summary: 'Hyderabad recorded 9,541 home sales in Q1 2026, reflecting continued end-user and investor activity across income segments.',
    source: 'Construction World',
    href: 'https://www.constructionworld.in/latest-construction-news/real-estate-news/hyderabad-records-9541-home-sales-in-q1-2026/90144'
  },
  {
    category: 'Hyderabad Premium',
    title: 'HNIs invest in city housing',
    summary: 'HNIs and UHNIs bought residential property worth Rs. 8,562 crore in Hyderabad during FY2026, highlighting premium demand.',
    source: 'Economic Times',
    href: 'https://m.economictimes.com/wealth/real-estate/hnis-uhnis-bought-residential-property-worth-rs-8562-crore-in-fy-2026-in-hyderabad-know-what-it-means-for-investors/amp_articleshow/130949836.cms'
  }
];

const fallbackPopularLocations: PopularLocation[] = [
  { name: 'Kokapet', image: '/banners/kokapet-original.jpg', note: 'Premium growth corridor', city: 'Hyderabad' },
  { name: 'Financial District', image: '/banners/financial-district-original.jpg', note: 'Office-led demand', city: 'Hyderabad' },
  { name: 'Shamsabad', image: '/banners/hero-plotted-layout-1920x900.jpg', note: 'Airport-side development zone', city: 'Hyderabad' },
  { name: 'Tukkuguda', image: '/banners/tukkuguda.jpg', note: 'High builder interest', city: 'Hyderabad' },
];

const locationImages: Record<string, string> = {
  kokapet: '/banners/kokapet-original.jpg',
  'financial district': '/banners/financial-district-original.jpg',
  shamsabad: '/banners/hero-plotted-layout-1920x900.jpg',
  tukkuguda: '/banners/tukkuguda.jpg',
};
const curatedLocationImages = fallbackPopularLocations.map((location) => location.image);

const normalizeLocationName = (value = '') =>
  value
    .toLowerCase()
    .replace(/^near\s+(to\s+)?/i, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const titleCaseLocation = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

function HomePage() {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);
  const [selectedCity, setSelectedCity] = useState(() => localStorage.getItem('selectedCity') || 'Hyderabad');
  const [storedBuilderLogos, setStoredBuilderLogos] = useState<BuilderLogo[]>([]);
  const [popularLocations, setPopularLocations] = useState<PopularLocation[]>(fallbackPopularLocations);
  const [exclusiveProjects, setExclusiveProjects] = useState<any[]>([]);
  const [exclusiveIndex, setExclusiveIndex] = useState(0);
  const [exclusiveImageIndex, setExclusiveImageIndex] = useState(0);
  const [propertyCategoryCounts, setPropertyCategoryCounts] = useState({ newLaunches: 0, readyToMove: 0, underConstruction: 0 });
  const [propertyCategoryImages, setPropertyCategoryImages] = useState({ newLaunches: '', readyToMove: '', underConstruction: '' });
  const [happeningProjects, setHappeningProjects] = useState<any[]>([]);
  const [selectedHotSellingZone, setSelectedHotSellingZone] = useState('All');
  const hotSellingScrollRef = useRef<HTMLDivElement>(null);
  const newlyLaunchedScrollRef = useRef<HTMLDivElement>(null);
  const housingPicksScrollRef = useRef<HTMLDivElement>(null);
  const [marketplaceStats, setMarketplaceStats] = useState<MarketplaceStats>({
    builders: 0,
    owners: 0,
    mediators: 0,
    ownersAndMediators: 0,
    approvedProperties: 0,
  });

  const workflow = [
    { icon: ShieldCheck, title: 'Listings are reviewed', text: 'Every owner submission enters moderation before it appears publicly.' },
    { icon: BadgeCheck, title: 'Builders are verified', text: 'Builder contact access opens only after admin approval.' },
    { icon: LockKeyhole, title: 'Contacts stay private', text: 'Owner details unlock after mutual interest, with chat history retained.' },
  ];
  const curatedBuilders = buildersByCity[selectedCity] || buildersByCity.Hyderabad;
  const storedBuilderKeys = new Set(storedBuilderLogos.map((builder) => builder.name.trim().toLowerCase()));
  const topBuilders = [
    ...storedBuilderLogos,
    ...curatedBuilders.filter((builder) => !storedBuilderKeys.has(builder.name.trim().toLowerCase()))
  ].slice(0, 50);
  const scrollingBuilders = [...topBuilders, ...topBuilders];

  const handlePostProperty = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.setItem('redirectToPost', 'true');
      setShowLoginModal(true);
      return;
    }
    navigate('/post-property');
  };

  useEffect(() => {
    const handleCityChange = (event: Event) => {
      const city = (event as CustomEvent<string>).detail || localStorage.getItem('selectedCity') || 'Hyderabad';
      setSelectedCity(city);
    };

    window.addEventListener('selectedCityChange', handleCityChange);
    return () => window.removeEventListener('selectedCityChange', handleCityChange);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadStoredBuilderLogos = async () => {
      try {
        const response = await fetch(`${API_BASE}/builder-logos?city=${encodeURIComponent(selectedCity)}`);
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error('Unable to load stored builder logos');
        if (!cancelled) setStoredBuilderLogos(data);
      } catch (error) {
        if (!cancelled) setStoredBuilderLogos([]);
      }
    };

    loadStoredBuilderLogos();
    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

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
        if (!cancelled) {
          setMarketplaceStats({
            builders: 0,
            owners: 0,
            mediators: 0,
            ownersAndMediators: 0,
            approvedProperties: 0,
          });
        }
      }
    };

    loadMarketplaceStats();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPopularLocations = async () => {
      try {
        const fallbackForCity = fallbackPopularLocations.map((location) => ({ ...location, city: selectedCity }));
        const response = await fetch(`${API_BASE}/search?listingIntent=sell&city=${encodeURIComponent(selectedCity)}`);
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error('Unable to load popular locations');

        const grouped = new Map<string, PopularLocation & { latestTime: number }>();

        data.forEach((property: any) => {
          const rawLocation = property.locality && !/^https?:\/\//i.test(property.locality)
            ? property.locality
            : property.landmark || property.city;
          const key = normalizeLocationName(rawLocation);
          if (!key) return;

          const current = grouped.get(key);
          const propertyTime = property.createdAt ? new Date(property.createdAt).getTime() : 0;
          const image = locationImages[key] || curatedLocationImages[grouped.size % curatedLocationImages.length];

          if (!current) {
            grouped.set(key, {
              name: titleCaseLocation(key),
              image,
              note: '1 verified listing',
              count: 1,
              city: property.city || selectedCity,
              latestTime: propertyTime
            });
            return;
          }

          current.count = (current.count || 0) + 1;
          current.note = `${current.count} verified listings`;
          if (propertyTime > current.latestTime) {
            current.latestTime = propertyTime;
          }
        });

        const rankedLocations = Array.from(grouped.values())
          .sort((a, b) => (b.count || 0) - (a.count || 0) || b.latestTime - a.latestTime)
          .slice(0, 6)
          .map(({ latestTime, ...location }, index) => ({
            ...location,
            image: locationImages[normalizeLocationName(location.name)] || curatedLocationImages[index % curatedLocationImages.length],
            note: `${location.count || 0} verified ${location.count === 1 ? 'listing' : 'listings'}`
          }));

        if (!cancelled) {
          setPopularLocations(rankedLocations.length ? rankedLocations : fallbackForCity);
        }
      } catch (error) {
        if (!cancelled) setPopularLocations(fallbackPopularLocations.map((location) => ({ ...location, city: selectedCity })));
      }
    };

    loadPopularLocations();
    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  useEffect(() => {
    let cancelled = false;
    const apartmentLikeTypes = ['apartment', 'standalone', 'high-rise', 'gated-community', 'group-house'];

    const loadExclusiveProjects = async () => {
      try {
        const response = await fetch(`${API_BASE}/search?listingIntent=sell&city=${encodeURIComponent(selectedCity)}`);
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error('Unable to load exclusive projects');

        const ranked = data
          .filter((property: any) => apartmentLikeTypes.includes(String(property.developmentType || '').toLowerCase()))
          .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 6);

        if (!cancelled) {
          setExclusiveProjects(ranked);
          setExclusiveIndex(0);
          setExclusiveImageIndex(0);
        }
      } catch (error) {
        if (!cancelled) setExclusiveProjects([]);
      }
    };

    loadExclusiveProjects();
    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  useEffect(() => {
    let cancelled = false;

    const loadPropertyCategoryCounts = async () => {
      try {
        const cityParam = `city=${encodeURIComponent(selectedCity)}`;
        const [allRes, readyRes, underConstructionRes] = await Promise.all([
          fetch(`${API_BASE}/search?${cityParam}`),
          fetch(`${API_BASE}/search?${cityParam}&possessionStatus=${encodeURIComponent('Ready to Move')}`),
          fetch(`${API_BASE}/search?${cityParam}&possessionStatus=${encodeURIComponent('Under Construction')}`)
        ]);
        const [all, ready, underConstruction] = await Promise.all([allRes.json(), readyRes.json(), underConstructionRes.json()]);
        if (cancelled) return;

        const sortByRecent = (list: any) =>
          Array.isArray(list)
            ? [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            : [];

        const sortedReady = sortByRecent(ready);
        const sortedUnderConstruction = sortByRecent(underConstruction);
        const sortedAll = sortByRecent(all);

        const readyImage = sortedReady.length ? getProjectImage(sortedReady[0]) : '';
        const underConstructionImage = sortedUnderConstruction.length ? getProjectImage(sortedUnderConstruction[0]) : '';
        const usedIds = new Set([sortedReady[0]?._id, sortedUnderConstruction[0]?._id].filter(Boolean));
        const newLaunchPick = sortedAll.find((property) => !usedIds.has(property._id)) || sortedAll[0];
        const newLaunchesImage = newLaunchPick ? getProjectImage(newLaunchPick) : '';

        setPropertyCategoryCounts({
          newLaunches: Array.isArray(all) ? all.length : 0,
          readyToMove: Array.isArray(ready) ? ready.length : 0,
          underConstruction: Array.isArray(underConstruction) ? underConstruction.length : 0
        });
        setPropertyCategoryImages({
          newLaunches: newLaunchesImage,
          readyToMove: readyImage,
          underConstruction: underConstructionImage
        });
      } catch {
        if (!cancelled) setPropertyCategoryCounts({ newLaunches: 0, readyToMove: 0, underConstruction: 0 });
      }
    };

    loadPropertyCategoryCounts();
    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  useEffect(() => {
    let cancelled = false;
    fetchHappeningProjects(selectedCity)
      .then((projects) => { if (!cancelled) setHappeningProjects(projects); })
      .catch(() => { if (!cancelled) setHappeningProjects([]); });
    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  useEffect(() => {
    const bannerTimer = window.setTimeout(() => {
      setActiveBanner((current) => (current + 1) % homeBannerSlides.length);
    }, 5000);

    return () => window.clearTimeout(bannerTimer);
  }, [activeBanner]);

  const activeExclusiveProject = exclusiveProjects[exclusiveIndex];
  const exclusiveGalleryImages = activeExclusiveProject
    ? (Array.isArray(activeExclusiveProject.images) && activeExclusiveProject.images.length
        ? activeExclusiveProject.images
        : (activeExclusiveProject.imageUrl ? [activeExclusiveProject.imageUrl] : []))
    : [];

  const getExclusiveProjectPrice = (property: any) => {
    if (property.totalBudget) return `Rs. ${Number(property.totalBudget).toLocaleString('en-IN')} Onwards`;
    if (property.squareFeetPrice) return `Rs. ${Number(property.squareFeetPrice).toLocaleString('en-IN')} / Sq Ft`;
    if (property.squareYardPrice) return `Rs. ${Number(property.squareYardPrice).toLocaleString('en-IN')} / Sq Yd`;
    return 'Price on request';
  };

  const goToExclusiveProject = (direction: 1 | -1) => {
    if (!exclusiveProjects.length) return;
    setExclusiveIndex((current) => (current + direction + exclusiveProjects.length) % exclusiveProjects.length);
    setExclusiveImageIndex(0);
  };

  const panExclusiveImage = (direction: 1 | -1) => {
    if (!exclusiveGalleryImages.length) return;
    setExclusiveImageIndex((current) => (current + direction + exclusiveGalleryImages.length) % exclusiveGalleryImages.length);
  };

  const scrollHousingPicks = (direction: 1 | -1) => {
    const container = housingPicksScrollRef.current;
    const card = container?.firstElementChild as HTMLElement | null;
    if (!container || !card) return;
    const gap = parseFloat(getComputedStyle(container).columnGap || '0') || 16;
    container.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: 'smooth' });
  };

  useEffect(() => {
    if (happeningProjects.length <= 1) return;
    const interval = setInterval(() => {
      const container = housingPicksScrollRef.current;
      const card = container?.firstElementChild as HTMLElement | null;
      if (!container || !card) return;
      const gap = parseFloat(getComputedStyle(container).columnGap || '0') || 16;
      const atEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
      if (atEnd) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: card.offsetWidth + gap, behavior: 'smooth' });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [happeningProjects]);

  const visibleHotSellingProjects = selectedHotSellingZone === 'All'
    ? hotSellingProjects
    : hotSellingProjects.filter((project) => project.zone === selectedHotSellingZone);

  return (
    <div className="overflow-hidden bg-slate-50">
      <section className="relative min-h-[calc(100vh-60px)] overflow-hidden text-white">
        {homeBannerSlides.map((slide, index) => (
          <img
            key={slide.title}
            src={slide.image}
            alt={slide.title}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              index === activeBanner ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-900/15" />
        <div className="ld-container relative z-10 flex min-h-[calc(100vh-60px)] -translate-y-[10%] flex-col justify-center gap-8 pb-14 pt-6">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles className="h-4 w-4 text-amber-300" />
              India's verified marketplace for apartments, commercial space & buyers
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
              <BrandName />
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 md:text-xl">
              Discover verified apartment sales, explore commercial space, and share buyer requirements with confidence, all in one professional workflow.
            </p>
            <div className="mx-auto mt-8 max-w-4xl">
              <SearchBar compact popularLocations={popularLocations.map((location) => location.name)} />
            </div>
            <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center gap-3">
              <Link to={`/properties?view=developers&listingIntent=sell&city=${encodeURIComponent(selectedCity)}`} className="ld-btn-primary bg-white text-slate-950 hover:bg-teal-50">
                Explore Properties <ArrowRight className="h-5 w-5" />
              </Link>
              <button onClick={handlePostProperty} className="ld-btn-ghost border-white/30 bg-white/10 text-white backdrop-blur hover:border-white hover:bg-white/20 hover:text-white">
                Post Property
              </button>
              {[
                ['Admin-reviewed', 'Listings'],
                ['Verified', 'Builders'],
                ['Private', 'Contact Flow']
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-white/20 bg-white/10 p-4 shadow-lg shadow-black/10 backdrop-blur-md backdrop-saturate-150">
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-sm text-slate-200">{label}</p>
                </div>
              ))}
            </div>
            <div className="mx-auto mt-6 flex max-w-4xl items-center gap-2">
              {homeBannerSlides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  onClick={() => setActiveBanner(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    index === activeBanner ? 'w-9 bg-white' : 'w-2.5 bg-white/45 hover:bg-white/75'
                  }`}
                  aria-label={`Show ${slide.title}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="ld-container">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">HomeFeet's <span className="text-[#0AA6A6]">Happening</span> Projects</h2>
              <p className="mt-1 text-slate-600">Explore top living options with us</p>
            </div>
            {happeningProjects[0] && (
              <div className="hidden text-center sm:block">
                <img
                  src={getProjectImage(happeningProjects[0])}
                  alt={happeningProjects[0].projectName}
                  className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
                />
                <p className="mt-1 max-w-[6rem] truncate text-xs font-semibold text-slate-700">{happeningProjects[0].projectName}</p>
              </div>
            )}
          </div>

          {happeningProjects.length === 0 ? (
            <div className="flex h-[340px] items-center justify-center rounded-lg border border-slate-200 bg-white text-center text-sm font-semibold text-slate-500">
              No active Sale Property listings in {selectedCity} yet.
            </div>
          ) : (
          <div className="relative">
            <div
              ref={housingPicksScrollRef}
              className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [-webkit-mask-image:linear-gradient(to_right,black_82%,transparent_100%)] [mask-image:linear-gradient(to_right,black_82%,transparent_100%)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {happeningProjects.map((pick) => (
                <div
                  key={pick._id}
                  className="flex w-[min(90vw,820px)] shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-slate-200 sm:grid sm:h-[340px] sm:flex-none sm:grid-cols-[260px_1fr]"
                >
                  {/* Info panel — below image on mobile, left column on sm+ */}
                  <div className="flex flex-col gap-3 p-4 sm:justify-between sm:gap-0 sm:p-5">
                    {/* Builder */}
                    <div className="flex items-center gap-2.5">
                      {getBuilderLogo(pick) ? (
                        <img
                          src={getBuilderLogo(pick)}
                          alt={getBuilderLabel(pick)}
                          className="h-10 w-10 shrink-0 rounded-lg object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0AA6A6] text-base font-black text-white">
                          {getBuilderInitial(pick)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-black text-slate-900">{getBuilderLabel(pick)}</p>
                        <Link
                          to={`/properties?view=marketplace&city=${encodeURIComponent(selectedCity)}`}
                          className="text-xs font-semibold text-[#0AA6A6] hover:underline"
                        >
                          View Projects →
                        </Link>
                      </div>
                    </div>

                    {/* Project name & location */}
                    <div>
                      <p className="line-clamp-1 text-base font-black leading-tight text-slate-950">{pick.projectName || pick.developmentType}</p>
                      <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{pick.locality}, {pick.city}</p>
                    </div>

                    {/* Price & config */}
                    <div>
                      <p className="line-clamp-1 font-black text-[#0AA6A6]">{getProjectPriceRange(pick)}</p>
                      <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{getProjectConfiguration(pick)}</p>
                    </div>

                    {/* Contact button */}
                    <Link
                      to={`/property/${pick._id}`}
                      className="block rounded-lg bg-[#0AA6A6] px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-[#088f8f]"
                    >
                      Contact
                    </Link>
                  </div>

                  {/* Image — order-first on mobile (shows above info), right column on sm+ */}
                  <div className="relative order-first h-40 overflow-hidden bg-slate-100 sm:order-none sm:h-full">
                    <img
                      src={getProjectImage(pick)}
                      alt={pick.projectName}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => scrollHousingPicks(-1)}
              aria-label="Previous top pick"
              className="absolute left-0 top-1/2 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50 lg:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollHousingPicks(1)}
              aria-label="Next top pick"
              className="absolute right-0 top-1/2 hidden h-10 w-10 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50 lg:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          )}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="ld-container">
          <div className="rounded-lg border border-slate-200 bg-white p-6 pt-[1.425rem] shadow-xl shadow-slate-200/70 md:p-8 md:pt-[1.9rem]">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-4xl">Top <span className="text-[#0AA6A6]">Developers</span> in {selectedCity}</h2>
            <p className="mt-3 w-full text-sm leading-6 text-slate-600">
              These top developers in {selectedCity} have proven track records and a history of satisfied customers. Whether it's gated villas, high-rise apartments, or township living, they build with integrity and care. Choose a name that enhances the value of your property.
            </p>

            <div className="relative mt-8">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {topDeveloperHighlights.map((builder) => (
                  <div key={builder.name} className="flex flex-col rounded-lg border border-slate-200 p-5">
                    <div className="flex items-start gap-3">
                      <TopDeveloperLogoBox builder={builder} />
                      <div>
                        <p className="font-black text-slate-950">{builder.name}</p>
                        <p className="text-xs text-slate-500">{builder.city || selectedCity}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                      {typeof builder.totalProjects === 'number' && (
                        <div>
                          <p className="font-black text-slate-950">{builder.totalProjects}</p>
                          <p className="text-xs text-slate-500">Total Projects</p>
                        </div>
                      )}
                      {typeof builder.experience === 'number' && (
                        <div>
                          <p className="font-black text-slate-950">{builder.experience}</p>
                          <p className="text-xs text-slate-500">Experience</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      {typeof builder.readyToMove === 'number' && (
                        <Link
                          to={`/properties?view=marketplace&city=${encodeURIComponent(selectedCity)}`}
                          className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-teal-700 hover:bg-teal-50 hover:text-teal-800"
                        >
                          Ready to Move ({builder.readyToMove}) <ChevronRight className="h-4 w-4" />
                        </Link>
                      )}
                      {typeof builder.underConstruction === 'number' && (
                        <Link
                          to={`/properties?view=marketplace&city=${encodeURIComponent(selectedCity)}`}
                          className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-teal-700 hover:bg-teal-50 hover:text-teal-800"
                        >
                          Under Construction ({builder.underConstruction}) <ChevronRight className="h-4 w-4" />
                        </Link>
                      )}
                      {typeof builder.newLaunch === 'number' && (
                        <Link
                          to={`/properties?view=marketplace&city=${encodeURIComponent(selectedCity)}`}
                          className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-teal-700 hover:bg-teal-50 hover:text-teal-800"
                        >
                          New Launch ({builder.newLaunch}) <ChevronRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link to={`/properties?view=marketplace&city=${encodeURIComponent(selectedCity)}`} className="mt-7 inline-flex items-center gap-1 text-sm font-bold text-slate-950 hover:text-teal-700">
              View All Developers in {selectedCity} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {activeExclusiveProject && (
        <section className="bg-white py-16">
          <div className="ld-container">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-4xl">Premium <span className="text-[#0AA6A6]">Properties</span> in {selectedCity}</h2>
                <p className="mt-1 text-sm text-slate-500">Explore the latest and ongoing luxury projects in {selectedCity}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToExclusiveProject(-1)}
                  aria-label="Previous project"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-teal-700 hover:text-teal-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => goToExclusiveProject(1)}
                  aria-label="Next project"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-teal-700 hover:text-teal-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 h-[3px] w-full bg-[#0AA6A6]" />

            <div className="mt-6 rounded-2xl bg-[#eef4fb] p-5 md:p-6">
              <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="flex flex-col py-1">
                  <h3 className="text-2xl font-black text-slate-950 md:text-[1.7rem]">
                    {activeExclusiveProject.projectName || activeExclusiveProject.societyName || cleanDevelopmentType(activeExclusiveProject.developmentType)}
                  </h3>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {activeExclusiveProject.locality || activeExclusiveProject.city || selectedCity}
                    {activeExclusiveProject.locality ? `, ${activeExclusiveProject.city || selectedCity}` : ''}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-700">
                    <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm">
                      <BedDouble className="h-4 w-4 text-[#0AA6A6]" />
                      {activeExclusiveProject.bedrooms || 'On request'}
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm">
                      <Ruler className="h-4 w-4 text-[#0AA6A6]" />
                      {activeExclusiveProject.flatSize
                        ? `${activeExclusiveProject.flatSize} sqft`
                        : activeExclusiveProject.totalArea
                          ? `${activeExclusiveProject.totalArea} ${activeExclusiveProject.areaUnit || ''}`
                          : 'On request'}
                    </span>
                  </div>

                  <div className="mt-10">
                    <p className="text-sm text-slate-500">Starting price</p>
                    <p className="mt-1 text-3xl font-black text-slate-950">{getExclusiveProjectPrice(activeExclusiveProject)}</p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {activeExclusiveProject.propertyFormUrl && (
                        <a
                          href={`${API_ORIGIN}${activeExclusiveProject.propertyFormUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-950 hover:border-teal-700 hover:text-teal-700"
                        >
                          Download Brochure <Download className="h-4 w-4" />
                        </a>
                      )}
                      <Link
                        to={`/property/${activeExclusiveProject._id}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-700"
                      >
                        Explore Now <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl bg-slate-200">
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-slate-950/80 px-3 py-1.5 text-xs font-bold text-amber-300">
                    <Crown className="h-3.5 w-3.5" /> Premium Project
                  </span>
                  <div className="absolute right-3 top-3 flex items-center gap-2">
                    <button type="button" aria-label="Share project" className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700">
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Save project" className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700">
                      <Heart className="h-4 w-4" />
                    </button>
                  </div>
                  <img
                    src={exclusiveGalleryImages[exclusiveImageIndex] ? `${API_ORIGIN}${exclusiveGalleryImages[exclusiveImageIndex]}` : fallbackExclusiveProjectImage}
                    alt={activeExclusiveProject.projectName || 'Premium project'}
                    className="h-72 w-full object-cover md:h-96"
                    onError={(e) => { e.currentTarget.src = fallbackExclusiveProjectImage; }}
                  />
                  {exclusiveGalleryImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => panExclusiveImage(-1)}
                        aria-label="Previous photo"
                        className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg hover:bg-white"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => panExclusiveImage(1)}
                        aria-label="Next photo"
                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg hover:bg-white"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/70 px-2.5 py-1 text-xs font-semibold text-white">
                        {exclusiveImageIndex + 1} / {exclusiveGalleryImages.length}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="bg-white py-16">
        <div className="ld-container">
          <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-4xl">Properties Categories</h2>
          <p className="mt-1 text-sm text-[#0077CC]">Explore Properties Tailored to Your Needs</p>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                label: 'New Launches',
                count: propertyCategoryCounts.newLaunches,
                image: propertyCategoryImages.newLaunches,
                to: `/properties?view=marketplace&city=${encodeURIComponent(selectedCity)}`
              },
              {
                label: 'Ready To Move',
                count: propertyCategoryCounts.readyToMove,
                image: propertyCategoryImages.readyToMove,
                to: `/properties?view=marketplace&city=${encodeURIComponent(selectedCity)}&possessionStatus=${encodeURIComponent('Ready to Move')}`
              },
              {
                label: 'Under Construction',
                count: propertyCategoryCounts.underConstruction,
                image: propertyCategoryImages.underConstruction,
                to: `/properties?view=marketplace&city=${encodeURIComponent(selectedCity)}&possessionStatus=${encodeURIComponent('Under Construction')}`
              }
            ].map((category) => (
              <Link
                key={category.label}
                to={category.to}
                className="group relative block h-64 overflow-hidden rounded-xl shadow-sm transition hover:shadow-xl"
              >
                {category.image ? (
                  <img src={category.image} alt={category.label} className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-400">
                    No listings yet
                  </div>
                )}
                <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 shadow-lg">
                  <div>
                    <p className="font-black text-slate-950">{category.label}</p>
                    <p className="text-xs text-slate-500">{category.count} Available Properties</p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-200 text-red-600 transition group-hover:bg-red-600 group-hover:text-white">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="ld-container">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 md:p-8">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-4xl">Hot Selling <span className="text-[#0077CC]">Real Estate</span> Projects in {selectedCity}</h2>
            <p className="mt-3 w-full text-sm leading-6 text-slate-600">
              In search of the most talked-about homes? Our list of hot-selling projects in {selectedCity} features properties with modern architecture, future-ready features, and exceptional ROI potential. All of them are known to be located in rapidly developing areas; these homes are selling out quickly.
            </p>

            <div className="mt-12 flex flex-wrap gap-2">
              {hotSellingZones.map((zone) => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => setSelectedHotSellingZone(zone)}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                    selectedHotSellingZone === zone
                      ? 'bg-slate-950 text-white'
                      : 'border border-slate-200 text-slate-800 hover:border-slate-400'
                  }`}
                >
                  {zone}
                </button>
              ))}
            </div>

            <div className="relative mt-10">
              <div
                ref={hotSellingScrollRef}
                className="flex gap-6 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {visibleHotSellingProjects.map((project, index) => (
                  <div key={project.name} className="relative w-64 shrink-0">
                    <span className="pointer-events-none absolute -left-2 -top-7 select-none text-6xl font-black text-slate-200">
                      {index + 1}
                    </span>
                    <div className="relative overflow-hidden rounded-lg">
                      <img src={project.image} alt={project.name} className="h-40 w-full object-cover" />
                    </div>
                    <div className="mt-3 rounded-lg border border-slate-200 p-4">
                      <p className="font-black text-slate-950">{project.name}</p>
                      <p className="mt-1 text-sm text-teal-700">{project.location}</p>
                      <p className="mt-2 font-black text-slate-950">{project.priceRange}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => hotSellingScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                aria-label="Scroll for more projects"
                className="absolute right-0 top-1/3 hidden h-10 w-10 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-950 lg:flex"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <Link
              to={`/properties?view=marketplace&city=${encodeURIComponent(selectedCity)}`}
              className="mt-7 inline-flex items-center gap-1 text-sm font-bold text-slate-950 hover:text-teal-700"
            >
              Projects in {selectedCity} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white pb-16 pt-[3.8rem]">
        <div className="ld-container">
          <div className="mb-12 flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-4xl">Newly <span className="text-[#0AA6A6]">Launched</span> Projects</h2>
            <Link
              to={`/properties?view=marketplace&city=${encodeURIComponent(selectedCity)}`}
              className="inline-flex items-center gap-1 text-sm font-bold text-[#0077CC] hover:text-teal-700"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="relative">
            <div
              ref={newlyLaunchedScrollRef}
              className="flex gap-6 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {newlyLaunchedProjects.map((project) => (
                <div key={project.name} className="w-72 shrink-0 rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="relative">
                    <img src={project.image} alt={project.name} className="h-44 w-full rounded-t-lg object-cover" />
                    <div className="absolute right-3 top-3 flex gap-2">
                      <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                        <Heart className="h-4 w-4" />
                      </button>
                      <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-slate-950/85 px-3 py-1 text-xs font-bold text-amber-300">
                      <Rocket className="h-3.5 w-3.5" /> New Launch
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="font-black text-slate-950">{project.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{project.location}</p>
                    <p className="mt-2 font-black text-amber-600">{project.priceRange}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {project.configuration} BHK <span className="mx-1 text-slate-300">|</span> {project.sizeRange} sq ft
                    </p>
                    <p className="mt-1 text-xs text-slate-500">By {project.builder}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => newlyLaunchedScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
              aria-label="Scroll for more newly launched projects"
              className="absolute right-0 top-[35%] hidden h-10 w-10 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50 lg:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="ld-container">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="ld-eyebrow flex items-center gap-2">
                <Newspaper className="h-4 w-4" />
                Real estate news desk
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-4xl">
                Weekly real estate news across India
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              Every week updated government policy, housing demand, apartment and commercial space trends, and real estate market signals from major Indian cities.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex w-fit items-center gap-2 rounded-br-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white">
              <Landmark className="h-4 w-4 text-amber-300" />
              All India Real Estate News
            </div>
            <div className="ld-news-marquee">
              <div className="ld-news-track">
                {[...marketNewsUpdates, ...marketNewsUpdates].map((item, index) => (
                  <a
                    key={`${item.title}-${index}`}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="ld-news-card"
                  >
                    <span className="text-xs font-black uppercase tracking-wide text-[#0AA6A6]">{item.category}</span>
                    <strong className="mt-2 block text-base text-slate-950">{item.title}</strong>
                    <span className="mt-2 block text-sm leading-6 text-slate-600">{item.summary}</span>
                    <span className="mt-3 inline-flex text-xs font-bold text-slate-500">Source: {item.source}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pb-4 pt-8 md:pb-5 md:pt-10">
        <div className="ld-container">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="ld-eyebrow">Platform Built For Serious Deals</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                Better Homes. Quicker Connections. Smarter Deals.
              </h2>
            </div>
            <p className="max-w-xl text-slate-600">
              HomeFeet keeps the marketplace curated: owners get protected contact details, builders get searchable apartment and commercial space data, and admins get operational control.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {workflow.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-[#0AA6A6] text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-slate-600">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white pb-12 pt-8 md:pb-16 md:pt-10">
        <div className="ld-container">
          <div className="mb-7 text-center">
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-4xl">
              Trusted By Leading{' '}
              <span className="bg-gradient-to-r from-[#0AA6A6] to-[#0077CC] bg-clip-text text-transparent">
                Developer
              </span>{' '}
              From {selectedCity}
            </h2>
          </div>

          <div className="ld-builders-marquee mx-auto max-w-7xl">
            <div className="ld-builders-track">
              {scrollingBuilders.map((builder, index) => (
                <BuilderLogoCard
                  key={`${builder.name}-${builder.domain}-${index}`}
                  builder={builder}
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => setShowLoginModal(false)}
        />
      )}
    </div>
  );
}

function BuyPlotLandComingSoon() {
  return (
    <section className="bg-white py-16">
      <div className="ld-container max-w-5xl">
        <div className="border-b border-slate-200 pb-8">
          <p className="ld-eyebrow">Buy Plot | Land</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
                Coming Soon
              </h1>
              <p className="mt-4 max-w-2xl text-slate-600">
                A dedicated buying experience for plots and land is being prepared with verified listings, location filters, and cleaner discovery.
              </p>
            </div>
            <Link to="/properties" className="ld-btn-primary w-fit">
              Explore Properties <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div className="grid gap-6 py-10 md:grid-cols-3">
          {[
            ['Verified supply', 'Reviewed listings before they appear in the marketplace.'],
            ['Location-first search', 'City, locality, pincode, frontage, and zoning filters.'],
            ['Buyer workflow', 'Shortlist plots and land with clearer owner-contact steps.'],
          ].map(([title, text]) => (
            <div key={title} className="border-l-2 border-teal-600 pl-4">
              <h2 className="font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SellPlotLandComingSoon() {
  return (
    <section className="bg-white py-16">
      <div className="ld-container max-w-5xl">
        <div className="border-b border-slate-200 pb-8">
          <p className="ld-eyebrow">Sell Plot | Land</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
                Coming Soon
              </h1>
              <p className="mt-4 max-w-2xl text-slate-600">
                A dedicated selling experience for plots and land is being prepared with simpler submissions, better buyer matching, and clear owner controls.
              </p>
            </div>
              <Link to="/post-property" className="ld-btn-primary w-fit">
              Post Property <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div className="grid gap-6 py-10 md:grid-cols-3">
          {[
            ['Owner-first listing', 'A cleaner flow for plot and land owners to submit details.'],
            ['Better buyer discovery', 'Listings prepared for location, frontage, zoning, and pincode matching.'],
            ['Controlled contact', 'Owner contact flow designed to stay professional and protected.'],
          ].map(([title, text]) => (
            <div key={title} className="border-l-2 border-teal-600 pl-4">
              <h2 className="font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PropertiesMapPage() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const transitLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const mapRenderTokenRef = useRef(0);
  const placesSessionTokenRef = useRef<any>(null);
  const skipPlacesLookupRef = useRef(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [mappedProperties, setMappedProperties] = useState<any[]>([]);
  const [mappedCount, setMappedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const [mapError, setMapError] = useState('');
  const [markersReady, setMarkersReady] = useState(false);
  const [accessNotice, setAccessNotice] = useState('');
  const [selectedCity, setSelectedCity] = useState(() => localStorage.getItem('selectedCity') || 'Hyderabad');
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSearchNotice, setLocationSearchNotice] = useState('');
  const [locationPredictions, setLocationPredictions] = useState<any[]>([]);
  const [showLocationPredictions, setShowLocationPredictions] = useState(false);
  const [isLocationSearching, setIsLocationSearching] = useState(false);
  const [showMapFilters, setShowMapFilters] = useState(false);
  const [activeMapFilters, setActiveMapFilters] = useState({
    plots: false,
    ownerListed: false,
    lastMonth: false,
    lastWeek: false,
    listingIntent: 'All',
  });

  const cityCenters: Record<string, { lat: number; lng: number; zoom: number }> = {
    Hyderabad: { lat: 17.385, lng: 78.4867, zoom: 11 },
    Bengaluru: { lat: 12.9716, lng: 77.5946, zoom: 11 },
    Chennai: { lat: 13.0827, lng: 80.2707, zoom: 11 },
    Mumbai: { lat: 19.076, lng: 72.8777, zoom: 11 },
    Delhi: { lat: 28.6139, lng: 77.209, zoom: 10 },
    Kolkata: { lat: 22.5726, lng: 88.3639, zoom: 11 },
    Pune: { lat: 18.5204, lng: 73.8567, zoom: 11 },
    Ahmedabad: { lat: 23.0225, lng: 72.5714, zoom: 11 },
    Jaipur: { lat: 26.9124, lng: 75.7873, zoom: 11 },
    Kochi: { lat: 9.9312, lng: 76.2673, zoom: 11 },
    Lucknow: { lat: 26.8467, lng: 80.9462, zoom: 11 },
    Chandigarh: { lat: 30.7333, lng: 76.7794, zoom: 11 },
  };
  const correctedMapCoordinates: Record<string, { lat: number; lng: number }> = {
    '6a0dd72af12f43e1310e78ae': { lat: 18.864937, lng: 79.458788 }
  };
  const correctedLocalityCoordinates: Record<string, { lat: number; lng: number }> = {
    turkyamjal: { lat: 17.2709, lng: 78.5831 },
    turkayamjal: { lat: 17.2709, lng: 78.5831 },
    miyapur: { lat: 17.4933, lng: 78.3915 },
    injapur: { lat: 17.3037, lng: 78.6684 },
    tukkuguda: { lat: 17.2086, lng: 78.4831 },
    bongulur: { lat: 17.2675, lng: 78.6746 },
    boduppal: { lat: 17.4139, lng: 78.5783 },
    nelamangala: { lat: 13.1021, lng: 77.3937 },
    chikkaballapura: { lat: 13.4355, lng: 77.7315 },
    chikkaballapur: { lat: 13.4355, lng: 77.7315 },
    nandihills: { lat: 13.3702, lng: 77.6835 },
    rajanukunte: { lat: 13.1732, lng: 77.5659 },
    yeshwanthpur: { lat: 13.0285, lng: 77.5409 },
    jigani: { lat: 12.7843, lng: 77.6412 },
    igani: { lat: 12.7843, lng: 77.6412 },
    devanahalli: { lat: 13.2437, lng: 77.7137 },
    thanisandra: { lat: 13.0451, lng: 77.6266 },
    manyatatechpark: { lat: 13.0451, lng: 77.6266 },
    brigadeorchards: { lat: 13.2325, lng: 77.7144 },
    hoskote: { lat: 13.0707, lng: 77.7981 },
    sarjapur: { lat: 12.861, lng: 77.7855 },
    anekal: { lat: 12.7105, lng: 77.6953 },
    shivamogga: { lat: 13.9299, lng: 75.5681 },
  };
  const indiaBounds = {
    minLat: 6.0,
    maxLat: 37.5,
    minLng: 68.0,
    maxLng: 98.5,
  };
  const telanganaBounds = {
    minLat: 15.7,
    maxLat: 19.95,
    minLng: 77.0,
    maxLng: 81.9,
  };
  const karnatakaBounds = {
    minLat: 11.4,
    maxLat: 18.6,
    minLng: 74.0,
    maxLng: 78.8,
  };
  const cityCoordinateRadiusKm: Record<string, number> = {
    Hyderabad: 180,
    Bengaluru: 520,
    Chennai: 160,
    Mumbai: 160,
    Delhi: 180,
    Kolkata: 160,
    Pune: 140,
    Ahmedabad: 150,
    Jaipur: 150,
    Kochi: 140,
    Lucknow: 150,
    Chandigarh: 130,
  };

  const networkMapStyles = [
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#facc15' }, { weight: 1.5 }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#f59e0b' }, { weight: 2.2 }],
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#111827' }],
    },
    {
      featureType: 'transit.line',
      elementType: 'geometry',
      stylers: [{ color: '#2563eb' }, { weight: 2 }],
    },
    {
      featureType: 'transit.station.rail',
      elementType: 'labels.icon',
      stylers: [{ color: '#1d4ed8' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#38bdf8' }],
    },
    {
      featureType: 'poi.business',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'poi.government',
      elementType: 'labels',
      stylers: [{ visibility: 'on' }],
    },
  ];

  const getPropertyTitle = (property: any) =>
    property.projectName || `${String(property.developmentType || 'Property').replace(/-/g, ' ')} property in ${property.locality || property.city || 'India'}`;

  const normalizeLocationKey = (value?: string) =>
    String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const propertyNeedsTelanganaContext = (property: any) =>
    /telangana|hyderabad|secunderabad|miyapur|turkyamjal|turkayamjal|injapur|tukkuguda|bongulur/i.test(
      [property.state, property.city, property.locality, property.address, property.landmark, selectedCity].filter(Boolean).join(' ')
    );

  const propertyNeedsKarnatakaContext = (property: any) =>
    /karnataka|bengaluru|bangalore|nelamangala|chikkaballapura|chikkaballapur|rajanukunte|nandi\s*hills?|jigani|igani|yeshwanthpur|devanahalli|thanisandra|manyata|brigade\s*orchards|hoskote|sarjapur|anekal|shivamogga/i.test(
      [property.state, property.city, property.locality, property.address, property.landmark, selectedCity].filter(Boolean).join(' ')
    );

  const coordinateInsideBounds = (coords: { lat: number; lng: number }, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) =>
    coords.lat >= bounds.minLat
      && coords.lat <= bounds.maxLat
      && coords.lng >= bounds.minLng
      && coords.lng <= bounds.maxLng;

  const distanceKm = (first: { lat: number; lng: number }, second: { lat: number; lng: number }) => {
    const toRadians = (value: number) => value * Math.PI / 180;
    const radius = 6371;
    const latDelta = toRadians(second.lat - first.lat);
    const lngDelta = toRadians(second.lng - first.lng);
    const a = Math.sin(latDelta / 2) ** 2
      + Math.cos(toRadians(first.lat)) * Math.cos(toRadians(second.lat)) * Math.sin(lngDelta / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getCoordinateContextCity = (property: any) => {
    const locationText = [property.city, property.state, property.locality, property.address, property.landmark, selectedCity]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return Object.keys(cityCenters).find((city) => locationText.includes(city.toLowerCase())) || selectedCity || 'Hyderabad';
  };

  const coordinatesFitPropertyContext = (property: any, coords: { lat: number; lng: number }) => {
    if (!coordinateInsideBounds(coords, indiaBounds)) return false;

    if (propertyNeedsTelanganaContext(property)) {
      return coordinateInsideBounds(coords, telanganaBounds);
    }

    if (propertyNeedsKarnatakaContext(property)) {
      return coordinateInsideBounds(coords, karnatakaBounds);
    }

    const contextCity = getCoordinateContextCity(property);
    const cityCenter = cityCenters[contextCity] || cityCenters.Hyderabad;
    const radiusKm = cityCoordinateRadiusKm[contextCity] || 180;
    return distanceKm(coords, cityCenter) <= radiusKm;
  };

  const getPropertyLocationParts = (property: any) => {
    const needsTelangana = propertyNeedsTelanganaContext(property);
    const selectedCityCenter = cityCenters[selectedCity] ? selectedCity : '';
    const state = property.state || (needsTelangana ? 'Telangana' : '');
    return {
      societyName: property.societyName || '',
      locality: property.locality || property.location || '',
      landmark: String(property.landmark || '').replace(/^near\s+(to\s+)?/i, '').trim(),
      city: property.city || (needsTelangana ? 'Hyderabad' : selectedCityCenter),
      state,
      pincode: property.pincode || '',
      address: property.address || '',
    };
  };

  const getPropertyLocation = (property: any) => {
    const { societyName, locality, landmark, city, state, pincode } = getPropertyLocationParts(property);
    return [
      societyName,
      locality,
      landmark,
      city,
      state,
      pincode,
    ].filter(Boolean).join(', ');
  };

  const isSpecificLocationValue = (value?: string, city?: string, state?: string) => {
    const normalized = normalizeLocationKey(value);
    if (!normalized || normalized.length < 3) return false;
    const genericValues = new Set([
      'india',
      'telangana',
      'andhrapradesh',
      'karnataka',
      'hyderabad',
      'secunderabad',
      'bengaluru',
      'bangalore',
      'sharedviawhatsapp',
      'maplocation',
      'location',
      'near',
      'mainroad',
    ]);
    if (genericValues.has(normalized)) return false;
    if (city && normalized === normalizeLocationKey(city)) return false;
    if (state && normalized === normalizeLocationKey(state)) return false;
    return true;
  };

  const hasSpecificPropertyLocation = (property: any) => {
    const { societyName, locality, landmark, city, state, pincode, address } = getPropertyLocationParts(property);
    return Boolean(
      isSpecificLocationValue(societyName, city, state) ||
      isSpecificLocationValue(locality, city, state) ||
      isSpecificLocationValue(landmark, city, state) ||
      isSpecificLocationValue(address, city, state) ||
      /^\d{6}$/.test(String(pincode || ''))
    );
  };

  const isCityCenterCoordinate = (property: any, coords: { lat: number; lng: number }) => {
    if (!hasSpecificPropertyLocation(property)) return false;
    return Object.values(cityCenters).some((center) =>
      Math.abs(coords.lat - center.lat) < 0.018 && Math.abs(coords.lng - center.lng) < 0.018
    );
  };

  const getPropertyPrice = (property: any) => {
    if (property.squareYardPrice) return `Rs. ${Number(property.squareYardPrice).toLocaleString('en-IN')} / sq yd`;
    if (property.goodwill) return `Goodwill Rs. ${Number(property.goodwill).toLocaleString('en-IN')}`;
    if (property.advance) return `Advance Rs. ${Number(property.advance).toLocaleString('en-IN')}`;
    return 'Price on request';
  };

  const getPropertyIntentLabel = (property: any) => {
    const intent = String(property.listingIntent || 'development').toLowerCase();
    if (intent === 'buy') return 'Buyer requirement';
    if (intent === 'sell') return 'Sell plot';
    return 'Development';
  };

  const getPropertyImage = (property: any) => {
    return property.imageUrl
      ? `${API_ORIGIN}${property.imageUrl}`
      : 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80';
  };

  const normalizeCoordinates = (coords: any) => {
    const lat = Number(coords?.lat);
    const lng = Number(coords?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
    return null;
  };

  const safeDecodeMapText = (value?: string) => {
    try {
      return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
    } catch {
      return String(value || '').replace(/\+/g, ' ');
    }
  };

  const extractCoordinatesFromMapText = (value?: string) => {
    const decodedValue = safeDecodeMapText(value);
    const patterns = [
      /(?:q=|ll=|center=|@)\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
      /!3d\s*(-?\d+(?:\.\d+)?)\s*!4d\s*(-?\d+(?:\.\d+)?)/i,
      /\b(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\b/
    ];

    for (const pattern of patterns) {
      const match = decodedValue.match(pattern);
      const coords = match ? normalizeCoordinates({ lat: match[1], lng: match[2] }) : null;
      if (coords) return coords;
    }

    return null;
  };

  const extractSearchTextFromMapLink = (link?: string) => {
    const trimmed = String(link || '').trim();
    if (!trimmed || extractCoordinatesFromMapText(trimmed)) return '';

    try {
      const url = new URL(trimmed);
      const queryKeys = ['q', 'query', 'destination', 'daddr'];
      for (const key of queryKeys) {
        const value = url.searchParams.get(key);
        if (value && !extractCoordinatesFromMapText(value)) return value.replace(/\+/g, ' ');
      }

      const decodedPath = safeDecodeMapText(url.pathname);
      const pathMatch = decodedPath.match(/\/maps\/(?:place|search|dir)\/([^/@?]+)/);
      if (pathMatch?.[1]) return pathMatch[1].replace(/\//g, ' ').trim();
    } catch {
      return trimmed;
    }

    return '';
  };

  const isDefaultMapPlaceholder = (coords: { lat: number; lng: number }) =>
    Math.abs(coords.lat - 22.9734) < 0.0001 && Math.abs(coords.lng - 78.6569) < 0.0001;

  const coerceCoordinatesForProperty = (property: any, coords: { lat: number; lng: number } | null) => {
    if (!coords || isDefaultMapPlaceholder(coords) || isCityCenterCoordinate(property, coords)) return null;
    if (coordinatesFitPropertyContext(property, coords)) return coords;

    const swapped = normalizeCoordinates({ lat: coords.lng, lng: coords.lat });
    if (swapped && !isDefaultMapPlaceholder(swapped) && !isCityCenterCoordinate(property, swapped) && coordinatesFitPropertyContext(property, swapped)) {
      return swapped;
    }

    return null;
  };

  const parseCoordinates = (property: any) => {
    if (correctedMapCoordinates[property?._id]) return correctedMapCoordinates[property._id];

    const mapLink = property?.map || property?.mapLink || '';
    const mapCoords = coerceCoordinatesForProperty(property, extractCoordinatesFromMapText(mapLink));
    if (mapCoords) return mapCoords;

    const localityKey = normalizeLocationKey([property?.locality, property?.location, property?.landmark, property?.address, property?.city].filter(Boolean).join(' '));
    const correctedLocality = Object.entries(correctedLocalityCoordinates)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([key]) => localityKey.includes(key))?.[1];
    if (correctedLocality) return correctedLocality;

    if (property?.coordinates) {
      const directCoords = normalizeCoordinates(property.coordinates);
      const coercedDirectCoords = coerceCoordinatesForProperty(property, directCoords);
      if (coercedDirectCoords) return coercedDirectCoords;

      try {
        const parsed = JSON.parse(property.coordinates);
        const parsedCoords = coerceCoordinatesForProperty(property, normalizeCoordinates(parsed));
        if (parsedCoords) return parsedCoords;
      } catch {
        // Fall back to parsing the map link below.
      }
    }

    return null;
  };

  const resolvePropertyMapLinkCoordinates = async (property: any) => {
    const mapLink = String(property?.map || property?.mapLink || '').trim();
    if (!mapLink || extractCoordinatesFromMapText(mapLink)) return null;

    try {
      const response = await fetch(`${API_BASE}/resolve-map-link?url=${encodeURIComponent(mapLink)}`);
      const data = await response.json();
      if (!response.ok) return null;
      return coerceCoordinatesForProperty(property, normalizeCoordinates(data.coordinates));
    } catch (error) {
      console.error('Unable to resolve map link coordinates:', error);
      return null;
    }
  };

  const getPropertyGeocodeCandidates = (property: any) => {
    const { societyName, locality, landmark, city, state, pincode, address } = getPropertyLocationParts(property);
    const mapSearchText = extractSearchTextFromMapLink(property.map || property.mapLink);
    const specificSocietyName = isSpecificLocationValue(societyName, city, state) ? societyName : '';
    const specificLocality = isSpecificLocationValue(locality, city, state) ? locality : '';
    const specificLandmark = isSpecificLocationValue(landmark, city, state) ? landmark : '';
    const specificAddress = isSpecificLocationValue(address, city, state) ? address : '';
    const candidates = [
      mapSearchText && `${mapSearchText}, ${specificLocality || city}, ${state}, India`,
      mapSearchText && `${mapSearchText}, India`,
      specificAddress && specificLocality && city && state && `${specificAddress}, ${specificLocality}, ${city}, ${state}, India`,
      specificSocietyName && specificLocality && city && state && `${specificSocietyName}, ${specificLocality}, ${city}, ${state}, India`,
      specificLandmark && specificLocality && city && state && `${specificLandmark}, ${specificLocality}, ${city}, ${state}, India`,
      specificLocality && pincode && city && state && `${specificLocality}, ${city}, ${state}, ${pincode}, India`,
      specificLocality && city && state && `${specificLocality}, ${city}, ${state}, India`,
      specificAddress && city && state && `${specificAddress}, ${city}, ${state}, India`,
      specificLandmark && city && state && `${specificLandmark}, ${city}, ${state}, India`,
      pincode && city && state && `${pincode}, ${city}, ${state}, India`,
      specificLocality && state && `${specificLocality}, ${state}, India`,
      specificLocality && `${specificLocality}, India`,
    ].filter(Boolean) as string[];
    return Array.from(new Set(candidates.map((candidate) => candidate.replace(/\s+/g, ' ').trim())));
  };

  const resolvePropertyCandidateWithPlaces = async (property: any, query: string) => {
    const google = (window as any).google;
    if (!google?.maps?.places?.PlacesService || !mapInstanceRef.current || !query.trim()) return null;

    const service = new google.maps.places.PlacesService(mapInstanceRef.current);
    const normalizePlaceCoords = (place: any) => {
      const location = place?.geometry?.location;
      const coords = location ? normalizeCoordinates({ lat: location.lat(), lng: location.lng() }) : null;
      return coords && !isDefaultMapPlaceholder(coords) && coordinatesFitPropertyContext(property, coords) ? coords : null;
    };

    const findPlaceCoords = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
      service.findPlaceFromQuery(
        {
          query,
          fields: ['geometry', 'formatted_address', 'name'],
          locationBias: cityCenters[selectedCity]
            ? new google.maps.LatLng(cityCenters[selectedCity].lat, cityCenters[selectedCity].lng)
            : undefined,
        },
        (results: any[] | null, status: string) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
            resolve(null);
            return;
          }
          resolve(results.map(normalizePlaceCoords).find(Boolean) || null);
        }
      );
    });
    if (findPlaceCoords) return findPlaceCoords;

    return new Promise<{ lat: number; lng: number } | null>((resolve) => {
      service.textSearch(
        {
          query,
          location: cityCenters[selectedCity]
            ? new google.maps.LatLng(cityCenters[selectedCity].lat, cityCenters[selectedCity].lng)
            : undefined,
          radius: 120000,
        },
        (results: any[] | null, status: string) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
            resolve(null);
            return;
          }
          resolve(results.map(normalizePlaceCoords).find(Boolean) || null);
        }
      );
    });
  };

  const getPropertyDate = (property: any) => {
    const rawDate = property.approvedAt || property.createdAt || property.updatedAt;
    const date = rawDate ? new Date(rawDate) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  };

  const matchesLocationSearch = (property: any) => {
    const query = locationSearch.trim().toLowerCase();
    if (!query) return true;
    return [
      property.projectName,
      property.societyName,
      property.locality,
      property.landmark,
      property.city,
      property.pincode,
      property.address,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  };

  const matchesPlotFilter = (property: any) => {
    const type = String(property.developmentType || '').toLowerCase();
    const intent = String(property.listingIntent || 'development').toLowerCase();
    return intent === 'buy' || intent === 'sell' || type.includes('plot') || type.includes('land') || type.includes('plotted');
  };

  const matchesSelectedCity = (property: any) => {
    const city = String(selectedCity || '').trim().toLowerCase();
    if (!city) return true;

    const aliases: Record<string, string[]> = {
      bengaluru: ['bengaluru', 'bangalore'],
      bangalore: ['bengaluru', 'bangalore'],
      mumbai: ['mumbai', 'bombay'],
      delhi: ['delhi', 'new delhi'],
      kolkata: ['kolkata', 'calcutta'],
      kochi: ['kochi', 'cochin'],
    };
    const cityAliases = aliases[city] || [city];
    const propertyCity = String(property.city || '').trim().toLowerCase();
    if (cityAliases.some((alias) => propertyCity === alias)) return true;

    const cityStateAliases: Record<string, string[]> = {
      hyderabad: ['telangana'],
      bengaluru: ['karnataka'],
      bangalore: ['karnataka'],
      chennai: ['tamil nadu', 'tamilnadu'],
      mumbai: ['maharashtra'],
      delhi: ['delhi', 'nct of delhi'],
      kolkata: ['west bengal', 'westbengal'],
      pune: ['maharashtra'],
      ahmedabad: ['gujarat'],
      jaipur: ['rajasthan'],
      kochi: ['kerala'],
      lucknow: ['uttar pradesh', 'uttarpradesh'],
      chandigarh: ['chandigarh', 'punjab', 'haryana'],
    };
    const selectedStateAliases = cityStateAliases[city] || [];
    const propertyState = String(property.state || '').trim().toLowerCase();
    if (selectedStateAliases.some((state) => propertyState === state)) return true;

    const searchableLocation = [
      property.locality,
      property.societyName,
      property.projectName,
      property.address,
      property.landmark,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return cityAliases.some((alias) => new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(searchableLocation));
  };

  const filteredProperties = useMemo(() => {
    const now = Date.now();
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    return properties.filter((property) => {
      if (!matchesSelectedCity(property)) return false;

      if (activeMapFilters.listingIntent !== 'All') {
        const intent = String(property.listingIntent || 'development').toLowerCase();
        const type = String(property.developmentType || '').toLowerCase();
        if (activeMapFilters.listingIntent === 'commercial') {
          if (intent !== 'sell' || type !== 'commercial-plot') return false;
        } else {
        if (intent !== activeMapFilters.listingIntent.toLowerCase()) return false;
        }
      }

      if (activeMapFilters.plots && !matchesPlotFilter(property)) return false;

      if (activeMapFilters.ownerListed) {
        const intent = String(property.listingIntent || 'development').toLowerCase();
        if (intent === 'buy') return false;
      }

      const propertyDate = getPropertyDate(property);
      if (activeMapFilters.lastWeek) {
        if (!propertyDate || propertyDate.getTime() < weekAgo) return false;
      } else if (activeMapFilters.lastMonth) {
        if (!propertyDate || propertyDate.getTime() < monthAgo) return false;
      }

      return true;
    });
  }, [properties, activeMapFilters, selectedCity]);

  const toggleMapFilter = (key: 'plots' | 'ownerListed' | 'lastMonth' | 'lastWeek') => {
    setActiveMapFilters((prev) => {
      if (key === 'lastWeek') {
        return { ...prev, lastWeek: !prev.lastWeek, lastMonth: prev.lastWeek ? prev.lastMonth : false };
      }
      if (key === 'lastMonth') {
        return { ...prev, lastMonth: !prev.lastMonth, lastWeek: prev.lastMonth ? prev.lastWeek : false };
      }
      return { ...prev, [key]: !prev[key] };
    });
  };

  const clearMapFilters = () => {
    setLocationSearch('');
    setLocationSearchNotice('');
    setLocationPredictions([]);
    setShowLocationPredictions(false);
    setActiveMapFilters({
      plots: false,
      ownerListed: false,
      lastMonth: false,
      lastWeek: false,
      listingIntent: 'All',
    });
    setSelectedProperty(null);
  };

  const getPlacesSessionToken = () => {
    const google = (window as any).google;
    if (!google?.maps?.places?.AutocompleteSessionToken) return null;
    if (!placesSessionTokenRef.current) {
      placesSessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
    return placesSessionTokenRef.current;
  };

  const moveMapToPlace = (place: any, fallbackLabel = 'Location found.') => {
    const geometry = place?.geometry;
    if (!geometry?.location || !mapInstanceRef.current) return false;

    if (geometry.viewport) {
      mapInstanceRef.current.fitBounds(geometry.viewport);
    } else {
      mapInstanceRef.current.setCenter(geometry.location);
      mapInstanceRef.current.setZoom(14);
    }
    setLocationSearch(place.formatted_address || place.name || fallbackLabel);
    setLocationSearchNotice(place.formatted_address || place.name || fallbackLabel);
    setShowLocationPredictions(false);
    setLocationPredictions([]);
    skipPlacesLookupRef.current = true;
    placesSessionTokenRef.current = null;
    return true;
  };

  const geocodeMapLocation = (query: string, noticeOnSuccess = true) => {
    const google = (window as any).google;
    if (!google?.maps?.Geocoder || !mapInstanceRef.current) {
      setLocationSearchNotice('Google location search is still loading. Please try again.');
      return;
    }

    setIsLocationSearching(true);
    setLocationSearchNotice('Searching location...');
    const cityContext = selectedCity && !new RegExp(selectedCity, 'i').test(query) ? `, ${selectedCity}` : '';
    const searchAddress = `${query}${cityContext}, India`;
    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address: searchAddress, componentRestrictions: { country: 'IN' } }, (results: any[], status: string) => {
      setIsLocationSearching(false);
      if (status !== 'OK' || !results?.[0]?.geometry?.location) {
        setLocationSearchNotice('Location not found. Try locality, city, state, or pincode.');
        return;
      }

      const result = results[0];
      moveMapToPlace(result, noticeOnSuccess ? 'Location found.' : '');
    });
  };

  const selectLocationPrediction = (prediction: any) => {
    if (!prediction?.place_id) return;
    const google = (window as any).google;
    if (!google?.maps?.places?.PlacesService || !mapInstanceRef.current) {
      geocodeMapLocation(prediction.description || locationSearch);
      return;
    }

    setIsLocationSearching(true);
    setLocationSearchNotice('Searching location...');
    const service = new google.maps.places.PlacesService(mapInstanceRef.current);
    service.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['formatted_address', 'geometry', 'name'],
        sessionToken: placesSessionTokenRef.current,
      },
      (place: any, status: string) => {
        setIsLocationSearching(false);
        if (status === 'OK' && moveMapToPlace(place, prediction.description)) return;
        geocodeMapLocation(prediction.description || locationSearch);
      }
    );
  };

  useEffect(() => {
    const query = locationSearch.trim();
    if (skipPlacesLookupRef.current) {
      skipPlacesLookupRef.current = false;
      return;
    }
    if (query.length < 2) {
      setLocationPredictions([]);
      setShowLocationPredictions(false);
      return;
    }

    const google = (window as any).google;
    if (!google?.maps?.places?.AutocompleteService) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const cityCenter = cityCenters[selectedCity] || cityCenters.Hyderabad;
      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'in' },
          location: cityCenter ? new google.maps.LatLng(cityCenter.lat, cityCenter.lng) : undefined,
          radius: 90000,
          sessionToken: getPlacesSessionToken(),
        },
        (predictions: any[] | null, status: string) => {
          if (cancelled) return;
          const okStatus = google.maps.places.PlacesServiceStatus.OK;
          if (status !== okStatus || !predictions?.length) {
            setLocationPredictions([]);
            setShowLocationPredictions(false);
            return;
          }
          setLocationPredictions(predictions.slice(0, 6));
          setShowLocationPredictions(true);
        }
      );
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [locationSearch, selectedCity]);

  const focusMapLocation = () => {
    const query = locationSearch.trim();
    if (!query) return;

    if (locationPredictions.length) {
      selectLocationPrediction(locationPredictions[0]);
      return;
    }

    geocodeMapLocation(query);
  };

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch(`${API_BASE}/search`);
        const data = await res.json();
        if (res.ok) setProperties(data);
      } catch (error) {
        console.error('Failed to load properties for map:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  useEffect(() => {
    const handleCityChange = (event: Event) => {
      const city = (event as CustomEvent<string>).detail || localStorage.getItem('selectedCity') || 'Hyderabad';
      setSelectedCity(city);
    };
    const handleStorage = () => setSelectedCity(localStorage.getItem('selectedCity') || 'Hyderabad');

    window.addEventListener('selectedCityChange', handleCityChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('selectedCityChange', handleCityChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (selectedProperty && !filteredProperties.some((property) => property._id === selectedProperty._id)) {
      setSelectedProperty(null);
    }
  }, [filteredProperties, selectedProperty]);

  useEffect(() => {
    if (loading) return;

    setMarkersReady(false);
    const markerTimer = window.setTimeout(() => {
      setMarkersReady(true);
    }, 3000);

    return () => window.clearTimeout(markerTimer);
  }, [loading, filteredProperties.length]);

  useEffect(() => {
    const loadMap = () => {
      if (!(window as any).google?.maps || !mapRef.current) return;

      const google = (window as any).google;
      const renderToken = ++mapRenderTokenRef.current;
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center: { lat: 22.9734, lng: 78.6569 },
          zoom: 5,
          mapTypeId: 'hybrid',
          styles: networkMapStyles,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
        });
        transitLayerRef.current = new google.maps.TransitLayer();
        transitLayerRef.current.setMap(mapInstanceRef.current);
      }

      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      setMappedProperties([]);
      setMappedCount(0);

      if (!markersReady) return;

      const bounds = new google.maps.LatLngBounds();
      const mappedItems: any[] = [];
      const coordinateUseCount: Record<string, number> = {};

      const zoomToSelectedCity = () => {
        const cityCenter = cityCenters[selectedCity];
        if (cityCenter) {
          mapInstanceRef.current.setCenter({ lat: cityCenter.lat, lng: cityCenter.lng });
          mapInstanceRef.current.setZoom(cityCenter.zoom);
          return;
        }

        if (mappedItems.length > 1) {
          mapInstanceRef.current.fitBounds(bounds, 80);
        } else if (mappedItems.length === 1) {
          mapInstanceRef.current.setCenter(bounds.getCenter());
          mapInstanceRef.current.setZoom(13);
        }
      };

      const getMarkerSymbol = (property: any) => {
        const type = String(property.developmentType || '').toLowerCase();
        if (type.includes('villa')) {
          return {
            path: 'M 0 -12 L 11 8 L -11 8 Z',
            fillColor: '#22c55e',
            scale: 1.2,
          };
        }
        if (type.includes('plot')) {
          return {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#facc15',
            scale: 11,
          };
        }
        if (type.includes('standalone')) {
          return {
            path: 'M -10 -10 L 10 -10 L 10 10 L -10 10 Z',
            fillColor: '#38bdf8',
            scale: 1,
          };
        }
        return {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          fillColor: '#f97316',
          scale: 7,
        };
      };

      const addMarker = (property: any, coords: { lat: number; lng: number }) => {
        if (renderToken !== mapRenderTokenRef.current) return;
        const symbol = getMarkerSymbol(property);
        const localityKey = normalizeLocationKey(property.locality || property.location || property.city);
        const coordKey = `${localityKey || 'location'}:${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;
        const duplicateIndex = coordinateUseCount[coordKey] || 0;
        coordinateUseCount[coordKey] = duplicateIndex + 1;
        const markerCoords = duplicateIndex
          ? (() => {
              const angle = duplicateIndex * 1.618 * Math.PI;
              const radius = Math.min(0.0045, 0.00055 + duplicateIndex * 0.00022);
              return {
                lat: coords.lat + Math.cos(angle) * radius,
                lng: coords.lng + Math.sin(angle) * radius,
              };
            })()
          : coords;
        const marker = new google.maps.Marker({
          position: markerCoords,
          map: mapInstanceRef.current,
          title: getPropertyTitle(property),
          icon: {
            path: symbol.path,
            fillColor: symbol.fillColor,
            fillOpacity: 1,
            strokeColor: '#020617',
            strokeWeight: 3,
            scale: symbol.scale,
          },
          animation: google.maps.Animation.DROP,
        });

        marker.addListener('click', () => {
          setAccessNotice('');
          setSelectedProperty({ ...property, mapCoordinates: markerCoords });
          mapInstanceRef.current.panTo(markerCoords);
          mapInstanceRef.current.setZoom(Math.max(mapInstanceRef.current.getZoom() || 13, 13));
        });

        markersRef.current.push(marker);
        bounds.extend(markerCoords);
        mappedItems.push({ ...property, mapCoordinates: markerCoords });
        setMappedCount(mappedItems.length);
        setMappedProperties([...mappedItems]);
      };

      const propertiesMissingCoordinates: any[] = [];
      let pendingGeocodeCount = 0;

      filteredProperties.forEach((property) => {
        const coords = parseCoordinates(property);
        if (coords) {
          addMarker(property, coords);
        } else {
          propertiesMissingCoordinates.push(property);
        }
      });

      if (propertiesMissingCoordinates.length && google.maps.Geocoder) {
        const geocoder = new google.maps.Geocoder();
        pendingGeocodeCount = propertiesMissingCoordinates.length;
        propertiesMissingCoordinates.forEach((property, index) => {
          const candidates = getPropertyGeocodeCandidates(property);
          if (!candidates.length) {
            pendingGeocodeCount -= 1;
            setMappedCount(mappedItems.length);
            return;
          }

          window.setTimeout(() => {
            if (renderToken !== mapRenderTokenRef.current) return;
            const startResolve = async () => {
              const resolvedCoords = await resolvePropertyMapLinkCoordinates(property);
              if (renderToken !== mapRenderTokenRef.current) return;
              if (resolvedCoords) {
                addMarker(property, resolvedCoords);
                pendingGeocodeCount -= 1;
                zoomToSelectedCity();
                return;
              }

              tryCandidate(0);
            };
            const tryCandidate = (candidateIndex: number) => {
              if (renderToken !== mapRenderTokenRef.current) return;
              if (candidateIndex >= candidates.length) {
                pendingGeocodeCount -= 1;
                setMappedCount(mappedItems.length);
                return;
              }
              geocoder.geocode({ address: candidates[candidateIndex], componentRestrictions: { country: 'IN' } }, async (results: any[], status: string) => {
                if (renderToken !== mapRenderTokenRef.current) return;
                if (status !== 'OK' || !results?.[0]?.geometry?.location) {
                  const placesCoords = await resolvePropertyCandidateWithPlaces(property, candidates[candidateIndex]);
                  if (renderToken !== mapRenderTokenRef.current) return;
                  if (placesCoords) {
                    addMarker(property, placesCoords);
                    pendingGeocodeCount -= 1;
                    zoomToSelectedCity();
                    return;
                  }
                  tryCandidate(candidateIndex + 1);
                  return;
                }
                const location = results[0].geometry.location;
                const coords = { lat: location.lat(), lng: location.lng() };
                if (!coordinatesFitPropertyContext(property, coords)) {
                  const placesCoords = await resolvePropertyCandidateWithPlaces(property, candidates[candidateIndex]);
                  if (renderToken !== mapRenderTokenRef.current) return;
                  if (placesCoords) {
                    addMarker(property, placesCoords);
                    pendingGeocodeCount -= 1;
                    zoomToSelectedCity();
                    return;
                  }
                  tryCandidate(candidateIndex + 1);
                  return;
                }
                addMarker(property, coords);
                pendingGeocodeCount -= 1;
                zoomToSelectedCity();
              });
            };
            startResolve();
          }, index * 260);
        });
      }

      setMappedCount(mappedItems.length);
      setMappedProperties([...mappedItems]);
      zoomToSelectedCity();
    };

    if (!(window as any).google?.maps) {
      const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (existingScript) {
        existingScript.addEventListener('load', loadMap, { once: true });
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setMapError('Add a valid Google Maps API key to show the property map.');
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=3.55&libraries=places`;
      script.async = true;
      script.onload = loadMap;
      script.onerror = () => setMapError('Google Maps could not load. Please check the API key and billing setup.');
      document.head.appendChild(script);
      return;
    }

    loadMap();
  }, [filteredProperties, markersReady, selectedCity]);

  return (
    <section className="relative h-[calc(100vh-68px)] min-h-[760px] overflow-hidden bg-slate-900">
      <div ref={mapRef} className="absolute inset-0 h-full w-full" />
      {mapError && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center bg-slate-900">
          <div className="mx-4 max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <MapPinned className="mx-auto h-10 w-10 text-teal-700" />
            <h2 className="mt-4 text-xl font-bold text-slate-950">Map setup required</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{mapError}</p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute left-0 right-0 top-5 z-10 px-3 sm:top-6 sm:px-5">
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative w-full min-w-0 sm:w-[300px] lg:w-[320px]">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                focusMapLocation();
              }}
              className="flex h-11 w-full min-w-0 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-slate-600 shadow-lg"
            >
              <input
                value={locationSearch}
                onChange={(event) => {
                  setLocationSearch(event.target.value);
                  setLocationSearchNotice('');
                  if (event.target.value.trim().length >= 2) setShowLocationPredictions(true);
                }}
                onFocus={() => {
                  if (locationPredictions.length) setShowLocationPredictions(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    focusMapLocation();
                  }
                  if (event.key === 'Escape') {
                    setShowLocationPredictions(false);
                  }
                }}
                className="min-w-0 flex-1 bg-transparent outline-none"
                placeholder="Enter Location"
                aria-label="Enter Location"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={focusMapLocation}
                className="rounded-full p-1 text-slate-600 hover:bg-slate-100"
                aria-label="Search map location"
              >
                <Search className="h-5 w-5" />
              </button>
            </form>
            {showLocationPredictions && (locationPredictions.length > 0 || isLocationSearching) && (
              <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl">
                {locationPredictions.map((prediction) => (
                  <button
                    key={prediction.place_id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectLocationPrediction(prediction)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {prediction.structured_formatting?.main_text || prediction.description}
                      </span>
                      {prediction.structured_formatting?.secondary_text && (
                        <span className="block truncate text-xs text-slate-500">
                          {prediction.structured_formatting.secondary_text}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
                {isLocationSearching && !locationPredictions.length && (
                  <div className="px-4 py-3 text-sm font-semibold text-slate-500">Searching locations...</div>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowMapFilters((value) => !value)}
            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-lg sm:px-5 ${
              showMapFilters || activeMapFilters.listingIntent !== 'All'
                ? 'bg-teal-700 text-white'
                : 'bg-amber-50 text-slate-800'
            }`}
          >
            <Filter className="h-4 w-4" /> Filters
          </button>
        {[
            { label: 'Flats', key: 'plots' as const },
            { label: 'Last Month', key: 'lastMonth' as const },
            { label: 'Last Week', key: 'lastWeek' as const },
          ].map((filter) => {
            const active = activeMapFilters[filter.key];
            return (
            <button
              key={filter.key}
              type="button"
              onClick={() => toggleMapFilter(filter.key)}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-lg sm:px-5 ${
                active ? 'bg-teal-700 text-white' : 'bg-white text-slate-700'
              }`}
              aria-pressed={active}
            >
              {active && <Check className="h-4 w-4 text-white" />}
              {filter.label}
            </button>
            );
          })}
        </div>
        {locationSearchNotice && (
          <div className="pointer-events-auto mt-2 w-fit max-w-[min(420px,calc(100vw-24px))] rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-lg">
            {locationSearchNotice}
          </div>
        )}
        {showMapFilters && (
          <div className="pointer-events-auto mt-3 w-full max-w-[420px] rounded-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-950">Property filters</h2>
              <button type="button" onClick={clearMapFilters} className="text-xs font-bold text-teal-700">
                Reset
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'All', value: 'All' },
                { label: 'Buyer', value: 'buy' },
                { label: 'Sale Property', value: 'sell' },
                { label: 'Commercial Space', value: 'commercial' },
              ].map((option) => {
                const active = activeMapFilters.listingIntent === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setActiveMapFilters((prev) => ({ ...prev, listingIntent: option.value }))}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                      active
                        ? 'border-teal-700 bg-teal-50 text-teal-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">
              Showing {filteredProperties.length} of {properties.length} approved properties.
            </p>
          </div>
        )}
      </div>

      <button className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-r-xl bg-white px-2 py-4 text-sm font-bold text-slate-950 shadow-lg md:block">
        <span className="[writing-mode:vertical-rl]">List</span>
      </button>

      <div className="absolute right-5 top-24 z-10 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg">
        {loading ? 'Preparing property markers...' : `${mappedCount} marked / ${filteredProperties.length} listed`}
      </div>
      {!loading && filteredProperties.length > mappedCount && (
        <div className="absolute right-5 top-36 z-10 max-w-[260px] rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-900 shadow-lg">
          {filteredProperties.length - mappedCount} listed propert{filteredProperties.length - mappedCount === 1 ? 'y is' : 'ies are'} waiting for valid map coordinates.
        </div>
      )}

      {accessNotice && (
        <div className="absolute bottom-6 left-1/2 z-30 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white shadow-2xl">
          {accessNotice}
        </div>
      )}

      {selectedProperty ? (
        <aside className="absolute bottom-4 left-4 top-20 z-20 flex w-[360px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-950">
                    {selectedProperty.totalArea} {selectedProperty.areaUnit || ''}
                  </h1>
                  <span className="text-sm font-semibold text-slate-400">|</span>
                  <span className="text-sm font-semibold text-slate-500">{getPropertyPrice(selectedProperty)}</span>
                </div>
                <p className="mt-2 flex items-start gap-1 text-sm text-slate-600">
                  <MapPinned className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{getPropertyLocation(selectedProperty)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProperty(null)}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                aria-label="Close property details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
            <div className="relative h-52 bg-slate-200">
              <img
                src={getPropertyImage(selectedProperty)}
                alt={getPropertyTitle(selectedProperty)}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80';
                }}
              />
              <span className="absolute left-4 top-4 rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-slate-950">
                Owner listed property
              </span>
            </div>

            <div className="m-4 rounded-xl bg-amber-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase text-slate-700 underline">Property Highlights</h2>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">Verified</span>
              </div>
              {[
                `Development type: ${selectedProperty.developmentType || 'Land'}`,
                `Facing: ${selectedProperty.facing || selectedProperty.roadFacingDirection || 'Available on request'}`,
                `Road size: ${selectedProperty.roadSize || 'Available on request'}`,
                `Pincode: ${selectedProperty.pincode || 'Available on request'}`,
              ].map((item) => (
                <p key={item} className="mt-3 flex gap-3 text-sm leading-6 text-slate-700">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-slate-600" />
                  <span>{item}</span>
                </p>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            <div className="mb-3 rounded-lg bg-slate-100 px-4 py-3 text-center text-xs font-medium text-slate-600">
              Access this property with <span className="font-bold text-slate-950">HomeFeet Premium</span> <Crown className="ml-1 inline h-4 w-4 text-amber-500" />
            </div>
            <div className="grid grid-cols-[1fr_1fr] gap-3">
              <Link to={`/property/${selectedProperty._id}`} className="inline-flex h-11 items-center justify-center rounded-full border border-slate-950 px-4 text-sm font-semibold text-slate-950">
                View Details
              </Link>
              <Link to={`/property/${selectedProperty._id}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-amber-300 px-4 text-sm font-bold text-slate-950">
                Get Access <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </aside>
      ) : null}
    </section>
  );
}

function MembershipPage({ audience }: { audience?: 'builder' | 'owner_mediator' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('3_months');
  const [loadingPlan, setLoadingPlan] = useState('');
  const [message, setMessage] = useState('');
  const paymentInProgressRef = useRef(false);
  const redirectParam = searchParams.get('redirect');
  const membershipUseCase = searchParams.get('useCase');
  const redirectTo = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/properties';
  const accountType = localStorage.getItem('accountType') || 'owner';
  const selectedAudience = audience || (['owner', 'mediator', 'buyer'].includes(accountType) ? 'owner_mediator' : 'builder');
  const isOwnerMediatorPlan = selectedAudience === 'owner_mediator';
  const isBuyerAccessPlan = isOwnerMediatorPlan && membershipUseCase === 'buyer';
  const isBuyerInfoAccessPlan = isOwnerMediatorPlan && membershipUseCase === 'buyer-info';
  const builderMembershipPrices = {
    '3_months': '15000.00 INR',
    '6_months': '30000.00 INR',
    '12_months': '50000.00 INR',
  };
  const ownerMediatorMembershipPrices = {
    '3_months': '50000.00 INR',
    '6_months': '100000.00 INR',
    '12_months': '150000.00 INR',
  };
  const membershipPrices = isBuyerAccessPlan
    ? builderMembershipPrices
    : isOwnerMediatorPlan
      ? ownerMediatorMembershipPrices
      : builderMembershipPrices;
  const membershipFeatures = isBuyerAccessPlan
    ? [
        'Subscribe before exploring sale flats and commercial space',
        'Access complete listing details from owners and mediators',
        'Continue from the property search you were browsing',
      ]
    : isBuyerInfoAccessPlan
    ? [
        'Owners and mediators can access buyer requirement details',
        'Open buyer contact information only with active membership',
        'Continue from the buyer requirement you were reviewing',
      ]
    : isOwnerMediatorPlan
    ? [
        'Free property posting for owners and mediators',
        'Access complete property details',
        'Continue from the property page you were browsing',
      ]
    : [
        'Access complete property details',
        'View owner and mediator listing information',
        'Continue from the property page you were browsing',
      ];
  const plans = [
    {
      value: '3_months',
      label: 'Quarterly / 3 Months',
      price: membershipPrices['3_months'],
      note: 'Best for short-term property scouting',
    },
    {
      value: '6_months',
      label: 'Half Yearly / 6 Months',
      price: membershipPrices['6_months'],
      note: 'Better for active market follow-up',
    },
    {
      value: '12_months',
      label: 'Yearly / 12 Months',
      price: membershipPrices['12_months'],
      note: 'Best value for full-year access',
    },
  ];
  const selectedPlanDetails = plans.find((plan) => plan.value === selectedPlan) || plans[0];

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, []);

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

  const openRazorpayCheckout = async (plan: typeof plans[number]) => {
    if (paymentInProgressRef.current) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    const currentAccountType = localStorage.getItem('accountType') || 'owner';
    const accountAudience = currentAccountType === 'owner' || currentAccountType === 'mediator' ? 'owner_mediator' : 'builder';
    if (accountAudience !== selectedAudience) {
      setMessage(accountAudience === 'owner_mediator'
        ? 'Your account is Owner/Agent (Mediator). Please open the Owner/Agent (Mediator) membership page.'
        : 'Your account is Builder. Please open the Builder membership page.'
      );
      return;
    }

    paymentInProgressRef.current = true;
    setLoadingPlan(plan.value);
    setMessage('');

    try {
      await loadRazorpayCheckout();

      const orderResponse = await fetch(`${API_BASE}/membership-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan: plan.value, membershipAudience: selectedAudience })
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
        description: `${plan.label} Membership`,
        image: `${window.location.origin}${razorpayConfig.logoPath}`,
        order_id: orderData.order.id,
        prefill: {
          name: localStorage.getItem('name') || 'HomeFeet User',
          email: localStorage.getItem('email') || '',
          contact: localStorage.getItem('phone') ? `+91${localStorage.getItem('phone')}` : ''
        },
        notes: {
          plan: plan.value,
          membershipAudience: selectedAudience,
          redirectTo,
          address: razorpayConfig.notesAddress
        },
        theme: {
          color: razorpayConfig.themeColor
        },
        handler: async (response) => {
          try {
            const verifyResponse = await fetch(`${API_BASE}/membership-payment/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token') || ''}`
              },
              body: JSON.stringify({
                plan: plan.value,
                ...response
              })
            });
            const verifyData = await verifyResponse.json();
            if (!verifyResponse.ok) {
              throw new Error(verifyData.message || 'Payment verification failed');
            }

            localStorage.setItem('builderSubscriptionPlan', verifyData.user.builderSubscriptionPlan || 'none');
            localStorage.setItem('builderSubscriptionExpiresAt', verifyData.user.builderSubscriptionExpiresAt || '');
            setMessage('Payment successful. Membership activated.');
            window.setTimeout(() => navigate(redirectTo), 800);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Payment verification failed');
          } finally {
            paymentInProgressRef.current = false;
            setLoadingPlan('');
          }
        },
        modal: {
          ondismiss: () => {
            paymentInProgressRef.current = false;
            setLoadingPlan('');
          }
        }
      });

      checkout.open();
    } catch (error) {
      paymentInProgressRef.current = false;
      setMessage(error instanceof Error ? error.message : 'Unable to start Razorpay payment');
      setLoadingPlan('');
    }
  };

  const handleSubscribe = (plan: typeof plans[number]) => {
    if (paymentInProgressRef.current) return;

    setMessage('');
    setSelectedPlan(plan.value);
    localStorage.setItem('membershipRedirectTo', redirectTo);
    localStorage.setItem('pendingMembershipPlan', plan.value);

    if (!localStorage.getItem('token')) {
      setShowLoginModal(true);
      return;
    }

    openRazorpayCheckout(plan);
  };

  return (
    <section className="bg-slate-50 pb-24 pt-12">
      <div className="ld-container">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm font-bold tracking-wide text-[#0877C9]">HomeFeet Membership</p>
          <h1 className="relative -top-2 mt-1 text-[2.25rem] font-black tracking-tight text-slate-950 sm:text-[2.7rem] md:whitespace-nowrap md:text-[4.3rem]">
            {isBuyerAccessPlan
              ? 'Buyer | Property Seeker Membership'
              : isBuyerInfoAccessPlan
                ? 'Unlock buyer information'
                : 'Unlock complete property details'}
          </h1>
        </div>

        <div id="membership-plans" className="mx-auto mt-3 max-w-[784px] scroll-mt-24 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
          <div className="mx-auto grid max-w-[720px] gap-3 md:grid-cols-3">
            {plans.map((plan) => {
              const active = selectedPlan === plan.value;
              return (
                <label
                  key={plan.value}
                  className={`cursor-pointer rounded-xl border px-3 py-4 transition sm:px-4 sm:py-6 ${
                    active ? 'border-[#0877C9] bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="membershipPlan"
                      checked={active}
                      onChange={() => setSelectedPlan(plan.value)}
                      className="peer sr-only"
                    />
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      active ? 'border-[#0877C9]' : 'border-slate-400'
                    }`}>
                      <span className={`h-2.5 w-2.5 rounded-full transition ${active ? 'bg-[#0877C9]' : 'bg-transparent'}`} />
                    </span>
                    <span className="text-[13px] font-black leading-tight text-slate-950 md:whitespace-nowrap">{plan.label}</span>
                  </div>
                  <p className="mt-3 text-center font-sans text-lg font-semibold leading-tight tracking-normal text-slate-900 sm:text-xl">{plan.price}</p>
                  <p className="mt-2 text-center text-[11px] leading-5 text-slate-600 md:whitespace-nowrap">{plan.note}</p>
                </label>
              );
            })}
          </div>

          <div className="mx-auto mt-6 max-w-4xl space-y-3 text-xs font-semibold text-slate-800 sm:text-sm">
            {membershipFeatures.map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#0877C9]" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-3 flex max-w-4xl items-center justify-between border-t border-slate-200 pt-4 text-sm">
            <span className="font-semibold text-slate-600">Total Amount:</span>
            <span className="font-sans text-lg font-semibold tracking-normal text-slate-900">{selectedPlanDetails.price}</span>
          </div>

          <div className="mx-auto mt-3 flex max-w-4xl items-center gap-2 text-xs font-semibold text-slate-600 sm:text-sm">
            <FileText className="h-4 w-4 text-slate-500" />
            GST Invoice Available
          </div>

          <button
            type="button"
            onClick={() => handleSubscribe(selectedPlanDetails)}
            disabled={Boolean(loadingPlan)}
            className="mx-auto mt-5 flex min-h-9 w-full max-w-[176px] items-center justify-center gap-2 rounded-lg bg-[#0877C9] px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-[#0665aa] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loadingPlan ? 'Opening Razorpay...' : 'Subscribe Now'}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-slate-600">
            <span>Secured by</span>
            <span className="inline-flex items-center gap-0.5 font-black italic text-[#1f5fbf]">
              <svg className="h-5 w-4" viewBox="0 0 64 80" aria-hidden="true">
                <polygon points="6,72 24,40 37,35 24,72" fill="#0b2d5b" />
                <polygon points="26,38 60,6 43,72 28,72 39,35 28,45" fill="#3395ff" />
              </svg>
              Razorpay
            </span>
          </p>
        </div>

        {message && (
          <p className="mx-auto mt-6 max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-800">
            {message}
          </p>
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          Your selected plan is saved so support can continue from the membership you selected.
        </p>
      </div>
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          stayOnPage
          onLoginSuccess={() => {
            setShowLoginModal(false);
            if (selectedPlan) {
              const plan = plans.find((item) => item.value === selectedPlan);
              if (plan) openRazorpayCheckout(plan);
            } else {
              setMessage('Please select a membership plan to continue.');
            }
          }}
        />
      )}
    </section>
  );
}

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search]);

  return null;
}

function RequireLogin({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem('token')));
  const [showLoginModal, setShowLoginModal] = useState(() => !localStorage.getItem('token'));

  if (isLoggedIn) return <>{children}</>;

  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">Login required</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Please login with mobile number and OTP to continue.</p>
      </div>
      {showLoginModal && (
        <LoginModal
          stayOnPage
          onClose={() => {
            setShowLoginModal(false);
            if (!localStorage.getItem('token')) navigate('/');
          }}
          onLoginSuccess={() => {
            setIsLoggedIn(true);
            setShowLoginModal(false);
          }}
        />
      )}
    </section>
  );
}

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ScrollToTop />
      <SEOManager />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/properties" element={<PropertiesListingPage />} />
          <Route path="/buy-plot-land" element={<Navigate to="/properties?view=developers&listingIntent=buy" replace />} />
          <Route path="/sell-plot-land" element={<Navigate to="/properties?view=developers&listingIntent=sell" replace />} />
          <Route path="/properties-map" element={<PropertiesMapPage />} />
          <Route path="/membership" element={<MembershipPage />} />
          <Route path="/builder-membership" element={<MembershipPage audience="builder" />} />
          <Route path="/owner-mediator-membership" element={<MembershipPage audience="owner_mediator" />} />
          <Route path="/membership/builder" element={<MembershipPage audience="builder" />} />
          <Route path="/membership/owner-mediator" element={<MembershipPage audience="owner_mediator" />} />
          <Route path="/search" element={<PropertiesListingPage />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/testimonials" element={<TestimonialsPage />} />
          <Route path="/subscription-plans" element={<SubscriptionPlansPage />} />
          <Route path="/compare" element={<ComparisonPage />} />
          <Route path="/find-an-agent" element={<AgentDirectory />} />
          <Route path="/agent/:id" element={<AgentProfile />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms-and-conditions" element={<LegalPage type="terms" />} />
          <Route path="/privacy-policy" element={<LegalPage type="privacy" />} />
          <Route path="/refund-and-cancellation" element={<LegalPage type="refund" />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/post-property-options" element={<PostPropertyChoice />} />
          <Route path="/buyer-requirement" element={<BuyerExpectedPropertyForm />} />
          <Route path="/post-property-summary" element={<RequireLogin><PropertySummary /></RequireLogin>} />
          <Route path="/post-property" element={<PostProperty />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/project/:id" element={<PropertyDetails />} />
          <Route path="/property/:id" element={<PropertyDetails />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/edit-property/:id" element={<PostProperty />} />
          <Route path="/interest-shown" element={<InterestShown />} />
          <Route path="/interested-in-your-properties" element={<InterestedInYourProperties />} />
          <Route path="/user-posted-properties" element={<UserPostedProperties />} />
          <Route path="/chat/:interestId" element={<ChatPage />} />
        </Routes>
      </main>
      <Footer />
      <AdminChatbot />
    </div>
  );
}

export default App;
