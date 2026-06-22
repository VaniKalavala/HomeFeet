import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Check, Lock, ShieldCheck, X } from 'lucide-react';

const COMPETITORS = ['Housing.com', '99acres', 'MagicBricks', 'CommonFloor', 'NoBroker', 'Square Yards'];

const COMPARISON_ROWS = [
  { label: 'Listings reviewed before going live', homefeet: true, others: false },
  { label: 'Owner contact stays private until mutual interest', homefeet: true, others: false },
  { label: 'Builder access requires verification', homefeet: true, others: false },
  { label: 'Free property posting for owners', homefeet: true, others: 'Varies' },
  { label: 'Built for apartments & commercial space specifically', homefeet: true, others: 'Mixed inventory' },
  { label: 'Buyer requirements shared directly with owners/mediators', homefeet: true, others: false },
];

export default function ComparisonPage() {
  return (
    <div className="bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/40" />
        <div className="ld-container relative py-20">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-300">Compare Real Estate Portals</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
            HomeFeet vs Housing.com, 99acres, MagicBricks, CommonFloor, NoBroker & Square Yards
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
            Looking for an alternative to the big property portals? Here's how HomeFeet's admin-reviewed, contact-controlled marketplace for apartments and commercial space compares.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="ld-container">
          <div className="mb-8 flex items-center gap-3 text-sm font-black uppercase tracking-[0.18em] text-slate-500">
            <span className="h-px w-9 bg-slate-400" />
            Side-by-side comparison
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-4 font-bold text-slate-950">What matters</th>
                  <th className="px-5 py-4 font-bold text-teal-700">HomeFeet</th>
                  <th className="px-5 py-4 font-bold text-slate-500">Typical Portals</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-4 font-semibold text-slate-800">{row.label}</td>
                    <td className="px-5 py-4">
                      {row.homefeet === true ? (
                        <Check className="h-5 w-5 text-teal-600" />
                      ) : (
                        <span className="font-semibold text-slate-700">{row.homefeet}</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {row.others === false ? (
                        <X className="h-5 w-5 text-slate-300" />
                      ) : (
                        <span className="font-semibold text-slate-500">{row.others}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            "Typical Portals" reflects common patterns seen across large listing marketplaces such as {COMPETITORS.join(', ')}. Individual platforms vary; this is a general comparison, not a claim about any single competitor.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <ShieldCheck className="mb-4 h-8 w-8 text-teal-700" />
              <h3 className="text-lg font-bold text-slate-950">Why people switch from the big portals</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Big inventory often means unverified listings and constant cold calls. HomeFeet reviews every listing before it's published.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <Lock className="mb-4 h-8 w-8 text-teal-700" />
              <h3 className="text-lg font-bold text-slate-950">Contact details stay private</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Owner phone numbers unlock only after mutual interest or membership, instead of being broadcast to every visitor.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <BadgeCheck className="mb-4 h-8 w-8 text-teal-700" />
              <h3 className="text-lg font-bold text-slate-950">Built for apartments & commercial space</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                A focused marketplace instead of a generic listings dump — builders, owners, mediators, and buyers in one verified workflow.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link to="/properties" className="ld-btn-primary inline-flex">
              Explore HomeFeet Listings <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
