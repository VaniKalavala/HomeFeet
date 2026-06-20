import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, Building2, Filter, MapPin, MessageSquareQuote, Send, Star, Users } from 'lucide-react';
import { API_BASE } from '../lib/api';

type Testimonial = {
  _id?: string;
  name: string;
  role: string;
  city?: string;
  summary: string;
  createdAt?: string;
};

const defaultTestimonials: Testimonial[] = [
  {
    name: 'Vani Kalavala',
    role: 'Mediator',
    summary: 'HomeFeet helped us present land information clearly, with admin-reviewed listings and controlled contact access.',
    city: 'Hyderabad'
  },
  {
    name: 'Ashok Reddy',
    role: 'Builder',
    summary: 'The platform keeps property details, owner conversations, and verification in one professional workflow.',
    city: 'Bengaluru'
  },
  {
    name: 'PropHunt Sourcing Desk',
    role: 'Land Seeker',
    summary: 'Structured property summaries make it easier to review development opportunities before serious discussions.',
    city: 'Bengaluru'
  }
];

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(defaultTestimonials);
  const [form, setForm] = useState({ name: '', role: 'Owner', city: '', summary: '' });
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const roleOptions = useMemo(() => ['Builder', 'Owner', 'Mediator', 'Buyer', 'Land Seeker', 'Other'], []);
  const cityOptions = useMemo(() => {
    const cities = testimonials.map((item) => item.city || '').filter(Boolean);
    return Array.from(new Set(cities)).sort();
  }, [testimonials]);

  const filteredTestimonials = testimonials.filter((item) => {
    const cityMatch = selectedCity === 'all' || item.city === selectedCity;
    const roleMatch = selectedRole === 'all' || item.role === selectedRole;
    return cityMatch && roleMatch;
  });

  useEffect(() => {
    let cancelled = false;

    const loadTestimonials = async () => {
      try {
        const response = await fetch(`${API_BASE}/testimonials`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load testimonials');
        if (!cancelled && Array.isArray(data.testimonials) && data.testimonials.length > 0) {
          setTestimonials(data.testimonials);
        }
      } catch (error) {
        console.error('Testimonials load error:', error);
      }
    };

    loadTestimonials();
    return () => {
      cancelled = true;
    };
  }, []);

  const submitTestimonial = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (!form.name.trim() || !form.summary.trim()) {
      setMessage('Please enter your name and testimonial summary.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/testimonials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to submit testimonial');
      setForm({ name: '', role: 'Owner', city: '', summary: '' });
      setMessage('Thank you. Your testimonial has been submitted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to submit testimonial');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=85"
          alt="Real estate discussion"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/40" />
        <div className="ld-container relative py-20">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-300">Testimonials</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
            Trusted voices from the HomeFeet marketplace.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
            City-wise feedback from builders, owners, mediators, buyers, and land seekers.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-20">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-br from-[#E7FAF8] via-[#F8FCFF] to-[#EAF3FF] lg:block" />
        <div className="ld-container relative grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-teal-700">
              <span className="h-px w-9 bg-teal-600" />
              Share Testimonial
            </div>
            <h2 className="mt-6 max-w-xl text-4xl font-black leading-[1.05] tracking-tight text-slate-950 md:text-5xl">
              Share your real marketplace experience.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700">
              Builders, owners, mediators, buyers, and land seekers can submit a short testimonial summary. Testimonials appear city-wise on this page.
            </p>
          </div>

          <form onSubmit={submitTestimonial} className="rounded-lg border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
            <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-teal-700">
              <Send className="h-4 w-4" />
              Share Testimonial
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block text-sm font-bold text-slate-900">
                Name
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  placeholder="Your name"
                  maxLength={80}
                />
              </label>
              <label className="block text-sm font-bold text-slate-900">
                Type
                <select
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-900">
                City
                <input
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  placeholder="Hyderabad"
                  maxLength={80}
                />
              </label>
            </div>
            <label className="mt-4 block text-sm font-bold text-slate-900">
              Testimonial Summary
              <textarea
                value={form.summary}
                onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                className="mt-2 min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                placeholder="Share what you experienced as a builder, owner, mediator, buyer, or land seeker..."
                maxLength={800}
              />
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit Testimonial'}
                <ArrowRight className="h-4 w-4" />
              </button>
              {message && <p className="text-sm font-semibold text-slate-600">{message}</p>}
            </div>
          </form>
        </div>
      </section>

      <section className="py-20">
        <div className="ld-container">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                <span className="h-px w-9 bg-slate-400" />
                City Wise Testimonials
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                Marketplace feedback
              </h2>
            </div>
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-2">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                <Filter className="mr-1 inline h-4 w-4 text-teal-700" />
                City
                <select
                  value={selectedCity}
                  onChange={(event) => setSelectedCity(event.target.value)}
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800"
                >
                  <option value="all">All Cities</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                <Users className="mr-1 inline h-4 w-4 text-teal-700" />
                Type
                <select
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value)}
                  className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800"
                >
                  <option value="all">All Types</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {filteredTestimonials.map((item) => (
              <article key={item._id || `${item.name}-${item.city}-${item.summary}`} className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/70">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <MessageSquareQuote className="h-5 w-5" />
                  </div>
                  <div className="flex gap-1 text-yellow-500">
                    {[0, 1, 2, 3, 4].map((star) => (
                      <Star key={star} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-slate-700">"{item.summary}"</p>
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <p className="font-black text-slate-950">{item.name}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700">
                    <BadgeCheck className="h-4 w-4" />
                    {item.role}
                  </p>
                  {item.city && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <MapPin className="h-4 w-4 text-teal-700" />
                      {item.city}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>

          {filteredTestimonials.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
              <Building2 className="mx-auto h-8 w-8 text-teal-700" />
              <p className="mt-3 font-black text-slate-950">No approved testimonials found for this filter.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
