import React from 'react';
import { ArrowRight, ClipboardList, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PostPropertyChoice = () => {
  const navigate = useNavigate();

  const options = [
    {
      title: 'Property Details',
      badge: 'Easy Way to Share',
      text: 'Share a quick summary, map link, and dimension image to pre-fill the property form faster.',
      icon: FileText,
      action: () => navigate('/post-property-summary')
    },
    {
      title: 'Property Form',
      text: 'Open the complete property form and enter every field manually.',
      icon: ClipboardList,
      action: () => navigate('/post-property')
    }
  ];

  return (
    <main className="bg-white px-3 py-6 sm:px-4 sm:py-10 lg:py-14">
      <section className="mx-auto grid w-full max-w-[78rem] gap-8 bg-cyan-50/70 px-4 py-8 sm:px-8 sm:py-10 lg:grid-cols-[0.85fr_1.25fr] lg:items-center lg:px-12 lg:py-12">
        <div>
          <p className="inline-flex items-center gap-3 text-sm font-black uppercase tracking-wide text-[#0AA6A6] before:h-px before:w-9 before:bg-slate-400 before:content-['']">
            Owner Listing Desk
          </p>
          <h1 className="mt-6 max-w-xl text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            Choose how you want to <span className="text-[#0AA6A6]">post</span>.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-700 sm:text-base">
            Use the full form when every detail is ready, or start with a quick summary and let HomeFeet prepare the property form for review.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:gap-5">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.title}
                type="button"
                onClick={option.action}
                className="flex min-h-[198px] flex-col rounded-lg border border-slate-200 bg-white p-4 text-left shadow-lg shadow-slate-200/70 transition hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-xl sm:min-h-[240px] sm:p-6"
              >
                <Icon className="h-7 w-7 text-[#0AA6A6] sm:h-8 sm:w-8" />
                <h2 className="mt-4 text-lg font-black text-slate-950 sm:mt-5 sm:text-2xl">{option.title}</h2>
                {'badge' in option && option.badge && (
                  <span className="mt-1 text-xs font-black text-red-600 ld-blink-text sm:text-sm">
                    {option.badge}
                  </span>
                )}
                <p className="mt-2.5 text-[13px] leading-5 text-slate-600 sm:mt-3 sm:text-sm sm:leading-6">{option.text}</p>
                <span className="mt-auto inline-flex w-fit items-center gap-2 rounded-lg bg-[#0AA6A6] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#087f7f] sm:px-5 sm:py-3 sm:text-sm">
                  Continue <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
};

export default PostPropertyChoice;
