import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Mail, MapPin, Phone, ShieldCheck, Users } from 'lucide-react';
import BrandName from './BrandName';
import { API_BASE } from '../lib/api';

export default function Footer() {
  const [visitorCounts, setVisitorCounts] = useState({ dailyCount: 0, uniqueDailyCount: 0, totalCount: 0 });

  useEffect(() => {
    let cancelled = false;

    const loadVisitorCounts = async () => {
      try {
        const hasTrackedThisSession = sessionStorage.getItem('homefeetVisitorTracked') === 'true';
        const response = await fetch(`${API_BASE}/visitors/${hasTrackedThisSession ? 'stats' : 'track'}`, {
          method: hasTrackedThisSession ? 'GET' : 'POST'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load visitor counts');
        if (!hasTrackedThisSession) sessionStorage.setItem('homefeetVisitorTracked', 'true');
        if (!cancelled) {
          setVisitorCounts({
            dailyCount: Number(data.dailyCount || 0),
            uniqueDailyCount: Number(data.uniqueDailyCount || 0),
            totalCount: Number(data.totalCount || 0)
          });
        }
      } catch (error) {
        console.error('Visitor count error:', error);
      }
    };

    loadVisitorCounts();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatCount = (value: number) => value.toLocaleString('en-IN');

  return (
    <footer className="bg-slate-950 text-white">
      <div className="ld-container py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src="/HomeFeet_logo.png" alt="HomeFeet" className="h-12 w-12 rounded-lg bg-white p-1" />
              <div>
                <p className="text-2xl font-black"><BrandName /></p>
                <p className="text-sm text-teal-200">Verified marketplace for apartments, commercial space & buyers</p>
              </div>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">
              A professional platform for owners, builders, and administrators to manage verified apartment sales and commercial space opportunities with moderated listings, trust signals, private contact reveal, and chat.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-2 text-sm font-semibold text-teal-100">
              <ShieldCheck className="h-4 w-4" />
              Admin-reviewed marketplace
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200">
                <Users className="h-4 w-4 text-teal-300" />
                Daily Visitors: <span className="font-bold text-white">{formatCount(visitorCounts.dailyCount)}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200">
                <Users className="h-4 w-4 text-teal-300" />
                Daily Unique Visitors: <span className="font-bold text-white">{formatCount(visitorCounts.uniqueDailyCount)}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200">
                <Users className="h-4 w-4 text-teal-300" />
                Total Visitors: <span className="font-bold text-white">{formatCount(visitorCounts.totalCount)}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-4 font-bold text-white">Explore</p>
            <div className="space-y-3 text-sm text-slate-300">
              <Link className="block hover:text-white" to="/properties">Properties</Link>
              <Link className="block hover:text-white" to="/post-property-options">Post Property</Link>
              <Link className="block hover:text-white" to="/about">About</Link>
              <Link className="block hover:text-white" to="/subscription-plans">Subscription Plans</Link>
              <Link className="block hover:text-white" to="/compare">Compare Portals</Link>
              <Link className="block hover:text-white" to="/testimonials">Testimonials</Link>
              <Link className="block hover:text-white" to="/contact">Contact</Link>
              <Link className="block hover:text-white" to="/terms-and-conditions">Terms and Conditions</Link>
              <Link className="block hover:text-white" to="/privacy-policy">Privacy Policy</Link>
              <Link className="block hover:text-white" to="/refund-and-cancellation">Refund and Cancellation</Link>
            </div>
          </div>

          <div>
            <p className="mb-4 font-bold text-white">Contact</p>
            <div className="space-y-3 text-sm text-slate-300">
              <p className="flex gap-2"><Phone className="h-4 w-4 text-teal-300" /> +91 90140 11885</p>
              <p className="flex gap-2"><Mail className="h-4 w-4 text-teal-300" /> contact@homefeet.in</p>
              <p className="flex gap-2"><MapPin className="h-4 w-4 text-teal-300" /> 11-13-1181/3 Flat-406, Vaishnovi TNR, Vasavi Colony, RK Puram, Saroon Nagar, Hyderabad-500035</p>
              <p className="flex gap-2"><Building2 className="h-4 w-4 text-teal-300" /> Owner and builder operations</p>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs leading-6 text-slate-400">
          <p>"HomeFeet" trademark is owned by Inventor Heads Animation Studios Pvt. Ltd. and licensed to its affiliates and subsidiaries.</p>
          <p className="mt-1">All rights to this website, including copyright in content represented thereat, vest in Inventor Heads Animation Studios Pvt. Ltd. and/or its respective affiliates and subsidiaries. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
