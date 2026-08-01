import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Image, IndianRupee, MapPin, Ruler, Search, Upload } from 'lucide-react';
import { API_BASE } from '../lib/api';
import { isAdminUser } from '../lib/admin';
import LoginModal from './LoginModal';

const cityOptions = [
  'Hyderabad',
  'Bengaluru',
  'Chennai',
  'Mumbai',
  'Pune',
  'Delhi',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Kochi',
  'Lucknow',
  'Chandigarh'
];

const areaPresets = {
  sqYards: { unit: 'Sq Yards', min: '100', max: '4000' },
  acres: { unit: 'Acres', min: '1', max: '100' },
  sqft: { unit: 'Sq Ft', min: '500', max: '5000' }
};

const bhkOptions = ['1 BHK', '2 BHK', '2.5 BHK', '3 BHK', '4 BHK', '4+ BHK'];

const landTypeOptions = [
  { label: 'Apartment', value: 'apartment', areaMode: 'sqft' as const, category: 'apartment' as const },
  { label: 'High Rise', value: 'high-rise', areaMode: 'sqft' as const, category: 'apartment' as const },
  { label: 'Gated Community', value: 'gated-community', areaMode: 'sqft' as const, category: 'apartment' as const },
  { label: 'Villa', value: 'villa', areaMode: 'sqYards' as const, category: 'plot' as const },
  { label: 'Commercial', value: 'commercial-plot', areaMode: 'sqft' as const, category: 'commercial' as const },
  { label: 'FarmVilla', value: 'farm-villa', areaMode: 'acres' as const, category: 'land' as const }
];

const timelineOptions = [
  { label: 'Property Looking Immediately', value: 'immediate' },
  { label: '3 Months Time', value: '3_months' },
  { label: '1 Year Time', value: '1_year' }
];

const normalizeMoney = (value = '') => value.replace(/[^\d]/g, '');
const normalizeAssistedPhone = (value = '') => value.replace(/\D/g, '').slice(-10);

const BuyerExpectedPropertyForm: React.FC = () => {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [areaMode, setAreaMode] = useState<'sqYards' | 'acres' | 'sqft'>('sqft');
  const canUseAssistedUpload = isAdminUser(
    localStorage.getItem('phone'),
    localStorage.getItem('accountType'),
    localStorage.getItem('email')
  );
  const [assistedBuyer, setAssistedBuyer] = useState({ phone: '', firstName: '', lastName: '', email: '' });
  const [assistedBuyerLookup, setAssistedBuyerLookup] = useState<{
    status: 'idle' | 'checking' | 'found' | 'not_found' | 'blocked' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });
  const [formData, setFormData] = useState({
    landType: 'apartment',
    minArea: areaPresets.sqft.min,
    maxArea: areaPresets.sqft.max,
    bedrooms: '',
    location: '',
    city: localStorage.getItem('selectedCity') || 'Hyderabad',
    avatar: null as File | null,
    totalBudget: '',
    minSquareYardPrice: '5000',
    maxSquareYardPrice: '30000',
    purchaseTimeline: 'immediate',
    note: ''
  });

  const selectedLandType = landTypeOptions.find(option => option.value === formData.landType) || landTypeOptions[0];
  const isApartment = selectedLandType.category === 'apartment';
  const isCommercial = selectedLandType.category === 'commercial';
  const showAreaModeToggle = selectedLandType.category === 'plot' || selectedLandType.category === 'land';
  const priceUnitLabel = isApartment || isCommercial ? 'Square Feet' : 'Square Yard';

  const updateAreaMode = (mode: 'sqYards' | 'acres' | 'sqft') => {
    setAreaMode(mode);
    setFormData(prev => ({
      ...prev,
      minArea: areaPresets[mode].min,
      maxArea: areaPresets[mode].max
    }));
  };

  const updateLandType = (value: string) => {
    const selectedType = landTypeOptions.find(option => option.value === value) || landTypeOptions[0];
    setAreaMode(selectedType.areaMode);
    setFormData(prev => ({
      ...prev,
      landType: selectedType.value,
      minArea: areaPresets[selectedType.areaMode].min,
      maxArea: areaPresets[selectedType.areaMode].max,
      bedrooms: selectedType.category === 'apartment' ? prev.bedrooms : ''
    }));
  };

  const handleAssistedBuyerChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAssistedBuyer(prev => ({ ...prev, [name]: name === 'phone' ? normalizeAssistedPhone(value) : value }));
  };

  useEffect(() => {
    if (!canUseAssistedUpload) return;

    const phone = normalizeAssistedPhone(assistedBuyer.phone);
    if (phone.length < 10) {
      setAssistedBuyerLookup({ status: 'idle', message: '' });
      return;
    }

    let cancelled = false;
    const token = localStorage.getItem('token');
    setAssistedBuyerLookup({ status: 'checking', message: 'Checking registration...' });

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
          setAssistedBuyerLookup({
            status: 'not_found',
            message: 'No registered account found. Fill the details below to create the buyer profile.'
          });
          setAssistedBuyer(prev => ({ ...prev, firstName: '', lastName: '', email: '' }));
          return;
        }

        if (!data.canAssignProperty) {
          setAssistedBuyerLookup({
            status: 'blocked',
            message: 'This mobile number belongs to an admin account. Use the buyer\'s own mobile number.'
          });
          return;
        }

        setAssistedBuyer(prev => ({
          ...prev,
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          email: data.user.email || ''
        }));
        setAssistedBuyerLookup({
          status: 'found',
          message: `Registered ${data.user.accountType} found. This requirement will be saved under ${data.user.firstName || 'this user'}'s account.`
        });
      } catch (err) {
        if (!cancelled) {
          setAssistedBuyerLookup({ status: 'error', message: err instanceof Error ? err.message : 'Unable to check this mobile number' });
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [assistedBuyer.phone, canUseAssistedUpload]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    if (canUseAssistedUpload) {
      const assistedPhone = normalizeAssistedPhone(assistedBuyer.phone);
      if (assistedPhone.length !== 10) {
        alert('Please enter the buyer\'s 10-digit mobile number');
        return;
      }
      if (assistedBuyerLookup.status === 'blocked') {
        alert(assistedBuyerLookup.message);
        return;
      }
    }

    const minArea = Number(formData.minArea);
    const maxArea = Number(formData.maxArea);
    const minPrice = Number(normalizeMoney(formData.minSquareYardPrice));
    const maxPrice = Number(normalizeMoney(formData.maxSquareYardPrice));

    if (!formData.location.trim()) {
      alert('Please enter expected location');
      return;
    }
    if (!formData.city.trim()) {
      alert('Please select city');
      return;
    }
    if (!minArea || !maxArea || minArea > maxArea) {
      alert('Please enter a valid expected area range');
      return;
    }
    if (!formData.totalBudget.trim()) {
      alert('Please enter total budget');
      return;
    }
    if (!minPrice || !maxPrice || minPrice > maxPrice) {
      alert(`Please enter a valid ${priceUnitLabel.toLowerCase()} price range`);
      return;
    }
    if (isApartment && !formData.bedrooms) {
      alert('Please select a BHK type');
      return;
    }

    const areaUnit = areaPresets[areaMode].unit;
    const areaRange = `${formData.minArea} - ${formData.maxArea}`;
    const priceRange = `${minPrice} - ${maxPrice}`;
    const landTypeLabel = landTypeOptions.find(option => option.value === formData.landType)?.label || 'Plot';
    const timelineLabel = timelineOptions.find(option => option.value === formData.purchaseTimeline)?.label || 'Property Looking Immediately';
    const locationText = `${formData.location.trim()}, ${formData.city.trim()}, India`;
    const description = [
      `Buyer requirement for ${landTypeLabel}${isApartment && formData.bedrooms ? ` (${formData.bedrooms})` : ''}, ${areaRange} ${areaUnit} at ${formData.location.trim()}, ${formData.city}.`,
      `Total budget: Rs. ${formData.totalBudget.trim()}.`,
      `Expected ${priceUnitLabel.toLowerCase()} price range: Rs. ${minPrice.toLocaleString('en-IN')} to Rs. ${maxPrice.toLocaleString('en-IN')}.`,
      `Timeline: ${timelineLabel}.`,
      formData.note.trim()
    ].filter(Boolean).join(' ');

    const payload = new FormData();
    payload.append('listingIntent', 'buy');
    payload.append('developmentType', formData.landType);
    payload.append('totalArea', areaRange);
    payload.append('areaUnit', areaUnit);
    payload.append('state', '');
    payload.append('city', formData.city.trim());
    payload.append('locality', formData.location.trim());
    payload.append('societyName', '');
    payload.append('landmark', formData.location.trim());
    payload.append('map', `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`);
    payload.append('coordinates', '');
    payload.append('facing', 'Any');
    payload.append('roadFacingDirection', 'Any');
    payload.append('roadSize', '');
    payload.append('frontageWidth', '');
    payload.append('pincode', '');
    payload.append('zoningClassification', '');
    payload.append('northSideLength', '');
    payload.append('southSideLength', '');
    payload.append('eastSideLength', '');
    payload.append('westSideLength', '');
    payload.append('developerRatio', '');
    payload.append('partlySale', '');
    payload.append('partlySaleUnit', '');
    payload.append('partlySaleValue', '0');
    payload.append('goodwill', '');
    payload.append('advance', '');
    payload.append(isApartment || isCommercial ? 'squareFeetPrice' : 'squareYardPrice', priceRange);
    payload.append('bedrooms', isApartment ? formData.bedrooms : '');
    payload.append('purchaseTimeline', formData.purchaseTimeline);
    payload.append('description', description);
    payload.append('address', locationText);
    payload.append('selectedAmenities', JSON.stringify([]));
    if (canUseAssistedUpload) {
      const assistedPhone = normalizeAssistedPhone(assistedBuyer.phone);
      payload.append('adminAssistedUpload', 'true');
      payload.append('assistedOwnerAccountType', 'buyer');
      payload.append('assistedOwnerPhone', assistedPhone);
      payload.append('assistedOwnerFirstName', assistedBuyer.firstName.trim() || 'Buyer');
      payload.append('assistedOwnerLastName', assistedBuyer.lastName.trim() || assistedPhone.slice(-4));
      if (assistedBuyer.email.trim()) {
        payload.append('assistedOwnerEmail', assistedBuyer.email.trim());
      }
    }
    if (formData.avatar) {
      payload.append('image', formData.avatar);
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/add`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: payload
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || 'Unable to submit buyer requirement');

      alert('Buyer requirement submitted for admin approval.');
      navigate(`/properties?view=developers&listingIntent=buy&city=${encodeURIComponent(formData.city.trim())}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to submit buyer requirement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-slate-50 py-10">
      <div className="ld-container">
        <div className="mx-auto max-w-5xl rounded-xl border border-teal-100 bg-white p-5 shadow-xl sm:p-8">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="ld-eyebrow">Buyer Expected Property Form</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">Share Dream Property Requirement</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Add expected area, location, city, avatar, total budget, and price range for owners and mediators to review.
              </p>
            </div>
            <Search className="h-10 w-10 text-teal-700" />
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
            {canUseAssistedUpload && (
              <section className="space-y-4 rounded-lg border border-teal-200 bg-teal-50/60 p-5 shadow-sm sm:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Admin-assisted buyer requirement</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">Buyer contact details</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    Fill this in when submitting on behalf of a buyer (e.g. a phone or WhatsApp inquiry). The buyer's
                    profile will be created or reused, and this requirement will appear under their account. These
                    contact details are only visible to admins.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="space-y-1 text-sm font-semibold text-slate-700">
                    Mobile Number *
                    <input
                      name="phone"
                      value={normalizeAssistedPhone(assistedBuyer.phone)}
                      onChange={handleAssistedBuyerChange}
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
                      value={assistedBuyer.firstName}
                      onChange={handleAssistedBuyerChange}
                      placeholder="Optional buyer first name"
                      className="w-full rounded border border-slate-300 bg-white p-2 font-normal"
                    />
                  </label>
                  <label className="space-y-1 text-sm font-semibold text-slate-700">
                    Last Name
                    <input
                      name="lastName"
                      value={assistedBuyer.lastName}
                      onChange={handleAssistedBuyerChange}
                      placeholder="Buyer last name"
                      className="w-full rounded border border-slate-300 bg-white p-2 font-normal"
                    />
                  </label>
                  <label className="space-y-1 text-sm font-semibold text-slate-700">
                    Email
                    <input
                      name="email"
                      value={assistedBuyer.email}
                      onChange={handleAssistedBuyerChange}
                      placeholder="Optional email"
                      className="w-full rounded border border-slate-300 bg-white p-2 font-normal"
                      type="email"
                    />
                  </label>
                </div>

                {assistedBuyerLookup.message && (
                  <div
                    className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                      assistedBuyerLookup.status === 'found'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : assistedBuyerLookup.status === 'blocked' || assistedBuyerLookup.status === 'error'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}
                  >
                    {assistedBuyerLookup.message}
                  </div>
                )}
              </section>
            )}

            <div>
              <p className="mb-2 text-sm font-black text-slate-900">Property Type</p>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {landTypeOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateLandType(option.value)}
                    className={`rounded-lg border px-4 py-3 text-left text-sm font-black ${formData.landType === option.value ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-700 hover:border-teal-300'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {isApartment && (
              <div>
                <p className="mb-2 text-sm font-black text-slate-900">BHK Type</p>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {bhkOptions.map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, bedrooms: option }))}
                      className={`rounded-lg border px-4 py-3 text-left text-sm font-black ${formData.bedrooms === option ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-700 hover:border-teal-300'}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showAreaModeToggle && (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => updateAreaMode('sqYards')}
                  className={`rounded-lg border px-4 py-3 text-left text-sm font-black ${areaMode === 'sqYards' ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-700 hover:border-teal-300'}`}
                >
                  100 Square Yards to 4000 Square Yards
                </button>
                <button
                  type="button"
                  onClick={() => updateAreaMode('acres')}
                  className={`rounded-lg border px-4 py-3 text-left text-sm font-black ${areaMode === 'acres' ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-700 hover:border-teal-300'}`}
                >
                  1 Acre to 100 Acres
                </button>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-900"><Ruler className="h-4 w-4 text-teal-700" /> Minimum Area ({areaPresets[areaMode].unit})</span>
                <input
                  type="number"
                  min={areaMode === 'sqYards' ? 100 : areaMode === 'sqft' ? 100 : 1}
                  max={areaMode === 'sqYards' ? 4000 : areaMode === 'sqft' ? 20000 : 100}
                  value={formData.minArea}
                  onChange={(event) => setFormData(prev => ({ ...prev, minArea: event.target.value }))}
                  className="ld-input"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-900">Maximum Area ({areaPresets[areaMode].unit})</span>
                <input
                  type="number"
                  min={areaMode === 'sqYards' ? 100 : 1}
                  max={areaMode === 'sqYards' ? 4000 : 100}
                  value={formData.maxArea}
                  onChange={(event) => setFormData(prev => ({ ...prev, maxArea: event.target.value }))}
                  className="ld-input"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-900"><MapPin className="h-4 w-4 text-teal-700" /> Location</span>
                <input
                  value={formData.location}
                  onChange={(event) => setFormData(prev => ({ ...prev, location: event.target.value }))}
                  placeholder="Preferred locality or corridor"
                  className="ld-input"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-900">City</span>
                <select
                  value={formData.city}
                  onChange={(event) => setFormData(prev => ({ ...prev, city: event.target.value }))}
                  className="ld-input"
                >
                  {cityOptions.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block md:col-span-1">
                <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-900"><Image className="h-4 w-4 text-teal-700" /> Avatar</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setFormData(prev => ({ ...prev, avatar: event.target.files?.[0] || null }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 flex items-center gap-2 text-sm font-black text-slate-900"><IndianRupee className="h-4 w-4 text-teal-700" /> Total Budget</span>
                <input
                  value={formData.totalBudget}
                  onChange={(event) => setFormData(prev => ({ ...prev, totalBudget: event.target.value }))}
                  placeholder="Example: 2 Cr, 50 Lakhs, 100 Cr"
                  className="ld-input"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-900">{priceUnitLabel} Price From</span>
                <input
                  inputMode="numeric"
                  value={formData.minSquareYardPrice}
                  onChange={(event) => setFormData(prev => ({ ...prev, minSquareYardPrice: normalizeMoney(event.target.value) }))}
                  placeholder="5000"
                  className="ld-input"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-900">{priceUnitLabel} Price To</span>
                <input
                  inputMode="numeric"
                  value={formData.maxSquareYardPrice}
                  onChange={(event) => setFormData(prev => ({ ...prev, maxSquareYardPrice: normalizeMoney(event.target.value) }))}
                  placeholder="30000"
                  className="ld-input"
                />
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm font-black text-slate-900">Other Options</p>
              <div className="grid gap-3 md:grid-cols-3">
                {timelineOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, purchaseTimeline: option.value }))}
                    className={`rounded-lg border px-4 py-3 text-left text-sm font-black ${formData.purchaseTimeline === option.value ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-700 hover:border-teal-300'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-900">Additional Requirement</span>
              <textarea
                value={formData.note}
                onChange={(event) => setFormData(prev => ({ ...prev, note: event.target.value }))}
                rows={4}
                placeholder="Any road width, facing, zoning, time frame, or seller preference"
                className="ld-input min-h-28"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-[#0AA6A6] px-6 py-3 text-sm font-black text-white shadow-lg transition hover:bg-[#088f8f] disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Upload className="h-4 w-4" />
              {isSubmitting ? 'Submitting...' : 'Submit Buyer Requirement'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLoginSuccess={() => setShowLoginModal(false)} />}
    </section>
  );
};

export default BuyerExpectedPropertyForm;
