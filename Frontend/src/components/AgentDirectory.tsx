import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Building2, Languages, MapPin, MessageCircle, Phone, Trophy, User } from 'lucide-react';
import { API_BASE } from '../lib/api';

type Agent = {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  state: string;
  agentCompanyName: string;
  agentExperienceYears: number | null;
  agentLanguages: string[];
  agentSpecializations: string[];
  propertiesCount: number;
};

const EXPERIENCE_RANGES = [
  { label: 'Any Experience', min: 0, max: Infinity },
  { label: '0-2 Years', min: 0, max: 2 },
  { label: '3-5 Years', min: 3, max: 5 },
  { label: '6-10 Years', min: 6, max: 10 },
  { label: '10+ Years', min: 10, max: Infinity },
];

const BRAND_TEAL = '#0AA6A6';

export default function AgentDirectory() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedSpecialization, setSelectedSpecialization] = useState('All');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [selectedExperience, setSelectedExperience] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadAgents = async () => {
      try {
        const response = await fetch(`${API_BASE}/agents`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load agents');
        if (!cancelled) setAgents(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load agents');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadAgents();
    return () => { cancelled = true; };
  }, []);

  const stateOptions = Array.from(new Set(agents.map((agent) => agent.state).filter(Boolean))).sort();
  const cityOptions = Array.from(new Set(
    agents
      .filter((agent) => selectedState === 'All' || agent.state === selectedState)
      .map((agent) => agent.city)
      .filter(Boolean)
  )).sort();
  const specializationOptions = Array.from(new Set(agents.flatMap((agent) => agent.agentSpecializations || []))).sort();
  const languageOptions = Array.from(new Set(agents.flatMap((agent) => agent.agentLanguages || []))).sort();

  const activeExperienceRange = EXPERIENCE_RANGES[selectedExperience];
  const visibleAgents = agents.filter((agent) =>
    (selectedState === 'All' || agent.state === selectedState) &&
    (selectedCity === 'All' || agent.city === selectedCity) &&
    (selectedSpecialization === 'All' || (agent.agentSpecializations || []).includes(selectedSpecialization)) &&
    (selectedLanguage === 'All' || (agent.agentLanguages || []).includes(selectedLanguage)) &&
    (selectedExperience === 0 || (
      typeof agent.agentExperienceYears === 'number' &&
      agent.agentExperienceYears >= activeExperienceRange.min &&
      agent.agentExperienceYears <= activeExperienceRange.max
    ))
  );

  const hasActiveFilters = selectedState !== 'All' || selectedCity !== 'All' ||
    selectedSpecialization !== 'All' || selectedLanguage !== 'All' || selectedExperience !== 0;

  const clearAllFilters = () => {
    setSelectedState('All');
    setSelectedCity('All');
    setSelectedSpecialization('All');
    setSelectedLanguage('All');
    setSelectedExperience(0);
  };

  const mostListedAgents = [...agents]
    .sort((a, b) => b.propertiesCount - a.propertiesCount)
    .filter((agent) => agent.propertiesCount > 0)
    .slice(0, 8);

  const filterSelectClass = "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-teal-600";

  return (
    <div className="bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/40" />
        <div className="ld-container relative py-20">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-300">Find an Agent</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
            Connect with verified agents (mediators) across India.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
            Browse agent profiles and the properties they've listed. Contact details unlock with an active membership.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="ld-container">
          {loading && <p className="text-center text-slate-500">Loading agents...</p>}
          {!loading && error && (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="font-semibold text-slate-700">{error}</p>
            </div>
          )}
          {!loading && !error && agents.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
              <User className="mx-auto h-8 w-8 text-teal-700" />
              <p className="mt-3 font-black text-slate-950">No agents found yet.</p>
            </div>
          )}
          {!loading && agents.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div>
                <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <select value={selectedState} onChange={(e) => { setSelectedState(e.target.value); setSelectedCity('All'); }} className={filterSelectClass}>
                    <option value="All">All States</option>
                    {stateOptions.map((state) => <option key={state} value={state}>{state}</option>)}
                  </select>
                  <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className={filterSelectClass}>
                    <option value="All">All Cities</option>
                    {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
                  </select>
                  <select value={selectedSpecialization} onChange={(e) => setSelectedSpecialization(e.target.value)} className={filterSelectClass}>
                    <option value="All">Property Type</option>
                    {specializationOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  <select value={selectedExperience} onChange={(e) => setSelectedExperience(Number(e.target.value))} className={filterSelectClass}>
                    {EXPERIENCE_RANGES.map((range, index) => <option key={range.label} value={index}>{range.label}</option>)}
                  </select>
                  <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className={filterSelectClass}>
                    <option value="All">Language</option>
                    {languageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  {hasActiveFilters && (
                    <button type="button" onClick={clearAllFilters} className="text-sm font-semibold text-teal-700 underline-offset-2 hover:underline">
                      Clear All
                    </button>
                  )}
                </div>

                <p className="mb-4 text-sm font-semibold text-slate-500">{visibleAgents.length} of {agents.length} agents found</p>

                {visibleAgents.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <p className="font-black text-slate-950">No agents found for these filters.</p>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {visibleAgents.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-lg"
                      >
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-black text-white"
                            style={{ backgroundColor: BRAND_TEAL }}
                          >
                            {agent.firstName?.charAt(0).toUpperCase() || <User className="h-6 w-6" />}
                          </div>
                          <Link to={`/agent/${agent.id}`} className="text-xs font-bold text-teal-700 hover:underline">
                            View Profile
                          </Link>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-lg font-black text-slate-950">
                            {agent.firstName} {agent.lastName}
                          </h3>
                          {agent.agentCompanyName && (
                            <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-slate-500">
                              <Building2 className="h-3.5 w-3.5 shrink-0" /> {agent.agentCompanyName}
                            </p>
                          )}
                          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                            <MapPin className="h-4 w-4 shrink-0 text-teal-700" />
                            <span className="truncate">{[agent.city, agent.state].filter(Boolean).join(', ') || 'Location not specified'}</span>
                          </p>
                          {(agent.agentExperienceYears || agent.agentLanguages?.length) ? (
                            <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                              {typeof agent.agentExperienceYears === 'number' && (
                                <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {agent.agentExperienceYears} Yrs Experience</span>
                              )}
                              {agent.agentLanguages?.length > 0 && (
                                <span className="flex items-center gap-1"><Languages className="h-3.5 w-3.5" /> {agent.agentLanguages.join(', ')}</span>
                              )}
                            </div>
                          ) : null}
                          {agent.propertiesCount > 0 && (
                            <p className="mt-1 text-xs font-semibold text-slate-600">
                              {agent.propertiesCount} Listing{agent.propertiesCount === 1 ? '' : 's'}{' '}
                              <Link to={`/agent/${agent.id}`} className="font-bold text-teal-700 underline">View All</Link>
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              to={`/agent/${agent.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700"
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                            </Link>
                            <Link
                              to={`/agent/${agent.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                              style={{ backgroundColor: BRAND_TEAL }}
                            >
                              <Phone className="h-3.5 w-3.5" /> Contact
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {mostListedAgents.length > 0 && (
                <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-700">
                    <Trophy className="h-4 w-4 text-amber-500" /> Most Listings
                  </h2>
                  <div className="mt-3 space-y-1">
                    {mostListedAgents.map((agent, index) => (
                      <Link
                        key={agent.id}
                        to={`/agent/${agent.id}`}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-teal-50"
                      >
                        <span className="w-4 shrink-0 text-sm font-bold text-slate-400">{index + 1}</span>
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                          style={{ backgroundColor: BRAND_TEAL }}
                        >
                          {agent.firstName?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                        </div>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                          {agent.firstName} {agent.lastName}
                        </span>
                        <span className="shrink-0 text-xs font-bold text-slate-500">{agent.propertiesCount}</span>
                      </Link>
                    ))}
                  </div>
                </aside>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
