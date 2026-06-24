import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, User } from 'lucide-react';
import { API_BASE } from '../lib/api';

type Agent = {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  state: string;
};

export default function AgentDirectory() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <Link
                  key={agent.id}
                  to={`/agent/${agent.id}`}
                  className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-lg font-black text-teal-700">
                    {agent.firstName?.charAt(0).toUpperCase() || <User className="h-6 w-6" />}
                  </div>
                  <h3 className="mt-4 text-lg font-black text-slate-950">
                    {agent.firstName} {agent.lastName}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPin className="h-4 w-4 text-teal-700" />
                    {[agent.city, agent.state].filter(Boolean).join(', ') || 'Location not specified'}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-teal-700">
                    View Profile <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
