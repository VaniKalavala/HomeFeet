import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Check, Lock, ShieldCheck, X } from 'lucide-react';

const COMPETITORS = [
  {
    name: 'Square Yards',
    text: 'Square Yards covers a very large catalog of new launches and resale listings across India. HomeFeet trades that scale for admin-reviewed listings and contact details that stay private until there is mutual interest, focused specifically on apartments and commercial space.'
  },
  {
    name: 'MagicBricks',
    text: 'MagicBricks is one of the largest classifieds-style listing portals in India. HomeFeet takes a smaller, curated approach: every listing is reviewed by an admin before it goes live, and builder access requires verification.'
  },
  {
    name: 'Housing.com',
    text: 'Housing.com offers broad coverage across cities and property types. HomeFeet is built specifically around apartment sales, commercial space, and buyer requirements, with a controlled contact-reveal workflow between owners, mediators, and builders.'
  },
  {
    name: '99acres',
    text: '99acres is a long-established classifieds marketplace with high listing volume. HomeFeet instead keeps the marketplace smaller and moderated, so every listing has been reviewed and every builder has been verified before they can request owner contact.'
  },
  {
    name: 'CommonFloor',
    text: 'CommonFloor focuses on community and society-level listings. HomeFeet covers apartments and commercial space with admin-reviewed listings and a buyer-requirement flow that reaches owners and mediators directly.'
  },
  {
    name: 'NoBroker',
    text: "NoBroker's model is built around removing broker commissions on rentals and resales. HomeFeet's focus is verified apartment and commercial space sales, with free posting for owners and controlled, mutual-interest-based contact access."
  },
];

const COMPARISON_ROWS = [
  { label: 'Listings reviewed before going live', homefeet: true, others: false },
  { label: 'Owner contact stays private until mutual interest', homefeet: true, others: false },
  { label: 'Builder access requires verification', homefeet: true, others: false },
  { label: 'Free property posting for owners', homefeet: true, others: 'Varies' },
  { label: 'Built for apartments & commercial space specifically', homefeet: true, others: 'Mixed inventory' },
  { label: 'Buyer requirements shared directly with owners/mediators', homefeet: true, others: false },
];

const FAQS = [
  {
    question: 'What is a good alternative to 99acres for verified apartment listings?',
    answer: 'HomeFeet is a focused alternative to 99acres for apartment sales and commercial space, with every listing reviewed by an admin before it goes live and owner contact details kept private until there is mutual interest.'
  },
  {
    question: 'Is there a alternative to MagicBricks with admin-reviewed listings?',
    answer: 'Yes. HomeFeet reviews every property listing before publishing and requires builder verification before contact access opens, unlike open classifieds-style portals like MagicBricks.'
  },
  {
    question: 'What is similar to Housing.com but smaller and verified?',
    answer: 'HomeFeet is a smaller, verified marketplace similar to Housing.com but focused specifically on apartments, commercial space, and buyer requirements with controlled contact access.'
  },
  {
    question: 'Is there a free alternative to Square Yards for posting property?',
    answer: 'HomeFeet lets owners post apartment and commercial space listings for free, with admin review before the listing goes live, as a focused alternative to large portals like Square Yards.'
  },
  {
    question: 'What is a NoBroker alternative for apartment sales?',
    answer: 'HomeFeet focuses on verified apartment and commercial space sales with free owner posting and contact access that opens only after mutual interest, as an alternative to NoBroker.'
  },
  {
    question: 'Is there a CommonFloor alternative with verified builders?',
    answer: 'HomeFeet requires builder verification before contact access opens and reviews every listing before publishing, as an alternative to CommonFloor.'
  },
];

export default function ComparisonPage() {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'comparison-faq-jsonld';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer }
      }))
    });
    document.head.appendChild(script);
    return () => { document.getElementById('comparison-faq-jsonld')?.remove(); };
  }, []);

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
            "Typical Portals" reflects common patterns seen across large listing marketplaces such as {COMPETITORS.map((c) => c.name).join(', ')}. Individual platforms vary; this is a general comparison, not a claim about any single competitor.
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

          <div className="mt-16">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">HomeFeet compared to each portal</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {COMPETITORS.map((competitor) => (
                <div key={competitor.name} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-950">HomeFeet vs {competitor.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{competitor.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Frequently asked questions</h2>
            <div className="mt-6 space-y-4">
              {FAQS.map((faq) => (
                <div key={faq.question} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-bold text-slate-950">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
                </div>
              ))}
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
