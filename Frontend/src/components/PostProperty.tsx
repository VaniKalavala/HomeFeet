import React, { useState, ChangeEvent, FormEvent, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Armchair,
  ArrowLeft,
  ArrowUpDown,
  Bath,
  Bike,
  Building2,
  Car,
  Castle,
  CircleDot,
  Clapperboard,
  Compass,
  Droplet,
  Dumbbell,
  Flower2,
  Image,
  MapPin,
  Ruler,
  Shield,
  ShieldCheck,
  ShowerHead,
  Snowflake,
  Sprout,
  Trees,
  Trophy,
  Upload,
  UtensilsCrossed,
  Users,
  Video,
  Waves,
  Zap
} from 'lucide-react';
import { API_BASE, API_ORIGIN } from '../lib/api';
import { isAdminUser as checkIsAdminUser } from '../lib/admin';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

const purchaseTimelineOptions = new Set([
  '1_to_3_months',
  '1_to_6_months',
  '1_to_12_months'
]);

const normalizePurchaseTimeline = (value?: string) =>
  value && purchaseTimelineOptions.has(value) ? value : '';

const INDIA_CENTER = { lat: 22.9734, lng: 78.6569 };
const normalizeAssistedPhone = (value = '') => value.replace(/\D/g, '').slice(-10);

const localityPincodeLookup: Record<string, string> = {
  miyapur: '500049',
  madinaguda: '500049',
  chandanagar: '500050',
  chanda_nagar: '500050',
  lingampally: '500019',
  serilingampally: '500019',
  kondapur: '500084',
  kukatpally: '500072',
  kphb: '500072',
  nizampet: '500090',
  manneguda: '501510',
  mangalguda: '501510',
  turkayamjal: '501510',
  injapur: '501510',
  tukkuguda: '501359',
  maheshwaram: '501359',
  nadargul: '501510',
  nadergul: '501510',
  kokapet: '500075',
  gachibowli: '500032',
  financial_district: '500032',
  nanakramguda: '500032',
  narsingi: '500075',
  bowrampet: '500043',
  bachupally: '500090',
  patancheru: '502319',
  tellapur: '502032',
  kollur: '502300',
  isnapur: '502307',
  shankarpally: '501203',
  bongulur: '501510',
  lb_nagar: '500074',
  lbnagar: '500074',
  l_b_nagar: '500074',
  kothapet: '500035',
  dilsukhnagar: '500060',
  uppal: '500039',
  habsiguda: '500007',
  habisguda: '500007',
  habsigudanacharam: '500007',
  habsiguda_nacharam: '500007',
  habsiguda_nacharam_main_road: '500007',
  habisguda_nacharam_main_road: '500007',
  nacharam: '500076',
  mallapur: '500076',
  cherlapally: '501301',
  kompally: '500014',
  medchal: '501401',
  shamshabad: '501218',
  shamsabad: '501218',
  rajendranagar: '500030',
  manikonda: '500089',
  shaikpet: '500008',
  suchitra: '500067',
  alwal: '500010',
  sainikpuri: '500094',
  ecil: '500062',
  meerpet: '500097',
  hayathnagar: '501505',
  vanasthalipuram: '500070',
  pocharam: '500088',
  ghatkesar: '501301',
  boduppal: '500092',
  khalsa: '501506',
  ibrahimpatnam: '501506',
  rangareddy: '501506',
  khalsa_village: '501506',
  kandawada: '501503',
  kandwada: '501503',
  chevella: '501503',
  imamguda: '501359',
  imam_guda: '501359',
  thukkuguda: '501359',
  maheshwaram_mandal: '501359'
};

const normalizePincodeKey = (value = '') =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const findPincodeFromText = (...values: string[]) => {
  const joined = values.filter(Boolean).join(' ');
  const explicit = joined.match(/\b\d{6}\b/)?.[0];
  if (explicit) return explicit;

  for (const value of values) {
    const key = normalizePincodeKey(value);
    if (localityPincodeLookup[key]) return localityPincodeLookup[key];
    const compactKey = key.replace(/_/g, '');
    if (localityPincodeLookup[compactKey]) return localityPincodeLookup[compactKey];
    const matchedEntry = Object.entries(localityPincodeLookup).sort((a, b) => b[0].length - a[0].length).find(([localityKey]) =>
      key.includes(localityKey) || compactKey.includes(localityKey.replace(/_/g, ''))
    );
    if (matchedEntry) return matchedEntry[1];
  }

  return '';
};

type CropTarget = 'image' | 'plotDiagram';

type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CropModalState = {
  target: CropTarget;
  url: string;
  fileName: string;
  fileType: string;
};

type ParcelShape = 'random' | 'square' | 'rectangle' | 'skewed' | 'natural';

const cleanLabel = (value: string) =>
  value.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const buildAutoDescription = (formData: Record<string, any>, isApartment: boolean) => {
  const sentences: string[] = [];
  const typeLabel = formData.developmentType ? cleanLabel(formData.developmentType) : 'Property';
  const place = [formData.locality, formData.city].filter(Boolean).join(', ');

  let intro = `${typeLabel} listing`;
  if (place) intro += ` in ${place}`;
  if (isApartment && formData.bedrooms) intro += ` with ${formData.bedrooms} configuration`;
  sentences.push(`${intro}.`);

  if (isApartment) {
    const apartmentBits: string[] = [];
    if (formData.bathrooms) apartmentBits.push(`${formData.bathrooms} bathroom${Number(formData.bathrooms) > 1 ? 's' : ''}`);
    if (formData.flatSize) apartmentBits.push(`${formData.flatSize} Sq Ft built-up area`);
    if (formData.floorNumber) apartmentBits.push(`located on floor ${formData.floorNumber}${formData.totalFloors ? ` of ${formData.totalFloors}` : ''}`);
    if (formData.flatFacing) apartmentBits.push(`${formData.flatFacing}-facing`);
    if (formData.furnishingStatus) apartmentBits.push(formData.furnishingStatus.toLowerCase());
    if (formData.possessionStatus) apartmentBits.push(formData.possessionStatus.toLowerCase());
    if (apartmentBits.length) sentences.push(`${apartmentBits.join(', ')}.`.replace(/^./, (char) => char.toUpperCase()));
  } else {
    const plotBits: string[] = [];
    if (formData.totalArea) plotBits.push(`${formData.totalArea} ${formData.areaUnit || ''}`.trim());
    if (formData.facing) plotBits.push(`${formData.facing}-facing`);
    if (plotBits.length) sentences.push(`Plot size of ${plotBits.join(', ')}.`);
  }

  const priceBits: string[] = [];
  if (formData.totalBudget) priceBits.push(`total budget of Rs. ${Number(formData.totalBudget).toLocaleString('en-IN')}`);
  if (formData.squareFeetPrice) priceBits.push(`Rs. ${Number(formData.squareFeetPrice).toLocaleString('en-IN')} per Sq Ft`);
  if (formData.squareYardPrice) priceBits.push(`Rs. ${Number(formData.squareYardPrice).toLocaleString('en-IN')} per Sq Yard`);
  if (priceBits.length) sentences.push(`Priced at ${priceBits.join(', ')}.`);

  if (Array.isArray(formData.selectedAmenities) && formData.selectedAmenities.length) {
    sentences.push(`Amenities include ${formData.selectedAmenities.join(', ')}.`);
  }

  return sentences.join(' ');
};

const PostProperty = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(id);
  const isAdminUser = checkIsAdminUser(localStorage.getItem('phone'), localStorage.getItem('accountType'), localStorage.getItem('email'));
  const isAdminEditMode = isEditMode && searchParams.get('admin') === 'true' && isAdminUser;
  const canUseAssistedUpload = isAdminUser && !isEditMode;
  const [formData, setFormData] = useState({
    listingIntent: 'sell',
    propertyCategory: 'residential' as 'residential' | 'commercial',
    developmentType: '',
    totalArea: '',
    areaUnit: 'Sq Yards',
    flatSize: '',
    flatSizeMin: '',
    flatSizeMax: '',
    projectName: '',
    companyName: '',
    projectTotalUnits: '',
    northSideLength: '',
    southSideLength: '',
    eastSideLength: '',
    westSideLength: '',
    facing: '',
    flatFacing: '',
    roadFacingDirection: '',
    roadSize: '',
    frontageWidth: '',
    pincode: '',
    zoningClassification: '',
    bedrooms: '',
    bathrooms: '',
    bhkBathrooms: {} as Record<string, string>,
    floorNumber: '',
    totalFloors: '',
    furnishingStatus: '',
    possessionStatus: '',
    possessionDate: '',
    reraId: '',
    localityHighlights: '',
    projectHighlights: '',
    developerRatio: '',
    partlySale: '',
    partlySaleUnit: 'Square Yard',
    partlySaleValue: '0',
    partlySalePrice: '',
    state: 'Telangana',
    city: 'Hyderabad',
    locality: '',
    societyName: '',
    landmark: '',
    coordinates: INDIA_CENTER,
    mapLink: '',
    goodwill: '',
    advance: '',
    squareYardPrice: '',
    squareFeetPrice: '',
    totalBudget: '',
    purchaseTimeline: '',
    description: '',
    selectedAmenities: [] as string[],
    contactPhone: '',
    contactEmail: '',
    image: null as File | null,
    images: [] as File[],
    plotDiagram: null as File | null,
    video: null as File | null,
    propertyForm: null as File | null,
    companyLogo: null as File | null,
  });
  const [showParcelShapePicker, setShowParcelShapePicker] = useState(false);
  const formSteps = ['Property Details', 'Apartment Details', 'Pricing & Amenities', 'Media Uploads', 'Location Details'];
  const [currentStep, setCurrentStep] = useState(0);
  const [assistedOwner, setAssistedOwner] = useState({
    accountType: 'owner',
    phone: '',
    firstName: '',
    lastName: '',
    email: ''
  });
  const [assistedOwnerLookup, setAssistedOwnerLookup] = useState({
    status: 'idle' as 'idle' | 'checking' | 'found' | 'not_found' | 'blocked' | 'error',
    message: ''
  });

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [useMapLink, setUseMapLink] = useState(false);
  const [mapLinkInput, setMapLinkInput] = useState('');
  const [highlightedLocation, setHighlightedLocation] = useState<'map' | 'link' | 'address' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProperty, setIsLoadingProperty] = useState(false);
  const [existingMedia, setExistingMedia] = useState({
    imageUrl: '',
    imageUrls: [] as string[],
    plotDiagramUrl: '',
    floorPlanUrl: '',
    propertyFormUrl: '',
    videoUrl: '',
    companyLogoUrl: ''
  });
  type FloorPlanUnit = {
    bedrooms: string;
    size: string;
    price: string;
    file: File | null;
    existingImageUrl: string;
    rooms: { name: string; dimension: string }[];
  };
  const emptyFloorPlanUnit = (): FloorPlanUnit => ({
    bedrooms: (formData.bedrooms || '').split(',')[0]?.trim() || '',
    size: '',
    price: '',
    file: null,
    existingImageUrl: '',
    rooms: []
  });
  const [floorPlanUnits, setFloorPlanUnits] = useState<FloorPlanUnit[]>([]);
  const [cropModal, setCropModal] = useState<CropModalState | null>(null);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 10, y: 10, width: 80, height: 80 });
  
  const localityAutocompleteRef = useRef<any>(null);
  const societyAutocompleteRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapInitializedRef = useRef(false);
  const autoDescriptionRef = useRef('');
  const localityInputRef = useRef<HTMLInputElement>(null);
  const societyInputRef = useRef<HTMLInputElement>(null);
  const mapLinkInputRef = useRef<HTMLInputElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);
  const appliedSummaryRef = useRef(false);
  const preserveSummaryLocationRef = useRef(false);
  const preservedSummaryMapLinkRef = useRef('');
  const mapLinkResolveSeqRef = useRef(0);

  useEffect(() => {
    if (isEditMode || appliedSummaryRef.current) return;

    const routeState = location.state as {
      propertySummaryPrefill?: Record<string, any>;
      plotDiagramFile?: File | null;
    } | null;
    const storedPrefill = sessionStorage.getItem('propertySummaryPrefill');
    const prefill = routeState?.propertySummaryPrefill || (storedPrefill ? JSON.parse(storedPrefill) : null);

    if (!prefill) return;

    appliedSummaryRef.current = true;
    sessionStorage.removeItem('propertySummaryPrefill');
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    const prefillContactPhone = normalizeAssistedPhone(prefill.contactPhone || prefill.phone || '');
    const prefillContactEmail = String(prefill.contactEmail || prefill.email || '').trim();
    const prefillOwnerName = String(prefill.ownerName || prefill.contactName || '').trim();
    const ownerNameParts = prefillOwnerName.split(/\s+/).filter(Boolean);

    setFormData(prev => ({
      ...prev,
      listingIntent: prefill.listingIntent || prev.listingIntent,
      developmentType: prefill.developmentType || prev.developmentType,
      totalArea: prefill.totalArea || prev.totalArea,
      areaUnit: prefill.areaUnit || prev.areaUnit,
      flatSize: prefill.flatSize || prev.flatSize,
      projectName: prefill.projectName || prev.projectName,
      companyName: prefill.companyName || prev.companyName,
      projectTotalUnits: prefill.projectTotalUnits || prev.projectTotalUnits,
      northSideLength: prefill.northSideLength || prev.northSideLength,
      southSideLength: prefill.southSideLength || prev.southSideLength,
      eastSideLength: prefill.eastSideLength || prev.eastSideLength,
      westSideLength: prefill.westSideLength || prev.westSideLength,
      facing: prefill.facing || prev.facing,
      flatFacing: prefill.flatFacing || prev.flatFacing,
      roadFacingDirection: prefill.roadFacingDirection || prev.roadFacingDirection,
      roadSize: prefill.roadSize || prev.roadSize,
      frontageWidth: prefill.frontageWidth || prev.frontageWidth,
      pincode: prefill.pincode || prev.pincode,
      zoningClassification: prefill.zoningClassification || prev.zoningClassification,
      bedrooms: prefill.bedrooms || prev.bedrooms,
      bathrooms: prefill.bathrooms || prev.bathrooms,
      bhkBathrooms: prefill.bhkBathrooms || prev.bhkBathrooms,
      floorNumber: prefill.floorNumber || prev.floorNumber,
      totalFloors: prefill.totalFloors || prev.totalFloors,
      furnishingStatus: prefill.furnishingStatus || prev.furnishingStatus,
      possessionStatus: prefill.possessionStatus || prev.possessionStatus,
      reraId: prefill.reraId || prev.reraId,
      developerRatio: prefill.developerRatio || prev.developerRatio,
      state: prefill.state || prev.state,
      city: prefill.city || prev.city,
      locality: prefill.locality || prev.locality,
      societyName: prefill.societyName || prev.societyName,
      landmark: prefill.landmark || prev.landmark,
      mapLink: prefill.mapLink || prev.mapLink,
      coordinates: prefill.coordinates || prev.coordinates,
      goodwill: prefill.goodwill || prev.goodwill,
      advance: prefill.advance || prev.advance,
      partlySale: prefill.partlySale || prev.partlySale,
      partlySaleUnit: prefill.partlySaleUnit || prev.partlySaleUnit,
      partlySaleValue: prefill.partlySaleValue || prev.partlySaleValue,
      partlySalePrice: prefill.partlySalePrice || prev.partlySalePrice,
      squareYardPrice: prefill.squareYardPrice || prev.squareYardPrice,
      squareFeetPrice: prefill.squareFeetPrice || prev.squareFeetPrice,
      totalBudget: prefill.totalBudget || prev.totalBudget,
      description: prefill.description || prev.description,
      selectedAmenities: Array.isArray(prefill.selectedAmenities) && prefill.selectedAmenities.length
        ? prefill.selectedAmenities
        : prev.selectedAmenities,
      contactPhone: prefillContactPhone || prev.contactPhone,
      contactEmail: prefillContactEmail || prev.contactEmail,
      plotDiagram: routeState?.plotDiagramFile || prev.plotDiagram
    }));

    if (canUseAssistedUpload && (prefillContactPhone || prefillContactEmail || prefillOwnerName)) {
      setAssistedOwner(prev => ({
        ...prev,
        phone: prefillContactPhone || prev.phone,
        firstName: ownerNameParts[0] || prev.firstName,
        lastName: ownerNameParts.slice(1).join(' ') || prev.lastName,
        email: prefillContactEmail || prev.email
      }));
    }

    if (prefill.mapLink) {
      preserveSummaryLocationRef.current = true;
      preservedSummaryMapLinkRef.current = prefill.mapLink.trim();
      setUseMapLink(false);
      setMapLinkInput(prefill.mapLink);
    }
  }, [canUseAssistedUpload, isEditMode, location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!canUseAssistedUpload) return;

    const phone = normalizeAssistedPhone(assistedOwner.phone);
    if (phone.length < 10) {
      setAssistedOwnerLookup({ status: 'idle', message: '' });
      return;
    }

    let cancelled = false;
    const token = localStorage.getItem('token');
    setAssistedOwnerLookup({ status: 'checking', message: 'Checking registration...' });

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/users/lookup/${phone}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          throw new Error(data.error || 'Unable to check this mobile number');
        }

        if (!data.exists) {
          setAssistedOwnerLookup({
            status: 'not_found',
            message: 'No registered owner or mediator found. Fill the details below to create the profile.'
          });
          setAssistedOwner(prev => ({
            ...prev,
            firstName: '',
            lastName: '',
            email: ''
          }));
          return;
        }

        if (!data.canAssignProperty) {
          setAssistedOwnerLookup({
            status: 'blocked',
            message: 'This mobile number belongs to a builder or admin account. Use an owner or mediator mobile number.'
          });
          return;
        }

        setAssistedOwner(prev => ({
          ...prev,
          accountType: data.user.accountType || prev.accountType,
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          email: data.user.email || ''
        }));
        setAssistedOwnerLookup({
          status: 'found',
          message: `Registered ${data.user.accountType} found. This listing will be saved under ${data.user.firstName || 'this user'}'s My Listings.`
        });
      } catch (err: any) {
        if (!cancelled) {
          setAssistedOwnerLookup({ status: 'error', message: err.message || 'Unable to check this mobile number' });
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [assistedOwner.phone, canUseAssistedUpload]);

  const cities = [
    { value: 'Hyderabad', label: 'Hyderabad' },
    { value: 'Bengaluru', label: 'Bengaluru' },
    { value: 'Chennai', label: 'Chennai' },
    { value: 'Mumbai', label: 'Mumbai' },
    { value: 'Delhi', label: 'Delhi' },
    { value: 'Kolkata', label: 'Kolkata' },
    { value: 'Pune', label: 'Pune' },
    { value: 'Ahmedabad', label: 'Ahmedabad' },
    { value: 'Jaipur', label: 'Jaipur' },
    { value: 'Kochi', label: 'Kochi' },
    { value: 'Lucknow', label: 'Lucknow' },
    { value: 'Chandigarh', label: 'Chandigarh' },
  ];

  const states = [
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Delhi',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Tamil Nadu',
    'Telangana',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal'
  ];

  const parseCoordinates = (value: any) => {
    if (!value) return INDIA_CENTER;
    if (typeof value === 'object' && typeof value.lat === 'number' && typeof value.lng === 'number') return value;
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') return parsed;
    } catch {
      // Keep default coordinates when stored data is not JSON.
    }
    return INDIA_CENTER;
  };

  useEffect(() => {
    if (!isEditMode || !id) return;

    const fetchPropertyForEdit = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to edit this property');
        navigate('/');
        return;
      }

      setIsLoadingProperty(true);
      try {
        const res = await fetch(`${API_BASE}/properties/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load property');

        const property = data.project;
        const coordinates = parseCoordinates(property.coordinates);
        const mapLink = property.map || property.mapLink || (coordinates ? `https://maps.google.com/?q=${coordinates.lat},${coordinates.lng}` : '');

        setFormData(prev => ({
          ...prev,
          listingIntent: property.listingIntent || 'development',
          propertyCategory: ['office-space', 'retail', 'hospitality', 'industrial'].includes(property.developmentType) ? 'commercial' : 'residential',
          developmentType: property.developmentType || '',
          totalArea: property.totalArea || '',
          areaUnit: property.areaUnit || 'Sq Yards',
          flatSize: property.flatSize || '',
          flatSizeMin: property.flatSizeMin || '',
          flatSizeMax: property.flatSizeMax || '',
          projectName: property.projectName || '',
          companyName: property.companyName || '',
          projectTotalUnits: property.projectTotalUnits || '',
          northSideLength: property.northSideLength || '',
          southSideLength: property.southSideLength || '',
          eastSideLength: property.eastSideLength || '',
          westSideLength: property.westSideLength || '',
          facing: property.facing || '',
          flatFacing: property.flatFacing || '',
          roadFacingDirection: property.roadFacingDirection || '',
          roadSize: property.roadSize || '',
          frontageWidth: property.frontageWidth || '',
          pincode: property.pincode || '',
          zoningClassification: property.zoningClassification || '',
          bedrooms: property.bedrooms || '',
          bathrooms: property.bathrooms || '',
          bhkBathrooms: (property.bhkBathrooms && typeof property.bhkBathrooms === 'object') ? property.bhkBathrooms : {},
          floorNumber: property.floorNumber || '',
          totalFloors: property.totalFloors || '',
          furnishingStatus: property.furnishingStatus || '',
          possessionStatus: property.possessionStatus || '',
          possessionDate: property.possessionDate || '',
          reraId: property.reraId || '',
          localityHighlights: property.localityHighlights || '',
          projectHighlights: property.projectHighlights || '',
          developerRatio: property.developerRatio || '',
          partlySale: property.partlySale || '',
          partlySaleUnit: property.partlySaleUnit || 'Square Yard',
          partlySaleValue: property.partlySaleValue || '0',
          partlySalePrice: property.partlySalePrice || '',
          state: property.state || 'Telangana',
          city: property.city || 'Hyderabad',
          locality: property.locality || '',
          societyName: property.societyName || '',
          landmark: property.landmark || '',
          coordinates,
          mapLink,
          goodwill: property.goodwill || '',
          advance: property.advance || '',
          squareYardPrice: property.squareYardPrice || '',
          squareFeetPrice: property.squareFeetPrice || '',
          totalBudget: property.totalBudget || '',
          purchaseTimeline: normalizePurchaseTimeline(property.purchaseTimeline),
          description: property.description || '',
          selectedAmenities: Array.isArray(property.selectedAmenities) ? property.selectedAmenities : [],
          contactPhone: normalizeAssistedPhone(property.contactPhone || property.phone || ''),
          contactEmail: property.contactEmail || '',
          image: null,
          images: [],
          plotDiagram: null,
          video: null,
          companyLogo: null
        }));
        setMapLinkInput(mapLink);
        setExistingMedia({
          imageUrl: property.imageUrl || '',
          imageUrls: Array.isArray(property.images) && property.images.length
            ? property.images
            : (property.imageUrl ? [property.imageUrl] : []),
          plotDiagramUrl: property.plotDiagramUrl || '',
          floorPlanUrl: property.floorPlanUrl || '',
          propertyFormUrl: property.propertyFormUrl || '',
          videoUrl: property.videoUrl || '',
          companyLogoUrl: property.companyLogoUrl || ''
        });
        if (Array.isArray(property.floorPlanUnits) && property.floorPlanUnits.length) {
          setFloorPlanUnits(property.floorPlanUnits.map((unit: any) => ({
            bedrooms: unit.bedrooms || '',
            size: unit.size || '',
            price: unit.price || '',
            file: null,
            existingImageUrl: unit.imageUrl || '',
            rooms: Array.isArray(unit.rooms) ? unit.rooms.map((room: any) => ({ name: room.name || '', dimension: room.dimension || '' })) : []
          })));
        } else if (property.floorPlanUrl) {
          setFloorPlanUnits([{ bedrooms: (property.bedrooms || '').split(',')[0]?.trim() || '', size: property.flatSize || '', price: property.totalBudget || '', file: null, existingImageUrl: property.floorPlanUrl, rooms: [] }]);
        }
        if (coordinates) {
          setTimeout(() => moveMapToLocation(coordinates.lat, coordinates.lng), 300);
        }
      } catch (err: any) {
        alert(err.message || 'Failed to load property for editing');
        navigate(isAdminEditMode ? '/admin' : '/user-posted-properties');
      } finally {
        setIsLoadingProperty(false);
      }
    };

    fetchPropertyForEdit();
  }, [id, isAdminEditMode, isEditMode, navigate]);

  useEffect(() => {
    if (!window.google) {
      const script = document.createElement('script');
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error('Google Maps API key missing. Set VITE_GOOGLE_MAPS_API_KEY to enable maps.');
        return;
      }
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      window.initMap = () => {
        console.log('Google Maps API loaded successfully');
        setIsMapLoaded(true);
        initializeMap();
        setTimeout(() => {
          initializeLocalityAutocomplete();
          initializeSocietyAutocomplete();
        }, 100);
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
        alert('Failed to load Google Maps. Please check your API key and internet connection.');
      };
      
      document.head.appendChild(script);
    } else {
      setIsMapLoaded(true);
      initializeMap();
      initializeLocalityAutocomplete();
      initializeSocietyAutocomplete();
    }
  }, []);

  useEffect(() => {
    if (isLoadingProperty || !window.google || !document.getElementById('map')) return;

    if (!mapInitializedRef.current) {
      setIsMapLoaded(true);
      initializeMap();
      setTimeout(() => {
        initializeLocalityAutocomplete();
        initializeSocietyAutocomplete();
      }, 100);
      return;
    }

    if (isEditMode || mapLinkInput || formData.mapLink) {
      moveMapToLocation(formData.coordinates.lat, formData.coordinates.lng);
    }
  }, [isLoadingProperty, formData.coordinates.lat, formData.coordinates.lng]);

  useEffect(() => {
    return () => {
      if (cropModal?.url) {
        URL.revokeObjectURL(cropModal.url);
      }
    };
  }, [cropModal?.url]);

  const initializeMap = () => {
    if (window.google && document.getElementById('map')) {
      try {
        if (mapRef.current && markerRef.current) {
          moveMapToLocation(formData.coordinates.lat, formData.coordinates.lng);
          return;
        }

        mapRef.current = new window.google.maps.Map(document.getElementById('map'), {
          center: isEditMode ? formData.coordinates : INDIA_CENTER,
          zoom: isEditMode ? 12 : 5,
          mapTypeControl: true,
          streetViewControl: true,
          draggable: true,
          zoomControl: true,
          scrollwheel: true,
          disableDoubleClickZoom: false,
        });

        markerRef.current = new window.google.maps.Marker({
          position: formData.coordinates,
          map: mapRef.current,
          draggable: true,
          title: 'Property Location'
        });

        // Update coordinates when marker is dragged
        markerRef.current.addListener('dragend', (event: any) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          updateLocationFromCoordinates(lat, lng);
        });

        // Update coordinates when map is clicked
        mapRef.current.addListener('click', (event: any) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          markerRef.current.setPosition({ lat, lng });
          setHighlightedLocation('map');
          updateLocationFromCoordinates(lat, lng);
        });

        console.log('Map initialized successfully');
        mapInitializedRef.current = true;
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }
  };

  const extractAddressParts = (addressComponents: any[] = []) => {
    let localityName = '';
    let colonyName = '';
    let cityName = '';
    let stateName = '';
    let pincode = '';

    addressComponents.forEach((component: any) => {
      if (!colonyName &&
          (component.types.includes('premise') ||
          component.types.includes('establishment') ||
          component.types.includes('neighborhood') ||
          component.types.includes('sublocality_level_2') ||
          component.types.includes('sublocality_level_1') ||
          component.types.includes('sublocality'))) {
        colonyName = component.long_name;
      }
      if (component.types.includes('sublocality_level_1') ||
          component.types.includes('sublocality') ||
          component.types.includes('neighborhood')) {
        localityName = component.long_name;
      }
      if (!localityName && component.types.includes('locality')) {
        localityName = component.long_name;
      }
      if (component.types.includes('locality')) {
        cityName = component.long_name;
      }
      if (component.types.includes('administrative_area_level_1')) {
        stateName = component.long_name;
      }
      if (component.types.includes('postal_code')) {
        pincode = component.long_name;
      }
    });

    return { localityName, colonyName, cityName, stateName, pincode };
  };

  const cleanGoogleLandmarkCandidate = (value = '') => {
    const candidate = String(value || '').trim();
    if (!candidate || /^[A-Z0-9]{3,}\+[A-Z0-9]{2,}/i.test(candidate)) return '';
    if (/^\d{6}$/.test(candidate) || /^india$/i.test(candidate)) return '';
    const generic = [
      formData.locality,
      formData.city,
      formData.state,
      formData.pincode,
      'Telangana',
      'Hyderabad',
      'India'
    ].map((part) => String(part || '').toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean);
    const normalized = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalized && !generic.includes(normalized) ? candidate : '';
  };

  const extractLandmarkFromGoogleResult = (result: any) => {
    const components = result?.address_components || [];
    const preferredTypes = [
      'point_of_interest',
      'establishment',
      'premise',
      'route',
      'neighborhood',
      'sublocality_level_2',
      'sublocality_level_1',
      'sublocality'
    ];

    for (const type of preferredTypes) {
      const candidate = components.find((component: any) => component.types?.includes(type))?.long_name;
      const cleaned = cleanGoogleLandmarkCandidate(candidate);
      if (cleaned) return cleaned;
    }

    return cleanGoogleLandmarkCandidate(String(result?.formatted_address || '').split(',')[0]);
  };

  const resolveNearestLandmark = async (lat: number, lng: number) => {
    if (!window.google?.maps?.places?.PlacesService) return '';
    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    const location = new window.google.maps.LatLng(lat, lng);

    return new Promise<string>((resolve) => {
      service.nearbySearch(
        { location, radius: 1500, type: 'point_of_interest' },
        (results: any[], status: string) => {
          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results?.length) {
            resolve('');
            return;
          }
          resolve(results.map((place) => cleanGoogleLandmarkCandidate(place.name)).find(Boolean) || '');
        }
      );
    });
  };

  const getPlaceLocationName = (place: any) => {
    const name = String(place?.name || '').trim();
    if (name && !/^[A-Z0-9]{3,}\+[A-Z0-9]{2,}/i.test(name)) {
      return name;
    }

    const firstAddressPart = String(place?.formatted_address || '').split(',')[0]?.trim();
    return firstAddressPart && !/^[A-Z0-9]{3,}\+[A-Z0-9]{2,}/i.test(firstAddressPart) ? firstAddressPart : '';
  };

  const buildLocationLink = (lat: number, lng: number) => `https://maps.google.com/?q=${lat},${lng}`;

  const applyCoordinatesToLocation = (
    lat: number,
    lng: number,
    locationLink: string,
    highlightedSource: 'map' | 'link' | 'address',
    updateLinkInput = true
  ) => {
    setHighlightedLocation(highlightedSource);
    if (updateLinkInput) {
      setMapLinkInput(locationLink);
    }
    setFormData(prev => ({
      ...prev,
      coordinates: { lat, lng },
      mapLink: locationLink
    }));

    if (window.google?.maps) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, async (results: any, status: string) => {
        if (status !== 'OK' || !results?.[0]) return;
        const { localityName, colonyName, cityName, stateName, pincode } = extractAddressParts(results[0].address_components);
        const resolvedPincode = pincode || findPincodeFromText(localityName, colonyName, cityName, stateName);
        const resolvedLandmark = await resolveNearestLandmark(lat, lng) || extractLandmarkFromGoogleResult(results[0]);
        setFormData(prev => ({
          ...prev,
          locality: localityName || prev.locality,
          societyName: prev.societyName || colonyName,
          landmark: prev.landmark || resolvedLandmark,
          city: cityName || prev.city,
          state: stateName || prev.state,
          pincode: prev.pincode || resolvedPincode,
          coordinates: { lat, lng },
          mapLink: locationLink
        }));
      });
    }
  };

  const updateLocationFromCoordinates = (lat: number, lng: number) => {
    applyCoordinatesToLocation(lat, lng, buildLocationLink(lat, lng), 'map');
  };

  const initializeLocalityAutocomplete = () => {
    if (window.google && localityInputRef.current && !useMapLink) {
      try {
        localityAutocompleteRef.current = new window.google.maps.places.Autocomplete(
          localityInputRef.current,
          {
            types: ['sublocality', 'neighborhood', 'locality'],
            componentRestrictions: { country: 'IN' },
            fields: ['formatted_address', 'geometry', 'address_components', 'name']
          }
        );

        localityAutocompleteRef.current.addListener('place_changed', handleLocalitySelect);
      } catch (error) {
        console.error('Error initializing locality autocomplete:', error);
      }
    }
  };

  const initializeSocietyAutocomplete = () => {
    if (window.google && societyInputRef.current && !useMapLink) {
      try {
        societyAutocompleteRef.current = new window.google.maps.places.Autocomplete(
          societyInputRef.current,
          {
            types: ['establishment', 'point_of_interest'],
            componentRestrictions: { country: 'IN' },
            fields: ['formatted_address', 'geometry', 'address_components', 'name']
          }
        );

        societyAutocompleteRef.current.addListener('place_changed', handleSocietySelect);
      } catch (error) {
        console.error('Error initializing society autocomplete:', error);
      }
    }
  };

  const handleLocalitySelect = () => {
    try {
      const place = localityAutocompleteRef.current.getPlace();
      
      if (place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        const { localityName, colonyName, cityName, stateName, pincode } = extractAddressParts(place.address_components);
        const locationName = getPlaceLocationName(place);
        const resolvedPincode = pincode || findPincodeFromText(localityName, locationName, colonyName, cityName, stateName);
        const resolvedLandmark = cleanGoogleLandmarkCandidate(locationName) || cleanGoogleLandmarkCandidate(colonyName);

        const locationLink = `https://maps.google.com/?q=${lat},${lng}`;
        setHighlightedLocation('address');
        setMapLinkInput(locationLink);
        setFormData(prev => ({
          ...prev,
          locality: localityName || place.name || prev.locality,
          societyName: locationName || colonyName || prev.societyName,
          landmark: prev.landmark || resolvedLandmark,
          city: cityName || prev.city,
          state: stateName || prev.state,
          pincode: prev.pincode || resolvedPincode,
          coordinates: { lat, lng },
          mapLink: locationLink
        }));

        moveMapToLocation(lat, lng);
      }
    } catch (error) {
      console.error('Error handling locality selection:', error);
    }
  };

  const handleSocietySelect = () => {
    try {
      const place = societyAutocompleteRef.current.getPlace();
      
      if (place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const { localityName, colonyName, cityName, stateName, pincode } = extractAddressParts(place.address_components);
        const resolvedPincode = pincode || findPincodeFromText(place.name, colonyName, localityName, cityName, stateName);
        const resolvedLandmark = cleanGoogleLandmarkCandidate(place.name) || cleanGoogleLandmarkCandidate(colonyName);
        
        const locationLink = `https://maps.google.com/?q=${lat},${lng}`;
        setHighlightedLocation('address');
        setMapLinkInput(locationLink);
        setFormData(prev => ({
          ...prev,
          societyName: place.name || '',
          locality: localityName || prev.locality,
          landmark: prev.landmark || resolvedLandmark,
          city: cityName || prev.city,
          state: stateName || prev.state,
          pincode: prev.pincode || resolvedPincode,
          coordinates: { lat, lng },
          mapLink: locationLink
        }));

        moveMapToLocation(lat, lng);
      }
    } catch (error) {
      console.error('Error handling society selection:', error);
    }
  };

  const moveMapToLocation = (lat: number, lng: number) => {
    if (mapRef.current && markerRef.current) {
      const position = { lat, lng };
      mapRef.current.setCenter(position);
      mapRef.current.setZoom(15);
      markerRef.current.setPosition(position);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          if (window.google) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, async (results: any, status: string) => {
              if (status === 'OK' && results[0]) {
                const { localityName, colonyName, cityName, stateName, pincode } = extractAddressParts(results[0].address_components);
                const resolvedPincode = pincode || findPincodeFromText(localityName, colonyName, cityName, stateName);
                const resolvedLandmark = await resolveNearestLandmark(lat, lng) || extractLandmarkFromGoogleResult(results[0]);
                
                const locationLink = `https://maps.google.com/?q=${lat},${lng}`;
                setMapLinkInput(locationLink);
                setFormData(prev => ({
                  ...prev,
                  locality: localityName || prev.locality,
                  societyName: prev.societyName || colonyName,
                  landmark: prev.landmark || resolvedLandmark,
                  city: cityName || prev.city,
                  state: stateName || prev.state,
                  pincode: prev.pincode || resolvedPincode,
                  coordinates: { lat, lng },
                  mapLink: locationLink
                }));
                
                moveMapToLocation(lat, lng);
              }
            });
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your current location. Please enable location services.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const extractCoordinatesFromMapLink = (link: string) => {
    let decodedLink = link.replace(/\+/g, ' ');
    try {
      decodedLink = decodeURIComponent(decodedLink);
    } catch {
      // Keep the raw text while the user is still typing an incomplete encoded link.
    }
    const patterns = [
      /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      /[?&](?:q|query|ll|center|destination|daddr)=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
      /!2d(-?\d+\.?\d*)!3d(-?\d+\.?\d*)/,
      /(-?\d+\.?\d*),(-?\d+\.?\d*)/
    ];
    
    for (const pattern of patterns) {
      const match = decodedLink.match(pattern);
      if (match) {
        const isGoogleDataLngLat = pattern.source.startsWith('!2d');
        const lat = parseFloat(isGoogleDataLngLat ? match[2] : match[1]);
        const lng = parseFloat(isGoogleDataLngLat ? match[1] : match[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
    }
    return null;
  };

  const extractSearchTextFromMapLink = (link: string) => {
    const trimmed = link.trim();
    if (!trimmed) return '';

    try {
      const url = new URL(trimmed);
      const queryKeys = ['q', 'query', 'destination', 'daddr'];
      for (const key of queryKeys) {
        const value = url.searchParams.get(key);
        if (value && !extractCoordinatesFromMapLink(value)) {
          return `${value.replace(/\+/g, ' ')}, India`;
        }
      }

      const decodedPath = decodeURIComponent(url.pathname.replace(/\+/g, ' '));
      const pathMatch = decodedPath.match(/\/maps\/(?:place|search|dir)\/([^/@?]+)/);
      if (pathMatch?.[1]) {
        return `${pathMatch[1].replace(/\//g, ' ').trim()}, India`;
      }
    } catch {
      if (!/^https?:\/\//i.test(trimmed) && !extractCoordinatesFromMapLink(trimmed)) {
        return `${trimmed}, India`;
      }
    }

    return '';
  };

  const resolveMapLinkCoordinates = async (link: string) => {
    const directCoords = extractCoordinatesFromMapLink(link);
    if (directCoords) return directCoords;

    try {
      const response = await fetch(`${API_BASE}/resolve-map-link?url=${encodeURIComponent(link)}`);
      if (!response.ok) return null;
      const data = await response.json();
      const lat = Number(data?.coordinates?.lat);
      const lng = Number(data?.coordinates?.lng);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    } catch (error) {
      console.error('Unable to resolve map link coordinates:', error);
      return null;
    }
  };

  const syncMapLinkToLocation = async (link: string, replaceInputWithGeneratedLink = false) => {
    const trimmed = link.trim();
    if (!trimmed) return;
    const requestId = ++mapLinkResolveSeqRef.current;

    const coords = await resolveMapLinkCoordinates(trimmed);
    if (requestId !== mapLinkResolveSeqRef.current) return;
    if (coords) {
      applyCoordinatesToLocation(coords.lat, coords.lng, trimmed, 'link', false);
      moveMapToLocation(coords.lat, coords.lng);
      return;
    }

    const searchText = extractSearchTextFromMapLink(trimmed);
    if (!searchText || !window.google?.maps) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      { address: searchText, componentRestrictions: { country: 'IN' } },
      async (results: any, status: string) => {
        if (status !== 'OK' || !results?.[0]?.geometry) return;

        const lat = results[0].geometry.location.lat();
        const lng = results[0].geometry.location.lng();
        if (requestId !== mapLinkResolveSeqRef.current) return;
        const { localityName, colonyName, cityName, stateName, pincode } = extractAddressParts(results[0].address_components);
        const locationLink = replaceInputWithGeneratedLink ? buildLocationLink(lat, lng) : trimmed;
        const resolvedPincode = pincode || findPincodeFromText(localityName, colonyName, searchText, cityName, stateName);
        const resolvedLandmark = await resolveNearestLandmark(lat, lng) || extractLandmarkFromGoogleResult(results[0]);

        if (replaceInputWithGeneratedLink) {
          setMapLinkInput(locationLink);
        }
        setHighlightedLocation('link');
        setFormData(prev => ({
          ...prev,
          locality: localityName || prev.locality,
          societyName: prev.societyName || colonyName,
          landmark: prev.landmark || resolvedLandmark,
          city: cityName || prev.city,
          state: stateName || prev.state,
          pincode: prev.pincode || resolvedPincode,
          coordinates: { lat, lng },
          mapLink: locationLink
        }));
        moveMapToLocation(lat, lng);
      }
    );
  };

  const handleMapLinkChange = (e: ChangeEvent<HTMLInputElement>) => {
    const link = e.target.value;
    setHighlightedLocation('link');
    setMapLinkInput(link);
    setFormData(prev => ({ ...prev, mapLink: link }));
    
    const coords = extractCoordinatesFromMapLink(link);
    if (coords) {
      applyCoordinatesToLocation(coords.lat, coords.lng, link, 'link', false);
      moveMapToLocation(coords.lat, coords.lng);
    }
  };

  const handleMapLinkBlur = () => {
    const link = mapLinkInput.trim();
    if (!link || extractCoordinatesFromMapLink(link)) return;
    syncMapLinkToLocation(link, true);
  };

  useEffect(() => {
    if (!isMapLoaded || !mapLinkInput.trim()) return;
    if (preservedSummaryMapLinkRef.current === mapLinkInput.trim()) return;
    if (preserveSummaryLocationRef.current) {
      preserveSummaryLocationRef.current = false;
      return;
    }

    const syncTimer = window.setTimeout(() => {
      syncMapLinkToLocation(mapLinkInput);
    }, 650);

    return () => window.clearTimeout(syncTimer);
  }, [isMapLoaded, mapLinkInput]);

  useEffect(() => {
    if (formData.pincode || !formData.locality.trim()) return;

    const lookupPincode = findPincodeFromText(
      formData.locality,
      formData.societyName,
      formData.landmark,
      formData.city,
      formData.state
    );

    if (lookupPincode && formData.landmark) {
      setFormData(prev => ({ ...prev, pincode: prev.pincode || lookupPincode }));
      return;
    }

    if (!window.google?.maps) return;

    const lookupTimer = window.setTimeout(() => {
      const geocoder = new window.google.maps.Geocoder();
      const address = [
        formData.landmark,
        formData.societyName,
        formData.locality,
        formData.city,
        formData.state,
        'India'
      ].filter(Boolean).join(', ');

      geocoder.geocode(
        { address, componentRestrictions: { country: 'IN' } },
        async (results: any, status: string) => {
          if (status !== 'OK' || !results?.[0]) return;
          const { pincode } = extractAddressParts(results[0].address_components);
          const lat = results[0].geometry?.location?.lat?.();
          const lng = results[0].geometry?.location?.lng?.();
          const resolvedLandmark = Number.isFinite(lat) && Number.isFinite(lng)
            ? await resolveNearestLandmark(lat, lng) || extractLandmarkFromGoogleResult(results[0])
            : extractLandmarkFromGoogleResult(results[0]);
          setFormData(prev => ({
            ...prev,
            pincode: prev.pincode || pincode || lookupPincode,
            landmark: prev.landmark || resolvedLandmark
          }));
        }
      );
    }, 700);

    return () => window.clearTimeout(lookupTimer);
  }, [formData.locality, formData.societyName, formData.landmark, formData.city, formData.state, formData.pincode]);

  const toggleMapLinkMode = () => {
    setUseMapLink(!useMapLink);
    if (!useMapLink) {
      setFormData(prev => ({ ...prev, locality: '', societyName: '' }));
    } else {
      setMapLinkInput('');
      setTimeout(() => {
        initializeLocalityAutocomplete();
        initializeSocietyAutocomplete();
      }, 100);
    }
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'listingIntent') {
      setFormData(prev => ({
        ...prev,
        listingIntent: value,
        developmentType: value !== 'development' && /acre/i.test(prev.areaUnit) && !prev.developmentType ? 'farm-house' : prev.developmentType,
        developerRatio: value === 'development' ? prev.developerRatio : '',
        partlySale: value === 'development' ? prev.partlySale : '',
        partlySaleUnit: value === 'development' ? prev.partlySaleUnit : 'Square Yard',
        partlySaleValue: value === 'development' ? prev.partlySaleValue : '0',
        partlySalePrice: value === 'development' ? prev.partlySalePrice : '',
        goodwill: value === 'development' ? prev.goodwill : '',
        advance: value === 'development' ? prev.advance : '',
        squareYardPrice: value === 'development' ? '' : prev.squareYardPrice
      }));
      return;
    }
    if (name === 'areaUnit') {
      setFormData(prev => ({
        ...prev,
        areaUnit: value,
        developmentType: prev.listingIntent !== 'development' && /acre/i.test(value) && !prev.developmentType ? 'farm-house' : prev.developmentType
      }));
      return;
    }
    if (['locality', 'societyName', 'landmark'].includes(name)) {
      const lookupPincode = findPincodeFromText(
        value,
        name === 'locality' ? formData.societyName : formData.locality,
        name === 'landmark' ? value : formData.landmark,
        formData.city,
        formData.state
      );
      setFormData(prev => ({ ...prev, [name]: value, pincode: prev.pincode || lookupPincode }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssistedOwnerChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const normalizedValue = name === 'phone'
      ? normalizeAssistedPhone(value)
      : value;
    setAssistedOwner(prev => ({ ...prev, [name]: normalizedValue }));
  };

  const handleAdminContactChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const normalizedValue = name === 'contactPhone'
      ? normalizeAssistedPhone(value)
      : value;
    setFormData(prev => ({ ...prev, [name]: normalizedValue }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, image: file }));
  };

  const MAX_GALLERY_IMAGES = 10;

  const handleGalleryImagesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setFormData(prev => {
      const combined = [...prev.images, ...files].slice(0, MAX_GALLERY_IMAGES);
      return { ...prev, images: combined };
    });
    e.target.value = '';
  };

  const removeGalleryImage = (index: number) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const removeExistingGalleryImage = (index: number) => {
    setExistingMedia(prev => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== index) }));
  };

  const [galleryPreviewUrls, setGalleryPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = formData.images.map((file) => URL.createObjectURL(file));
    setGalleryPreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [formData.images]);

  const AMENITY_OPTIONS = [
    { label: 'Single Parking', icon: Car },
    { label: 'Double Parking', icon: Car },
    { label: 'Bike Parking', icon: Bike },
    { label: 'Lift', icon: ArrowUpDown },
    { label: 'Power Backup', icon: Zap },
    { label: 'Security', icon: Shield },
    { label: 'Gym', icon: Dumbbell },
    { label: 'Clubhouse', icon: Users },
    { label: 'Water Supply', icon: Droplet },
    { label: 'Park', icon: Trees },
    { label: 'Swimming Pool', icon: Waves },
    { label: 'Badminton Court', icon: Trophy },
    { label: 'Cricket Court', icon: CircleDot },
    { label: 'Food Court', icon: UtensilsCrossed },
    { label: 'Waiting Lounge', icon: Armchair },
    { label: 'Amphitheater', icon: Castle },
    { label: 'Sauna Bath', icon: Bath },
    { label: 'Spa', icon: Flower2 },
    { label: 'Skating Rink', icon: Snowflake },
    { label: 'Vastu Compliant', icon: Compass },
    { label: 'Landscaping & Tree Park', icon: Sprout },
    { label: 'Mini Theatre', icon: Clapperboard },
    { label: 'Fire Fighting System', icon: ShowerHead }
  ];

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      selectedAmenities: prev.selectedAmenities.includes(amenity)
        ? prev.selectedAmenities.filter(a => a !== amenity)
        : [...prev.selectedAmenities, amenity]
    }));
  };

  const handlePlotDiagramChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, plotDiagram: file }));
  };

  const handleCompanyLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, companyLogo: file }));
  };

  const getDefaultCropArea = (target: CropTarget): CropArea =>
    target === 'image'
      ? { x: 10, y: 12, width: 80, height: 60 }
      : { x: 10, y: 10, width: 80, height: 80 };

  const clampCropValue = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const updateCropArea = (key: keyof CropArea, value: number) => {
    setCropArea(prev => {
      const next = { ...prev };
      if (key === 'x') {
        next.x = clampCropValue(value, 0, 100 - prev.width);
      } else if (key === 'y') {
        next.y = clampCropValue(value, 0, 100 - prev.height);
      } else if (key === 'width') {
        next.width = clampCropValue(value, 10, 100 - prev.x);
      } else {
        next.height = clampCropValue(value, 10, 100 - prev.y);
      }
      return next;
    });
  };

  const handleCropPreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - bounds.left) / bounds.width) * 100;
    const clickY = ((e.clientY - bounds.top) / bounds.height) * 100;
    setCropArea(prev => ({
      ...prev,
      x: clampCropValue(clickX - prev.width / 2, 0, 100 - prev.width),
      y: clampCropValue(clickY - prev.height / 2, 0, 100 - prev.height)
    }));
  };

  const cropImageFile = (target: CropTarget) => {
    const file = target === 'image' ? formData.image : formData.plotDiagram;
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Crop option is available for image files only. PDF files cannot be cropped here.');
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setCropArea(getDefaultCropArea(target));
    setCropModal({
      target,
      url: imageUrl,
      fileName: file.name,
      fileType: file.type || 'image/jpeg'
    });
  };

  const closeCropEditor = () => {
    setCropModal(null);
  };

  const applyCrop = async () => {
    if (!cropModal || !cropImageRef.current) return;

    const image = cropImageRef.current;
    if (!image.naturalWidth || !image.naturalHeight) {
      alert('The image is still loading. Please try again in a moment.');
      return;
    }

    const sourceX = (cropArea.x / 100) * image.naturalWidth;
    const sourceY = (cropArea.y / 100) * image.naturalHeight;
    const sourceWidth = (cropArea.width / 100) * image.naturalWidth;
    const sourceHeight = (cropArea.height / 100) * image.naturalHeight;
    if (sourceWidth <= 0 || sourceHeight <= 0) return;

    const maxOutputWidth = cropModal.target === 'image' ? 1600 : 1400;
    const scale = Math.min(1, maxOutputWidth / sourceWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      const outputType = cropModal.fileType || 'image/jpeg';
      const croppedBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, 0.92));
      if (!croppedBlob) return;

      const extension = cropModal.fileName.match(/\.[a-zA-Z0-9]+$/)?.[0] || '.jpg';
      const croppedName = cropModal.fileName.replace(/\.[a-zA-Z0-9]+$/, '') + '-cropped' + extension;
      const croppedFile = new File([croppedBlob], croppedName, { type: croppedBlob.type || outputType });
      setFormData(prev => ({ ...prev, [cropModal.target]: croppedFile }));
      closeCropEditor();
    } catch {
      alert('Unable to crop this image. Please try another file.');
    }
  };

  const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 50 * 1024 * 1024) {
      alert('Video must be 50MB or smaller. Please upload a compressed walkthrough.');
      e.target.value = '';
      setFormData(prev => ({ ...prev, video: null }));
      return;
    }
    setFormData(prev => ({ ...prev, video: file }));
  };

  const MAX_FLOOR_PLAN_UNITS = 6;

  const addFloorPlanUnit = () => {
    setFloorPlanUnits(prev => (prev.length >= MAX_FLOOR_PLAN_UNITS ? prev : [...prev, emptyFloorPlanUnit()]));
  };

  const removeFloorPlanUnit = (unitIndex: number) => {
    setFloorPlanUnits(prev => prev.filter((_, i) => i !== unitIndex));
  };

  const updateFloorPlanUnit = (unitIndex: number, patch: Partial<FloorPlanUnit>) => {
    setFloorPlanUnits(prev => prev.map((unit, i) => (i === unitIndex ? { ...unit, ...patch } : unit)));
  };

  const handleUnitFloorPlanFileChange = (unitIndex: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    updateFloorPlanUnit(unitIndex, { file });
  };

  const addRoomToUnit = (unitIndex: number) => {
    setFloorPlanUnits(prev => prev.map((unit, i) =>
      i === unitIndex ? { ...unit, rooms: [...unit.rooms, { name: '', dimension: '' }] } : unit
    ));
  };

  const updateUnitRoom = (unitIndex: number, roomIndex: number, patch: Partial<{ name: string; dimension: string }>) => {
    setFloorPlanUnits(prev => prev.map((unit, i) =>
      i === unitIndex
        ? { ...unit, rooms: unit.rooms.map((room, ri) => (ri === roomIndex ? { ...room, ...patch } : room)) }
        : unit
    ));
  };

  const removeUnitRoom = (unitIndex: number, roomIndex: number) => {
    setFloorPlanUnits(prev => prev.map((unit, i) =>
      i === unitIndex ? { ...unit, rooms: unit.rooms.filter((_, ri) => ri !== roomIndex) } : unit
    ));
  };

  const handlePropertyFormChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, propertyForm: file }));
  };

  const hasCompletePlotMeasurements = () =>
    [
      formData.northSideLength,
      formData.southSideLength,
      formData.eastSideLength,
      formData.westSideLength,
      formData.frontageWidth,
    ].every(value => value && Number(value) > 0);

  const isLargeAcreListing = () =>
    formData.areaUnit === 'Acres' && Number(formData.totalArea || 0) > 2;

  const shouldAutoGeneratePlotDiagram = () =>
    !formData.plotDiagram &&
    !existingMedia.plotDiagramUrl &&
    (hasCompletePlotMeasurements() || (isLargeAcreListing() && !formData.image && !formData.images.length && !existingMedia.imageUrl && !existingMedia.imageUrls.length));

  const generateLargeLandMap = async (shape: ParcelShape = 'random') => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 760;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const location = [formData.locality, formData.city, formData.state].filter(Boolean).join(', ');
    const seedText = `${formData.totalArea}-${location}-${formData.mapLink || ''}`;
    let seed = 0;
    for (let index = 0; index < seedText.length; index += 1) {
      seed = (seed * 31 + seedText.charCodeAt(index)) >>> 0;
    }
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    ctx.fillStyle = '#eef7ef';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    for (let x = 80; x < canvas.width; x += 92) {
      ctx.beginPath();
      ctx.moveTo(x, 80);
      ctx.lineTo(x + 24, canvas.height - 90);
      ctx.stroke();
    }
    for (let y = 96; y < canvas.height; y += 86) {
      ctx.beginPath();
      ctx.moveTo(70, y);
      ctx.lineTo(canvas.width - 70, y + 18);
      ctx.stroke();
    }

    const shapeVariant = shape === 'random'
      ? Math.floor(random() * 4)
      : { square: 0, rectangle: 1, skewed: 2, natural: 3 }[shape];
    const points =
      shapeVariant === 0
        ? [
            { x: 250, y: 150 },
            { x: 750, y: 150 },
            { x: 750, y: 650 },
            { x: 250, y: 650 }
          ]
        : shapeVariant === 1
          ? [
              { x: 170, y: 205 },
              { x: 830, y: 205 },
              { x: 830, y: 595 },
              { x: 170, y: 595 }
            ]
          : shapeVariant === 2
            ? [
                { x: 235, y: 150 },
                { x: 765, y: 130 },
                { x: 810, y: 610 },
                { x: 190, y: 630 }
              ]
            : [
                { x: 235 + random() * 70, y: 120 + random() * 48 },
                { x: 700 + random() * 80, y: 105 + random() * 70 },
                { x: 850 + random() * 42, y: 330 + random() * 90 },
                { x: 720 + random() * 80, y: 610 + random() * 50 },
                { x: 310 + random() * 90, y: 650 + random() * 35 },
                { x: 150 + random() * 52, y: 390 + random() * 90 }
              ];

    ctx.fillStyle = '#d9f3dd';
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 7;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.clip();
    ctx.strokeStyle = '#8fbc8f';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 12]);
    for (let index = 0; index < 7; index += 1) {
      const start = points[index % points.length];
      const end = points[(index + 3) % points.length];
      ctx.beginPath();
      ctx.moveTo(start.x + random() * 40 - 20, start.y + random() * 40 - 20);
      ctx.lineTo(end.x + random() * 40 - 20, end.y + random() * 40 - 20);
      ctx.stroke();
    }
    ctx.restore();
    ctx.setLineDash([]);

    const markerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const markerY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    ctx.fillStyle = '#0f766e';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(markerX, markerY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(markerX, markerY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 30px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${formData.totalArea || '-'} ${formData.areaUnit || 'Acres'} Land Parcel`, 76, 62);
    ctx.font = '600 20px Arial';
    ctx.fillStyle = '#334155';
    ctx.fillText(location || 'Shared map location', 76, 96);
    ctx.font = '700 18px Arial';
    ctx.fillStyle = '#0f766e';
    ctx.fillText(formData.zoningClassification || 'Land', 76, 138);
    if (/nala/i.test(formData.description || '')) {
      ctx.fillStyle = '#92400e';
      ctx.fillText('NALA conversion noted', 76, 170);
    }
    if (formData.squareYardPrice) {
      ctx.fillStyle = '#334155';
      ctx.fillText(`Per acre: Rs. ${Number(formData.squareYardPrice).toLocaleString('en-IN')}`, 76, 202);
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return null;
    return new File([blob], 'auto-generated-large-land-map.png', { type: 'image/png' });
  };

  const generatePlotDiagram = async (shape: ParcelShape = 'random') => {
    if (isLargeAcreListing()) {
      return generateLargeLandMap(shape);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 760;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const north = Number(formData.northSideLength) || 0;
    const south = Number(formData.southSideLength) || 0;
    const east = Number(formData.eastSideLength) || 0;
    const west = Number(formData.westSideLength) || 0;
    const frontage = Number(formData.frontageWidth) || 0;
    const horizontalMax = Math.max(north, south, frontage, 1);
    const verticalMax = Math.max(east, west, 1);
    const northWidth = Math.max(220, Math.min(640, ((north || south || horizontalMax) / horizontalMax) * 640));
    const southWidth = Math.max(220, Math.min(640, ((south || north || horizontalMax) / horizontalMax) * 640));
    const eastHeight = Math.max(220, Math.min(440, ((east || west || verticalMax) / verticalMax) * 440));
    const westHeight = Math.max(220, Math.min(440, ((west || east || verticalMax) / verticalMax) * 440));
    const shapeWidth = Math.max(northWidth, southWidth);
    const shapeHeight = Math.max(eastHeight, westHeight);
    const centerX = canvas.width / 2;
    const top = 170;
    const bottom = top + shapeHeight;
    const topLeft = { x: centerX - northWidth / 2, y: top };
    const topRight = { x: centerX + northWidth / 2, y: top };
    const bottomRight = { x: centerX + southWidth / 2, y: top + eastHeight };
    const bottomLeft = { x: centerX - southWidth / 2, y: top + westHeight };
    const boundsLeft = Math.min(topLeft.x, bottomLeft.x);
    const boundsRight = Math.max(topRight.x, bottomRight.x);
    const boundsTop = top;
    const boundsBottom = Math.max(bottomLeft.y, bottomRight.y);
    const road = formData.roadFacingDirection;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo((topLeft.x + topRight.x) / 2, topLeft.y);
    ctx.lineTo((bottomLeft.x + bottomRight.x) / 2, (bottomLeft.y + bottomRight.y) / 2);
    ctx.moveTo((topLeft.x + bottomLeft.x) / 2, (topLeft.y + bottomLeft.y) / 2);
    ctx.lineTo((topRight.x + bottomRight.x) / 2, (topRight.y + bottomRight.y) / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const label = (text: string, x: number, y: number, rotate = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotate);
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 22px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };

    label(`North: ${formData.northSideLength || '-'} ft`, (topLeft.x + topRight.x) / 2, top - 28);
    label(`South: ${formData.southSideLength || '-'} ft`, (bottomLeft.x + bottomRight.x) / 2, boundsBottom + 48);
    label(`East: ${formData.eastSideLength || '-'} ft`, boundsRight + 84, (topRight.y + bottomRight.y) / 2, Math.PI / 2);
    label(`West: ${formData.westSideLength || '-'} ft`, boundsLeft - 84, (topLeft.y + bottomLeft.y) / 2, -Math.PI / 2);

    const roadText = `Road Facing: ${road} | Road Size: ${formData.roadSize || '-'} ft`;
    ctx.strokeStyle = '#f59e0b';
    ctx.fillStyle = '#f59e0b';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (road === 'North') {
      ctx.moveTo(topLeft.x + 36, boundsTop - 58);
      ctx.lineTo(topRight.x - 36, boundsTop - 58);
      label(`${roadText} | Frontage: ${formData.frontageWidth || '-'} ft`, centerX, boundsTop - 90);
    } else if (road === 'South') {
      ctx.moveTo(bottomLeft.x + 36, boundsBottom + 78);
      ctx.lineTo(bottomRight.x - 36, boundsBottom + 78);
      label(`${roadText} | Frontage: ${formData.frontageWidth || '-'} ft`, centerX, boundsBottom + 118);
    } else if (road === 'East') {
      ctx.moveTo(boundsRight + 58, boundsTop + 36);
      ctx.lineTo(boundsRight + 58, boundsBottom - 36);
      label(`${roadText} | Frontage: ${formData.frontageWidth || '-'} ft`, boundsRight + 128, (boundsTop + boundsBottom) / 2, Math.PI / 2);
    } else {
      ctx.moveTo(boundsLeft - 58, boundsTop + 36);
      ctx.lineTo(boundsLeft - 58, boundsBottom - 36);
      label(`${roadText} | Frontage: ${formData.frontageWidth || '-'} ft`, boundsLeft - 128, (boundsTop + boundsBottom) / 2, -Math.PI / 2);
    }
    ctx.stroke();

    ctx.fillStyle = '#0f766e';
    ctx.font = '700 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Frontage Width: ${formData.frontageWidth || '-'} ft`, 72, canvas.height - 86);
    ctx.fillText(`Facing Direction: ${road || '-'}`, 72, canvas.height - 56);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return null;
    return new File([blob], 'auto-generated-plot-layout.png', { type: 'image/png' });
  };

  const generate3DPlotDiagram = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 760;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const north = Number(formData.northSideLength) || 0;
    const south = Number(formData.southSideLength) || 0;
    const east = Number(formData.eastSideLength) || 0;
    const west = Number(formData.westSideLength) || 0;
    const frontage = Number(formData.frontageWidth) || 0;
    const horizontalMax = Math.max(north, south, frontage, 1);
    const verticalMax = Math.max(east, west, 1);
    const topWidth = north ? Math.max(300, Math.min(640, (north / horizontalMax) * 640)) : 560;
    const bottomWidth = south ? Math.max(300, Math.min(640, (south / horizontalMax) * 640)) : topWidth;
    const depth = Math.max(210, Math.min(370, ((east || west || verticalMax) / verticalMax) * 330));
    const centerX = canvas.width / 2;
    const topY = 210;
    const bottomY = topY + depth;
    const liftX = 78;
    const liftY = -64;
    const base = [
      { x: centerX - topWidth / 2, y: topY },
      { x: centerX + topWidth / 2, y: topY },
      { x: centerX + bottomWidth / 2, y: bottomY },
      { x: centerX - bottomWidth / 2, y: bottomY }
    ];
    const top = base.map(point => ({ x: point.x + liftX, y: point.y + liftY }));

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#ecfeff');
    gradient.addColorStop(1, '#fefce8');
    ctx.fillStyle = gradient;
    ctx.fillRect(56, 58, canvas.width - 112, canvas.height - 116);

    const drawPolygon = (points: { x: number; y: number }[], fill: string) => {
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = '#0f766e';
      ctx.lineWidth = 5;
      ctx.stroke();
    };

    drawPolygon([base[1], top[1], top[2], base[2]], '#b7e4c7');
    drawPolygon([base[2], top[2], top[3], base[3]], '#95d5b2');
    drawPolygon(top, '#d8f3dc');

    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = '#7aa77f';
    ctx.lineWidth = 3;
    [[top[0], top[2]], [top[1], top[3]]].forEach(([start, end]) => {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    const markerX = top.reduce((sum, point) => sum + point.x, 0) / top.length;
    const markerY = top.reduce((sum, point) => sum + point.y, 0) / top.length;
    ctx.fillStyle = '#0f766e';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(markerX, markerY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const title = `${formData.totalArea || '-'} ${formData.areaUnit || 'Sq Yards'} ${formData.developmentType || 'Property'}`;
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 30px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(title, 76, 84);
    ctx.font = '600 20px Arial';
    ctx.fillStyle = '#334155';
    ctx.fillText([formData.locality, formData.city, formData.state].filter(Boolean).join(', ') || 'Shared location', 76, 118);
    ctx.font = '700 18px Arial';
    ctx.fillStyle = '#0f766e';
    ctx.fillText(`Facing: ${formData.facing || formData.roadFacingDirection || 'East'}`, 76, canvas.height - 78);
    if (formData.roadSize) ctx.fillText(`Road size: ${formData.roadSize} ft`, 76, canvas.height - 46);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return null;
    return new File([blob], 'auto-generated-3d-plot-diagram.png', { type: 'image/png' });
  };

  const regenerateAdminDiagram = async (mode: '2d' | '3d', shape: ParcelShape = 'random') => {
    const generatedFile = mode === '2d' ? await generatePlotDiagram(shape) : await generate3DPlotDiagram();
    if (!generatedFile) {
      alert('Please enter plot side lengths, frontage width, or acreage details before regenerating the diagram.');
      return;
    }
    setFormData(prev => ({ ...prev, plotDiagram: generatedFile }));
    setShowParcelShapePicker(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in');
      navigate('/');
      setIsSubmitting(false);
      return;
    }

    // Validation
    if (!formData.locality) {
      alert('Please enter a locality');
      setIsSubmitting(false);
      return;
    }
    if (!formData.pincode || !/^\d{6}$/.test(formData.pincode)) {
      alert('Please enter a valid 6-digit pincode');
      setIsSubmitting(false);
      return;
    }
    const isApartmentListing = ['apartment', 'standalone', 'high-rise', 'group-house'].includes(formData.developmentType.trim().toLowerCase());
    if (!isApartmentListing && !formData.roadFacingDirection) {
      alert('Please select the road facing direction');
      setIsSubmitting(false);
      return;
    }
    if (isApartmentListing && !formData.bedrooms) {
      alert('Please select the number of bedrooms (BHK)');
      setIsSubmitting(false);
      return;
    }
    if (formData.listingIntent !== 'development' && (!formData.squareFeetPrice || Number(formData.squareFeetPrice) <= 0)) {
      alert('Please enter square feet price');
      setIsSubmitting(false);
      return;
    }
    if (canUseAssistedUpload) {
      const ownerPhone = normalizeAssistedPhone(assistedOwner.phone);
      if (assistedOwnerLookup.status === 'blocked') {
        alert('Please use an owner or mediator mobile number for admin-assisted upload');
        setIsSubmitting(false);
        return;
      }
      if (!['owner', 'mediator'].includes(assistedOwner.accountType)) {
        alert('Please select Owner or Agent (Mediator) for admin-assisted upload');
        setIsSubmitting(false);
        return;
      }
      if (!/^\d{10}$/.test(ownerPhone)) {
        alert('Please enter the owner or mediator 10-digit mobile number');
        setIsSubmitting(false);
        return;
      }
    }

    const data = new FormData();
    
    // Add all text fields
    data.append('listingIntent', formData.listingIntent);
    data.append('developmentType', formData.developmentType);
    data.append('totalArea', formData.totalArea);
    data.append('areaUnit', formData.areaUnit);
    data.append('flatSize', formData.flatSize);
    data.append('flatSizeMin', formData.flatSizeMin);
    data.append('flatSizeMax', formData.flatSizeMax);
    data.append('projectName', formData.projectName);
    data.append('companyName', formData.companyName);
    data.append('projectTotalUnits', formData.projectTotalUnits);
    data.append('northSideLength', formData.northSideLength);
    data.append('southSideLength', formData.southSideLength);
    data.append('eastSideLength', formData.eastSideLength);
    data.append('westSideLength', formData.westSideLength);
    data.append('facing', formData.facing);
    data.append('flatFacing', formData.flatFacing);
    data.append('roadFacingDirection', formData.roadFacingDirection);
    data.append('roadSize', formData.roadSize);
    data.append('frontageWidth', formData.frontageWidth);
    data.append('pincode', formData.pincode);
    data.append('zoningClassification', formData.zoningClassification);
    data.append('bedrooms', formData.bedrooms);
    data.append('bathrooms', formData.bathrooms);
    data.append('bhkBathrooms', JSON.stringify(formData.bhkBathrooms || {}));
    data.append('floorNumber', formData.floorNumber);
    data.append('totalFloors', formData.totalFloors);
    data.append('furnishingStatus', formData.furnishingStatus);
    data.append('possessionStatus', formData.possessionStatus);
    data.append('possessionDate', formData.possessionDate);
    data.append('reraId', formData.reraId);
    data.append('localityHighlights', formData.localityHighlights);
    data.append('projectHighlights', formData.projectHighlights);
    data.append('developerRatio', formData.listingIntent === 'development' ? formData.developerRatio : '');
    data.append('partlySale', formData.listingIntent === 'development' ? formData.partlySale : '');
    data.append('partlySaleUnit', formData.listingIntent === 'development' ? formData.partlySaleUnit : '');
    data.append('partlySaleValue', formData.listingIntent === 'development' ? formData.partlySaleValue : '0');
    data.append('partlySalePrice', formData.listingIntent === 'development' ? formData.partlySalePrice : '');
    data.append('state', formData.state);
    data.append('city', formData.city);
    data.append('locality', formData.locality);
    data.append('societyName', formData.societyName);
    data.append('landmark', formData.landmark);
    data.append('map', formData.mapLink);
    data.append('coordinates', JSON.stringify(formData.coordinates));
    data.append('goodwill', formData.listingIntent === 'development' ? formData.goodwill : '');
    data.append('advance', formData.listingIntent === 'development' ? formData.advance : '');
    data.append('squareYardPrice', formData.listingIntent === 'development' ? '' : formData.squareYardPrice);
    data.append('squareFeetPrice', formData.squareFeetPrice);
    data.append('totalBudget', formData.totalBudget);
    data.append('description', formData.description);
    data.append('selectedAmenities', JSON.stringify(formData.selectedAmenities));
    if (isAdminEditMode) {
      data.append('contactPhone', normalizeAssistedPhone(formData.contactPhone));
      data.append('phone', normalizeAssistedPhone(formData.contactPhone));
      data.append('contactEmail', formData.contactEmail.trim());
    }
    if (canUseAssistedUpload) {
      const ownerPhone = normalizeAssistedPhone(assistedOwner.phone);
      const fallbackFirstName = assistedOwner.accountType === 'mediator' ? 'Agent' : 'Owner';
      data.append('adminAssistedUpload', 'true');
      data.append('assistedOwnerAccountType', assistedOwner.accountType);
      data.append('assistedOwnerPhone', ownerPhone);
      data.append('assistedOwnerFirstName', assistedOwner.firstName.trim() || fallbackFirstName);
      data.append('assistedOwnerLastName', assistedOwner.lastName.trim() || ownerPhone.slice(-4));
      if (assistedOwner.email.trim()) {
        data.append('assistedOwnerEmail', assistedOwner.email.trim());
      }
    }
    
    const generatedPlotDiagram = shouldAutoGeneratePlotDiagram()
      ? await generatePlotDiagram()
      : null;
    const finalPlotDiagram = formData.plotDiagram || generatedPlotDiagram;

    formData.images.forEach((file) => {
      data.append('images', file);
    });

    // Fall back to the auto-generated dimension image as the listing image when no
    // gallery photo is provided.
    if (!formData.images.length && !existingMedia.imageUrls.length) {
      if (formData.image) {
        data.append('image', formData.image);
      } else if (finalPlotDiagram?.type?.startsWith('image/')) {
        data.append('image', finalPlotDiagram);
      }
    }
    if (finalPlotDiagram) {
      data.append('plotDiagram', finalPlotDiagram);
    }
    if (formData.video) {
      data.append('video', formData.video);
    }
    const floorPlanUnitsMeta = floorPlanUnits.map((unit) => ({
      bedrooms: unit.bedrooms,
      size: unit.size,
      price: unit.price,
      existingImageUrl: unit.existingImageUrl,
      hasNewFile: Boolean(unit.file),
      rooms: unit.rooms.filter((room) => room.name || room.dimension)
    }));
    data.append('floorPlanUnits', JSON.stringify(floorPlanUnitsMeta));
    floorPlanUnits.forEach((unit) => {
      if (unit.file) {
        data.append('floorPlan', unit.file);
      }
    });
    if (formData.propertyForm) {
      data.append('propertyForm', formData.propertyForm);
    }
    if (formData.companyLogo) {
      data.append('companyLogo', formData.companyLogo);
    }

    try {
      const res = await fetch(isEditMode ? `${API_BASE}/properties/${id}` : `${API_BASE}/add`, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: data
      });

      const responseText = await res.text();
      
      let json;
      try {
        json = JSON.parse(responseText);
      } catch (parseError) {
        const shortResponse = responseText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        throw new Error(shortResponse || 'Server returned an invalid response. Please try again without the video upload.');
      }
      
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
          alert('Your login session expired. Please log in again, then submit the property.');
          navigate('/');
          return;
        }
        throw new Error(json.error || json.details || 'Failed to post property');
      }
      
      alert(isEditMode
        ? (isAdminEditMode ? 'Property updated successfully by admin.' : 'Property updated successfully! It will be reviewed again before publishing.')
        : 'Property submitted successfully! It will be visible after admin approval.'
      );
      navigate(isEditMode ? (isAdminEditMode ? '/admin' : '/user-posted-properties') : '/');
      
    } catch (err: any) {
      console.error('Submit error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const roadSizes = ['20', '40', '60', '80', '100'];
  const facings = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'];
  const flatFacingOptions = ['North', 'South', 'East', 'West'];
  const roadFacingDirections = ['North', 'South', 'East', 'West'];
  const ratios = ['50:50', '60:40', '70:30', '80:20'];
  const zoningOptions = ['Residential', 'Commercial', 'Mixed Use', 'Agricultural', 'Industrial'];
  const plotBoundaryTypes = ['standalone', 'high-rise', 'group-house'];
  const bedroomOptions = ['1 BHK', '2 BHK', '2.5 BHK', '3 BHK', '4 BHK', '4+ BHK'];
  const selectedBedroomOptions = formData.bedrooms ? formData.bedrooms.split(',').map(b => b.trim()).filter(Boolean) : [];
  const toggleBedroomOption = (option: string) => {
    setFormData(prev => {
      const current = prev.bedrooms ? prev.bedrooms.split(',').map(b => b.trim()).filter(Boolean) : [];
      const next = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option].sort((a, b) => bedroomOptions.indexOf(a) - bedroomOptions.indexOf(b));
      return { ...prev, bedrooms: next.join(', ') };
    });
  };
  const updateBhkBathrooms = (option: string, value: string) => {
    setFormData(prev => ({ ...prev, bhkBathrooms: { ...prev.bhkBathrooms, [option]: value } }));
  };
  const bathroomOptions = ['1', '2', '3', '4', '4+'];
  const furnishingOptions = ['Unfurnished', 'Semi-Furnished', 'Fully-Furnished'];
  const possessionOptions = ['Ready to Move', 'Under Construction'];
  const normalizedDevelopmentType = formData.developmentType.trim().toLowerCase();
  const apartmentLikeTypes = ['apartment', 'standalone', 'high-rise', 'group-house'];
  const isApartment = apartmentLikeTypes.includes(normalizedDevelopmentType);

  useEffect(() => {
    const generated = buildAutoDescription(formData, isApartment);
    if (formData.description === autoDescriptionRef.current && generated !== formData.description) {
      autoDescriptionRef.current = generated;
      setFormData((prev) => ({ ...prev, description: generated }));
    }
  }, [
    formData.developmentType, formData.bedrooms, formData.bathrooms, formData.flatSize, formData.flatFacing,
    formData.floorNumber, formData.totalFloors, formData.furnishingStatus, formData.possessionStatus,
    formData.totalArea, formData.areaUnit, formData.facing, formData.locality, formData.city,
    formData.totalBudget, formData.squareFeetPrice, formData.squareYardPrice, formData.selectedAmenities,
    isApartment
  ]);

  const requiresPlotBoundaryDetails =
    !isApartment &&
    !isLargeAcreListing() &&
    (normalizedDevelopmentType === 'standalone' ||
    (formData.listingIntent === 'sell' && plotBoundaryTypes.includes(normalizedDevelopmentType)));
  const showDimensions = requiresPlotBoundaryDetails;
  const heroCopy = {
    development: {
      eyebrow: 'Owner listing desk',
      createTitle: 'Submit a verified development opportunity',
      editTitle: 'Edit your development opportunity',
      description: 'Every listing is reviewed before publishing. Complete fields help serious verified builders shortlist faster.'
    },
    buy: {
      eyebrow: 'Buyer requirement desk',
      createTitle: 'Submit a verified buy requirement',
      editTitle: 'Edit your buy requirement',
      description: 'Share your desired location, budget, and time frame so owners and mediators can contact you with matching apartments or commercial space.'
    },
    sell: {
      eyebrow: 'Owner selling desk',
      createTitle: 'Submit a verified apartment or commercial space listing',
      editTitle: 'Edit your apartment or commercial space listing',
      description: 'Share property details, location, and price so serious buyers and mediators can shortlist faster.'
    }
  }[formData.listingIntent as 'development' | 'buy' | 'sell'];

  if (isLoadingProperty) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-600">
        Loading property details for editing...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-6xl space-y-6 px-3 py-5 sm:space-y-8 sm:px-4 sm:py-10">
      <div className="rounded-lg border border-white/10 bg-slate-950/80 px-4 py-5 text-white shadow-xl shadow-slate-950/30 backdrop-blur-md backdrop-saturate-150 sm:px-6 sm:py-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-300 sm:text-sm">{heroCopy.eyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
          {isEditMode ? (isAdminEditMode ? 'Admin edit property details' : heroCopy.editTitle) : heroCopy.createTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
          {isAdminEditMode
            ? 'Correct wrong owner or mediator submissions while keeping original ownership and approval status unchanged.'
            : isEditMode
            ? 'Update any property detail below. Edited listings return to admin review before they are visible again.'
            : heroCopy.description}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <button
            type="button"
            onClick={() => navigate('/properties')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-teal-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Properties
          </button>

          <div className="mt-4 flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50">
              <Building2 className="h-5 w-5 text-teal-700" />
            </div>
            <div>
              <p className="font-bold text-slate-950">List Your Property</p>
              <p className="text-xs leading-5 text-slate-500">Complete the form to get your property listed</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-1.5 w-full rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-all"
                style={{ width: `${Math.round((currentStep / (formSteps.length - 1)) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs font-semibold text-slate-500">
              {Math.round((currentStep / (formSteps.length - 1)) * 100)}%
            </p>
          </div>

          <div className="mt-5">
            {formSteps.map((step, index) => (
              <div key={step} className="relative flex gap-3 pb-8 last:pb-0">
                {index < formSteps.length - 1 && (
                  <span className="absolute left-[15px] top-8 h-full w-px bg-slate-200" />
                )}
                <button
                  type="button"
                  onClick={() => index <= currentStep && setCurrentStep(index)}
                  disabled={index > currentStep}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    index === currentStep
                      ? 'bg-slate-950 text-white'
                      : index < currentStep
                        ? 'bg-teal-100 text-teal-700'
                        : 'cursor-not-allowed bg-slate-100 text-slate-400'
                  }`}
                >
                  {index + 1}
                </button>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step {index + 1}</p>
                  <p className={`text-sm font-bold ${index === currentStep ? 'text-slate-950' : 'text-slate-600'}`}>{step}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {currentStep === 0 && (
      <>
      {canUseAssistedUpload && (
        <section className="space-y-4 rounded-lg border border-teal-200 bg-teal-50/60 p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Admin-assisted property upload</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Owner or mediator registration</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Use this only when an owner or mediator needs help submitting a listing. The profile will be created or reused, and the property will appear under their My Listings.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Account Type *
              <select
                name="accountType"
                value={assistedOwner.accountType}
                onChange={handleAssistedOwnerChange}
                className="w-full rounded border border-slate-300 bg-white p-2 font-normal"
                required
              >
                <option value="owner">Owner</option>
                <option value="mediator">Agent (Mediator)</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Mobile Number *
              <input
                name="phone"
                value={normalizeAssistedPhone(assistedOwner.phone)}
                onChange={handleAssistedOwnerChange}
                onInput={(event) => {
                  const cleanedPhone = normalizeAssistedPhone(event.currentTarget.value);
                  event.currentTarget.value = cleanedPhone;
                  setAssistedOwner(prev => ({ ...prev, phone: cleanedPhone }));
                }}
                onPaste={(event) => {
                  event.preventDefault();
                  const pastedPhone = normalizeAssistedPhone(event.clipboardData.getData('text'));
                  event.currentTarget.value = pastedPhone;
                  setAssistedOwner(prev => ({ ...prev, phone: pastedPhone }));
                }}
                placeholder="10-digit mobile number"
                className="w-full rounded border border-slate-300 bg-white p-2 font-normal tracking-normal"
                inputMode="numeric"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                pattern="[0-9]*"
                required
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              First Name
              <input
                name="firstName"
                value={assistedOwner.firstName}
                onChange={handleAssistedOwnerChange}
                placeholder="Optional owner first name"
                className="w-full rounded border border-slate-300 bg-white p-2 font-normal"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Last Name
              <input
                name="lastName"
                value={assistedOwner.lastName}
                onChange={handleAssistedOwnerChange}
                placeholder="Owner last name"
                className="w-full rounded border border-slate-300 bg-white p-2 font-normal"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Email
              <input
                name="email"
                value={assistedOwner.email}
                onChange={handleAssistedOwnerChange}
                placeholder="Optional email"
                className="w-full rounded border border-slate-300 bg-white p-2 font-normal"
                type="email"
              />
            </label>
          </div>
          {assistedOwnerLookup.message && (
            <div
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                assistedOwnerLookup.status === 'found'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : assistedOwnerLookup.status === 'blocked' || assistedOwnerLookup.status === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              {assistedOwnerLookup.message}
            </div>
          )}
        </section>
      )}

      {isAdminEditMode && (
        <section className="space-y-4 rounded-lg border border-teal-200 bg-teal-50 p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Admin contact control</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Owner / mediator contact details</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Update the contact details shown after membership unlock. Phone changes also update this listing's owner phone reference.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Contact Mobile Number *
              <input
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleAdminContactChange}
                onInput={(event) => {
                  const cleanedPhone = normalizeAssistedPhone(event.currentTarget.value);
                  event.currentTarget.value = cleanedPhone;
                  setFormData(prev => ({ ...prev, contactPhone: cleanedPhone }));
                }}
                onPaste={(event) => {
                  event.preventDefault();
                  const pastedPhone = normalizeAssistedPhone(event.clipboardData.getData('text'));
                  event.currentTarget.value = pastedPhone;
                  setFormData(prev => ({ ...prev, contactPhone: pastedPhone }));
                }}
                placeholder="10-digit owner or mediator number"
                className="w-full rounded border border-slate-300 bg-white p-2 font-normal tracking-normal"
                inputMode="numeric"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                pattern="[0-9]*"
                required
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Contact Email
              <input
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleAdminContactChange}
                placeholder="owner@example.com"
                className="w-full rounded border border-slate-300 bg-white p-2 font-normal"
                type="email"
              />
            </label>
          </div>
        </section>
      )}
      
      <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <Building2 className="h-6 w-6 text-teal-700" />
          <h2 className="text-xl font-bold text-slate-900">Property Details</h2>
        </div>
        <div className="mb-5">
          <p className="mb-2 text-sm font-semibold text-slate-800">Post Property For *</p>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { value: 'buy', label: 'Buy' },
              { value: 'sell', label: 'Sell' },
              ...(formData.listingIntent === 'development' ? [{ value: 'development', label: 'Development' }] : [])
            ].map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                  formData.listingIntent === option.value
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'
                }`}
              >
                <input
                  type="radio"
                  name="listingIntent"
                  value={option.value}
                  checked={formData.listingIntent === option.value}
                  onChange={handleChange}
                  className="h-4 w-4 accent-teal-700"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      
      {formData.listingIntent !== 'development' && (
        <div className="mb-2">
          <p className="mb-2 text-sm font-semibold text-slate-800">Property Category</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'residential', label: 'Residential' },
              { value: 'commercial', label: 'Commercial' }
            ].map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                  formData.propertyCategory === option.value
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'
                }`}
              >
                <input
                  type="radio"
                  name="propertyCategory"
                  value={option.value}
                  checked={formData.propertyCategory === option.value}
                  onChange={() => setFormData(prev => ({
                    ...prev,
                    propertyCategory: option.value as 'residential' | 'commercial',
                    developmentType: ''
                  }))}
                  className="h-4 w-4 accent-teal-700"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <select
        name="developmentType"
        value={formData.developmentType}
        onChange={handleChange}
        className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
        required
      >
        <option value="">{formData.listingIntent === 'development' ? 'Select Development Type *' : 'Select Property Type *'}</option>
        {formData.listingIntent === 'development' ? (
          <>
            <option value="villa">Villa</option>
            <option value="standalone">Standalone</option>
            <option value="high-rise">High-rise</option>
            <option value="plotted">Plotted</option>
            {formData.developmentType === 'apartment' && <option value="apartment">Apartment</option>}
            <option value="mixed">Mixed</option>
          </>
        ) : formData.propertyCategory === 'commercial' ? (
          <>
            <option value="office-space">Office Space</option>
            <option value="retail">Retail</option>
            <option value="hospitality">Hospitality</option>
            <option value="industrial">Industrial</option>
          </>
        ) : (
          <>
            <option value="standalone">Standalone</option>
            <option value="high-rise">High-rise</option>
            <option value="group-house">Group House</option>
            <option value="residential-house">Residential House</option>
            <option value="villa">Villa</option>
            <option value="farm-house">Farm House</option>
            {formData.developmentType === 'apartment' && <option value="apartment">Apartment</option>}
          </>
        )}
      </select>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input
          name="totalArea"
          value={formData.totalArea}
          onChange={handleChange}
          placeholder="Plot Size *"
          className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
          type="number"
          min="0"
          step="any"
          required
        />
        <select
          name="areaUnit"
          onChange={handleChange}
          value={formData.areaUnit}
          className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
        >
          <option value="Sq Yards">Sq Yards</option>
          <option value="Sq Ft">Square Feet</option>
          <option value="Acres">Acres</option>
        </select>
      </div>
      {formData.areaUnit === 'Sq Ft' && (
        <p className="-mt-2 rounded-md bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800">
          Square feet will be converted to square yards before saving. Plot dimensions below should be entered in feet.
        </p>
      )}

      {showDimensions && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-teal-600">Plot Dimensions (in feet)</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              name="northSideLength"
              value={formData.northSideLength}
              onChange={handleChange}
              placeholder="North Side Length (ft)"
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              type="number"
              min="0"
              step="any"
            />
            <input
              name="southSideLength"
              value={formData.southSideLength}
              onChange={handleChange}
              placeholder="South Side Length (ft)"
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              type="number"
              min="0"
              step="any"
            />
            <input
              name="eastSideLength"
              value={formData.eastSideLength}
              onChange={handleChange}
              placeholder="East Side Length (ft)"
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              type="number"
              min="0"
              step="any"
            />
            <input
              name="westSideLength"
              value={formData.westSideLength}
              onChange={handleChange}
              placeholder="West Side Length (ft)"
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              type="number"
              min="0"
              step="any"
            />
          </div>
        </div>
      )}

      <select
        name="facing"
        onChange={handleChange}
        value={formData.facing}
        className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
      >
        <option value="">Plot Facing</option>
        {facings.map(f => <option key={f} value={f}>{f}</option>)}
      </select>

      {!isApartment && (
        <>
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <select
              onChange={e => setFormData(prev => ({ ...prev, roadSize: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select Road Size (ft)</option>
              {roadSizes.map(size => <option key={size} value={size}>{size}</option>)}
            </select>
            <input
              name="roadSize"
              value={formData.roadSize}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              placeholder="Or enter road size (in feet)"
            />
            <input
              name="frontageWidth"
              value={formData.frontageWidth}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              placeholder="Frontage width (ft)"
              type="number"
              min="0"
              step="any"
            />
            <select
              name="roadFacingDirection"
              value={formData.roadFacingDirection}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              required
            >
              <option value="">Road Facing Direction *</option>
              {roadFacingDirections.map(direction => (
                <option key={direction} value={direction}>{direction}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 grid grid-cols-1 items-start gap-4">
            <select
              name="zoningClassification"
              value={formData.zoningClassification}
              onChange={handleChange}
              className="rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              required
            >
              <option value="">Zoning Classification *</option>
              {zoningOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        </>
      )}
      </section>
      </>
      )}

      {currentStep === 1 && (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <Building2 className="h-6 w-6 text-teal-700" />
          <h2 className="text-xl font-bold text-slate-900">Apartment Details</h2>
        </div>
        {isApartment ? (
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            <input
              name="projectName"
              value={formData.projectName}
              onChange={handleChange}
              placeholder="Project Name"
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              type="text"
            />
            <input
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Company Name"
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              type="text"
            />
            <label className="block rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 md:col-span-2">
              <span className="mb-1 flex items-center gap-2 font-semibold text-slate-800">
                <Image className="h-5 w-5 text-teal-700" />Company Logo
              </span>
              <span className="mb-2 block text-xs text-slate-500">
                Recommended size: square, 256x256px (PNG/JPG, max 2MB). Shown beside this property wherever it's listed.
              </span>
              {isEditMode && existingMedia.companyLogoUrl && !formData.companyLogo && (
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-white p-3">
                  <img src={`${API_ORIGIN}${existingMedia.companyLogoUrl}`} alt="Current company logo" className="h-12 w-12 rounded-lg border border-slate-200 object-contain" />
                  <p className="text-sm text-slate-600">Current logo is saved. Upload a new one only if you want to replace it.</p>
                </div>
              )}
              <input type="file" onChange={handleCompanyLogoChange} className="w-full rounded bg-white p-2" accept="image/*" />
              {formData.companyLogo && <p className="mt-2 text-sm font-semibold text-teal-700">Selected: {formData.companyLogo.name}</p>}
            </label>
            <input
              name="projectTotalUnits"
              value={formData.projectTotalUnits}
              onChange={handleChange}
              placeholder="Project Total Units"
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              type="number"
              min="0"
              step="1"
            />
            <input
              name="flatSize"
              value={formData.flatSize}
              onChange={handleChange}
              placeholder="Flat Size (Sq Ft)"
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              type="number"
              min="0"
              step="any"
            />
            <select
              name="flatFacing"
              onChange={handleChange}
              value={formData.flatFacing}
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Flat Facing</option>
              {flatFacingOptions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <input
                name="flatSizeMin"
                value={formData.flatSizeMin}
                onChange={handleChange}
                placeholder="Min Flat Size (Sq Ft) - if range"
                className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
                type="number"
                min="0"
                step="any"
              />
              <input
                name="flatSizeMax"
                value={formData.flatSizeMax}
                onChange={handleChange}
                placeholder="Max Flat Size (Sq Ft) - if range"
                className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
                type="number"
                min="0"
                step="any"
              />
            </div>
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-semibold text-slate-700">Bedrooms (BHK) *</p>
              <div className="flex flex-wrap gap-3">
                {bedroomOptions.map(option => (
                  <label key={option} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedBedroomOptions.includes(option)}
                      onChange={() => toggleBedroomOption(option)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
            {selectedBedroomOptions.length > 1 ? (
              <div className="md:col-span-2">
                <p className="mb-2 text-sm font-semibold text-slate-700">Bathrooms per BHK *</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {selectedBedroomOptions.map(option => (
                    <div key={option} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-sm font-medium text-slate-700">{option}</span>
                      <select
                        value={formData.bhkBathrooms[option] || ''}
                        onChange={(e) => updateBhkBathrooms(option, e.target.value)}
                        className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Bathrooms</option>
                        {bathroomOptions.map(bOption => <option key={bOption} value={bOption}>{bOption}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <select
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Bathrooms</option>
                {bathroomOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            )}
            <input
              name="floorNumber"
              value={formData.floorNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              placeholder="Floor No. (e.g. 4)"
              type="number"
              min="0"
              step="1"
            />
            <input
              name="totalFloors"
              value={formData.totalFloors}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              placeholder="Total Floors (e.g. 12)"
              type="number"
              min="0"
              step="1"
            />
            <select
              name="furnishingStatus"
              value={formData.furnishingStatus}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Furnishing Status</option>
              {furnishingOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <select
              name="possessionStatus"
              value={formData.possessionStatus}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Possession Status</option>
              {possessionOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        ) : (
          <p className="text-sm text-slate-500">This section applies to apartment-type listings only. Click Next to continue.</p>
        )}
      </section>
      )}

      {currentStep === 2 && (
      <>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-slate-800">Amenities Details</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {AMENITY_OPTIONS.map(({ label: amenity, icon: AmenityIcon }) => (
            <label
              key={amenity}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                formData.selectedAmenities.includes(amenity)
                  ? 'border-teal-600 bg-teal-50 text-teal-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.selectedAmenities.includes(amenity)}
                onChange={() => toggleAmenity(amenity)}
                className="h-4 w-4 accent-teal-700"
              />
              <AmenityIcon className="h-4 w-4 text-teal-700" />
              {amenity}
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <Ruler className="h-6 w-6 text-teal-700" />
        <h2 className="text-xl font-bold text-slate-900">Commercial Terms</h2>
      </div>
      <div className={formData.listingIntent === 'development' ? 'grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]' : 'hidden'}>
        <select
          value={ratios.includes(formData.developerRatio) ? formData.developerRatio : ''}
          onChange={e => setFormData(prev => ({ ...prev, developerRatio: e.target.value }))}
          className="w-full min-w-0 rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Select Development Ratio (Owner : Builder)</option>
          {ratios.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <input
          name="developerRatio"
          value={formData.developerRatio}
          onChange={handleChange}
          className="w-full min-w-0 rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
          placeholder="Or enter custom ratio"
        />
      </div>
      {formData.listingIntent === 'development' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            name="goodwill"
            onChange={handleChange}
            value={formData.goodwill}
            placeholder="Goodwill (₹)"
            className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
            type="number"
          />
          <input
            name="advance"
            onChange={handleChange}
            value={formData.advance}
            placeholder="Advance (₹)"
            className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
            type="number"
          />
        </div>
      )}
      {formData.listingIntent === 'development' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <select
            name="partlySale"
            value={formData.partlySale}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Partly sale required?</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
          <select
            name="partlySaleUnit"
            value={formData.partlySaleUnit}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
          >
            <option value="Square Yard">Square Yard</option>
            <option value="Square Feet">Square Feet</option>
            <option value="Acres">Acres</option>
          </select>
          <input
            name="partlySaleValue"
            value={formData.partlySaleValue}
            onChange={handleChange}
            placeholder="Partly sale value"
            className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
            type="number"
            min="0"
            step="any"
          />
          <input
            name="partlySalePrice"
            value={formData.partlySalePrice}
            onChange={handleChange}
            placeholder="Expected sale price"
            className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
          />
        </div>
      )}
      {formData.listingIntent !== 'development' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            name="squareFeetPrice"
            onChange={handleChange}
            value={formData.squareFeetPrice}
            placeholder={formData.listingIntent === 'buy' ? 'Budget per Sq Ft (Rs) *' : 'Square Feet Price (Rs) *'}
            className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
            type="number"
            min="0"
            step="any"
            required
          />
          <input
            name="totalBudget"
            onChange={handleChange}
            value={formData.totalBudget}
            placeholder={formData.listingIntent === 'buy' ? 'Total Budget (Rs)' : 'Total Budget / Expected Price (Rs)'}
            className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
            type="number"
            min="0"
            step="any"
          />
        </div>
      )}
      <div>
        <textarea
          name="description"
          onChange={handleChange}
          value={formData.description}
          placeholder="Property Description (Optional)"
          className="h-24 w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
        />
        <p className="mt-1 text-xs text-slate-500">Auto-filled from the details above. Edit it any time to customize.</p>
      </div>
      </section>
      </>
      )}

      {currentStep === 3 && (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <Upload className="h-6 w-6 text-teal-700" />
          <h2 className="text-xl font-bold text-slate-900">Media Uploads</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
            <span className="mb-2 flex items-center gap-2 font-semibold text-slate-800"><Image className="h-5 w-5 text-teal-700" />Photo Gallery</span>
            <p className="mb-3 text-xs text-slate-500">
              Upload up to {MAX_GALLERY_IMAGES} clear photos of your property (exterior, interior, surroundings).
            </p>
            {existingMedia.imageUrls.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2">
                {existingMedia.imageUrls.map((url, index) => (
                  <div key={url} className="relative">
                    <img
                      src={`${API_ORIGIN}${url}`}
                      alt={`Current property ${index + 1}`}
                      className="h-20 w-full rounded-lg object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingGalleryImage(index)}
                      className="absolute right-1 top-1 rounded-full bg-slate-950/70 px-1.5 py-0.5 text-xs font-bold text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="file"
              onChange={handleGalleryImagesChange}
              className="w-full rounded bg-white p-2"
              accept="image/*"
              multiple
              disabled={formData.images.length >= MAX_GALLERY_IMAGES}
            />
            {formData.images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {formData.images.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="relative">
                    <img
                      src={galleryPreviewUrls[index]}
                      alt={`Selected ${index + 1}`}
                      className="h-20 w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(index)}
                      className="absolute right-1 top-1 rounded-full bg-slate-950/70 px-1.5 py-0.5 text-xs font-bold text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <label className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
            <span className="mb-2 flex items-center gap-2 font-semibold text-slate-800"><Video className="h-5 w-5 text-teal-700" />Walkthrough Video</span>
            {isEditMode && existingMedia.videoUrl && !formData.video && (
              <p className="mb-3 rounded-lg bg-white p-3 text-sm text-slate-600">Current video is saved. Upload a new one only if you want to replace it.</p>
            )}
            <input type="file" onChange={handleVideoChange} className="w-full rounded bg-white p-2" accept="video/*" />
            {formData.video && <p className="mt-2 text-sm font-semibold text-teal-700">New video selected: {formData.video.name}</p>}
          </label>
        </div>
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          <span className="mb-2 flex items-center gap-2 font-semibold text-slate-800"><Image className="h-5 w-5 text-teal-700" />Flat Floor Plans by Unit</span>
          <p className="mb-3 text-xs text-slate-500">
            If this project has different unit sizes, add one card per unit with its size, price, floor plan, and room dimensions (up to {MAX_FLOOR_PLAN_UNITS}).
          </p>

          <div className="space-y-4">
            {floorPlanUnits.map((unit, unitIndex) => (
              <div key={unitIndex} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">Unit {unitIndex + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeFloorPlanUnit(unitIndex)}
                    className="rounded-full bg-slate-950/70 px-2 py-0.5 text-xs font-bold text-white"
                  >
                    Remove
                  </button>
                </div>

                <select
                  value={unit.bedrooms}
                  onChange={(e) => updateFloorPlanUnit(unitIndex, { bedrooms: e.target.value })}
                  className="mb-3 w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">BHK Type for this unit</option>
                  {(selectedBedroomOptions.length ? selectedBedroomOptions : bedroomOptions).map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    value={unit.size}
                    onChange={(e) => updateFloorPlanUnit(unitIndex, { size: e.target.value })}
                    placeholder="Unit Size (e.g. 1550 Sq Ft)"
                    className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
                  />
                  <input
                    value={unit.price}
                    onChange={(e) => updateFloorPlanUnit(unitIndex, { price: e.target.value })}
                    placeholder="Price for this unit (Rs)"
                    type="number"
                    min="0"
                    step="any"
                    className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="mt-3">
                  {unit.existingImageUrl && !unit.file && (
                    <p className="mb-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">Current floor plan is saved. Upload a new one only if you want to replace it.</p>
                  )}
                  <input
                    type="file"
                    onChange={(e) => handleUnitFloorPlanFileChange(unitIndex, e)}
                    className="w-full rounded bg-white p-2"
                    accept="image/*,.pdf"
                  />
                  {unit.file && <p className="mt-1 text-xs font-semibold text-teal-700">Selected: {unit.file.name}</p>}
                </div>

                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Room Dimensions (optional)</p>
                  <div className="space-y-2">
                    {unit.rooms.map((room, roomIndex) => (
                      <div key={roomIndex} className="flex gap-2">
                        <input
                          value={room.name}
                          onChange={(e) => updateUnitRoom(unitIndex, roomIndex, { name: e.target.value })}
                          placeholder="Room (e.g. Bedroom 1)"
                          className="w-1/2 rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-teal-500"
                        />
                        <input
                          value={room.dimension}
                          onChange={(e) => updateUnitRoom(unitIndex, roomIndex, { dimension: e.target.value })}
                          placeholder={`Dimension (e.g. 11'9" X 14'2")`}
                          className="w-1/2 rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-teal-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeUnitRoom(unitIndex, roomIndex)}
                          className="shrink-0 rounded-full bg-slate-950/70 px-2 text-xs font-bold text-white"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addRoomToUnit(unitIndex)}
                    className="mt-2 text-xs font-bold text-teal-700 hover:text-teal-900"
                  >
                    + Add Room
                  </button>
                </div>
              </div>
            ))}
          </div>

          {floorPlanUnits.length < MAX_FLOOR_PLAN_UNITS && (
            <button
              type="button"
              onClick={addFloorPlanUnit}
              className="mt-4 inline-flex items-center justify-center rounded-lg border border-teal-600 bg-white px-4 py-2 text-sm font-bold text-teal-700 transition hover:bg-teal-50"
            >
              + Add Unit
            </button>
          )}
        </div>

        <div className="mt-4">
          <label className="block rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
            <span className="mb-2 flex items-center gap-2 font-semibold text-slate-800"><Image className="h-5 w-5 text-teal-700" />Property Brochure</span>
            {isEditMode && existingMedia.propertyFormUrl && !formData.propertyForm && (
              <p className="mb-3 rounded-lg bg-white p-3 text-sm text-slate-600">Current property form is saved. Upload a new one only if you want to replace it.</p>
            )}
            <input type="file" onChange={handlePropertyFormChange} className="w-full rounded bg-white p-2" accept="image/*,.pdf" />
            {formData.propertyForm && <p className="mt-2 text-sm font-semibold text-teal-700">Selected: {formData.propertyForm.name}</p>}
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Possession Date</label>
            <input
              name="possessionDate"
              value={formData.possessionDate}
              onChange={handleChange}
              type="date"
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">RERA ID</label>
            <input
              name="reraId"
              value={formData.reraId}
              onChange={handleChange}
              type="text"
              placeholder="RERA registration ID (if applicable)"
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Locality Top Highlights</label>
            <textarea
              name="localityHighlights"
              value={formData.localityHighlights}
              onChange={handleChange}
              placeholder="e.g. Close to metro, schools, hospitals, IT parks"
              rows={3}
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Project Highlights</label>
            <textarea
              name="projectHighlights"
              value={formData.projectHighlights}
              onChange={handleChange}
              placeholder="e.g. Clubhouse, swimming pool, gated community, power backup"
              rows={3}
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </section>
      )}

      {currentStep === 4 && (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <MapPin className="h-6 w-6 text-teal-700" />
        <h2 className="text-xl font-bold text-slate-900">Location Details</h2>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
            <select
              name="state"
              value={formData.state}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              required
            >
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
            <select
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              required
            >
              {cities.map(city => (
                <option key={city.value} value={city.value}>{city.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
          <input
            type="checkbox"
            id="useMapLink"
            checked={useMapLink}
            onChange={toggleMapLinkMode}
            className="w-4 h-4 text-teal-600"
          />
          <label htmlFor="useMapLink" className="text-sm text-gray-700">
            Use Google Maps link instead
          </label>
        </div>

        {useMapLink ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paste Google Maps Link *
            </label>
            <input
              ref={mapLinkInputRef}
              type="text"
              value={mapLinkInput}
              onFocus={() => setHighlightedLocation('link')}
              onChange={handleMapLinkChange}
              onBlur={handleMapLinkBlur}
              placeholder="Paste your Google Maps link here"
              className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-teal-500 ${highlightedLocation === 'link' ? 'border-teal-600 ring-1 ring-teal-200' : ''}`}
              required
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Colony Name
              </label>
              <input
                ref={societyInputRef}
                name="societyName"
                value={formData.societyName}
                onFocus={() => setHighlightedLocation('address')}
                onChange={handleChange}
                placeholder="Enter colony name"
                className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-teal-500 ${highlightedLocation === 'address' ? 'border-teal-600 ring-1 ring-teal-200' : ''}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Locality *
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="ml-2 text-xs text-teal-600 hover:text-teal-800 bg-teal-50 px-2 py-1 rounded"
                >
                  Use Current Location
                </button>
              </label>
              <input
                ref={localityInputRef}
                name="locality"
                value={formData.locality}
                onFocus={() => setHighlightedLocation('address')}
                onChange={handleChange}
                placeholder="Enter locality (e.g., Gachibowli, Kondapur)"
                className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-teal-500 ${highlightedLocation === 'address' ? 'border-teal-600 ring-1 ring-teal-200' : ''}`}
                required
              />
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
            <input
              name="pincode"
              value={formData.pincode}
              onChange={(e) => setFormData(prev => ({ ...prev, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              placeholder="Pincode auto-fills from locality when available"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Landmark / Street *</label>
            <input
              name="landmark"
              value={formData.landmark}
              onChange={handleChange}
              placeholder="e.g., Near Metro Station, Main Road"
              className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>
        </div>

        {(formData.locality || formData.societyName) && (
          <div className="p-3 bg-teal-50 rounded-lg">
            <p className="text-sm text-teal-700">
              <strong>Selected Location:</strong>
            </p>
            <p className="text-sm text-gray-700 break-words">
              {formData.societyName && `${formData.societyName}, `}
              {formData.locality}, {formData.landmark}, {formData.city}, {formData.state}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location Link
          </label>
          <input
            ref={!useMapLink ? mapLinkInputRef : undefined}
            type="text"
            value={mapLinkInput}
            onFocus={() => setHighlightedLocation('link')}
            onChange={handleMapLinkChange}
            onBlur={handleMapLinkBlur}
            placeholder="Paste Google Maps location link"
            className={`w-full border p-3 rounded-lg focus:ring-2 focus:ring-teal-500 ${highlightedLocation === 'link' ? 'border-teal-600 ring-1 ring-teal-200' : ''}`}
            disabled={!isMapLoaded}
          />
        </div>

        <label className="block text-sm font-medium text-gray-700">
          Mark Location on Map *
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Click on the map or drag the marker to mark the exact property location
        </p>
        <div
          id="map"
          className={`w-full h-80 rounded-lg border bg-gray-100 ${highlightedLocation === 'map' ? 'border-teal-600 ring-2 ring-teal-200' : 'border-gray-200'}`}
          style={{ minHeight: '320px' }}
        ></div>
      </div>
      </section>
      )}

      {cropModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="crop-editor-title"
        >
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 id="crop-editor-title" className="text-xl font-bold text-slate-900">
                  {cropModal.target === 'plotDiagram' ? 'Crop 2D Plot Diagram' : 'Crop Property Image'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Click the image to move the crop box, then adjust the sliders for the exact area.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCropEditor}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="rounded-lg bg-slate-100 p-3">
                <div
                  className="relative mx-auto w-fit max-w-full cursor-crosshair overflow-hidden rounded-lg bg-white"
                  onClick={handleCropPreviewClick}
                >
                  <img
                    ref={cropImageRef}
                    src={cropModal.url}
                    alt="Crop preview"
                    className="block max-h-[62vh] max-w-full object-contain"
                  />
                  <div
                    className="pointer-events-none absolute border-2 border-teal-500 bg-teal-400/20 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]"
                    style={{
                      left: `${cropArea.x}%`,
                      top: `${cropArea.y}%`,
                      width: `${cropArea.width}%`,
                      height: `${cropArea.height}%`
                    }}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-bold text-slate-900">Set Crop Area</h4>
                <div className="mt-4 space-y-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    Left: {Math.round(cropArea.x)}%
                    <input
                      type="range"
                      min="0"
                      max={100 - cropArea.width}
                      value={cropArea.x}
                      onChange={(e) => updateCropArea('x', Number(e.target.value))}
                      className="mt-2 w-full accent-teal-700"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Top: {Math.round(cropArea.y)}%
                    <input
                      type="range"
                      min="0"
                      max={100 - cropArea.height}
                      value={cropArea.y}
                      onChange={(e) => updateCropArea('y', Number(e.target.value))}
                      className="mt-2 w-full accent-teal-700"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Width: {Math.round(cropArea.width)}%
                    <input
                      type="range"
                      min="10"
                      max={100 - cropArea.x}
                      value={cropArea.width}
                      onChange={(e) => updateCropArea('width', Number(e.target.value))}
                      className="mt-2 w-full accent-teal-700"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Height: {Math.round(cropArea.height)}%
                    <input
                      type="range"
                      min="10"
                      max={100 - cropArea.y}
                      value={cropArea.height}
                      onChange={(e) => updateCropArea('height', Number(e.target.value))}
                      className="mt-2 w-full accent-teal-700"
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={applyCrop}
                    className="rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800"
                  >
                    Apply Crop
                  </button>
                  <button
                    type="button"
                    onClick={closeCropEditor}
                    className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {currentStep > 0 && (
          <button
            type="button"
            onClick={() => setCurrentStep((step) => step - 1)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-8 py-4 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back
          </button>
        )}
        {currentStep < formSteps.length - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((step) => step + 1)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0AA6A6] px-8 py-4 font-semibold text-white shadow-lg hover:bg-[#088f8f]"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0AA6A6] px-8 py-4 font-semibold text-white shadow-lg hover:bg-[#088f8f] disabled:cursor-not-allowed disabled:bg-gray-400"
            disabled={isSubmitting}
          >
            <ShieldCheck className="h-5 w-5" />
            {isSubmitting
              ? (isEditMode ? (isAdminEditMode ? 'Updating Property...' : 'Updating for Review...') : 'Submitting for Approval...')
              : (isEditMode ? (isAdminEditMode ? 'Update Property Details' : 'Update Property for Review') : 'Submit Property for Approval')}
          </button>
        )}
      </div>

      <p className="text-sm text-gray-600 text-center">
        {isAdminEditMode
          ? 'Admin edits keep the original owner contact and current approval status.'
          : isEditMode
          ? 'Edited properties are sent back to admin review before publishing'
          : 'Your property will be reviewed by admin before being published'}
      </p>
        </div>
      </div>
    </form>
  );
};

export default PostProperty;
