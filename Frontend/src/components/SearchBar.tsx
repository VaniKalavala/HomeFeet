import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Briefcase, Building2, Home, MapPin, Mic, Search, Tag } from 'lucide-react';

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
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    localStorage.setItem('selectedCity', value);
    setShowCityDropdown(false);
  };

  return (
    <div className={compact ? 'w-full' : 'mx-auto max-w-5xl'}>
      <div className="overflow-hidden rounded-lg shadow-xl shadow-slate-950/10 backdrop-blur-md">
        <div className="flex flex-wrap bg-slate-950/80">
          {SEARCH_TABS.map((tab, index) => {
            const Icon = tab.icon;
            const active = index === activeTab && tab.label !== 'Post Property';
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => handleTabClick(index)}
                className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition sm:gap-2 sm:px-4 sm:py-3 sm:text-sm ${
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
          <div className="flex items-center gap-2">
            <div className="relative w-24 shrink-0 sm:w-auto">
              <button
                type="button"
                onClick={() => setShowCityDropdown((prev) => !prev)}
                className="ld-input flex w-full items-center justify-between gap-1 whitespace-nowrap px-2 text-sm font-semibold text-slate-800 sm:gap-2 sm:px-4"
              >
                <span className="truncate">{city}</span>
                <ArrowRight className="h-3 w-3 shrink-0 rotate-90" />
              </button>
              {showCityDropdown && (
                <div className="absolute left-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
                  <p className="px-4 pt-2 text-xs font-bold uppercase tracking-wide text-teal-700">Top Cities</p>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {metroCities.map((option) => (
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
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative min-w-0 flex-1">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-4 sm:h-5 sm:w-5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Try Kokapet, 500032, Gachibowli..."
                className="ld-input pl-9 pr-9 text-sm sm:pl-12 sm:pr-12 sm:text-base"
              />
              <Mic className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:right-4 sm:h-5 sm:w-5" />
            </div>
            <button onClick={handleSearch} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0AA6A6] px-3 py-2.5 font-semibold text-white shadow-sm transition hover:bg-[#088f8f] disabled:cursor-not-allowed disabled:bg-slate-400 sm:px-5 sm:py-3">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trending Searches:</span>
            {popularLocations.map((location) => (
              <button
                key={location}
                onClick={() => navigate(buildLocationUrl(location))}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-teal-700 hover:bg-teal-50 hover:text-teal-800"
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
