import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Armchair,
  ArrowLeft,
  ArrowUpDown,
  BadgeCheck,
  Bath,
  Bike,
  Car,
  Castle,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Clapperboard,
  Compass,
  Download,
  Droplet,
  Dumbbell,
  Flower2,
  IndianRupee,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Shield,
  ShieldCheck,
  ShowerHead,
  Snowflake,
  Sparkles,
  Sprout,
  Tag,
  Trees,
  Trophy,
  Users,
  UtensilsCrossed,
  Waves,
  Zap
} from 'lucide-react';
import { API_BASE, API_ORIGIN } from '../lib/api';
import LoginModal from './LoginModal';

const formatMoney = (value?: string) => {
  const rawValue = String(value || '');
  const rangeParts = rawValue.match(/\d[\d,]*/g);
  if (rangeParts && rangeParts.length >= 2 && /-|to/i.test(rawValue)) {
    return `${formatMoney(rangeParts[0])} to ${formatMoney(rangeParts[1])}`;
  }
  const num = Number(rawValue.replace(/,/g, '') || 0);
  if (!num) return '';
  return `Rs. ${num.toLocaleString('en-IN')}`;
};

const cleanType = (value?: string) =>
  value ? value.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Development';

const commercialDevelopmentTypes = ['commercial-plot', 'office-space', 'retail', 'hospitality', 'industrial'];
const apartmentLikeTypes = ['apartment', 'standalone', 'high-rise', 'group-house'];

const propertyNumberPrefix = (property: any) => {
  const intent = String(property?.listingIntent || 'development').toLowerCase();
  const type = String(property?.developmentType || '').toLowerCase();
  if (commercialDevelopmentTypes.includes(type)) return 'CP';
  if (intent === 'sell' && apartmentLikeTypes.includes(type)) return 'SF';
  if (intent === 'buy') return 'BY';
  if (intent === 'sell') return 'SP';
  return 'DP';
};

const propertyStatePrefix = (property: any) => {
  const state = String(property?.state || property?.city || 'Telangana').replace(/[^a-z]/gi, '').toUpperCase();
  return (state || 'TEL').slice(0, 3).padEnd(3, 'X');
};

const propertyNumber = (property: any) => {
  const id = String(property?._id || '');
  const stableNumber = id
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `${propertyStatePrefix(property)}-${propertyNumberPrefix(property)}-${101 + (stableNumber % 900)}`;
};

const fallbackPropertyImage = 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80';
const isDisplayableImage = (url = '') => url && !url.toLowerCase().includes('.pdf');

const AMENITY_ICONS: Record<string, typeof Sparkles> = {
  'Single Parking': Car,
  'Double Parking': Car,
  'Bike Parking': Bike,
  Lift: ArrowUpDown,
  'Power Backup': Zap,
  Security: Shield,
  Gym: Dumbbell,
  Clubhouse: Users,
  'Water Supply': Droplet,
  Park: Trees,
  'Swimming Pool': Waves,
  'Badminton Court': Trophy,
  'Cricket Court': CircleDot,
  'Food Court': UtensilsCrossed,
  'Waiting Lounge': Armchair,
  Amphitheater: Castle,
  'Sauna Bath': Bath,
  Spa: Flower2,
  'Skating Rink': Snowflake,
  'Vastu Compliant': Compass,
  'Landscaping & Tree Park': Sprout,
  'Mini Theatre': Clapperboard,
  'Fire Fighting System': ShowerHead
};

const AMENITY_PREVIEW_COUNT = 11;

const PropertyDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [contact, setContact] = useState<{ phone?: string; email?: string } | null>(null);
  const [interestStatus, setInterestStatus] = useState('');
  const [interestId, setInterestId] = useState('');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState('');
  const [accessRequired, setAccessRequired] = useState('');
  const [accessListingIntent, setAccessListingIntent] = useState('');
  const [accessPropertyType, setAccessPropertyType] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [compareCandidates, setCompareCandidates] = useState<any[]>([]);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  const token = localStorage.getItem('token');
  const accountType = localStorage.getItem('accountType') || 'owner';
  const isOwnerOrMediator = accountType === 'owner' || accountType === 'mediator';
  const detailListingIntent = String(property?.listingIntent || accessListingIntent || '').toLowerCase();
  const detailPropertyType = String(property?.developmentType || accessPropertyType || '').toLowerCase();
  const isBuyerRequirementListing = detailListingIntent === 'buy';
  const isBuyerMarketplaceListing = detailListingIntent === 'sell' || detailPropertyType === 'commercial-plot';
  const detailMembershipUseCase = isBuyerRequirementListing ? 'buyer-info' : isBuyerMarketplaceListing ? 'buyer' : '';
  const membershipUrl = detailMembershipUseCase
    ? `/owner-mediator-membership?useCase=${detailMembershipUseCase}&redirect=${encodeURIComponent(`/property/${id || ''}`)}`
    : `/membership?redirect=${encodeURIComponent(`/property/${id || ''}`)}`;
  const contactPartyLabel = isBuyerRequirementListing ? 'Buyer' : 'Owner';
  const marketplaceAccessCopy = isBuyerRequirementListing
    ? 'Owners and mediators need an active subscription to access buyer requirement details and buyer contact information.'
    : isBuyerMarketplaceListing
      ? 'Buyers and land seekers need an active subscription to explore sell plots, commercial plots, complete details, and owner or mediator contact information.'
      : 'To access complete property details, please upgrade your membership.';
  const accessPlanPrices = isOwnerOrMediator
    ? {
        '3_months': '50000.00 INR',
        '6_months': '100000.00 INR',
        '12_months': '150000.00 INR',
      }
    : {
        '3_months': '15000.00 INR',
        '6_months': '30000.00 INR',
        '12_months': '50000.00 INR',
      };
  const continueBrowsing = () => {
    const previousPath = document.referrer && document.referrer.startsWith(window.location.origin)
      ? `${new URL(document.referrer).pathname}${new URL(document.referrer).search}`
      : '';

    if (previousPath && previousPath !== window.location.pathname) {
      navigate(previousPath);
      return;
    }

    navigate(-1);
  };
  const accessPlans = [
    { value: '3_months', label: '3 Months', price: accessPlanPrices['3_months'], note: 'Marketplace access for one quarter' },
    { value: '6_months', label: '6 Months', price: accessPlanPrices['6_months'], note: 'Good for active project scouting' },
    { value: '12_months', label: '12 Months', price: accessPlanPrices['12_months'], note: 'Best value for yearly marketplace access' },
  ];

  useEffect(() => {
    const fetchProperty = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setAccessRequired('');
      setAccessListingIntent('');
      setAccessPropertyType('');
      setContact(null);
      setShowContact(false);

      try {
        const res = await fetch(`${API_BASE}/properties/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setProperty(data.project);
          setActiveImageIndex(0);
          setAccessRequired('');
          const ownerPhone = data.project?.contactPhone || data.project?.phone;
          const ownerEmail = data.project?.contactEmail;
          if (ownerPhone || ownerEmail) {
            setContact({ phone: ownerPhone, email: ownerEmail });
          }
        } else if (data.accessRequired) {
          setAccessRequired(data.accessRequired);
          setAccessListingIntent(data.listingIntent || '');
          setAccessPropertyType(data.propertyType || '');
          setProperty(null);
        } else {
          console.error('Failed to fetch property:', data.error);
        }
      } catch (err) {
        console.error('Error fetching property:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id, token]);

  useEffect(() => {
    if (!property?.locality) {
      setCompareCandidates([]);
      setSelectedCompareIds([]);
      setShowComparison(false);
      return;
    }
    const fetchCompareCandidates = async () => {
      try {
        const params = new URLSearchParams({ q: property.locality });
        if (property.city) params.set('city', property.city);
        const res = await fetch(`${API_BASE}/search?${params.toString()}`);
        const data = await res.json();
        if (!res.ok || !Array.isArray(data)) return;
        const seenProjects = new Set<string>([
          (property.projectName || property.societyName || '').trim().toLowerCase()
        ].filter(Boolean));
        const candidates = data.filter((candidate: any) => {
          if (candidate._id === property._id) return false;
          const key = (candidate.projectName || candidate.societyName || '').trim().toLowerCase();
          if (!key || seenProjects.has(key)) return false;
          seenProjects.add(key);
          return true;
        }).slice(0, 6);
        setCompareCandidates(candidates);
        setSelectedCompareIds([]);
        setShowComparison(false);
      } catch (err) {
        console.error('Error fetching comparable properties:', err);
      }
    };
    fetchCompareCandidates();
  }, [property?._id, property?.locality, property?.city]);

  const toggleCompareSelection = (propertyId: string) => {
    setSelectedCompareIds(prev =>
      prev.includes(propertyId) ? prev.filter(pid => pid !== propertyId) : [...prev, propertyId].slice(0, 3)
    );
  };

  const comparisonProperties = useMemo(() => {
    if (!property) return [];
    const selected = compareCandidates.filter((candidate) => selectedCompareIds.includes(candidate._id));
    return [property, ...selected];
  }, [property, compareCandidates, selectedCompareIds]);

  const title = useMemo(() => {
    if (!property) return '';
    return property.projectName || property.societyName || `${cleanType(property.developmentType)} opportunity in ${property.locality || property.city || 'Hyderabad'}`;
  }, [property]);

  const location = property?.locality && property?.city
    ? `${property.locality}, ${property.city}`
    : property?.city || property?.location || 'Hyderabad';
  const shareOrigin = (import.meta.env.VITE_SHARE_ORIGIN || 'https://www.homefeet.in').replace(/\/$/, '');
  const sharePreviewUrl = property ? `${shareOrigin}/share/property/${property._id}` : '';
  const whatsappShareUrl = property
    ? `https://wa.me/?text=${encodeURIComponent(`${title}\n${sharePreviewUrl}`)}`
    : '';
  const currentUserPhone = localStorage.getItem('phone') || '';
  const isOwnListing = property
    ? Boolean(
        currentUserPhone &&
        (property.phone === currentUserPhone || property.contactPhone === currentUserPhone)
      )
    : false;
  const galleryImages = property
    ? (Array.isArray(property.images) && property.images.length ? property.images : (property.imageUrl ? [property.imageUrl] : []))
    : [];
  const heroImageUrl = property
    ? galleryImages[activeImageIndex] || property.imageUrl || (isDisplayableImage(property.plotDiagramUrl) ? property.plotDiagramUrl : '')
    : '';
  const isGeneratedDiagramHero = property ? !galleryImages.length && !property.imageUrl && Boolean(heroImageUrl) : false;
  const isKarnatakaListing = property
    ? /\b(?:karnataka|bengaluru|bangalore)\b/i.test(`${property.state || ''} ${property.city || ''} ${property.location || ''}`)
    : false;
  const developerRatioLabel = isKarnatakaListing ? 'JV Ratio (Owner:Builder)' : 'Development Ratio (Owner : Builder)';

  const isApartmentListing = String(property?.developmentType || '').toLowerCase() === 'apartment';
  const apartmentLikeTypes = ['apartment', 'standalone', 'high-rise', 'group-house'];
  const isApartmentLikeListing = apartmentLikeTypes.includes(String(property?.developmentType || '').toLowerCase());

  const categoryDetails = property ? [
    { label: 'Category', value: property.propertyCategory ? cleanType(property.propertyCategory) : '' },
    { label: 'Property Type', value: cleanType(property.developmentType) },
    { label: 'Total Area', value: property.totalArea ? `${property.totalArea} ${property.areaUnit || ''}` : '' },
    { label: 'Facing', value: property.facing },
  ].filter((item) => item.value) : [];

  const details = property ? [
    { label: 'Project Name', value: property.projectName },
    { label: 'Company Name', value: property.companyName },
    { label: 'Project Total Units', value: property.projectTotalUnits },
    { label: 'Total Area', value: isApartmentLikeListing ? '' : (property.totalArea ? `${property.totalArea} ${property.areaUnit || ''}` : '') },
    { label: 'Square Feet Price', value: formatMoney(property.squareFeetPrice) },
    { label: 'Total Budget', value: formatMoney(property.totalBudget) },
    { label: 'Bedrooms', value: property.bedrooms },
    { label: 'Bathrooms', value: property.bathrooms },
    { label: developerRatioLabel, value: isApartmentListing ? '' : property.developerRatio },
    { label: 'Facing', value: isApartmentLikeListing ? '' : property.facing },
    { label: 'Flat Size', value: property.flatSize ? `${property.flatSize} Sq Ft` : '' },
    { label: 'Flat Size Range', value: property.flatSizeMin || property.flatSizeMax ? `${property.flatSizeMin || '-'} to ${property.flatSizeMax || '-'} Sq Ft` : '' },
    { label: 'Flat Facing', value: property.flatFacing },
    { label: 'Floor', value: property.floorNumber ? `${property.floorNumber}${property.totalFloors ? ` of ${property.totalFloors}` : ''}` : '' },
    { label: 'Furnishing', value: property.furnishingStatus },
    { label: 'Possession Status', value: property.possessionStatus },
    { label: 'Possession Date', value: property.possessionDate },
    { label: 'RERA ID', value: property.reraId },
    { label: 'Road Size', value: property.roadSize ? `${property.roadSize} ft` : '' },
    { label: 'Frontage', value: property.frontageWidth ? `${property.frontageWidth} ft` : '' },
    { label: 'Road Facing Direction', value: property.roadFacingDirection },
    { label: 'Zoning', value: property.zoningClassification },
  ].filter((item) => item.value) : [];

  const amenities: string[] = Array.isArray(property?.selectedAmenities) ? property.selectedAmenities : [];
  const localityHighlights = property?.localityHighlights || '';
  const projectHighlights = property?.projectHighlights || '';

  const handleShowContact = async () => {
    const builderStatus = localStorage.getItem('builderVerificationStatus');

    if (!token) {
      setShowLoginModal(true);
      return;
    }
    if (isOwnerOrMediator) {
      if (contact || isOwnListing) {
        setShowContact(true);
        return;
      }
      navigate(membershipUrl);
      return;
    }
    if (accountType !== 'builder') {
      alert('Only verified builders can request owner contact. Owners, mediators, buyers, and land seekers can unlock complete listings with a paid membership.');
      return;
    }
    if (builderStatus !== 'approved') {
      alert('Your builder verification must be approved before owner contact access is enabled.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/interests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          propertyId: property._id,
          message: `I am interested in ${property.locality || 'this property'}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to request contact');

      setInterestStatus(data.interest?.status || 'requested');
      setInterestId(data.interest?._id || '');
      setContact(data.contact);
      setShowContact(Boolean(data.contactUnlocked));
      if (data.subscription) {
        localStorage.setItem('builderSubscriptionPlan', data.subscription.plan || 'none');
        localStorage.setItem('builderSubscriptionExpiresAt', data.subscription.expiresAt || '');
        localStorage.setItem('contactUnlocksUsed', String((2 - Number(data.subscription.freeRemaining || 0))));
      }
      if (data.paymentRequired) {
        setShowSubscriptionModal(true);
      }
      if (!data.contactUnlocked) alert(data.message);
    } catch (err: any) {
      alert(err.message || 'Unable to request contact');
    }
  };

  const chooseBuilderPlan = async (plan: string) => {
    localStorage.setItem('pendingMembershipPlan', plan);
    navigate(`/builder-membership?redirect=${encodeURIComponent(`/property/${id || ''}`)}`);
  };

  if (!token && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <div className="ld-container">
          <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-xl">
            <Lock className="mx-auto mb-4 h-10 w-10 text-teal-700" />
            <h1 className="text-3xl font-black text-slate-950">Login required</h1>
            <p className="mt-3 text-slate-600">Property details are available only to logged-in users.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button onClick={() => setShowLoginModal(true)} className="ld-btn-primary">Login to View Details</button>
              <Link to="/properties" className="ld-btn-ghost">Back to Properties</Link>
            </div>
          </div>
        </div>
        {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => window.location.reload()} />}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <div className="ld-container text-center text-slate-600">Loading property details...</div>
      </div>
    );
  }

  const membershipAccessRequired = accessRequired === 'marketplace_subscription' || accessRequired === 'mediator_subscription' || accessRequired === 'owner_subscription';

  if (membershipAccessRequired && !property) {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <div className="ld-container">
          <div className="mx-auto w-full max-w-lg rounded-lg border border-slate-200 bg-white p-7 text-center shadow-2xl">
            <Lock className="mx-auto h-11 w-11 text-teal-700" />
            <p className="ld-eyebrow mt-5">Membership Required</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Upgrade your membership</h1>
            <p className="mt-4 leading-7 text-slate-600">
              {marketplaceAccessCopy}
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={membershipUrl} className="ld-btn-primary">
                Membership <ArrowLeft className="h-5 w-5 rotate-180" />
              </Link>
              <button type="button" onClick={continueBrowsing} className="ld-btn-ghost">
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <div className="ld-container">
          <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-xl">
            <h2 className="text-2xl font-black text-slate-950">Property Not Found</h2>
            <p className="mt-3 text-slate-600">The property does not exist, is not approved, or is no longer available.</p>
            <Link to="/properties" className="ld-btn-primary mt-6">
              <ArrowLeft className="h-5 w-5" /> Back to Properties
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="ld-container">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <Link to="/properties" className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Properties
          </Link>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${
            property.dealStatus === 'closed' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            <Tag className="h-4 w-4" />
            {property.dealStatus === 'closed' ? 'Closed' : 'Open'}
          </span>
        </div>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative h-72 bg-slate-200 md:h-96 lg:h-full lg:min-h-[420px]">
              <img
                src={heroImageUrl ? `${API_ORIGIN}${heroImageUrl}` : fallbackPropertyImage}
                alt={title}
                className={`h-full w-full ${isGeneratedDiagramHero ? 'bg-white object-contain p-4' : 'object-cover'}`}
                onError={(e) => {
                  e.currentTarget.src = fallbackPropertyImage;
                  e.currentTarget.className = 'h-full w-full object-cover';
                }}
              />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-teal-800 shadow">
                  <BadgeCheck className="h-4 w-4" /> Verified Listing
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-slate-800 shadow">
                  <ShieldCheck className="h-4 w-4" /> Admin Reviewed
                </span>
              </div>
              {galleryImages.length > 1 && (
                <div className="absolute bottom-3 left-3 right-3 flex gap-2 overflow-x-auto">
                  {galleryImages.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${
                        index === activeImageIndex ? 'border-teal-500' : 'border-white/70'
                      }`}
                    >
                      <img
                        src={`${API_ORIGIN}${url}`}
                        alt={`${title} photo ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 md:p-8">
              <div className="mb-4 flex flex-wrap gap-2">
                {property.developmentType && (
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-teal-800">
                    {cleanType(property.developmentType)}
                  </span>
                )}
                {property.zoningClassification && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-800">
                    {property.zoningClassification}
                  </span>
                )}
                <span
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-800 shadow-sm"
                  title={`Property number ${propertyNumber(property)}`}
                >
                  Property No: {propertyNumber(property)}
                </span>
              </div>

              <h1 className="text-3xl font-black leading-tight text-slate-950 md:text-4xl">{title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-teal-700" />
                  {location}
                </span>
                {property.map && (
                  <a href={property.map} target="_blank" rel="noopener noreferrer" className="font-bold text-teal-700 hover:text-teal-900">
                    View on Map
                  </a>
                )}
                {property && (
                  <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-green-700 hover:text-green-900">
                    <Share2 className="h-4 w-4" />
                    Share on WhatsApp
                  </a>
                )}
              </div>
              {property.landmark && <p className="mt-2 text-sm text-slate-500">Near {property.landmark}</p>}

              {categoryDetails.length > 0 && (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Property Category</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {categoryDetails.map((item) => (
                      <div key={item.label}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                        <p className="mt-1 font-black text-slate-950">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {property.projectName && (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Project Name Overview</p>
                  <p className="mt-2 text-lg font-black text-slate-950">{property.projectName}</p>
                  {property.companyName && (
                    <p className="mt-1 text-sm font-semibold text-slate-600">By {property.companyName}</p>
                  )}
                  {property.propertyFormUrl && (
                    <a
                      href={`${API_ORIGIN}${property.propertyFormUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#0AA6A6] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#088f8f]"
                    >
                      <Download className="h-4 w-4" />
                      Download Brochure
                    </a>
                  )}
                </div>
              )}

              {(property.advance || property.goodwill) && (
                <div className="mt-5 grid gap-3 rounded-lg bg-teal-50 p-4 sm:grid-cols-2">
                  {property.goodwill && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Goodwill Amount</p>
                      <p className="text-xl font-black text-teal-950">{formatMoney(property.goodwill)}</p>
                    </div>
                  )}
                  {property.advance && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Advance Required</p>
                      <p className="text-xl font-black text-blue-950">{formatMoney(property.advance)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            {property.description && (
              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">Description</h2>
                <p className="mt-3 leading-7 text-slate-600">{property.description}</p>
              </section>
            )}

            {details.length > 0 && (
              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">
                  {property.projectName ? `${property.projectName} Overview` : 'Property Details'}
                </h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {details.map((detail) => (
                    <div key={detail.label} className="rounded-lg bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{detail.label}</p>
                      <p className="mt-1 font-black text-slate-950">{detail.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {amenities.length > 0 && (
              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">{title} Top Amenities</h2>
                <div className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                  {(showAllAmenities ? amenities : amenities.slice(0, AMENITY_PREVIEW_COUNT)).map((amenity) => {
                    const AmenityIcon = AMENITY_ICONS[amenity] || Sparkles;
                    return (
                      <div key={amenity} className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                          <AmenityIcon className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-semibold leading-tight text-slate-700">{amenity}</p>
                      </div>
                    );
                  })}
                  {!showAllAmenities && amenities.length > AMENITY_PREVIEW_COUNT && (
                    <button
                      type="button"
                      onClick={() => setShowAllAmenities(true)}
                      className="flex flex-col items-center justify-center gap-1 rounded-lg border border-teal-200 bg-teal-50 p-3 text-center text-teal-700 transition hover:bg-teal-100"
                    >
                      <span className="text-sm font-black">+{amenities.length - AMENITY_PREVIEW_COUNT} more</span>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  )}
                  {showAllAmenities && amenities.length > AMENITY_PREVIEW_COUNT && (
                    <button
                      type="button"
                      onClick={() => setShowAllAmenities(false)}
                      className="flex flex-col items-center justify-center gap-1 rounded-lg border border-teal-200 bg-teal-50 p-3 text-center text-teal-700 transition hover:bg-teal-100"
                    >
                      <span className="text-sm font-black">Show less</span>
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </section>
            )}

            {(projectHighlights || localityHighlights) && (
              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">Highlights</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {projectHighlights && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project Highlights</p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{projectHighlights}</p>
                    </div>
                  )}
                  {localityHighlights && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Locality Top Highlights</p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{localityHighlights}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {property.floorPlanUrl && (
              <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 p-6 pb-4">
                  <h2 className="text-xl font-black text-slate-950">{title} Floor Plans and Pricing</h2>
                  <a
                    href={`${API_ORIGIN}${property.floorPlanUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-bold text-teal-800 transition hover:bg-teal-100"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </div>

                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="inline-flex flex-col rounded-lg border border-teal-200 bg-teal-50 px-4 py-2">
                      <span className="text-sm font-black text-teal-800">
                        {property.bedrooms ? `${property.bedrooms} Apartment` : cleanType(property.developmentType)}
                      </span>
                      {(property.flatSizeMin || property.flatSizeMax) ? (
                        <span className="text-xs font-semibold text-teal-700">
                          {property.flatSizeMin || '-'} - {property.flatSizeMax || '-'} Sq Ft
                        </span>
                      ) : property.flatSize ? (
                        <span className="text-xs font-semibold text-teal-700">{property.flatSize} Sq Ft</span>
                      ) : null}
                    </div>
                    {formatMoney(property.totalBudget) && (
                      <p className="text-2xl font-black text-slate-950">{formatMoney(property.totalBudget)}</p>
                    )}
                  </div>

                  <div className="mt-6">
                    {isDisplayableImage(property.floorPlanUrl) ? (
                      <img
                        src={`${API_ORIGIN}${property.floorPlanUrl}`}
                        alt={`${title} floor plan`}
                        className="w-full rounded-lg border border-slate-200 object-contain"
                      />
                    ) : (
                      <p className="text-sm text-slate-600">Floor plan document uploaded. Use the Download button above to view it.</p>
                    )}
                  </div>

                  {(property.bedrooms || property.bathrooms || property.floorNumber || property.furnishingStatus || property.possessionStatus) && (
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      {[
                        { label: 'Bedrooms', value: property.bedrooms },
                        { label: 'Bathrooms', value: property.bathrooms },
                        { label: 'Floor', value: property.floorNumber ? `${property.floorNumber}${property.totalFloors ? ` of ${property.totalFloors}` : ''}` : '' },
                        { label: 'Furnishing', value: property.furnishingStatus },
                        { label: 'Possession', value: property.possessionStatus },
                      ].filter((item) => item.value).map((item) => (
                        <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                          <p className="mt-1 text-sm font-black text-slate-950">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {property.videoUrl && (
              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-black text-slate-950">Video Walkthrough</h2>
                <video controls className="max-h-[520px] w-full rounded-lg border bg-black">
                  <source src={`${API_ORIGIN}${property.videoUrl}`} />
                </video>
              </section>
            )}

            {compareCandidates.length > 0 && (
              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">Compare Properties in {property.locality}</h2>
                <p className="mt-1 text-sm text-slate-600">Select up to 3 other projects nearby to compare side by side with this one.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {compareCandidates.map((candidate) => {
                    const checked = selectedCompareIds.includes(candidate._id);
                    return (
                      <label
                        key={candidate._id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                          checked ? 'border-teal-600 bg-teal-50' : 'border-slate-200 hover:border-teal-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCompareSelection(candidate._id)}
                          className="h-4 w-4 accent-teal-700"
                        />
                        <img
                          src={candidate.imageUrl ? `${API_ORIGIN}${candidate.imageUrl}` : fallbackPropertyImage}
                          alt={candidate.projectName || candidate.societyName || 'Property'}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-950">
                            {candidate.projectName || candidate.societyName || cleanType(candidate.developmentType)}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {[candidate.locality, candidate.city].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {selectedCompareIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowComparison(true)}
                    className="mt-4 inline-flex items-center justify-center rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
                  >
                    Compare Selected ({comparisonProperties.length})
                  </button>
                )}

                {showComparison && comparisonProperties.length > 1 && (
                  <div className="mt-6 overflow-x-auto">
                    <div className="flex gap-4">
                      {comparisonProperties.map((item) => {
                        const itemAmenities: string[] = Array.isArray(item.selectedAmenities) ? item.selectedAmenities : [];
                        return (
                          <div key={item._id} className="w-56 shrink-0 rounded-lg border border-slate-200 p-4">
                            <img
                              src={item.imageUrl ? `${API_ORIGIN}${item.imageUrl}` : fallbackPropertyImage}
                              alt={item.projectName || item.societyName || 'Property'}
                              className="h-28 w-full rounded-lg object-cover"
                            />
                            <p className="mt-2 truncate text-sm font-black text-slate-950">
                              {item.projectName || item.societyName || cleanType(item.developmentType)}
                            </p>
                            <p className="truncate text-xs text-slate-500">{[item.locality, item.city].filter(Boolean).join(', ')}</p>
                            {item.bedrooms && (
                              <p className="mt-2 text-xs font-semibold text-slate-700">
                                {item.bedrooms}{item.flatSize ? ` - ${item.flatSize} Sq Ft` : ''}
                              </p>
                            )}
                            <p className="mt-2 text-base font-black text-teal-700">{formatMoney(item.totalBudget) || formatMoney(item.squareFeetPrice)}</p>
                            {item.squareFeetPrice && <p className="text-xs text-slate-500">{formatMoney(item.squareFeetPrice)}/sq.ft</p>}
                            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                            <p className="text-sm font-bold text-slate-900">{item.possessionStatus || '-'}</p>
                            {item.possessionDate && (
                              <>
                                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Possession By</p>
                                <p className="text-sm font-bold text-slate-900">{item.possessionDate}</p>
                              </>
                            )}
                            {itemAmenities.length > 0 && (
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                {itemAmenities.slice(0, 6).map((amenity) => {
                                  const AmenityIcon = AMENITY_ICONS[amenity] || Sparkles;
                                  return (
                                    <div key={amenity} className="flex flex-col items-center gap-1 text-center">
                                      <AmenityIcon className="h-4 w-4 text-teal-700" />
                                      <p className="text-[10px] leading-tight text-slate-600">{amenity}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {itemAmenities.length > 6 && (
                              <p className="mt-1 text-center text-xs font-semibold text-teal-700">+{itemAmenities.length - 6} more</p>
                            )}
                            {item._id !== property._id && (
                              <Link
                                to={`/property/${item._id}`}
                                className="mt-3 block rounded-lg border border-teal-200 px-3 py-1.5 text-center text-xs font-bold text-teal-800 hover:bg-teal-50"
                              >
                                View Details
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>

          <aside className="h-fit rounded-lg border border-slate-200 bg-white p-6 shadow-xl lg:sticky lg:top-28">
            <h2 className="text-xl font-black text-slate-950">Contact {contactPartyLabel}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {contactPartyLabel} contact stays locked by default. Active membership is required to access complete contact details from other listings.
            </p>

            {property.dealStatus === 'closed' ? (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
                This deal has been closed.
              </div>
            ) : !showContact ? (
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex gap-3">
                  <Lock className="mt-1 h-5 w-5 shrink-0 text-teal-700" />
                  <div>
                    <h3 className="font-black text-slate-950">{isOwnerOrMediator ? 'Paid membership required' : `${contactPartyLabel} approval required for free access`}</h3>
                    <p className="text-sm text-slate-600">
                      {isOwnerOrMediator
                        ? marketplaceAccessCopy
                        : `Paid builder members unlock contact immediately. Free builders send a request for ${contactPartyLabel.toLowerCase()} approval.`}
                    </p>
                  </div>
                </div>
                <button onClick={handleShowContact} className="ld-btn-primary w-full bg-[#0AA6A6] hover:bg-[#088f8f]">
                  {isOwnerOrMediator ? 'Unlock With Membership' : `Request / Unlock ${contactPartyLabel} Contact`}
                </button>
                {interestStatus && <p className="mt-3 text-sm font-bold text-amber-700">Request status: {interestStatus}</p>}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="flex items-center gap-2 font-black text-slate-950">
                    <Phone className="h-5 w-5 text-teal-700" />
                    {contact?.phone || `${contactPartyLabel} phone unlocked`}
                  </p>
                </div>
                {contact?.email && (
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="flex items-center gap-2 font-black text-slate-950">
                      <Mail className="h-5 w-5 text-teal-700" />
                      {contact.email}
                    </p>
                  </div>
                )}
                {interestId && (
                  <Link to={`/chat/${interestId}`} className="ld-btn-primary w-full bg-slate-950 hover:bg-slate-800">
                    <MessageCircle className="h-5 w-5" /> Open Chat
                  </Link>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => window.location.reload()} />}
      {membershipAccessRequired && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-lg rounded-lg border border-slate-200 bg-white p-7 text-center shadow-2xl">
            <Lock className="mx-auto h-11 w-11 text-teal-700" />
            <p className="ld-eyebrow mt-5">Membership Required</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Upgrade your membership</h1>
            <p className="mt-4 leading-7 text-slate-600">
              {marketplaceAccessCopy}
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={membershipUrl} className="ld-btn-primary">
                Membership <ArrowLeft className="h-5 w-5 rotate-180" />
              </Link>
              <button type="button" onClick={continueBrowsing} className="ld-btn-ghost">
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}
      {showSubscriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="ld-eyebrow">Marketplace Access</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">Choose a plan to unlock more owner contacts</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Paid builder, owner, and mediator members can access owner contacts without waiting for owner approval. Free builders need owner approval before contact details unlock.
                </p>
              </div>
              <button onClick={() => setShowSubscriptionModal(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {accessPlans.map((plan) => (
                <button
                  key={plan.value}
                  type="button"
                  onClick={() => chooseBuilderPlan(plan.value)}
                  disabled={Boolean(subscriptionLoading)}
                  className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-teal-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{plan.label}</p>
                    <Check className="h-5 w-5 text-teal-700" />
                  </div>
                  <p className="mt-3 font-sans text-lg font-semibold tracking-normal text-slate-900">{plan.price}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{plan.note}</p>
                  <span className="mt-5 inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">
                    {subscriptionLoading === plan.value ? 'Activating...' : 'Select Plan'}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-center">
              <button type="button" onClick={() => setShowSubscriptionModal(false)} className="ld-btn-ghost">
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyDetails;
