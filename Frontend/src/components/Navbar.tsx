import React, { useState, useCallback, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, User, X } from 'lucide-react';
import LoginModal from './LoginModal';
import { isAdminUser } from '../lib/admin';
import BrandName from './BrandName';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [selectedCity, setSelectedCity] = useState(() => localStorage.getItem('selectedCity') || 'Hyderabad');
  const [mobileOpen, setMobileOpen] = useState(false);

  const loadAuthData = useCallback(() => {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('name');
    setIsLoggedIn(Boolean(token));
    setUserName(name || '');
  }, []);

  useEffect(() => {
    loadAuthData();
    const handleStorageChange = () => loadAuthData();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadAuthData]);

  const closeLogin = () => setShowLoginModal(false);

  const handleLoginSuccess = useCallback(() => {
    loadAuthData();
    setShowLoginModal(false);
    if (localStorage.getItem('redirectToBuyerRequirement') === 'true') {
      localStorage.removeItem('redirectToBuyerRequirement');
      navigate('/buyer-requirement');
    }
  }, [loadAuthData, navigate]);

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setShowDropdown(false);
    setMobileOpen(false);
    navigate('/');
  };

  const selectedCityParam = encodeURIComponent(selectedCity);
  const navLinks = [
    { to: `/properties?view=developers&listingIntent=buy&city=${selectedCityParam}`, label: 'Buyer', intent: 'buy' },
    { to: `/properties?view=developers&listingIntent=sell&city=${selectedCityParam}`, label: 'Sale Flats', intent: 'sell' },
    { to: `/properties?view=developers&listingIntent=sell&propertyType=commercial-plot&city=${selectedCityParam}`, label: 'Commercial Space', intent: 'sell', propertyType: 'commercial-plot' },
    { to: '/find-an-agent', label: 'Find an Agent' },
    { to: '/properties-map', label: 'Properties Map-View' },
  ];
  const accountLinks = [
    ['Dashboard', '/dashboard'],
    ['My Profile', '/profile'],
  ];

  const isNavLinkActive = (link: { to: string; intent?: string; propertyType?: string }) => {
    if (link.intent) {
      const params = new URLSearchParams(location.search);
      const propertyTypeMatches = link.propertyType
        ? params.get('propertyType') === link.propertyType
        : !params.get('propertyType');
      return location.pathname === '/properties'
        && params.get('view') === 'developers'
        && (params.get('listingIntent') || 'development') === link.intent
        && propertyTypeMatches;
    }
    return location.pathname === link.to;
  };

  const metroCities = [
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

  const goToPost = () => {
    const token = localStorage.getItem('token');
    setMobileOpen(false);
    if (!token) {
      localStorage.setItem('redirectToPost', 'true');
      setShowLoginModal(true);
      return;
    }
    navigate('/post-property');
    window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, 0);
  };

  const goToBuyerRequirement = () => {
    const token = localStorage.getItem('token');
    setMobileOpen(false);
    if (!token) {
      localStorage.setItem('redirectToBuyerRequirement', 'true');
      setShowLoginModal(true);
      return;
    }
    navigate('/buyer-requirement');
    window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, 0);
  };

  const buyerRequirementButton = (
    <button onClick={goToBuyerRequirement} className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-[#0AA6A6] bg-white px-3.5 py-2 text-sm font-semibold text-[#087f7f] shadow-sm transition hover:bg-teal-50">
      Buyer Requirement
    </button>
  );

  const menuButton = (
    <button onClick={goToPost} className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-[#0AA6A6] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#088f8f]">
      Post Property
    </button>
  );

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="flex h-11 w-full items-center gap-2 px-3 sm:gap-4 sm:px-8">
          <div className="flex shrink-0 items-center gap-4">
            <Link to="/" className="flex min-w-0 items-center gap-2 text-slate-950 sm:gap-3">
              <img src="/HomeFeet_logo.png" alt="HomeFeet" className="h-8 w-8 rounded-md bg-white object-contain sm:h-11 sm:w-11 lg:h-12 lg:w-12" />
              <p className="whitespace-nowrap text-base font-black tracking-tight sm:text-lg xl:text-xl"><BrandName /></p>
            </Link>

            <div className="relative hidden 2xl:block">
              <button
                type="button"
                onClick={() => setShowCityDropdown((prev) => !prev)}
                className="inline-flex items-center gap-1 whitespace-nowrap border-l border-slate-200 pl-4 text-sm font-semibold text-slate-800 transition hover:text-teal-700"
              >
                {selectedCity}
                <ChevronDown className="h-4 w-4" />
              </button>
              {showCityDropdown && (
                <div className="absolute left-3 top-8 z-50 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-2 shadow-2xl">
                  {metroCities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => {
                        setSelectedCity(city);
                        localStorage.setItem('selectedCity', city);
                        window.dispatchEvent(new CustomEvent('selectedCityChange', { detail: city }));
                        setShowCityDropdown(false);
                      }}
                      className={`block w-full px-4 py-2 text-left text-sm font-semibold hover:bg-slate-50 ${
                        selectedCity === city ? 'text-teal-700' : 'text-slate-700'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="relative 2xl:hidden">
            <button
              type="button"
              onClick={() => setShowCityDropdown((prev) => !prev)}
              className="inline-flex max-w-24 items-center gap-1 truncate rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold text-slate-800 transition hover:text-teal-700 sm:max-w-28"
            >
              <span className="truncate">{selectedCity}</span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </button>
            {showCityDropdown && (
              <div className="absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-2 shadow-2xl">
                {metroCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      setSelectedCity(city);
                      localStorage.setItem('selectedCity', city);
                      window.dispatchEvent(new CustomEvent('selectedCityChange', { detail: city }));
                      setShowCityDropdown(false);
                    }}
                    className={`block w-full px-4 py-2 text-left text-sm font-semibold hover:bg-slate-50 ${
                      selectedCity === city ? 'text-teal-700' : 'text-slate-700'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden min-w-0 flex-1 items-center justify-end gap-[1rem] 2xl:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={() =>
                  `whitespace-nowrap border-r border-slate-200 px-[1.1rem] py-1 text-[15px] font-semibold leading-none transition last:border-r-0 ${
                    isNavLinkActive(link) ? 'text-teal-700' : 'text-slate-500 hover:text-teal-700'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="ml-auto hidden shrink-0 items-center gap-5 2xl:flex">
            {buyerRequirementButton}
            {menuButton}
            {!isLoggedIn ? (
              <button type="button" onClick={() => setShowLoginModal(true)} className="inline-flex items-center justify-center gap-2 whitespace-nowrap px-1 py-2 text-base font-semibold text-slate-600 transition hover:text-teal-700">
                <User className="h-4 w-4" />
                Login
              </button>
            ) : (
              <div className="relative">
                <button onClick={() => setShowDropdown((prev) => !prev)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-50">
                  <User className="h-4 w-4" />
                  {userName.split(' ')[0] || 'Account'}
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-2 shadow-2xl">
                    {accountLinks.map(([label, to]) => (
                      <button key={to} onClick={() => { setShowDropdown(false); navigate(to); }} className="block w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">
                        {label}
                      </button>
                    ))}
                    {isAdminUser(localStorage.getItem('phone'), localStorage.getItem('accountType'), localStorage.getItem('email')) && (
                      <button onClick={() => { setShowDropdown(false); navigate('/admin'); }} className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-teal-700 hover:bg-teal-50">
                        Admin Panel
                      </button>
                    )}
                    <button onClick={handleLogout} className="block w-full border-t border-slate-100 px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 2xl:hidden">
            {!isLoggedIn ? (
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-bold text-slate-800 hover:bg-teal-50 hover:text-teal-700"
              >
                <User className="h-4 w-4" />
                Login
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMobileOpen((prev) => !prev)}
                className="inline-flex max-w-24 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-bold text-slate-800 hover:bg-teal-50 hover:text-teal-700"
              >
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate">{userName.split(' ')[0] || 'Account'}</span>
              </button>
            )}
            <button onClick={() => setMobileOpen((prev) => !prev)} className="rounded-lg border border-slate-200 p-2 text-slate-800">
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white p-4 2xl:hidden">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-3 py-3 font-semibold hover:bg-slate-50 ${
                    isNavLinkActive(link) ? 'bg-teal-50 text-teal-700' : 'text-slate-800'
                  }`}
                >
                  {link.label}
                </NavLink>
              ))}
              <button onClick={goToPost} className="mt-2 inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-[#0AA6A6] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#088f8f]">
                Post Property
              </button>
              <button onClick={goToBuyerRequirement} className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-[#0AA6A6] bg-white px-4 py-2 text-sm font-semibold text-[#087f7f] shadow-sm transition hover:bg-teal-50">
                Buyer Requirement
              </button>
              {!isLoggedIn ? (
                <button onClick={() => setShowLoginModal(true)} className="rounded-lg border border-slate-200 px-3 py-3 text-left font-semibold text-slate-800 hover:bg-slate-50">Login</button>
              ) : (
                <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-3 py-3 text-sm font-bold text-slate-950">
                    {userName.split(' ')[0] || 'Account'}
                  </div>
                  {accountLinks.map(([label, to]) => (
                    <button
                      key={to}
                      onClick={() => {
                        setMobileOpen(false);
                        navigate(to);
                      }}
                      className="block w-full px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {label}
                    </button>
                  ))}
                  {isAdminUser(localStorage.getItem('phone'), localStorage.getItem('accountType'), localStorage.getItem('email')) && (
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        navigate('/admin');
                      }}
                      className="block w-full px-3 py-3 text-left text-sm font-semibold text-teal-700 hover:bg-teal-50"
                    >
                      Admin Panel
                    </button>
                  )}
                  <button onClick={handleLogout} className="block w-full border-t border-slate-100 px-3 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {showLoginModal && (
        <LoginModal onClose={closeLogin} onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
};

export default Navbar;
