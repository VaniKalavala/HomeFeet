import React, { useEffect, useState } from 'react';
import ListingsSidebar from './ListingsSidebar';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Building2, Mail, MapPin, Phone, ShieldCheck, Sparkles, User } from 'lucide-react';
import { API_BASE } from '../lib/api';

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('User');
  const [email, setEmail] = useState('Not available');
  const [phone, setPhone] = useState('Not available');
  const [accountType, setAccountType] = useState('owner');
  const [builderStatus, setBuilderStatus] = useState('not_required');
  const [builderPlan, setBuilderPlan] = useState('none');
  const [freeRemaining, setFreeRemaining] = useState(2);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');

  const languageOptions = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Marathi', 'Bengali', 'Urdu', 'Gujarati', 'Malayalam'];
  const specializationOptions = ['Apartment', 'Villa', 'Plot', 'Commercial Space', 'Independent House'];

  const toggleListValue = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const parseStoredList = (key: string): string[] => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    setName(localStorage.getItem('name') || 'User');
    setEmail(localStorage.getItem('email') || 'Not available');
    const storedPhone = localStorage.getItem('phone');
    setPhone(storedPhone ? `+91 ${storedPhone}` : 'Not available');
    setAccountType(localStorage.getItem('accountType') || 'owner');
    setBuilderStatus(localStorage.getItem('builderVerificationStatus') || 'not_required');
    setBuilderPlan(localStorage.getItem('builderSubscriptionPlan') || 'none');
    const credits = Number(localStorage.getItem('freeContactCredits') || 2);
    const used = Number(localStorage.getItem('contactUnlocksUsed') || 0);
    setFreeRemaining(Math.max(credits - used, 0));
    setCity(localStorage.getItem('city') || '');
    setState(localStorage.getItem('state') || '');
    setCompanyName(localStorage.getItem('agentCompanyName') || '');
    setExperienceYears(localStorage.getItem('agentExperienceYears') || '');
    setLanguages(parseStoredList('agentLanguages'));
    setSpecializations(parseStoredList('agentSpecializations'));
  }, [navigate]);

  const saveAgentDetails = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSavingLocation(true);
    setLocationMessage('');
    try {
      const response = await fetch(`${API_BASE}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          city,
          state,
          agentCompanyName: companyName,
          agentExperienceYears: experienceYears,
          agentLanguages: languages,
          agentSpecializations: specializations
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save agent details');
      localStorage.setItem('city', data.city || '');
      localStorage.setItem('state', data.state || '');
      localStorage.setItem('agentCompanyName', data.agentCompanyName || '');
      localStorage.setItem('agentExperienceYears', data.agentExperienceYears != null ? String(data.agentExperienceYears) : '');
      localStorage.setItem('agentLanguages', JSON.stringify(data.agentLanguages || []));
      localStorage.setItem('agentSpecializations', JSON.stringify(data.agentSpecializations || []));
      setLocationMessage('Agent details saved.');
    } catch (err) {
      setLocationMessage(err instanceof Error ? err.message : 'Unable to save agent details');
    } finally {
      setSavingLocation(false);
    }
  };

  const info = [
    { icon: User, label: 'Name', value: name },
    { icon: Mail, label: 'Email', value: email },
    { icon: Phone, label: 'Phone', value: phone },
    { icon: Building2, label: 'Account Type', value: accountType },
  ];

  return (
    <div className="bg-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl">
      <ListingsSidebar activePage="profile" />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-lg border border-teal-100 bg-[#eefdfd] p-6 shadow-sm sm:p-8">
          <div className="absolute right-8 top-8 hidden h-24 w-24 rounded-full border border-teal-200/70 lg:block" />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-teal-700">
              <span className="h-px w-9 bg-teal-500" />
              Your Account
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
              Welcome, <span className="text-[#0AA6A6]">{name.split(' ')[0]}</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Manage your profile, listings, owner requests, and builder conversations from one professional desk.
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {info.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-2 break-all text-base font-black capitalize leading-6 text-slate-950 sm:break-words">{item.value}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <BadgeCheck className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-slate-950">Trust Status</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {accountType === 'builder'
                ? `Builder verification status: ${builderStatus}. Plan: ${builderPlan === 'none' ? `Free access (${freeRemaining} owner contacts left)` : builderPlan.replace('_', ' ')}.`
                : accountType === 'mediator'
                  ? `Agent (Mediator) plan: ${builderPlan === 'none' ? 'Free summary access. Paid membership unlocks other complete listings.' : builderPlan.replace('_', ' ')}.`
                  : accountType === 'buyer'
                    ? 'Buyer account: your first owner-contact reveal is free. See the Subscription Plans tab in your Dashboard for request and credit-pack options.'
                    : `Owner plan: ${builderPlan === 'none' ? 'Free summary access and your own listing details. Paid membership unlocks other complete listings.' : builderPlan.replace('_', ' ')}.`}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-slate-950">Privacy Protection</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">HomeFeet uses controlled contact reveal, admin-reviewed listings, and conversation history to keep high-value property discussions professional.</p>
          </div>
        </section>

        {accountType === 'mediator' && (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <MapPin className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-slate-950">Agent Details</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Shown on your public agent profile so builders, owners, and buyers can find you in "Find an Agent".
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-teal-500"
              />
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-teal-500"
              />
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company Name"
                className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-teal-500"
              />
              <input
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder="Years of Experience"
                type="number"
                min="0"
                step="1"
                className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-slate-700">Languages Spoken</p>
              <div className="flex flex-wrap gap-2">
                {languageOptions.map((option) => (
                  <label key={option} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={languages.includes(option)}
                      onChange={() => setLanguages((prev) => toggleListValue(prev, option))}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-slate-700">Property Types You Deal In</p>
              <div className="flex flex-wrap gap-2">
                {specializationOptions.map((option) => (
                  <label key={option} className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={specializations.includes(option)}
                      onChange={() => setSpecializations((prev) => toggleListValue(prev, option))}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={saveAgentDetails}
                disabled={savingLocation}
                className="inline-flex items-center justify-center rounded-lg bg-[#0AA6A6] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#088f8f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingLocation ? 'Saving...' : 'Save Agent Details'}
              </button>
              {locationMessage && <p className="text-sm font-semibold text-slate-600">{locationMessage}</p>}
            </div>
          </section>
        )}

        <section className="mt-6 rounded-lg border border-teal-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-950">Account Ready</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Keep contact details updated so property requests and approvals move smoothly.</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/user-posted-properties')} className="inline-flex items-center justify-center rounded-lg bg-[#0AA6A6] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#088f8f]">
              View My Listings
            </button>
          </div>
        </section>
      </main>
      </div>
    </div>
  );
};

export default UserProfile;
