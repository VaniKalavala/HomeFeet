import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, Building2, Languages, Lock, MapPin, Phone, User } from 'lucide-react';
import { API_BASE, API_ORIGIN } from '../lib/api';

type AgentProperty = {
  _id: string;
  projectName?: string;
  societyName?: string;
  locality?: string;
  city?: string;
  developmentType?: string;
  listingIntent?: string;
  totalBudget?: string;
  squareFeetPrice?: string;
  imageUrl?: string;
};

type AgentProfileData = {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  state: string;
  agentCompanyName: string;
  agentExperienceYears: number | null;
  agentLanguages: string[];
  agentSpecializations: string[];
  phone: string;
  phoneLocked: boolean;
  properties: AgentProperty[];
};

const fallbackImage = 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80';

const formatPrice = (property: AgentProperty) => {
  if (property.totalBudget) return `Rs. ${Number(property.totalBudget).toLocaleString('en-IN')}`;
  if (property.squareFeetPrice) return `Rs. ${Number(property.squareFeetPrice).toLocaleString('en-IN')} / Sq Ft`;
  return 'Price on request';
};

export default function AgentProfile() {
  const { id } = useParams();
  const [agent, setAgent] = useState<AgentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadAgent = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/agents/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load agent profile');
        if (!cancelled) setAgent(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load agent profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadAgent();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-slate-50 py-16 text-center text-slate-600">Loading agent profile...</div>;
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <div className="ld-container">
          <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-xl">
            <h2 className="text-2xl font-black text-slate-950">Agent Not Found</h2>
            <p className="mt-3 text-slate-600">{error || 'This agent profile is not available.'}</p>
            <Link to="/find-an-agent" className="ld-btn-primary mt-6">
              <ArrowLeft className="h-5 w-5" /> Back to Agents
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="ld-container">
        <Link to="/find-an-agent" className="inline-flex items-center gap-2 text-sm font-bold text-teal-700 hover:text-teal-900">
          <ArrowLeft className="h-4 w-4" /> Back to Agents
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="h-fit rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black text-white" style={{ backgroundColor: '#0AA6A6' }}>
              {agent.firstName?.charAt(0).toUpperCase() || <User className="h-8 w-8" />}
            </div>
            <h1 className="mt-4 text-2xl font-black text-slate-950">{agent.firstName} {agent.lastName}</h1>
            {agent.agentCompanyName && (
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                <Building2 className="h-4 w-4 text-teal-700" /> {agent.agentCompanyName}
              </p>
            )}
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin className="h-4 w-4 text-teal-700" />
              {[agent.city, agent.state].filter(Boolean).join(', ') || 'Location not specified'}
            </p>
            <p className="mt-3 inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-teal-800">
              Agent (Mediator)
            </p>

            {(typeof agent.agentExperienceYears === 'number' || agent.agentLanguages?.length > 0 || agent.agentSpecializations?.length > 0) && (
              <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm text-slate-600">
                {typeof agent.agentExperienceYears === 'number' && (
                  <p className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-teal-700" /> {agent.agentExperienceYears} Years Experience</p>
                )}
                {agent.agentLanguages?.length > 0 && (
                  <p className="flex items-center gap-2"><Languages className="h-4 w-4 text-teal-700" /> {agent.agentLanguages.join(', ')}</p>
                )}
                {agent.agentSpecializations?.length > 0 && (
                  <p className="flex flex-wrap items-center gap-1.5">
                    {agent.agentSpecializations.map((spec) => (
                      <span key={spec} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{spec}</span>
                    ))}
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 border-t border-slate-100 pt-5">
              {agent.phoneLocked ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex gap-3">
                    <Lock className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                    <div>
                      <h3 className="font-black text-slate-950">Paid membership required</h3>
                      <p className="text-sm text-slate-600">
                        Builders, owners, and other agents need an active membership to view this agent's phone number.
                      </p>
                    </div>
                  </div>
                  <Link to="/owner-mediator-membership" className="ld-btn-primary w-full">
                    Unlock With Membership
                  </Link>
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="flex items-center gap-2 font-black text-slate-950">
                    <Phone className="h-5 w-5 text-teal-700" />
                    {agent.phone || 'Phone not available'}
                  </p>
                </div>
              )}
            </div>
          </aside>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Properties listed so far</h2>
            {agent.properties.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">This agent hasn't listed any verified properties yet.</p>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {agent.properties.map((property) => (
                  <Link
                    key={property._id}
                    to={`/property/${property._id}`}
                    className="overflow-hidden rounded-lg border border-slate-200 transition hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-lg"
                  >
                    <img
                      src={property.imageUrl ? `${API_ORIGIN}${property.imageUrl}` : fallbackImage}
                      alt={property.projectName || property.societyName || 'Property'}
                      className="h-36 w-full object-cover"
                      onError={(e) => { e.currentTarget.src = fallbackImage; }}
                    />
                    <div className="p-4">
                      <p className="font-black text-slate-950">{property.projectName || property.societyName || 'Untitled listing'}</p>
                      <p className="mt-1 text-sm text-slate-500">{[property.locality, property.city].filter(Boolean).join(', ')}</p>
                      <p className="mt-2 text-sm font-bold text-teal-700">{formatPrice(property)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
