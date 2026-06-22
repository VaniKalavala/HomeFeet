import React, { FormEvent, useEffect, useState } from 'react';
import { Building2, Mail, MapPin, Phone, Send, ShieldCheck } from 'lucide-react';
import { API_BASE } from '../lib/api';

const ContactPage: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', companyName: '', website: '', subject: '', message: '' });
  const [status, setStatus] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const res = await fetch(`${API_BASE}/contact-inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setStatus('Inquiry submitted. Our team will get back to you shortly.');
      setForm({ name: '', email: '', phone: '', companyName: '', website: '', subject: '', message: '' });
    } else {
      setStatus('Unable to submit inquiry. Please try again.');
    }
  };

  return (
    <div className="bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <img
          src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1800&q=85"
          alt="Professional real estate office"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/20" />
        <div className="ld-container relative py-20">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-300">Contact HomeFeet</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
            Talk to the operations team.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
            Listing review, builder verification, partnership, support, or platform inquiries. Send the details and we will route it to the right desk.
          </p>
        </div>
      </section>

      <div className="ld-container grid gap-8 py-14 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-4">
          {[
            { icon: Phone, label: 'Phone', value: '+91 80190 08351' },
            { icon: Mail, label: 'Email', value: 'contact@homefeet.in' },
            { icon: MapPin, label: 'Market', value: 'Hyderabad apartment & commercial space opportunities' },
            { icon: Building2, label: 'For', value: 'Owners, builders, buyers, partners, admins' }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <Icon className="mb-3 h-6 w-6 text-teal-700" />
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="font-bold text-slate-900">{item.value}</p>
              </div>
            );
          })}
          <div className="rounded-lg bg-slate-950 p-6 text-white">
            <ShieldCheck className="mb-4 h-8 w-8 text-amber-300" />
            <h2 className="text-xl font-black">Marketplace Quality Desk</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Use this form for moderation questions, builder verification support, rejected listing clarification, or collaboration requests.</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-6">
            <p className="ld-eyebrow">Inquiry Form</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Send us the details</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="ld-input" />
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="ld-input" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="ld-input" />
            <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Company Name" className="ld-input" />
            <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website" className="ld-input" />
            <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className="ld-input" />
          </div>
          <textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How can we help?" className="ld-input mt-4 h-40" />
          {status && <p className="mt-4 rounded-lg bg-teal-50 p-3 text-sm font-semibold text-teal-800">{status}</p>}
          <button className="ld-btn-primary mt-5">
            <Send className="h-4 w-4" /> Submit Inquiry
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContactPage;
