import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Briefcase, Building2, ChevronDown, Home, MapPin, Mic, Search, Tag } from 'lucide-react';

interface SearchBarProps {
  compact?: boolean;
  popularLocations?: string[];
}

const fallbackPopularLocations = ['Kokapet', 'Gachibowli', 'Kondapur', 'Financial District', 'Madhapur', 'Narsingi'];

const metroCities = [
  'Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai', 'Delhi', 'Kolkata',
  'Pune', 'Ahmedabad', 'Jaipur', 'Kochi', 'Lucknow', 'Chandigarh'
];

const SEARCH_TABS = [
  { label: 'Buyer', icon: Home, listingIntent: 'buy', propertyType: '' },
  { label: 'Sale Flats', icon: Tag, listingIntent: 'sell', propertyType: '' },
  { label: 'Commercial Space', icon: Building2, listingIntent: 'sell', propertyType: 'commercial-plot' },
  { label: 'Post Property', icon: Briefcase, listingIntent: 'development', propertyType: '', badge: 'FREE' }
];

const SearchBar: React.FC<SearchBarProps> = ({ compact = false, popularLocations = fallbackPopularLocations }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [city, setCity] = useState(() => localStorage.getItem('selectedCity') || 'Hyderabad');
  const [cityQuery, setCityQuery] = useState(city);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const cityContainerRef = useRef<HTMLDivElement>(null);
  const filteredCities = metroCities.filter((option) => option.toLowerCase().includes(cityQuery.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityContainerRef.current && !cityContainerRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
        setCityQuery(city);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [city]);

  const buildLocationUrl = (location: string) => {
    const tab = SEARCH_TABS[activeTab];
    const params = new URLSearchParams({
      view: 'developers',
      listingIntent: tab.listingIntent,
      city
    });
    if (tab.propertyType) params.set('propertyType', tab.propertyType);
    if (location) params.set('q', location);
    return `/properties?${params.toString()}`;
  };

  const handleTabClick = (index: number) => {
    if (SEARCH_TABS[index].label === 'Post Property') {
      navigate('/post-property-options');
      return;
    }
    setActiveTab(index);
  };

  const handleSearch = () => {
    navigate(buildLocationUrl(searchQuery.trim()));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const selectCity = (value: string) => {
    setCity(value);
    setCityQuery(value);
    localStorage.setItem('selectedCity', value);
    setShowCityDropdown(false);
  };

  return (
    <div className={compact ? 'w-full' : 'mx-auto max-w-5xl'}>
      <div className="overflow-hidden rounded-lg shadow-xl shadow-slate-950/10 backdrop-blur-md">
        <div className="flex overflow-x-auto whitespace-nowrap bg-slate-950/80 ld-scrollbar-hide">
          {SEARCH_TABS.map((tab, index) => {
            const Icon = tab.icon;
            const active = index === activeTab && tab.label !== 'Post Property';
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => handleTabClick(index)}
                className={`relative flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs font-semibold transition sm:gap-2 sm:px-4 sm:py-3 sm:text-sm ${
                  active ? 'bg-slate-800/90 text-white' : 'text-slate-300 hover:bg-slate-900/80 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {tab.label}
                {tab.badge && (
                  <span className="absolute -top-1 right-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="bg-white/85 p-4">
          <div className="flex items-stretch rounded-lg border border-slate-300 focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-100">
            <div ref={cityContainerRef} className="relative min-w-0 flex-1">
              <div className="flex h-full w-full items-center gap-1 rounded-l-lg bg-white px-2 sm:gap-2 sm:px-4">
                <input
                  ref={cityInputRef}
                  type="text"
                  value={cityQuery}
                  onFocus={() => { setShowCityDropdown(true); cityInputRef.current?.select(); }}
                  onChange={(e) => { setCityQuery(e.target.value); setShowCityDropdown(true); }}
                  className="w-full min-w-0 bg-transparent text-sm font-semibold text-slate-800 outline-none"
                  placeholder="City"
                />
                <button
                  type="button"
                  onClick={() => setShowCityDropdown((prev) => !prev)}
                  aria-label="Toggle city list"
                >
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {showCityDropdown && (
                <div className="absolute left-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
                  <p className="px-4 pt-2 text-xs font-bold uppercase tracking-wide text-teal-700">
                    {cityQuery && cityQuery !== city ? 'Matching Cities' : 'Top Cities'}
                  </p>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {filteredCities.length ? filteredCities.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => selectCity(option)}
                        className={`block w-full px-4 py-2 text-left text-sm font-semibold hover:bg-slate-50 ${
                          city === option ? 'text-teal-700' : 'text-slate-700'
                        }`}
                      >
                        {option}
                      </button>
                    )) : (
                      <p className="px-4 py-2 text-sm text-slate-500">No cities found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="relative min-w-0 flex-1 border-r border-slate-300">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-4 sm:h-5 sm:w-5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Try Kokapet, 500032, Gachibowli..."
                className="h-full w-full bg-white pl-9 pr-9 text-sm text-slate-900 outline-none sm:pl-12 sm:pr-12 sm:text-base"
              />
              <button
                type="button"
                aria-label="Voice search"
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 sm:right-3 sm:h-8 sm:w-8"
              >
                <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
            <button onClick={handleSearch} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-r-lg bg-[#0AA6A6] px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-[#088f8f] disabled:cursor-not-allowed disabled:bg-slate-400 sm:px-8 sm:py-3">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>

          <div className="-mx-4 -mb-4 mt-4 flex items-center gap-2 overflow-x-auto whitespace-nowrap rounded-b-lg bg-slate-100/85 px-4 py-3 ld-scrollbar-hide">
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Trending Searches:</span>
            {popularLocations.map((location) => (
              <button
                key={location}
                onClick={() => navigate(buildLocationUrl(location))}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-teal-700 hover:bg-teal-50 hover:text-teal-800"
              >
                {location}
                <ArrowRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
