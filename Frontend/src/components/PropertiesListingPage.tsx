import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  Building,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Factory,
  Grid,
  Home,
  Hotel,
  Layers,
  List,
  Lock,
  Mail,
  MapPin,
  Phone,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Trees,
  Users,
  X
} from 'lucide-react';
import { API_BASE, API_ORIGIN } from '../lib/api';
import { fetchHappeningProjects, getBuilderInitial, getBuilderLabel, getBuilderLogo, getProjectConfiguration, getProjectImage, getProjectPriceRange } from '../lib/happeningProjects';
import LoginModal from './LoginModal';
import { RAZORPAY_CHECKOUT_URL, razorpayConfig } from '../config/razorpay.config';

const BUYER_CONTACT_PACKS = [
  { packSize: 1, price: 199, label: '1 Property' },
  { packSize: 5, price: 1000, label: '5 Properties' },
  { packSize: 10, price: 2000, label: '10 Properties' }
];

declare global {
  interface Window {
    google: any;
  }
}

interface Property {
  _id: string;
  phone?: string;
  contactPhone?: string;
  projectName: string;
  listingIntent?: string;
  developmentType: string;
  totalArea: string;
  areaUnit: string;
  city: string;
  locality: string;
  societyName?: string;
  address?: string;
  pincode?: string;
  state?: string;
  landmark: string;
  coordinates: string;
  map?: string;
  goodwill: string;
  advance: string;
  imageUrl: string;
  plotDiagramUrl?: string;
  dealStatus: string;
  facing: string;
  flatSize?: string;
  flatFacing?: string;
  roadSize: string;
  developerRatio: string;
  bedrooms?: string;
  bathrooms?: string;
  floorNumber?: string;
  totalFloors?: string;
  furnishingStatus?: string;
  possessionStatus?: string;
  squareYardPrice?: string;
  squareFeetPrice?: string;
  totalBudget?: string;
  purchaseTimeline?: string;
  description?: string;
  createdAt: string;
}

const PRICE_RANGE_MIN = 1000000;
const PRICE_RANGE_MAX = 1000000000;
const PRICE_RANGE_STEP = 100000;
const DEFAULT_CITY = 'Hyderabad';
const METRO_CITIES = [
  'Hyderabad',
  'Bengaluru',
  'Chennai',
  'Mumbai',
  'Delhi',
  'Kolkata',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Kochi',
  'Lucknow',
  'Chandigarh',
];
const CITY_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  Hyderabad: { lat: 17.385, lng: 78.4867, zoom: 10 },
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
const getStoredSelectedCity = () => localStorage.getItem('selectedCity') || DEFAULT_CITY;
const getCityCenter = (city?: string) => CITY_CENTERS[city || DEFAULT_CITY] || CITY_CENTERS[DEFAULT_CITY];
const commercialDevelopmentTypes = ['commercial-plot', 'office-space', 'retail', 'hospitality', 'industrial'];
const apartmentLikeTypes = ['apartment', 'standalone', 'high-rise', 'gated-community', 'group-house'];
const getPropertyNumberPrefix = (property: Pick<Property, 'listingIntent' | 'developmentType'>, fallbackIntent = 'development') => {
  const intent = String(property.listingIntent || fallbackIntent || 'development').toLowerCase();
  const type = String(property.developmentType || '').toLowerCase();
  if (commercialDevelopmentTypes.includes(type)) return 'CP';
  if (intent === 'sell' && apartmentLikeTypes.includes(type)) return 'SF';
  if (intent === 'buy') return 'BY';
  if (intent === 'sell') return 'SP';
  return 'DP';
};

const getPropertyStatePrefix = (property: Pick<Property, 'state' | 'city'>) => {
  const state = String(property.state || property.city || 'Telangana').replace(/[^a-z]/gi, '').toUpperCase();
  return (state || 'TEL').slice(0, 3).padEnd(3, 'X');
};

const getPropertyNumber = (property: Pick<Property, '_id' | 'listingIntent' | 'developmentType' | 'state' | 'city'>, fallbackIntent = 'development') => {
  const id = String(property._id || '');
  const stableNumber = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `${getPropertyStatePrefix(property)}-${getPropertyNumberPrefix(property, fallbackIntent)}-${101 + (stableNumber % 900)}`;
};

const PropertiesListingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const routeView = searchParams.get('view');
  const isDeveloperView = routeView === 'developers';
  const isMarketplaceView = routeView === 'marketplace' || !routeView;
  const showDashboardLayout = isDeveloperView || isMarketplaceView;
  const listingIntent = searchParams.get('listingIntent') || 'sell';
  const getUrlDevelopmentType = (params: URLSearchParams, intent = listingIntent) =>
    params.get('developmentType') || (intent === 'sell' ? params.get('propertyType') : '') || 'All';
  const isPlotDealView = listingIntent === 'buy' || listingIntent === 'sell';
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const autocompleteRef = React.useRef<any>(null);
  const developerMapRef = React.useRef<HTMLDivElement>(null);
  const developerMapInstanceRef = React.useRef<any>(null);
  const developerMarkersRef = React.useRef<any[]>([]);
  const geocodedPropertyCoordsRef = React.useRef<Record<string, { lat: number; lng: number }>>({});
  const pendingGeocodePropertyIdsRef = React.useRef<Set<string>>(new Set());
  const pendingGeocodeCallbacksRef = React.useRef<Record<string, Array<(coords: { lat: number; lng: number }) => void>>>({});
  const fetchRequestRef = React.useRef(0);
  const mapAutoFitContextRef = React.useRef('');
  const mapAutoFitDoneRef = React.useRef(false);
  const housingPicksScrollRef = React.useRef<HTMLDivElement>(null);
  const [happeningProjects, setHappeningProjects] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState(() => searchParams.get('city') || getStoredSelectedCity());
  const [focusedPropertyId, setFocusedPropertyId] = useState('');
  const [geocodeTick, setGeocodeTick] = useState(0);
  const [showPropertyTypes, setShowPropertyTypes] = useState(false);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [propertyNumberQuery, setPropertyNumberQuery] = useState('');
  const [mapLocationQuery, setMapLocationQuery] = useState('');
  const [filters, setFilters] = useState({
    developmentType: getUrlDevelopmentType(searchParams),
    minArea: searchParams.get('minArea') || '',
    maxArea: searchParams.get('maxArea') || '',
    ratio: searchParams.get('ratio') || 'All',
    facing: searchParams.get('facing') || 'All',
    minGoodwill: searchParams.get('minGoodwill') || '',
    maxGoodwill: searchParams.get('maxGoodwill') || '',
    city: searchParams.get('city') || (showDashboardLayout ? getStoredSelectedCity() : 'All'),
    zoningClassification: searchParams.get('zoningClassification') || 'All',
    maxOwnerShare: searchParams.get('maxOwnerShare') || '',
    bedrooms: searchParams.get('bedrooms') || 'All',
    possessionStatus: searchParams.get('possessionStatus') || 'All',
    minBudget: searchParams.get('minBudget') || '',
    maxBudget: searchParams.get('maxBudget') || ''
  });
  const [sortBy, setSortBy] = useState('relevance');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [pendingPropertyId, setPendingPropertyId] = useState('');
  const [detailLoadingId, setDetailLoadingId] = useState('');
  const [pendingContactId, setPendingContactId] = useState('');
  const [contactModalProperty, setContactModalProperty] = useState<Property | null>(null);
  const [contactModalLoading, setContactModalLoading] = useState(false);
  const [contactModalResult, setContactModalResult] = useState<{ contactUnlocked: boolean; phone?: string; email?: string; message: string } | null>(null);
  const [loadingPack, setLoadingPack] = useState(0);
  const [packPurchaseMessage, setPackPurchaseMessage] = useState('');
  const [mapLoadError, setMapLoadError] = useState('');

  // Filter options
  const ratios = ['All', '50:50', '60:40', '70:30', '80:20'];
  const facings = ['All', 'North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'];
  const cities = ['All', ...METRO_CITIES];
  const bhkOptions = ['All', '1 BHK', '2 BHK', '2.5 BHK', '3 BHK', '4 BHK', '4+ BHK'];
  const possessionOptions = ['All', 'Ready to Move', 'Under Construction'];
  const budgetPresets = [
    { label: 'Budget', min: '', max: '' },
    { label: 'Up to ₹25 Lac', min: '', max: '2500000' },
    { label: '₹25 - 50 Lac', min: '2500000', max: '5000000' },
    { label: '₹50 Lac - 1 Cr', min: '5000000', max: '10000000' },
    { label: '₹1 - 2 Cr', min: '10000000', max: '20000000' },
    { label: '₹2 Cr+', min: '20000000', max: '' }
  ];
  const sortOptions = [
    { label: 'Relevance', value: 'relevance' },
    { label: 'Price: Low to High', value: 'price-asc' },
    { label: 'Price: High to Low', value: 'price-desc' },
    { label: 'Newest First', value: 'newest' }
  ];
  const zoningOptions = ['All', 'Residential', 'Commercial', 'Mixed Use', 'Agricultural', 'Industrial'];
  const getCityFilterValues = (city: string) => {
    if (city === 'All') return [];
    const cityKey = city.toLowerCase();
    const metroFilters: Record<string, string[]> = {
      hyderabad: [
        'hyderabad',
        'telangana',
        'secunderabad',
        'injapur',
        'miyapur',
        'nadergul',
        'nadargul',
        'maheshwaram',
        'tukkuguda',
        'turkayamjal',
        'bongulur',
        'isnapur',
        'tatti annaram',
        'lb nagar',
        'bowrampet',
        'kandlakoya',
        'mancherial',
        'agriculture colony',
        'avn colony'
      ],
      bengaluru: [
        'bengaluru',
        'bangalore',
        'karnataka',
        'bengaluru rural',
        'bengaluru urban',
        'nelamangala',
        'chikkaballapura',
        'chikkaballapur',
        'rajanukunte',
        'rajanukunte',
        'nandi hills',
        'nandihills',
        'igani',
        'jigani',
        'yeshwanthpur',
        'yelahanka',
        'devanahalli',
        'hoskote',
        'sarjapur',
        'anekal'
      ],
      mumbai: ['mumbai', 'maharashtra', 'bombay', 'navi mumbai', 'thane', 'south mumbai', 'western suburbs', 'central suburbs'],
      chennai: ['chennai', 'tamil nadu'],
      delhi: ['delhi', 'new delhi', 'ncr'],
      kolkata: ['kolkata', 'west bengal', 'calcutta'],
      pune: ['pune', 'maharashtra'],
      ahmedabad: ['ahmedabad', 'gujarat'],
      jaipur: ['jaipur', 'rajasthan'],
      kochi: ['kochi', 'kerala', 'cochin'],
      lucknow: ['lucknow', 'uttar pradesh'],
      chandigarh: ['chandigarh']
    };
    return metroFilters[cityKey] || [cityKey];
  };
  const propertyMatchesCity = (property: Property, city: string) => {
    const cityFilters = getCityFilterValues(city);
    if (!cityFilters.length) return true;
    const locationText = [
      property.city,
      property.state,
      property.locality,
      property.location,
      property.societyName,
      property.projectName,
      property.address,
      property.landmark,
      property.pincode
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return cityFilters.some((value) => locationText.includes(value));
  };

  // Fetch properties
  useEffect(() => {
    fetchProperties();
  }, [searchParams]);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
    setFilters({
      developmentType: getUrlDevelopmentType(searchParams),
      minArea: searchParams.get('minArea') || '',
      maxArea: searchParams.get('maxArea') || '',
      ratio: searchParams.get('ratio') || 'All',
      facing: searchParams.get('facing') || 'All',
      minGoodwill: searchParams.get('minGoodwill') || '',
      maxGoodwill: searchParams.get('maxGoodwill') || '',
      city: searchParams.get('city') || (showDashboardLayout ? selectedCity || getStoredSelectedCity() : 'All'),
      zoningClassification: searchParams.get('zoningClassification') || 'All',
      maxOwnerShare: searchParams.get('maxOwnerShare') || '',
      bedrooms: searchParams.get('bedrooms') || 'All',
      possessionStatus: searchParams.get('possessionStatus') || 'All',
      minBudget: searchParams.get('minBudget') || '',
      maxBudget: searchParams.get('maxBudget') || ''
    });
  }, [searchParams, showDashboardLayout, selectedCity]);

  useEffect(() => {
    if (!showDashboardLayout) return;

    const cityFromUrl = searchParams.get('city');
    const nextCity = cityFromUrl || selectedCity || getStoredSelectedCity();
    const legacyMixedFilter = searchParams.get('developmentType') === 'mixed';

    if (!cityFromUrl || legacyMixedFilter) {
      const params = new URLSearchParams(searchParams);
      params.set('view', isMarketplaceView ? 'marketplace' : 'developers');
      params.set('listingIntent', listingIntent);
      params.set('city', nextCity);
      if (legacyMixedFilter) params.delete('developmentType');
      setSearchParams(params, { replace: true });
      return;
    }

    if (cityFromUrl !== selectedCity) {
      setSelectedCity(cityFromUrl);
      localStorage.setItem('selectedCity', cityFromUrl);
      setProperties([]);
    }

    setFilters((prev) => prev.city === nextCity ? prev : { ...prev, city: nextCity });
  }, [isMarketplaceView, listingIntent, searchParams, selectedCity, setSearchParams, showDashboardLayout]);

  useEffect(() => {
    const focusDeveloperMapOnCity = (city: string) => {
      if (!developerMapInstanceRef.current) return;
      const center = getCityCenter(city);
      developerMapInstanceRef.current.setCenter({ lat: center.lat, lng: center.lng });
      developerMapInstanceRef.current.setZoom(center.zoom);
    };

    const handleCityChange = (event: Event) => {
      const nextCity = (event as CustomEvent<string>).detail || getStoredSelectedCity();
      setSelectedCity(nextCity);
      if (!showDashboardLayout) return;

      setSearchQuery('');
      setPropertyNumberQuery('');
      setFocusedPropertyId('');
      fetchRequestRef.current += 1;
      setProperties([]);
      setFilters((prev) => ({ ...prev, city: nextCity }));
      if (isDeveloperView) focusDeveloperMapOnCity(nextCity);

      const params = new URLSearchParams(searchParams);
      params.set('view', isMarketplaceView ? 'marketplace' : 'developers');
      params.set('listingIntent', listingIntent);
      params.set('city', nextCity);
      params.delete('q');
      setSearchParams(params);
    };

    window.addEventListener('selectedCityChange', handleCityChange);
    return () => window.removeEventListener('selectedCityChange', handleCityChange);
  }, [isDeveloperView, isMarketplaceView, listingIntent, searchParams, setSearchParams, showDashboardLayout]);

  // Initialize Google Maps Autocomplete
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google?.maps?.places && searchInputRef.current && !autocompleteRef.current) {
        try {
          autocompleteRef.current = new window.google.maps.places.Autocomplete(
            searchInputRef.current,
            {
              types: ['geocode', 'establishment'],
              componentRestrictions: { country: 'IN' },
              fields: ['formatted_address', 'geometry', 'address_components', 'name'],
              strictBounds: false
            }
          );

          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current?.getPlace();
            if (place && place.name) {
              let locationName = '';
              if (place.address_components) {
                const locality = place.address_components.find((c: any) =>
                  c.types?.includes('sublocality_level_1') ||
                  c.types?.includes('sublocality') ||
                  c.types?.includes('locality')
                );
                locationName = locality?.long_name || place.name;
              } else {
                locationName = place.name;
              }
              setSearchQuery(locationName);
              handleSearch(locationName);
            }
          });
        } catch (error) {
          console.warn('Failed to initialize Google Maps Autocomplete:', error);
        }
      }
    };

    if (!window.google?.maps) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error('Google Maps API key missing. Set VITE_GOOGLE_MAPS_API_KEY to enable location autocomplete.');
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=3.55`;
      script.async = true;
      script.onload = () => {
        setTimeout(loadGoogleMaps, 500);
      };
      document.head.appendChild(script);
    } else {
      loadGoogleMaps();
    }
  }, []);

  const fetchProperties = async () => {
    const requestId = fetchRequestRef.current + 1;
    fetchRequestRef.current = requestId;
    setLoading(true);
    try {
      const activeListingIntent = isMarketplaceView
        ? ''
        : searchParams.get('listingIntent') || (showDashboardLayout ? 'development' : '');
      const activeFilters = {
        developmentType: getUrlDevelopmentType(searchParams, activeListingIntent || listingIntent),
        minArea: searchParams.get('minArea') || '',
        maxArea: searchParams.get('maxArea') || '',
        ratio: searchParams.get('ratio') || 'All',
        facing: searchParams.get('facing') || 'All',
        minGoodwill: searchParams.get('minGoodwill') || '',
        maxGoodwill: searchParams.get('maxGoodwill') || '',
        city: searchParams.get('city') || (showDashboardLayout ? selectedCity : 'All'),
        zoningClassification: searchParams.get('zoningClassification') || 'All',
        maxOwnerShare: searchParams.get('maxOwnerShare') || '',
        bedrooms: searchParams.get('bedrooms') || 'All',
        possessionStatus: searchParams.get('possessionStatus') || 'All',
        minBudget: searchParams.get('minBudget') || '',
        maxBudget: searchParams.get('maxBudget') || ''
      };
      const activeQuery = searchParams.get('q') || '';
      const params = new URLSearchParams();
      if (activeQuery) params.append('q', activeQuery);
      if (activeListingIntent && activeListingIntent !== 'development') params.append('listingIntent', activeListingIntent);
      if (activeFilters.developmentType !== 'All') params.append('developmentType', activeFilters.developmentType);
      if (activeFilters.minArea) params.append('minArea', activeFilters.minArea);
      if (activeFilters.maxArea) params.append('maxArea', activeFilters.maxArea);
      if (listingIntent === 'development' && activeFilters.ratio !== 'All') params.append('ratio', activeFilters.ratio);
      if (getCityFilterValues(activeFilters.city).length === 1) params.append('city', activeFilters.city);
      if (activeFilters.zoningClassification !== 'All') params.append('zoningClassification', activeFilters.zoningClassification);
      if (activeFilters.bedrooms !== 'All') params.append('bedrooms', activeFilters.bedrooms);
      if (activeFilters.possessionStatus !== 'All') params.append('possessionStatus', activeFilters.possessionStatus);
      if (activeFilters.minBudget) params.append('minBudget', activeFilters.minBudget);
      if (activeFilters.maxBudget) params.append('maxBudget', activeFilters.maxBudget);
      if (activeFilters.maxOwnerShare) params.append('maxOwnerShare', activeFilters.maxOwnerShare);

      const response = await fetch(`${API_BASE}/search?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        let sourceData = Array.isArray(data) ? data : [];
        let usedLocationFallback = false;

        if (activeQuery && sourceData.length === 0) {
          const fallbackParams = new URLSearchParams();
          if (activeListingIntent && activeListingIntent !== 'development') fallbackParams.append('listingIntent', activeListingIntent);
          if (getCityFilterValues(activeFilters.city).length === 1) fallbackParams.append('city', activeFilters.city);
          const fallbackResponse = await fetch(`${API_BASE}/search?${fallbackParams.toString()}`);
          const fallbackData = await fallbackResponse.json();
          if (fallbackResponse.ok && Array.isArray(fallbackData)) {
            sourceData = fallbackData.filter((property: Property) => propertyMatchesSearch(property, activeQuery));
            usedLocationFallback = sourceData.length > 0;
          }
        }

        // Keep closed deals visible and apply additional filters.
        let filtered = sourceData;

        if (isMarketplaceView) {
          filtered = filtered.filter((property: Property) => {
            const intent = (property.listingIntent || 'development').toLowerCase();
            return intent === 'development' || intent === 'sell';
          });
        } else if (activeListingIntent) {
          filtered = filtered.filter((property: Property) =>
            (property.listingIntent || 'development').toLowerCase() === activeListingIntent.toLowerCase()
          );
        }

        // Apply facing filter
        if (!usedLocationFallback && activeFilters.facing !== 'All') {
          filtered = filtered.filter((p: Property) => p.facing === activeFilters.facing);
        }

        // Apply city filter
        if (activeFilters.city !== 'All') {
          filtered = filtered.filter((p: Property) => propertyMatchesCity(p, activeFilters.city));
        }

        // Apply goodwill range filter
        if (!usedLocationFallback && (activeFilters.minGoodwill || activeFilters.maxGoodwill)) {
          filtered = filtered.filter((p: Property) => {
            const budgetValue = isPlotDealView ? p.squareYardPrice : p.goodwill;
            const goodwill = parseInt(budgetValue || '0');
            const min = parseInt(activeFilters.minGoodwill || '0');
            const max = parseInt(activeFilters.maxGoodwill || '999999999');
            return goodwill >= min && goodwill <= max;
          });
        }

        const uniqueProperties = Array.from(
          new Map(
            filtered.map((property: Property) => [
              property._id || `${property.projectName}-${property.locality}-${property.city}-${property.totalArea}`,
              property
            ])
          ).values()
        );

        if (requestId === fetchRequestRef.current) {
          setProperties(uniqueProperties);
        }
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      if (requestId === fetchRequestRef.current) {
        setLoading(false);
      }
    }
  };

  const buildPropertySearchParams = (
    activeFilters: typeof filters,
    activeQuery: string,
    showDeveloperLayout = showDashboardLayout
  ) => {
    const params = new URLSearchParams();
    if (showDeveloperLayout) params.set('view', isMarketplaceView ? 'marketplace' : 'developers');
    if (!isMarketplaceView && listingIntent) params.set('listingIntent', listingIntent);
    if (activeQuery) params.set('q', activeQuery);
    if (activeFilters.developmentType !== 'All') params.set('developmentType', activeFilters.developmentType);
    if (activeFilters.minArea) params.set('minArea', activeFilters.minArea);
    if (activeFilters.maxArea) params.set('maxArea', activeFilters.maxArea);
    if (listingIntent === 'development' && activeFilters.ratio !== 'All') params.set('ratio', activeFilters.ratio);
    if (activeFilters.facing !== 'All') params.set('facing', activeFilters.facing);
    if (activeFilters.minGoodwill) params.set('minGoodwill', activeFilters.minGoodwill);
    if (activeFilters.maxGoodwill) params.set('maxGoodwill', activeFilters.maxGoodwill);
    if (activeFilters.city !== 'All') params.set('city', activeFilters.city);
    if (activeFilters.zoningClassification !== 'All') params.set('zoningClassification', activeFilters.zoningClassification);
    if (activeFilters.maxOwnerShare) params.set('maxOwnerShare', activeFilters.maxOwnerShare);
    if (activeFilters.bedrooms !== 'All') params.set('bedrooms', activeFilters.bedrooms);
    if (activeFilters.possessionStatus !== 'All') params.set('possessionStatus', activeFilters.possessionStatus);
    if (activeFilters.minBudget) params.set('minBudget', activeFilters.minBudget);
    if (activeFilters.maxBudget) params.set('maxBudget', activeFilters.maxBudget);
    return params;
  };

  const handleSearch = (queryOverride?: string) => {
    const query = typeof queryOverride === 'string' ? queryOverride : searchQuery;
    const params = buildPropertySearchParams(filters, query);
    setSearchParams(params);
  };

  const handleFilterChange = (key: string, value: string, showDeveloperLayout = showDashboardLayout) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (key === 'city' && value !== 'All') {
      setSelectedCity(value);
      localStorage.setItem('selectedCity', value);
    }

    // Apply filters immediately; a debounced update here can race with other
    // filter changes (e.g. the Budget select) and overwrite them with a stale snapshot.
    const params = buildPropertySearchParams(newFilters, searchQuery, showDeveloperLayout);
    setSearchParams(params);
  };

  const handleBudgetSliderChange = (key: 'minGoodwill' | 'maxGoodwill', value: string) => {
    const numericValue = Number(value);
    const pairedValue = key === 'minGoodwill'
      ? Number(filters.maxGoodwill || PRICE_RANGE_MAX)
      : Number(filters.minGoodwill || PRICE_RANGE_MIN);
    const nextValue = key === 'minGoodwill'
      ? Math.min(numericValue, pairedValue)
      : Math.max(numericValue, pairedValue);
    handleFilterChange(key, String(nextValue));
  };

  const clearFilters = () => {
    const cityToKeep = showDashboardLayout ? selectedCity : 'All';
    setSearchQuery('');
    setPropertyNumberQuery('');
    setSortBy('relevance');
    setFilters({
      developmentType: 'All',
      minArea: '',
      maxArea: '',
      ratio: 'All',
      facing: 'All',
      minGoodwill: '',
      maxGoodwill: '',
      city: cityToKeep,
      zoningClassification: 'All',
      maxOwnerShare: '',
      bedrooms: 'All',
      possessionStatus: 'All',
      minBudget: '',
      maxBudget: ''
    });
    setSearchParams(showDashboardLayout ? {
      view: isMarketplaceView ? 'marketplace' : 'developers',
      ...(!isMarketplaceView && listingIntent ? { listingIntent } : {}),
      city: cityToKeep
    } : {});
  };

  const scrollHousingPicks = (direction: 1 | -1) => {
    const container = housingPicksScrollRef.current;
    const card = container?.firstElementChild as HTMLElement | null;
    if (!container || !card) return;
    const gap = parseFloat(getComputedStyle(container).columnGap || '0') || 16;
    container.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: 'smooth' });
  };

  useEffect(() => {
    let cancelled = false;
    fetchHappeningProjects(selectedCity)
      .then((projects) => { if (!cancelled) setHappeningProjects(projects); })
      .catch(() => { if (!cancelled) setHappeningProjects([]); });
    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  const formatPrice = (price: string) => {
    if (!price) return 'Price on request';
    const rangeParts = String(price).match(/\d[\d,]*/g);
    if (rangeParts && rangeParts.length >= 2 && /-|to/i.test(price)) {
      return `${formatPrice(rangeParts[0])} to ${formatPrice(rangeParts[1])}`;
    }
    const num = parseInt(String(price).replace(/,/g, ''));
    if (isNaN(num)) return 'Price on request';
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    return `₹${num.toLocaleString()}`;
  };

  const currentPropertyType = searchParams.get('propertyType') || '';
  const isBuyerMarketplaceAccess = listingIntent === 'sell' || currentPropertyType === 'commercial-plot';
  const isBuyerRequirementAccess = listingIntent === 'buy';
  const membershipUseCase = isBuyerRequirementAccess ? 'buyer-info' : isBuyerMarketplaceAccess ? 'buyer' : '';
  const membershipUrl = membershipUseCase
    ? `/owner-mediator-membership?useCase=${membershipUseCase}&redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`
    : `/membership?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`;
  const membershipModalCopy = isBuyerRequirementAccess
    ? 'Owners and mediators need an active subscription to access buyer requirement details and buyer contact information.'
    : isBuyerMarketplaceAccess
      ? 'Buyers and property seekers need an active subscription to explore sale flats, commercial space, complete details, and owner or mediator contact information.'
      : 'To access other people\'s complete property details and owner contact, please upgrade your membership.';

  const requireLoginForDetails = async (property: Property) => {
    const token = localStorage.getItem('token');
    setPendingPropertyId(property._id);

    if (!token) {
      setShowLoginModal(true);
      return;
    }

    setDetailLoadingId(property._id);
    setShowMembershipModal(false);

    try {
      const res = await fetch(`${API_BASE}/properties/${property._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        navigate(`/property/${property._id}`);
        return;
      }

      if (data.accessRequired) {
        setShowMembershipModal(true);
        return;
      }

      navigate(`/property/${property._id}`);
    } catch (error) {
      navigate(`/property/${property._id}`);
    } finally {
      setDetailLoadingId('');
    }
  };

  const handleCardContact = async (property: Property) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setPendingContactId(property._id);
      setShowLoginModal(true);
      return;
    }

    setContactModalProperty(property);
    setContactModalLoading(true);
    setContactModalResult(null);
    setPackPurchaseMessage('');

    try {
      const res = await fetch(`${API_BASE}/interests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          propertyId: property._id,
          message: `I am interested in ${property.locality || 'this property'}`
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to request contact');

      setContactModalResult({
        contactUnlocked: Boolean(data.contactUnlocked),
        phone: data.contact?.phone,
        email: data.contact?.email,
        message: data.message || ''
      });
    } catch (error) {
      setContactModalResult({
        contactUnlocked: false,
        message: error instanceof Error ? error.message : 'Unable to request contact'
      });
    } finally {
      setContactModalLoading(false);
    }
  };

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

  const handleBuyPack = async (pack: { packSize: number; price: number; label: string }) => {
    if (loadingPack) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    setLoadingPack(pack.packSize);
    setPackPurchaseMessage('');

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
            setPackPurchaseMessage(`Payment successful. You now have ${verifyData.user.buyerContactCredits || 0} contact-reveal credit(s).`);
            if (contactModalProperty) {
              await handleCardContact(contactModalProperty);
            }
          } catch (error) {
            setPackPurchaseMessage(error instanceof Error ? error.message : 'Payment verification failed');
          } finally {
            setLoadingPack(0);
          }
        },
        modal: {
          ondismiss: () => {
            setLoadingPack(0);
          }
        }
      });

      checkout.open();
    } catch (error) {
      setLoadingPack(0);
      setPackPurchaseMessage(error instanceof Error ? error.message : 'Unable to start Razorpay payment');
    }
  };

  const correctedPropertyLocalities: Record<string, string> = {
    '69f85a50d3f7d46a8337be61': 'Turkayamjal',
    '69fdc585807f8cb4121d9848': 'Injapur'
  };
  const correctedPropertyCoordinates: Record<string, { lat: number; lng: number }> = {
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
    hoskote: { lat: 13.0707, lng: 77.7981 },
    sarjapur: { lat: 12.861, lng: 77.7855 },
    anekal: { lat: 12.7105, lng: 77.6953 },
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

  const isLocationLink = (value?: string) => Boolean(value && /^https?:\/\//i.test(value));
  const getDisplayLocality = (property: Property) => {
    if (correctedPropertyLocalities[property._id]) return correctedPropertyLocalities[property._id];
    if (property.locality && !isLocationLink(property.locality)) return property.locality;
    return property.landmark?.replace(/^near\s+(to\s+)?/i, '').trim() || property.city || 'Hyderabad';
  };

  const propertyTitle = (property: Property) =>
    property.projectName && !isLocationLink(property.projectName)
      ? property.projectName
      : `${property.developmentType?.replace(/-/g, ' ') || 'Development'} property in ${getDisplayLocality(property)}`;
  const normalizeSearchText = (value = '') =>
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  const locationSearchAliases: Record<string, string[]> = {
    bongulur: ['bongulur', 'bongloor', 'bungulur'],
    bongloor: ['bongulur', 'bongloor', 'bungulur'],
    tukkuguda: ['tukkuguda', 'tukuguda'],
    tukuguda: ['tukkuguda', 'tukuguda'],
    injapur: ['injapur', 'inapur']
  };
  const propertyMatchesSearch = (property: Property, query = '') => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return false;

    const searchableText = normalizeSearchText([
      propertyTitle(property),
      getDisplayLocality(property),
      property.locality,
      property.societyName,
      property.landmark,
      property.city,
      property.address,
      property.pincode,
      property.developmentType
    ].filter(Boolean).join(' '));

    return normalizedQuery
      .split(/\s+/)
      .filter(Boolean)
      .every((token) => {
        const aliases = locationSearchAliases[token] || [token];
        return aliases.some((alias) => searchableText.includes(alias));
      });
  };
  const getListingIntentLabel = (property: Property) => {
    const intent = (property.listingIntent || listingIntent || 'development').toLowerCase();
    if (intent === 'buy') return 'Buy';
    if (intent === 'sell') return 'Sell';
    return 'Development';
  };
  const getPropertyIntent = (property: Property) =>
    (property.listingIntent || listingIntent || 'development').toLowerCase();
  const fallbackImage = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80';
  const buyerAvatarFallback = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"%3E%3Crect width="320" height="240" fill="%23f8fafc"/%3E%3Ccircle cx="160" cy="84" r="42" fill="%23e0f2f1" stroke="%230f766e" stroke-width="6"/%3E%3Cpath d="M82 205c10-46 39-76 78-76s68 30 78 76" fill="%23e0f2f1" stroke="%230f766e" stroke-width="7" stroke-linecap="round"/%3E%3Cpath d="M130 88c10 12 50 12 60 0" fill="none" stroke="%230f766e" stroke-width="5" stroke-linecap="round"/%3E%3C/svg%3E';
  const isDisplayableImage = (url = '') => url && !url.toLowerCase().includes('.pdf');
  const getCardImageUrl = (property: Property) =>
    property.imageUrl || (isDisplayableImage(property.plotDiagramUrl) ? property.plotDiagramUrl : '');
  const getCardFallbackImage = (property: Property) =>
    getPropertyIntent(property) === 'buy' ? buyerAvatarFallback : fallbackImage;
  const getCardImageSrc = (property: Property) =>
    getCardImageUrl(property) ? `${API_ORIGIN}${getCardImageUrl(property)}` : getCardFallbackImage(property);
  const isBuyerAvatarFallback = (property: Property) =>
    getPropertyIntent(property) === 'buy' && !getCardImageUrl(property);
  const isGeneratedDiagramPreview = (property: Property) => !property.imageUrl && Boolean(getCardImageUrl(property));
  const activeSearchTerm = searchParams.get('q') || searchQuery;
  const getPropertySortPrice = (property: Property) => {
    if (property.totalBudget) return Number(property.totalBudget) || 0;
    if (property.squareFeetPrice && property.flatSize) {
      return (Number(property.squareFeetPrice) || 0) * (Number(property.flatSize) || 0);
    }
    return Number(property.squareYardPrice || property.goodwill || 0) || 0;
  };

  const visibleProperties = React.useMemo(() => {
    const normalizedPropertyNumber = propertyNumberQuery.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matched = normalizedPropertyNumber
      ? properties.filter((property) =>
          getPropertyNumber(property, listingIntent).toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedPropertyNumber)
        )
      : properties;

    if (sortBy === 'relevance') return matched;

    const sorted = [...matched];
    if (sortBy === 'price-asc') sorted.sort((a, b) => getPropertySortPrice(a) - getPropertySortPrice(b));
    else if (sortBy === 'price-desc') sorted.sort((a, b) => getPropertySortPrice(b) - getPropertySortPrice(a));
    else if (sortBy === 'newest') sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted;
  }, [listingIntent, properties, propertyNumberQuery, sortBy]);
  const currentMapCity = searchParams.get('city') || selectedCity || DEFAULT_CITY;

  const normalizeCoordinatePair = (latValue: unknown, lngValue: unknown) => {
    const lat = Number(latValue);
    const lng = Number(lngValue);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  };

  const safeDecodeMapText = (value?: string) => {
    const rawValue = String(value || '').replace(/\+/g, ' ');
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  };

  const extractCoordinatesFromMapText = (value?: string) => {
    const decodedValue = safeDecodeMapText(value);
    const patterns = [
      { regex: /@(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/, lngLat: false },
      { regex: /[?&](?:q|query|ll|center|destination|daddr)=(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/, lngLat: false },
      { regex: /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/, lngLat: false },
      { regex: /!2d(-?\d+\.?\d*)!3d(-?\d+\.?\d*)/, lngLat: true },
      { regex: /\b(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\b/, lngLat: false },
    ];

    for (const pattern of patterns) {
      const match = decodedValue.match(pattern.regex);
      if (!match) continue;
      const coords = pattern.lngLat
        ? normalizeCoordinatePair(match[2], match[1])
        : normalizeCoordinatePair(match[1], match[2]);
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

  const normalizeLocalityKey = (value?: string) =>
    String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const propertyNeedsTelanganaContext = (property: Property) =>
    /telangana|hyderabad|secunderabad|miyapur|turkyamjal|turkayamjal|injapur|tukkuguda|bongulur/i.test(
      [property.state, property.city, property.locality, property.address, property.landmark].filter(Boolean).join(' ')
    );

  const propertyNeedsKarnatakaContext = (property: Property) =>
    /karnataka|bengaluru|bangalore|nelamangala|chikkaballapura|chikkaballapur|rajanukunte|nandi\s*hills?|jigani|igani|yeshwanthpur|devanahalli|hoskote|sarjapur|anekal/i.test(
      [property.state, property.city, property.locality, property.address, property.landmark, currentMapCity].filter(Boolean).join(' ')
    );

  const coordinateInsideBounds = (coords: { lat: number; lng: number }, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) =>
    coords.lat >= bounds.minLat
      && coords.lat <= bounds.maxLat
      && coords.lng >= bounds.minLng
      && coords.lng <= bounds.maxLng;

  const getCoordinateContextCity = (property: Property) => {
    const locationText = [property.city, property.state, property.locality, property.address, property.landmark, currentMapCity]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return Object.keys(CITY_CENTERS).find((city) => locationText.includes(city.toLowerCase())) || currentMapCity || DEFAULT_CITY;
  };

  const distanceKm = (first: { lat: number; lng: number }, second: { lat: number; lng: number }) => {
    const toRadians = (value: number) => value * Math.PI / 180;
    const radius = 6371;
    const latDelta = toRadians(second.lat - first.lat);
    const lngDelta = toRadians(second.lng - first.lng);
    const a = Math.sin(latDelta / 2) ** 2
      + Math.cos(toRadians(first.lat)) * Math.cos(toRadians(second.lat)) * Math.sin(lngDelta / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const coordinatesFitPropertyContext = (property: Property, coords: { lat: number; lng: number }) => {
    if (!coordinateInsideBounds(coords, indiaBounds)) return false;

    if (propertyNeedsTelanganaContext(property)) {
      return coordinateInsideBounds(coords, telanganaBounds);
    }

    if (propertyNeedsKarnatakaContext(property)) {
      return coordinateInsideBounds(coords, karnatakaBounds);
    }

    const contextCity = getCoordinateContextCity(property);
    const cityCenter = getCityCenter(contextCity);
    const radiusKm = cityCoordinateRadiusKm[contextCity] || 180;
    return distanceKm(coords, cityCenter) <= radiusKm;
  };

  const coerceCoordinatesForProperty = (property: Property, coords: { lat: number; lng: number } | null) => {
    if (!coords || isDefaultMapPlaceholder(coords) || isCityCenterCoordinate(property, coords)) return null;
    if (coordinatesFitPropertyContext(property, coords)) return coords;

    const swapped = normalizeCoordinatePair(coords.lng, coords.lat);
    if (swapped && !isDefaultMapPlaceholder(swapped) && !isCityCenterCoordinate(property, swapped) && coordinatesFitPropertyContext(property, swapped)) {
      return swapped;
    }

    return null;
  };

  const isDefaultMapPlaceholder = (coords: { lat: number; lng: number }) =>
    Math.abs(coords.lat - 22.9734) < 0.0001 && Math.abs(coords.lng - 78.6569) < 0.0001;

  const hasSpecificPropertyLocation = (property: Property) =>
    Boolean(property.locality || property.landmark || property.address || property.pincode || property.societyName);

  const isCityCenterCoordinate = (property: Property, coords: { lat: number; lng: number }) => {
    if (!hasSpecificPropertyLocation(property)) return false;
    return Object.values(CITY_CENTERS).some((center) =>
      Math.abs(coords.lat - center.lat) < 0.018 && Math.abs(coords.lng - center.lng) < 0.018
    );
  };

  const parsePropertyCoordinates = (property: Property) => {
    if (correctedPropertyCoordinates[property._id]) return correctedPropertyCoordinates[property._id];

    const mapCoords = coerceCoordinatesForProperty(property, extractCoordinatesFromMapText(property.map));
    if (mapCoords) return mapCoords;

    const localityKey = normalizeLocalityKey([property.locality, property.landmark, property.city].filter(Boolean).join(' '));
    const correctedLocality = Object.entries(correctedLocalityCoordinates)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([key]) => localityKey.includes(key))?.[1];
    if (correctedLocality) return correctedLocality;

    if (property.coordinates) {
      try {
        const parsed = typeof property.coordinates === 'string'
          ? JSON.parse(property.coordinates)
          : property.coordinates;
        const coords = coerceCoordinatesForProperty(property, normalizeCoordinatePair(parsed?.lat, parsed?.lng));
        if (coords) return coords;
      } catch {
        const coords = coerceCoordinatesForProperty(property, extractCoordinatesFromMapText(property.coordinates));
        if (coords) return coords;
      }
    }

    return null;
  };

  const getPropertyMapCoordinates = (property: Property) =>
    parsePropertyCoordinates(property) || coerceCoordinatesForProperty(property, geocodedPropertyCoordsRef.current[property._id] || null);

  const resolvePropertyMapLinkCoordinates = async (property: Property) => {
    const mapLink = String(property.map || '').trim();
    if (!mapLink || extractCoordinatesFromMapText(mapLink)) return null;

    try {
      const response = await fetch(`${API_BASE}/resolve-map-link?url=${encodeURIComponent(mapLink)}`);
      if (!response.ok) return null;
      const data = await response.json();
      return coerceCoordinatesForProperty(property, normalizeCoordinatePair(data?.coordinates?.lat, data?.coordinates?.lng));
    } catch (error) {
      console.error('Unable to resolve listing map link coordinates:', error);
      return null;
    }
  };

  const getPropertyMapAddressCandidates = (property: Property) => {
    const locality = getDisplayLocality(property);
    const needsTelangana = propertyNeedsTelanganaContext(property);
    const state = property.state || (needsTelangana ? 'Telangana' : '');
    const city = property.city || '';
    const pincode = property.pincode || '';
    const landmark = property.landmark?.replace(/^near\s+(to\s+)?/i, '').trim() || '';
    const mapSearchText = extractSearchTextFromMapLink(property.map);
    const candidates = [
      property.address && `${property.address}, ${locality}, ${state || city}, India`,
      mapSearchText && `${mapSearchText}, ${city || locality}, ${state}, India`,
      locality && city && state && `${locality}, ${city}, ${state}, India`,
      landmark && locality && city && state && `${landmark}, ${locality}, ${city}, ${state}, India`,
      locality && pincode && city && state && `${locality}, ${city}, ${state}, ${pincode}, India`,
      locality && city && `${locality}, ${city}, India`,
      locality && state && `${locality}, ${state}, India`,
      locality && `${locality}, India`,
    ].filter(Boolean) as string[];

    return Array.from(new Set(candidates.map((candidate) => candidate.replace(/\s+/g, ' ').trim())));
  };

  const geocodePropertyForMap = (
    property: Property,
    google: any,
    onResolved?: (coords: { lat: number; lng: number }) => void
  ) => {
    const cachedCoords = geocodedPropertyCoordsRef.current[property._id];
    const safeCachedCoords = coerceCoordinatesForProperty(property, cachedCoords || null);
    if (safeCachedCoords) {
      onResolved?.(safeCachedCoords);
      return;
    }
    if (pendingGeocodePropertyIdsRef.current.has(property._id)) {
      if (onResolved) {
        pendingGeocodeCallbacksRef.current[property._id] = pendingGeocodeCallbacksRef.current[property._id] || [];
        pendingGeocodeCallbacksRef.current[property._id].push(onResolved);
      }
      return;
    }

    pendingGeocodePropertyIdsRef.current.add(property._id);
    if (onResolved) pendingGeocodeCallbacksRef.current[property._id] = [onResolved];
    const geocoder = new google.maps.Geocoder();
    const candidates = getPropertyMapAddressCandidates(property);
    const resolveCandidateWithPlaces = async (query: string) => {
      if (!google?.maps?.places?.PlacesService || !developerMapInstanceRef.current || !query.trim()) return null;
      const service = new google.maps.places.PlacesService(developerMapInstanceRef.current);
      const cityCenter = getCityCenter(currentMapCity);
      const normalizePlaceCoords = (place: any) => {
        const location = place?.geometry?.location;
        const coords = location ? normalizeCoordinatePair(location.lat(), location.lng()) : null;
        return coerceCoordinatesForProperty(property, coords);
      };

      const findPlaceCoords = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        service.findPlaceFromQuery(
          {
            query,
            fields: ['geometry', 'formatted_address', 'name'],
            locationBias: new google.maps.LatLng(cityCenter.lat, cityCenter.lng),
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
            location: new google.maps.LatLng(cityCenter.lat, cityCenter.lng),
            radius: 140000,
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
    const finish = (coords?: { lat: number; lng: number }) => {
      pendingGeocodePropertyIdsRef.current.delete(property._id);
      const callbacks = pendingGeocodeCallbacksRef.current[property._id] || [];
      delete pendingGeocodeCallbacksRef.current[property._id];
      if (coords) callbacks.forEach((callback) => callback(coords));
    };
    const tryCandidate = async (index: number) => {
      if (index >= candidates.length) {
        finish();
        return;
      }

      geocoder.geocode(
        { address: candidates[index], componentRestrictions: { country: 'IN' } },
        async (results: any, status: string) => {
          const location = results?.[0]?.geometry?.location;
          if (status !== 'OK' || !location) {
            const placesCoords = await resolveCandidateWithPlaces(candidates[index]);
            if (placesCoords) {
              geocodedPropertyCoordsRef.current[property._id] = placesCoords;
              setGeocodeTick((tick) => tick + 1);
              finish(placesCoords);
              return;
            }
            tryCandidate(index + 1);
            return;
          }

          const coords = coerceCoordinatesForProperty(property, normalizeCoordinatePair(
            typeof location.lat === 'function' ? location.lat() : Number(location.lat),
            typeof location.lng === 'function' ? location.lng() : Number(location.lng)
          ));
          if (!coords) {
            const placesCoords = await resolveCandidateWithPlaces(candidates[index]);
            if (placesCoords) {
              geocodedPropertyCoordsRef.current[property._id] = placesCoords;
              setGeocodeTick((tick) => tick + 1);
              finish(placesCoords);
              return;
            }
            tryCandidate(index + 1);
            return;
          }

          geocodedPropertyCoordsRef.current[property._id] = coords;
          setGeocodeTick((tick) => tick + 1);
          finish(coords);
        }
      );
    };

    const startResolve = async () => {
      const resolvedMapCoords = await resolvePropertyMapLinkCoordinates(property);
      if (resolvedMapCoords) {
        geocodedPropertyCoordsRef.current[property._id] = resolvedMapCoords;
        setGeocodeTick((tick) => tick + 1);
        finish(resolvedMapCoords);
        return;
      }
      tryCandidate(0);
    };

    startResolve();
  };

  const focusPropertyOnMap = (property: Property) => {
    setFocusedPropertyId(property._id);
    const coords = getPropertyMapCoordinates(property);

    if (coords && developerMapInstanceRef.current) {
      developerMapInstanceRef.current.panTo(coords);
      developerMapInstanceRef.current.setZoom(16);
      return;
    }

    if (!window.google?.maps || !developerMapInstanceRef.current) return;
    geocodePropertyForMap(property, window.google, (nextCoords) => {
      developerMapInstanceRef.current?.panTo(nextCoords);
      developerMapInstanceRef.current?.setZoom(16);
    });
  };

  useEffect(() => {
    if (!isDeveloperView) return;

    const renderDeveloperMap = () => {
      if (!developerMapRef.current || !window.google?.maps) return;
      const google = window.google;
      const cityCenter = getCityCenter(currentMapCity);

      if (!developerMapInstanceRef.current) {
        developerMapInstanceRef.current = new google.maps.Map(developerMapRef.current, {
          center: { lat: cityCenter.lat, lng: cityCenter.lng },
          zoom: cityCenter.zoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#dbe4ef' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c7ddff' }] },
          ],
        });
      }

      developerMarkersRef.current.forEach((marker) => marker.setMap(null));
      developerMarkersRef.current = [];

      const bounds = new google.maps.LatLngBounds();
      let markerCount = 0;
      const coordinateUseCount: Record<string, number> = {};
      const focusOnSelectedCity = () => {
        developerMapInstanceRef.current.setCenter({ lat: cityCenter.lat, lng: cityCenter.lng });
        developerMapInstanceRef.current.setZoom(cityCenter.zoom);
      };

      const mapProperties = mapLocationQuery.trim()
        ? visibleProperties.filter((property) => propertyMatchesSearch(property, mapLocationQuery))
        : visibleProperties;

      mapProperties.forEach((property) => {
        const coords = getPropertyMapCoordinates(property);
        if (!coords) {
          geocodePropertyForMap(property, google);
          return;
        }
        const isSearchMatch = propertyMatchesSearch(property, activeSearchTerm);
        const isFocused = focusedPropertyId === property._id;
        const coordKey = `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;
        const duplicateIndex = coordinateUseCount[coordKey] || 0;
        coordinateUseCount[coordKey] = duplicateIndex + 1;
        const markerCoords = duplicateIndex
          ? (() => {
              const angle = duplicateIndex * 1.618 * Math.PI;
              const radius = Math.min(0.0025, 0.00035 + duplicateIndex * 0.00012);
              return {
                lat: coords.lat + Math.cos(angle) * radius,
                lng: coords.lng + Math.sin(angle) * radius,
              };
            })()
          : coords;

        const marker = new google.maps.Marker({
          position: markerCoords,
          map: developerMapInstanceRef.current,
          title: propertyTitle(property),
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: isFocused ? '#dc2626' : isSearchMatch ? '#f59e0b' : '#0d9488',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: isFocused ? 4 : 3,
            scale: isFocused ? 14 : isSearchMatch ? 12 : 9,
          },
          zIndex: isFocused ? 1000 : isSearchMatch ? 500 : 1,
        });

        marker.addListener('click', () => {
          setFocusedPropertyId(property._id);
          requireLoginForDetails(property);
        });
        developerMarkersRef.current.push(marker);
        bounds.extend(markerCoords);
        markerCount += 1;
      });

      // Properties without stored coordinates resolve via async geocoding one
      // at a time, each re-running this effect as they land. Re-fitting bounds
      // on every single arrival made the map keep zooming out for several
      // seconds after the initial load as more far-flung pins appeared. Only
      // auto-fit once per "view" (city/intent/search) and silently add any
      // later-arriving markers without disturbing the user's current zoom.
      const autoFitContextKey = `${currentMapCity}|${listingIntent}|${mapLocationQuery.trim()}`;
      if (mapAutoFitContextRef.current !== autoFitContextKey) {
        mapAutoFitContextRef.current = autoFitContextKey;
        mapAutoFitDoneRef.current = false;
      }

      // Wait until every property in this view has resolved its coordinates
      // (cached or geocoded) before locking in the one-time auto-fit. Fitting
      // as soon as the first marker or two resolved left the map permanently
      // zoomed into just that handful, never widening once the rest of the
      // properties' async geocode lookups finished.
      const stillResolvingCoordinates = mapProperties.some((property) => pendingGeocodePropertyIdsRef.current.has(property._id));

      const focusedProperty = visibleProperties.find((property) => property._id === focusedPropertyId);
      const focusedCoords = focusedProperty ? getPropertyMapCoordinates(focusedProperty) : null;
      if (focusedCoords) {
        developerMapInstanceRef.current.setCenter(focusedCoords);
        developerMapInstanceRef.current.setZoom(16);
      } else if (!mapAutoFitDoneRef.current && !stillResolvingCoordinates && markerCount > 1) {
        developerMapInstanceRef.current.fitBounds(bounds, 70);
        mapAutoFitDoneRef.current = true;
      } else if (!mapAutoFitDoneRef.current && !stillResolvingCoordinates && markerCount === 1) {
        developerMapInstanceRef.current.setCenter(bounds.getCenter());
        developerMapInstanceRef.current.setZoom(14);
        mapAutoFitDoneRef.current = true;
      }
      const mapSearchTerm = mapLocationQuery.trim() || activeSearchTerm;
      if (markerCount === 0 && mapSearchTerm) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode(
          { address: `${mapSearchTerm}, ${currentMapCity}, India` },
          (results: any, status: string) => {
            if (status !== 'OK' || !results?.[0]?.geometry) {
              focusOnSelectedCity();
              return;
            }
            developerMapInstanceRef.current.setCenter(results[0].geometry.location);
            developerMapInstanceRef.current.setZoom(12);
          }
        );
      }
      if (markerCount === 0 && !mapSearchTerm) focusOnSelectedCity();
    };

    if (!window.google?.maps) {
      const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (existingScript) {
        existingScript.addEventListener('load', renderDeveloperMap, { once: true });
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setMapLoadError('Google Maps API key is required to show the real map.');
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=3.55`;
      script.async = true;
      script.onload = renderDeveloperMap;
      script.onerror = () => setMapLoadError('Google Maps could not load. Please check the API key.');
      document.head.appendChild(script);
      return;
    }

    renderDeveloperMap();
  }, [activeSearchTerm, currentMapCity, focusedPropertyId, geocodeTick, isDeveloperView, visibleProperties, mapLocationQuery]);

  useEffect(() => {
    if (!isDeveloperView || !developerMapRef.current) return;
    const container = developerMapRef.current;
    let lastSize = { width: container.clientWidth, height: container.clientHeight };

    // Only re-trigger Maps when the container's size actually changed by a
    // meaningful amount. ResizeObserver fires on every box-size change,
    // including sub-pixel layout shifts from unrelated async content
    // (images, carousels) loading nearby - reacting to those was causing the
    // map to re-zoom/"expand" on its own a few seconds after a normal load.
    const SIZE_CHANGE_THRESHOLD = 4;

    const handleContainerResize = (width: number, height: number) => {
      const map = developerMapInstanceRef.current;
      if (!window.google?.maps || !map) return;
      const previousCenter = map.getCenter();
      const previousZoom = map.getZoom();
      window.google.maps.event.trigger(map, 'resize');
      if (previousCenter) map.setCenter(previousCenter);
      if (previousZoom !== undefined) map.setZoom(previousZoom);
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (Math.abs(width - lastSize.width) < SIZE_CHANGE_THRESHOLD && Math.abs(height - lastSize.height) < SIZE_CHANGE_THRESHOLD) {
        return;
      }
      lastSize = { width, height };
      handleContainerResize(width, height);
    });
    observer.observe(container);

    const handleWindowResize = () => handleContainerResize(container.clientWidth, container.clientHeight);
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('orientationchange', handleWindowResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
    };
  }, [isDeveloperView]);

  const statCards = [
    { label: 'Total Properties', value: properties.length || 0 },
    { label: 'In Discussion', value: properties.filter((property) => property.dealStatus === 'booked').length || 0 },
    { label: 'Deal Closed', value: properties.filter((property) => property.dealStatus === 'closed').length || 0 },
    { label: 'Open For Deal', value: properties.filter((property) => property.dealStatus !== 'closed').length || 0 },
  ];
  const plotTypeFilters = [
    { label: 'Standalone', value: 'standalone', icon: Building },
    { label: 'High-rise', value: 'high-rise', icon: Building2 },
    { label: 'Gated Residential Community', value: 'gated-community', icon: Building2 },
    { label: 'Group House', value: 'group-house', icon: Users },
    { label: 'Residential House', value: 'residential-house', icon: Home },
    { label: 'Villa', value: 'villa', icon: Layers },
    { label: 'Farm House', value: 'farm-house', icon: Trees },
  ];
  const developmentOnlyTypeFilters = [
    { label: 'Standalone', value: 'standalone', icon: Building },
    { label: 'High-Rise', value: 'high-rise', icon: Building2 },
    { label: 'Gated Residential Community', value: 'gated-community', icon: Building2 },
    { label: 'Group House', value: 'group-house', icon: Users },
    { label: 'Villa', value: 'villa', icon: Layers },
    { label: 'Plotted', value: 'plotted', icon: Grid },
  ];
  const developerTypeFilters = [
    ...developmentOnlyTypeFilters,
    ...plotTypeFilters.filter((filter) => !developmentOnlyTypeFilters.some((item) => item.value === filter.value)),
  ];
  const commercialTypeFilters = [
    { label: 'Office Space', value: 'office-space', icon: Briefcase },
    { label: 'Retail', value: 'retail', icon: ShoppingBag },
    { label: 'Hospitality', value: 'hospitality', icon: Hotel },
    { label: 'Industrial', value: 'industrial', icon: Factory },
  ];
  const visibleDeveloperTypeFilters = developerTypeFilters.filter((filter) =>
    ['standalone', 'high-rise', 'gated-community', 'villa', 'plotted'].includes(filter.value)
  );
  const isCommercialPropertyView = currentPropertyType === 'commercial-plot';
  const activeTypeFilters = isCommercialPropertyView ? commercialTypeFilters : isPlotDealView ? plotTypeFilters : visibleDeveloperTypeFilters;
  const marketplaceTypeFilters = [
    ...developerTypeFilters,
    ...plotTypeFilters.filter((filter) => !developerTypeFilters.some((item) => item.value === filter.value)),
  ];
  const visibleTypeFilters = isCommercialPropertyView
    ? commercialTypeFilters
    : isMarketplaceView ? marketplaceTypeFilters : activeTypeFilters;
  const developmentTypeListingLabels: Record<string, string> = {
    standalone: 'Standalone Flats Listings',
    'high-rise': 'High-Rise Flats Listings',
    'gated-community': 'Gated Residential Community Flats Listings',
    'group-house': 'Group House Flats Listings',
    villa: 'Villa Flats Listings',
    plotted: 'Plotted Listings',
    'office-space': 'Office Space Listings',
    retail: 'Retail Space Listings',
    hospitality: 'Hospitality Listings',
    industrial: 'Industrial Listings',
  };
  const pageTitle = listingIntent === 'buy'
    ? 'Buyer Contact & Requirement Info'
    : listingIntent === 'sell'
      ? (developmentTypeListingLabels[filters.developmentType.toLowerCase()]
        || (currentPropertyType === 'commercial-plot' ? 'Commercial Space Listings' : 'Sale Flats Listings'))
      : 'Properties';
  const developerIntentTabs = [
    { label: 'Buyer', value: 'buy', propertyType: '' },
    { label: 'Sale Flats', value: 'sell', propertyType: '' },
    { label: 'Commercial Space', value: 'sell', propertyType: 'commercial-plot' },
  ];
  const switchDeveloperIntent = (intent: string, propertyType = '') => {
    const cityToKeep = currentMapCity || selectedCity || DEFAULT_CITY;
    setSearchQuery('');
    setPropertyNumberQuery('');
    setFocusedPropertyId('');
    setShowPropertyTypes(false);
    setShowQuickSearch(false);
    setFilters({
      developmentType: 'All',
      minArea: '',
      maxArea: '',
      ratio: 'All',
      facing: 'All',
      minGoodwill: '',
      maxGoodwill: '',
      city: cityToKeep,
      zoningClassification: 'All',
      maxOwnerShare: '',
      bedrooms: 'All',
      possessionStatus: 'All',
      minBudget: '',
      maxBudget: ''
    });
    const nextParams: Record<string, string> = {
      view: isMarketplaceView ? 'marketplace' : 'developers',
      listingIntent: intent,
      city: cityToKeep
    };
    if (propertyType) nextParams.propertyType = propertyType;
    setSearchParams(nextParams);
  };
  const timelineLabels: Record<string, string> = {
    '1_to_3_months': '1 to 3 months',
    '1_to_6_months': '1 to 6 months',
    '1_to_12_months': '1 to 12 months',
    immediate: 'Property Looking Immediately',
    '3_months': '3 Months Time',
    '1_year': '1 Year Time',
    next_1_month: 'Next 1 Month',
    next_3_months: 'Next 3 Months',
    next_6_months: 'Next 6 Months',
    within_1_year: 'Within 1 Year'
  };
  const rawPriceRangeMinValue = Math.min(
    Math.max(Number(filters.minGoodwill || PRICE_RANGE_MIN), PRICE_RANGE_MIN),
    PRICE_RANGE_MAX
  );
  const rawPriceRangeMaxValue = Math.min(
    Math.max(Number(filters.maxGoodwill || PRICE_RANGE_MAX), PRICE_RANGE_MIN),
    PRICE_RANGE_MAX
  );
  const priceRangeMinValue = Math.min(rawPriceRangeMinValue, rawPriceRangeMaxValue);
  const priceRangeMaxValue = Math.max(rawPriceRangeMinValue, rawPriceRangeMaxValue);
  const priceRangeMinPercent = ((priceRangeMinValue - PRICE_RANGE_MIN) / (PRICE_RANGE_MAX - PRICE_RANGE_MIN)) * 100;
  const priceRangeMaxPercent = ((priceRangeMaxValue - PRICE_RANGE_MIN) / (PRICE_RANGE_MAX - PRICE_RANGE_MIN)) * 100;
  if (showDashboardLayout) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-[#eef4fb] p-1.5 sm:p-3">
        <div className={`mx-auto grid max-w-[1580px] grid-cols-[minmax(0,1fr)] gap-2.5 md:gap-4 ${
          isDeveloperView ? 'md:grid-cols-[minmax(0,60fr)_minmax(0,40fr)]' : 'md:grid-cols-[minmax(0,1fr)]'
        }`}>
          <div className={`grid grid-cols-2 gap-1.5 sm:gap-4 ${
            isDeveloperView ? 'md:col-span-2' : ''
          } xl:grid-cols-4`}>
            {statCards.map((stat, index) => (
              <div key={stat.label} className="rounded-lg bg-white px-3 py-1 shadow-sm sm:rounded-xl sm:px-4 sm:py-1.5">
                <p className="text-[11px] leading-4 text-slate-500 sm:text-xs">{stat.label}</p>
                <div className="mt-0.5 flex items-end justify-between gap-3">
                  <p className="text-base font-semibold leading-5 text-slate-950 sm:text-xl">{loading ? '-' : stat.value}</p>
                  <div className="flex h-4 items-end gap-0.5 opacity-45 sm:h-5 sm:gap-1">
                    {Array.from({ length: 8 }).map((_, barIndex) => (
                      <span
                        key={barIndex}
                        className="w-0.5 rounded-full bg-slate-500"
                        style={{ height: `${6 + ((barIndex + index) % 5) * 3}px` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm ${
            isDeveloperView ? 'md:col-span-2' : ''
          }`}>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filters.developmentType}
                onChange={(e) => handleFilterChange('developmentType', e.target.value)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-teal-600"
              >
                <option value="All">Property Type</option>
                {visibleTypeFilters.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <select
                value={filters.bedrooms}
                onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-teal-600"
              >
                {bhkOptions.map((option) => (
                  <option key={option} value={option}>{option === 'All' ? 'BHK Type' : option}</option>
                ))}
              </select>
              <select
                value={budgetPresets.findIndex((preset) => preset.min === filters.minBudget && preset.max === filters.maxBudget)}
                onChange={(e) => {
                  const preset = budgetPresets[Number(e.target.value)];
                  const newFilters = { ...filters, minBudget: preset.min, maxBudget: preset.max };
                  setFilters(newFilters);
                  setSearchParams(buildPropertySearchParams(newFilters, searchQuery));
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-teal-600"
              >
                {budgetPresets.map((preset, index) => (
                  <option key={preset.label} value={index}>{preset.label}</option>
                ))}
              </select>
              <select
                value={filters.possessionStatus}
                onChange={(e) => handleFilterChange('possessionStatus', e.target.value)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-teal-600"
              >
                {possessionOptions.map((option) => (
                  <option key={option} value={option}>{option === 'All' ? 'Construction Status' : option}</option>
                ))}
              </select>
              <button type="button" onClick={clearFilters} className="text-sm font-semibold text-teal-700 underline-offset-2 hover:underline">
                Reset filters
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-slate-600">
                {loading ? 'Loading...' : `Showing ${visibleProperties.length} of ${properties.length} properties`}
              </span>
              <label className="flex items-center gap-1.5 font-semibold text-slate-600">
                Sort by:
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-slate-700"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {isDeveloperView && (
            <div className="order-1 flex flex-col gap-2.5">
              <div className="rounded-xl bg-white/40 p-2.5 sm:p-3">
                <h2 className="text-base font-semibold text-slate-950">Properties Marked on Map</h2>
                <div className="relative mt-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={mapLocationQuery}
                    onChange={(e) => setMapLocationQuery(e.target.value)}
                    placeholder="Search Location"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>
            <main className="relative min-h-[420px] overflow-hidden rounded-2xl bg-white shadow-sm sm:min-h-[560px] lg:min-h-[700px]">
              <div className="absolute left-2 right-2 top-2 z-10 flex gap-1 overflow-x-auto rounded-xl border border-white/70 bg-white/95 p-1 shadow-lg backdrop-blur [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
                {developerIntentTabs.map((tab) => {
                  const active = listingIntent === tab.value && currentPropertyType === tab.propertyType;
                  return (
                    <button
                      key={`${tab.value}-${tab.propertyType}`}
                      type="button"
                      onClick={() => switchDeveloperIntent(tab.value, tab.propertyType)}
                      className={`flex-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-center text-[11px] font-semibold leading-tight transition ${
                        active ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <div ref={developerMapRef} className="absolute inset-0 h-full w-full bg-slate-100" />
              {mapLoadError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100/95 p-6 text-center">
                  <div className="max-w-sm rounded-xl bg-white p-5 shadow-sm">
                    <MapPin className="mx-auto h-8 w-8 text-teal-700" />
                    <p className="mt-3 text-sm font-semibold text-slate-950">Real map unavailable</p>
                    <p className="mt-2 text-sm text-slate-600">{mapLoadError}</p>
                  </div>
                </div>
              )}
            </main>

            <div className="rounded-xl bg-white/40 p-2.5 sm:p-3">
              <h2 className="text-base font-semibold text-slate-950">HomeFeet's Happening Projects</h2>
              <p className="mt-0.5 text-xs text-slate-500">Explore top living options with us</p>
              <div className="relative mt-3">
                <div
                  ref={housingPicksScrollRef}
                  className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {happeningProjects.length === 0 ? (
                    <p className="flex h-44 w-full items-center justify-center px-2 text-center text-xs font-semibold text-slate-500">No active Sale Flats listings in {selectedCity} yet.</p>
                  ) : happeningProjects.map((pick) => (
                    <div
                      key={pick._id}
                      className="grid h-44 w-[calc(50%-0.375rem)] shrink-0 snap-start grid-cols-[140px_1fr] overflow-hidden rounded-lg bg-gradient-to-br from-cyan-100 via-sky-50 to-amber-50 shadow-sm"
                    >
                      <div className="flex h-full w-full items-center justify-center bg-slate-100">
                        <img src={getProjectImage(pick)} alt={pick.projectName} className="h-full w-full object-contain" />
                      </div>
                      <div className="flex flex-col justify-between p-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            {getBuilderLogo(pick) ? (
                              <img
                                src={getBuilderLogo(pick)}
                                alt={getBuilderLabel(pick)}
                                className="h-5 w-5 shrink-0 rounded object-contain"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#0AA6A6] text-[10px] font-black text-white">
                                {getBuilderInitial(pick)}
                              </span>
                            )}
                            <p className="line-clamp-1 text-[11px] font-bold leading-tight text-slate-950">{getBuilderLabel(pick)}</p>
                          </div>
                          <p className="mt-1.5 line-clamp-1 text-sm font-black leading-tight text-slate-950">{pick.projectName || pick.developmentType}</p>
                          <p className="line-clamp-1 text-xs text-slate-600">{pick.locality}, {pick.city}</p>
                        </div>
                        <div>
                          <p className="line-clamp-1 text-xs font-black text-slate-950">{getProjectPriceRange(pick)}</p>
                          <p className="line-clamp-1 text-[11px] text-slate-600">{getProjectConfiguration(pick)}</p>
                          <Link
                            to={`/property/${pick._id}`}
                            className="mt-1.5 inline-flex items-center justify-center rounded-lg bg-[#0AA6A6] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#088f8f]"
                          >
                            View Projects
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => scrollHousingPicks(-1)}
                  aria-label="Previous top pick"
                  className="absolute left-0 top-1/2 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50 md:flex"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollHousingPicks(1)}
                  aria-label="Next top pick"
                  className="absolute right-0 top-1/2 hidden h-8 w-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-slate-200 hover:bg-slate-50 md:flex"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            </div>
          )}

          <aside className="order-2 flex h-auto min-h-[360px] flex-col gap-2.5">
            <div className="rounded-xl bg-white/40 p-2.5 sm:p-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-950">{pageTitle}</h2>
                <button onClick={() => setShowMobileFilters(true)} className="rounded-full bg-white p-2 shadow-sm md:hidden">
                  <SlidersHorizontal className="h-5 w-5 text-slate-700" />
                </button>
              </div>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={propertyNumberQuery}
                  onChange={(event) => setPropertyNumberQuery(event.target.value)}
                  placeholder="Search property no. TEL-DP-101"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                {propertyNumberQuery && (
                  <button
                    type="button"
                    onClick={() => setPropertyNumberQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Clear property number search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-2.5 shadow-sm sm:grid-cols-2 sm:p-3">
              {loading && Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-44 animate-pulse rounded-xl bg-white shadow-sm" />
              ))}
              {!loading && properties.length > 0 && visibleProperties.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm font-semibold text-slate-500 shadow-sm">
                  No properties found for this property number.
                </div>
              )}
              {!loading && visibleProperties.length > 0 && visibleProperties.map((property) => (
                <article key={property._id} className={`flex flex-col gap-2 overflow-hidden rounded-xl border bg-white p-2 shadow-sm ${
                  focusedPropertyId === property._id
                    ? 'border-red-300 ring-2 ring-red-100'
                    : propertyMatchesSearch(property, activeSearchTerm) ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-100'
                }`}>
                  {(() => {
                    const propertyIntent = getPropertyIntent(property);
                    const isPropertyPlotDeal = propertyIntent === 'buy' || propertyIntent === 'sell';
                    const isPropertyApartment = apartmentLikeTypes.includes(String(property.developmentType || '').toLowerCase());
                    return (
                      <>
                        <div className="relative h-40 w-full overflow-hidden rounded-lg bg-slate-100" style={{ height: '160px' }}>
                          <img
                            src={getCardImageSrc(property)}
                            alt={propertyTitle(property)}
                            className={`h-full w-full ${isGeneratedDiagramPreview(property) || isBuyerAvatarFallback(property) ? 'bg-white object-contain p-2' : 'object-cover'}`}
                            style={{ width: '100%', height: '100%' }}
                            onError={(e) => {
                              e.currentTarget.src = getCardFallbackImage(property);
                              e.currentTarget.className = `h-full w-full ${getPropertyIntent(property) === 'buy' ? 'bg-white object-contain p-2' : 'object-cover'}`;
                            }}
                          />
                          <span className={`absolute left-1.5 top-1.5 rounded px-1.5 py-1 text-[10px] font-semibold text-white ${
                            property.dealStatus === 'closed' ? 'bg-red-600' : 'bg-emerald-500'
                          }`}>
                            {property.dealStatus === 'closed' ? 'Closed' : 'Available'}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <h3 className="line-clamp-1 text-[15px] font-semibold capitalize leading-6 text-slate-950">
                            {propertyIntent === 'buy' ? `Buyer requirement in ${getDisplayLocality(property)}` : propertyTitle(property)}
                          </h3>
                          <span className="mt-0.5 w-fit rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-800">
                            {getPropertyNumber(property, listingIntent)}
                          </span>
                          <div className="mt-0.5 flex items-start gap-1 text-[13px] leading-5 text-slate-500">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                            <button
                              type="button"
                              onClick={() => focusPropertyOnMap(property)}
                              className={`line-clamp-2 min-w-0 flex-1 rounded px-1 text-left transition hover:bg-teal-50 hover:text-teal-700 ${
                                focusedPropertyId === property._id
                                  ? 'bg-red-50 font-semibold text-red-700'
                                  : propertyMatchesSearch(property, activeSearchTerm) ? 'bg-amber-50 font-semibold text-amber-700' : ''
                              }`}
                            >
                              {propertyIntent === 'buy' ? 'Desired location: ' : ''}{getDisplayLocality(property)}, {property.city}
                            </button>
                            <span className="shrink-0 text-[11px] font-bold leading-5 text-red-600">
                              {getListingIntentLabel(property)}
                            </span>
                          </div>
                          {propertyIntent === 'buy' && property.purchaseTimeline && (
                            <p className="mt-0.5 line-clamp-1 text-[13px] font-semibold text-teal-700">
                              Looking property for: {timelineLabels[property.purchaseTimeline] || property.purchaseTimeline}
                            </p>
                          )}
                          {property.landmark && (
                            <p className="mt-0.5 line-clamp-1 text-[13px] text-slate-500">Near {property.landmark}</p>
                          )}
                          {(property.bedrooms || property.possessionStatus) && (
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {property.bedrooms && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{property.bedrooms}</span>
                              )}
                              {property.possessionStatus && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{property.possessionStatus}</span>
                              )}
                            </div>
                          )}
                          <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[12px]">
                            {isPropertyApartment ? (
                              <>
                                <div className="rounded-md bg-slate-50 px-1.5 py-1">
                                  <p className="text-slate-500">Flat Size</p>
                                  <p className="line-clamp-2 font-bold leading-4 text-slate-950">{property.flatSize ? `${property.flatSize} Sq Ft` : 'N/A'}</p>
                                </div>
                                <div className="rounded-md bg-slate-50 px-1.5 py-1">
                                  <p className="text-slate-500">Flat Facing</p>
                                  <p className="line-clamp-1 font-bold leading-4 text-slate-950">{property.flatFacing || 'N/A'}</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="rounded-md bg-slate-50 px-1.5 py-1">
                                  <p className="text-slate-500">Area</p>
                                  <p className="line-clamp-2 font-bold leading-4 text-slate-950">{property.totalArea} {property.areaUnit}</p>
                                </div>
                                <div className="rounded-md bg-slate-50 px-1.5 py-1">
                                  <p className="text-slate-500">Facing</p>
                                  <p className="line-clamp-1 font-bold leading-4 text-slate-950">{property.facing || 'N/A'}</p>
                                </div>
                              </>
                            )}
                          </div>
                          {String(property.developmentType || '').toLowerCase() === 'apartment' && (property.bedrooms || property.bathrooms) && (
                            <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[12px]">
                              {property.bedrooms && (
                                <div className="rounded-md bg-slate-50 px-1.5 py-1">
                                  <p className="text-slate-500">Bedrooms</p>
                                  <p className="line-clamp-1 font-bold leading-4 text-slate-950">{property.bedrooms}</p>
                                </div>
                              )}
                              {property.bathrooms && (
                                <div className="rounded-md bg-slate-50 px-1.5 py-1">
                                  <p className="text-slate-500">Bathrooms</p>
                                  <p className="line-clamp-1 font-bold leading-4 text-slate-950">{property.bathrooms}</p>
                                </div>
                              )}
                            </div>
                          )}
                          {isPropertyPlotDeal ? (
                            <div className="mt-1 rounded-md bg-slate-50 px-1.5 py-1 text-[12px]">
                              <span className="text-slate-500">
                                {isPropertyApartment
                                  ? 'Square Feet Price'
                                  : propertyIntent === 'buy' ? 'Budget / Sq Yard' : 'Square Yard Price'}
                              </span>
                              <p className="line-clamp-1 font-bold leading-4 text-teal-700">
                                {isPropertyApartment
                                  ? (property.squareFeetPrice ? formatPrice(property.squareFeetPrice) : 'Price on request')
                                  : (property.squareYardPrice ? formatPrice(property.squareYardPrice) : 'Price on request')}
                              </p>
                            </div>
                          ) : (
                            <div className="mt-1 grid grid-cols-2 gap-1.5 text-[12px]">
                              <div className="rounded-md bg-slate-50 px-1.5 py-1">
                                <span className="text-slate-500">Goodwill</span>
                                <p className="line-clamp-1 font-bold leading-4 text-green-600">{property.goodwill ? formatPrice(property.goodwill) : 'Not Required'}</p>
                              </div>
                              <div className="rounded-md bg-slate-50 px-1.5 py-1">
                                <span className="text-slate-500">Advance</span>
                                <p className="line-clamp-1 font-bold leading-4 text-blue-600">{property.advance ? formatPrice(property.advance) : 'Not Required'}</p>
                              </div>
                            </div>
                          )}
                          {isMarketplaceView && property.description && (
                            <p className="mt-1.5 line-clamp-2 rounded-md bg-slate-50 px-2 py-1.5 text-[12px] leading-5 text-slate-600">
                              <span className="font-semibold text-slate-700">Description: </span>
                              {property.description}
                            </p>
                          )}
                          <div className="mt-2 flex gap-1.5">
                            <button
                              onClick={() => requireLoginForDetails(property)}
                              disabled={detailLoadingId === property._id}
                              className="h-7 flex-1 min-w-[112px] self-start rounded-md bg-slate-950 px-4 text-[12px] font-semibold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-70"
                            >
                              {detailLoadingId === property._id ? 'Opening...' : 'View Details'}
                            </button>
                            <button
                              onClick={() => handleCardContact(property)}
                              className="h-7 flex-1 min-w-[112px] self-start rounded-md border border-teal-600 bg-white px-4 text-[12px] font-semibold text-teal-700 hover:bg-teal-50"
                            >
                              Contact
                            </button>
                          </div>
                          {property.projectHighlights && (
                            <div className="mt-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-[12px] leading-5 text-slate-700">
                              <span className="font-semibold text-amber-800">Project Highlights: </span>
                              <span className="line-clamp-2 whitespace-pre-line">{property.projectHighlights}</span>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          </aside>
        </div>
        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onLoginSuccess={() => {
              setShowLoginModal(false);
              const pendingProperty = properties.find((property) => property._id === pendingPropertyId);
              if (pendingProperty) requireLoginForDetails(pendingProperty);
              const pendingContactProperty = properties.find((property) => property._id === pendingContactId);
              if (pendingContactProperty) handleCardContact(pendingContactProperty);
            }}
          />
        )}
        {showMembershipModal && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg rounded-lg border border-slate-200 bg-white p-7 text-center shadow-2xl">
              <Lock className="mx-auto h-11 w-11 text-teal-700" />
              <p className="ld-eyebrow mt-5">Membership Required</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">Upgrade your membership</h1>
              <p className="mt-4 leading-7 text-slate-600">{membershipModalCopy}</p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to={membershipUrl} className="ld-btn-primary">
                  Membership
                </Link>
                <button type="button" onClick={() => setShowMembershipModal(false)} className="ld-btn-ghost">
                  Continue Browsing
                </button>
              </div>
            </div>
          </div>
        )}
        {contactModalProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-black text-slate-950">{contactModalProperty.projectName || 'Property'} Contact</h3>
                <button type="button" onClick={() => setContactModalProperty(null)} aria-label="Close">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
              {contactModalLoading ? (
                <div className="mt-6 flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600" />
                </div>
              ) : contactModalResult?.contactUnlocked ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-4 font-bold text-slate-950">
                    <Phone className="h-5 w-5 text-teal-700" /> {contactModalResult.phone || 'Not available'}
                  </div>
                  {contactModalResult.email && (
                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-4 font-bold text-slate-950">
                      <Mail className="h-5 w-5 text-teal-700" /> {contactModalResult.email}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-slate-600">{contactModalResult?.message || 'Unable to fetch contact.'}</p>

                  {packPurchaseMessage && (
                    <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-teal-800">
                      {packPurchaseMessage}
                    </div>
                  )}

                  <p className="mt-4 text-sm font-black text-slate-900">Buy a contact-reveal pack for instant access</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {BUYER_CONTACT_PACKS.map((pack) => (
                      <div key={pack.packSize} className="flex flex-col rounded-lg border border-slate-200 p-3 text-center">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{pack.label}</p>
                        <p className="mt-1 text-base font-black text-slate-950">Rs. {pack.price.toLocaleString('en-IN')}</p>
                        <button
                          type="button"
                          disabled={loadingPack === pack.packSize}
                          onClick={() => handleBuyPack(pack)}
                          className="mt-2 rounded-md bg-[#0AA6A6] px-2 py-1.5 text-xs font-bold text-white hover:bg-[#088f8f] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loadingPack === pack.packSize ? '...' : 'Buy'}
                        </button>
                      </div>
                    ))}
                  </div>

                  <button type="button" onClick={() => setContactModalProperty(null)} className="ld-btn-ghost mt-4 w-full">
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-slate-950 px-4 py-12 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-300">Marketplace</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-6xl">Verified property listings</h1>
          <p className="mt-4 max-w-2xl text-slate-300">Search curated apartment and commercial space opportunities by location, area, and budget.</p>
        </div>
      </section>
      {/* Header with Search */}
      <div className="sticky top-20 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by location, project name..."
                className="ld-input pl-10"
              />
            </div>

            {/* Search & Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="ld-btn-primary px-6 py-3"
              >
                <Search className="h-5 w-5" />
                <span className="hidden sm:inline">Search</span>
              </button>
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="md:hidden bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <SlidersHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <div className={`${showMobileFilters ? 'fixed inset-0 z-50 bg-white overflow-y-auto' : 'hidden'} md:block md:relative md:w-80 flex-shrink-0`}>
                          <div className="sticky top-40 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              {/* Mobile Close Button */}
              <div className="md:hidden flex justify-between items-center mb-4 pb-4 border-b">
                <h3 className="text-lg font-semibold">Filters</h3>
                <button onClick={() => setShowMobileFilters(false)}>
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold hidden md:block">Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-5">
                {/* City Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <select
                    value={filters.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                  >
                    {cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {/* Development Type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-950 mb-2">
                    Property Type
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleFilterChange('developmentType', 'All')}
                      className={`rounded-lg px-4 py-3 text-left text-sm shadow-sm transition ${
                        filters.developmentType === 'All' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-teal-50'
                      }`}
                    >
                      All Types
                    </button>
                    {activeTypeFilters.map((item) => {
                      const Icon = item.icon;
                      const active = filters.developmentType === item.value;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => handleFilterChange('developmentType', item.value, true)}
                          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-left text-sm shadow-sm transition ${
                            active ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-teal-50'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3.5">
                  <h4 className="mb-4 text-sm font-semibold text-slate-950">Quick Property Search</h4>
                  {/* Area Range */}
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Area Range (Sq Yards)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={filters.minArea}
                      onChange={(e) => handleFilterChange('minArea', e.target.value)}
                      placeholder="Min"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="self-center text-gray-500">-</span>
                    <input
                      type="number"
                      value={filters.maxArea}
                      onChange={(e) => handleFilterChange('maxArea', e.target.value)}
                      placeholder="Max"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  </div>

                {listingIntent !== 'sell' && (
                  <>
                    {/* Goodwill Range */}
                    <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {listingIntent === 'buy' ? 'Budget Range (Rs)' : 'Goodwill Range (₹)'}
                  </label>
                  <p className="mb-2 text-sm font-semibold text-slate-800">
                    {formatPrice(String(priceRangeMinValue))} to {formatPrice(String(priceRangeMaxValue))}
                  </p>
                  <div className="ld-range-field">
                    <div className="ld-range-track" />
                    <div
                      className="ld-range-fill"
                      style={{
                        left: `${priceRangeMinPercent}%`,
                        right: `${100 - priceRangeMaxPercent}%`
                      }}
                    />
                    <input
                      type="range"
                      min={PRICE_RANGE_MIN}
                      max={PRICE_RANGE_MAX}
                      step={PRICE_RANGE_STEP}
                      value={priceRangeMinValue}
                      onChange={(e) => handleBudgetSliderChange('minGoodwill', e.target.value)}
                      className="ld-range-input ld-range-input--min"
                      aria-label="Minimum goodwill"
                    />
                    <input
                      type="range"
                      min={PRICE_RANGE_MIN}
                      max={PRICE_RANGE_MAX}
                      step={PRICE_RANGE_STEP}
                      value={priceRangeMaxValue}
                      onChange={(e) => handleBudgetSliderChange('maxGoodwill', e.target.value)}
                      className="ld-range-input ld-range-input--max"
                      aria-label="Maximum goodwill"
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-xs font-semibold text-slate-500">
                    <span>10 Lakh</span>
                    <span>100 Cr</span>
                  </div>
                    </div>
                  </>
                )}

                {/* Facing */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Facing
                  </label>
                  <select
                    value={filters.facing}
                    onChange={(e) => handleFilterChange('facing', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                  >
                    {facings.map(facing => (
                      <option key={facing} value={facing}>{facing}</option>
                    ))}
                  </select>
                </div>

                {listingIntent === 'development' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Development Ratio (Owner : Builder)
                    </label>
                    <select
                      value={filters.ratio}
                      onChange={(e) => handleFilterChange('ratio', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                    >
                      {ratios.map(ratio => (
                        <option key={ratio} value={ratio}>
                          {ratio === 'All' ? 'All Ratios' : ratio}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zoning</label>
                  <select
                    value={filters.zoningClassification}
                    onChange={(e) => handleFilterChange('zoningClassification', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                  >
                    {zoningOptions.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Owner Share (%)</label>
                  <input
                    type="number"
                    value={filters.maxOwnerShare}
                    onChange={(e) => handleFilterChange('maxOwnerShare', e.target.value)}
                    placeholder="40"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Apply Button (Mobile) */}
                <button
                  onClick={() => {
                    handleSearch();
                    setShowMobileFilters(false);
                  }}
                  className="md:hidden w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 font-medium"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
          </div>

          {/* Properties List */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="mb-6 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {loading ? 'Searching...' : `${properties.length} Properties Found`}
                </h2>
                {searchQuery && (
                  <p className="text-sm text-gray-600 mt-1">
                    for "{searchQuery}"
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-600'}`}
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-600'}`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
                    <div className="h-48 bg-gray-200"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && properties.length === 0 && listingIntent !== 'buy' && (
              <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm">
                <MapPin className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Properties Found</h3>
                <p className="text-gray-600 mb-4">Try adjusting your filters or search criteria</p>
                <button
                  onClick={clearFilters}
                  className="text-teal-600 hover:text-teal-700 font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Properties Grid/List */}
            {!loading && properties.length > 0 && (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                : 'space-y-4'
              }>
                {properties.map((property) => (
                  <div
                    key={property._id}
                    className={`overflow-hidden rounded-lg border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                      viewMode === 'list' ? 'flex gap-4' : ''
                    } ${viewMode === 'grid' ? 'flex h-full flex-col' : ''} ${
                      propertyMatchesSearch(property, activeSearchTerm) ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
                    }`}
                  >
                    {/* Property Image */}
                    <div className={`relative ${viewMode === 'list' ? 'w-64 flex-shrink-0' : 'h-48'} bg-gray-200 overflow-hidden ${viewMode === 'grid' ? 'rounded-t-lg' : 'rounded-l-lg'}`}>
                      <img
                        src={getCardImageSrc(property)}
                        alt={property.projectName}
                        className={`h-full w-full ${isGeneratedDiagramPreview(property) || isBuyerAvatarFallback(property) ? 'bg-white object-contain p-2' : 'object-cover'}`}
                        onError={(e) => {
                          e.currentTarget.src = getCardFallbackImage(property);
                          e.currentTarget.className = `h-full w-full ${getPropertyIntent(property) === 'buy' ? 'bg-white object-contain p-2' : 'object-cover'}`;
                        }}
                      />
                      <span className="absolute top-2 right-2 bg-teal-600 text-white px-3 py-1 rounded-full text-xs">
                        {property.developmentType}
                      </span>
                    </div>

                    {/* Property Details */}
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="mb-2 line-clamp-1 text-lg font-semibold capitalize text-gray-900">
                        {listingIntent === 'buy' ? `Buyer requirement in ${getDisplayLocality(property)}` : propertyTitle(property)}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600 mb-3">
                        <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                        <span className={`line-clamp-1 min-w-0 flex-1 ${
                          propertyMatchesSearch(property, activeSearchTerm) ? 'rounded bg-amber-50 px-1 font-semibold text-amber-700' : ''
                        }`}>{listingIntent === 'buy' ? 'Desired location: ' : ''}{getDisplayLocality(property)}, {property.city}</span>
                        <span className="ml-2 shrink-0 text-xs font-bold text-red-600">
                          {getListingIntentLabel(property)}
                        </span>
                      </div>
                      {listingIntent === 'buy' && property.purchaseTimeline && (
                        <p className="mb-3 text-sm font-semibold text-teal-700">
                          Looking property for: {timelineLabels[property.purchaseTimeline] || property.purchaseTimeline}
                        </p>
                      )}

                      {property.landmark && (
                        <p className="text-xs text-gray-500 mb-3">Near {property.landmark}</p>
                      )}

                      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                        {apartmentLikeTypes.includes(String(property.developmentType || '').toLowerCase()) ? (
                          <>
                            <div>
                              <span className="text-gray-600">Flat Size:</span>
                              <span className="font-semibold ml-1">{property.flatSize ? `${property.flatSize} Sq Ft` : 'N/A'}</span>
                            </div>
                            {property.flatFacing && (
                              <div>
                                <span className="text-gray-600">Flat Facing:</span>
                                <span className="font-semibold ml-1">{property.flatFacing}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="text-gray-600">Area:</span>
                              <span className="font-semibold ml-1">{property.totalArea} {property.areaUnit}</span>
                            </div>
                            {property.facing && (
                              <div>
                                <span className="text-gray-600">Facing:</span>
                                <span className="font-semibold ml-1">{property.facing}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="mt-auto border-t pt-3">
                        <div className="mb-3 min-h-10">
                          <div>
                            {isPlotDealView ? (
                              <div className="text-sm">
                                <span className="text-gray-600">
                                  {apartmentLikeTypes.includes(String(property.developmentType || '').toLowerCase())
                                    ? 'Square Feet Price:'
                                    : listingIntent === 'buy' ? 'Budget / Sq Yard:' : 'Square Yard Price:'}
                                </span>
                                <span className="font-bold text-teal-700 ml-1">
                                  {apartmentLikeTypes.includes(String(property.developmentType || '').toLowerCase())
                                    ? (property.squareFeetPrice ? formatPrice(property.squareFeetPrice) : 'Price on request')
                                    : (property.squareYardPrice ? formatPrice(property.squareYardPrice) : 'Price on request')}
                                </span>
                              </div>
                            ) : (
                              <>
                                {property.goodwill && (
                                  <div className="text-sm">
                                    <span className="text-gray-600">Goodwill:</span>
                                    <span className="font-bold text-green-600 ml-1">
                                      {formatPrice(property.goodwill)}
                                    </span>
                                  </div>
                                )}
                                {property.advance && (
                                  <div className="text-sm">
                                    <span className="text-gray-600">Advance:</span>
                                    <span className="font-bold text-blue-600 ml-1">
                                      {formatPrice(property.advance)}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => requireLoginForDetails(property)}
                            disabled={detailLoadingId === property._id}
                            className="flex-1 rounded-lg bg-slate-950 py-3 text-center font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-wait disabled:opacity-70"
                          >
                            {detailLoadingId === property._id ? 'Opening...' : 'View Details'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCardContact(property)}
                            className="flex-1 rounded-lg border border-teal-600 bg-white py-3 text-center font-semibold text-teal-700 transition-colors hover:bg-teal-50"
                          >
                            Contact
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false);
            const pendingProperty = properties.find((property) => property._id === pendingPropertyId);
            if (pendingProperty) requireLoginForDetails(pendingProperty);
            const pendingContactProperty = properties.find((property) => property._id === pendingContactId);
            if (pendingContactProperty) handleCardContact(pendingContactProperty);
          }}
        />
      )}
      {showMembershipModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-lg rounded-lg border border-slate-200 bg-white p-7 text-center shadow-2xl">
            <Lock className="mx-auto h-11 w-11 text-teal-700" />
            <p className="ld-eyebrow mt-5">Membership Required</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Upgrade your membership</h1>
            <p className="mt-4 leading-7 text-slate-600">{membershipModalCopy}</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to={membershipUrl} className="ld-btn-primary">
                Membership
              </Link>
              <button type="button" onClick={() => setShowMembershipModal(false)} className="ld-btn-ghost">
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}
      {contactModalProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-black text-slate-950">{contactModalProperty.projectName || 'Property'} Contact</h3>
              <button type="button" onClick={() => setContactModalProperty(null)} aria-label="Close">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            {contactModalLoading ? (
              <div className="mt-6 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600" />
              </div>
            ) : contactModalResult?.contactUnlocked ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-4 font-bold text-slate-950">
                  <Phone className="h-5 w-5 text-teal-700" /> {contactModalResult.phone || 'Not available'}
                </div>
                {contactModalResult.email && (
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-4 font-bold text-slate-950">
                    <Mail className="h-5 w-5 text-teal-700" /> {contactModalResult.email}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-slate-600">{contactModalResult?.message || 'Unable to fetch contact.'}</p>

                {packPurchaseMessage && (
                  <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-teal-800">
                    {packPurchaseMessage}
                  </div>
                )}

                <p className="mt-4 text-sm font-black text-slate-900">Buy a contact-reveal pack for instant access</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {BUYER_CONTACT_PACKS.map((pack) => (
                    <div key={pack.packSize} className="flex flex-col rounded-lg border border-slate-200 p-3 text-center">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{pack.label}</p>
                      <p className="mt-1 text-base font-black text-slate-950">Rs. {pack.price.toLocaleString('en-IN')}</p>
                      <button
                        type="button"
                        disabled={loadingPack === pack.packSize}
                        onClick={() => handleBuyPack(pack)}
                        className="mt-2 rounded-md bg-[#0AA6A6] px-2 py-1.5 text-xs font-bold text-white hover:bg-[#088f8f] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loadingPack === pack.packSize ? '...' : 'Buy'}
                      </button>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => setContactModalProperty(null)} className="ld-btn-ghost mt-4 w-full">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesListingPage;
