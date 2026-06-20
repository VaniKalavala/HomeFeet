import React from 'react';
import { Award, BadgeCheck, Building2, Clock, MapPin, Sparkles, Users } from 'lucide-react';

const AboutUs: React.FC = () => {
  const stats = [
    { label: 'Listing quality checks', value: '100%' },
    { label: 'Admin moderation', value: '24/7' },
    { label: 'Builder verification', value: 'Required' },
    { label: 'Owner contact reveal', value: 'Controlled' }
  ];

  return (
    <div className="bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=85"
          alt="Modern real estate development"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/30" />
        <div className="ld-container relative py-24">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-300">About HomeFeet</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
            A sharper way to connect landowners and serious builders.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
            HomeFeet is built for high-trust development opportunities: owners can list with confidence, builders can evaluate richer property data, and admins can keep the marketplace curated.
          </p>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="ld-container grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <p className="text-2xl font-black text-teal-700">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-24">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-br from-[#E7FAF8] via-[#F8FCFF] to-[#EAF3FF] lg:block" />
        <div className="ld-container relative grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-slate-500">
              <span className="h-px w-9 bg-slate-400" />
              About Us
            </div>
            <h2 className="mt-6 max-w-2xl text-4xl font-black leading-[1.05] tracking-tight text-slate-950 md:text-6xl">
              Land development needs a more{' '}
              <span className="bg-gradient-to-r from-[#0AA6A6] to-[#0077CC] bg-clip-text text-transparent">
                transparent
              </span>{' '}
              market.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700">
              Typical listing sites expose contact details too early and miss the data builders actually need. HomeFeet focuses on verified listings, structured land data, and professional follow-through.
            </p>
            <a href="#operating-model" className="mt-6 inline-flex items-center text-base font-semibold text-[#0077CC] hover:text-[#0AA6A6]">
              Read More ↓
            </a>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-7 shadow-xl">
              <p className="text-5xl font-black tracking-tight text-slate-950">100%</p>
              <p className="mt-3 text-base leading-7 text-slate-700">Listings pass quality checks before they become visible.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-7 shadow-xl">
              <p className="text-5xl font-black tracking-tight text-[#0077CC]">24/7</p>
              <p className="mt-3 text-base leading-7 text-slate-700">Admin moderation keeps submitted property data curated.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-7 shadow-xl sm:col-span-2">
              <p className="text-5xl font-black tracking-tight text-[#0AA6A6]">Verified</p>
              <p className="mt-3 text-base leading-7 text-slate-700">Builders, owners, mediators, and contact access are managed through a controlled trust workflow.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="operating-model" className="relative overflow-hidden bg-white py-24">
        <div className="absolute inset-y-0 left-0 hidden w-1/2 bg-gradient-to-br from-[#E7FAF8] via-white to-[#F8FCFF] lg:block" />
        <div className="ld-container relative">
          <div className="mb-10 max-w-3xl">
            <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-teal-700">
              <span className="h-px w-9 bg-teal-600" />
              Operating Model
            </div>
            <h2 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-slate-950 md:text-5xl">
              Built around a professional review flow.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
              Every listing moves through a clear approval path, so owners stay in control and builders receive dependable property information.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-4">
            {[
              { icon: Building2, title: 'Owner submits', text: 'Structured property details, media, map and commercial terms.' },
              { icon: BadgeCheck, title: 'Admin reviews', text: 'Listings are approved or returned with a reason.' },
              { icon: Users, title: 'Builder requests', text: 'Verified builders request owner contact after shortlisting.' },
              { icon: Sparkles, title: 'Mutual interest', text: 'Contact and chat unlock when the owner accepts.' },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/70">
                  <Icon className="mb-5 h-8 w-8 text-teal-700" />
                  <h3 className="font-black text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="ld-container grid gap-6 md:grid-cols-3">
          {[
            { icon: MapPin, title: 'Hyderabad First', text: 'Focused on fast-moving development corridors and local builder demand.' },
            { icon: Clock, title: 'Operationally Ready', text: 'Admin panel, inquiries, listing statuses, and builder verification are part of the platform.' },
            { icon: Award, title: 'Professional Standard', text: 'A curated experience designed to feel credible to owners, builders, and partners.' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-lg bg-slate-950 p-7 text-white shadow-xl">
                <Icon className="mb-5 h-8 w-8 text-amber-300" />
                <h3 className="text-xl font-black">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
