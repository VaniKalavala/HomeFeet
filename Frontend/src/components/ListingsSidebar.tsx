import React from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Home, LayoutDashboard, MessageSquare, User } from 'lucide-react';

const ListingsSidebar: React.FC<{ activePage: string }> = ({ activePage }) => {
  const links = [
    { page: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { page: 'profile', to: '/profile', label: 'Profile', icon: User },
    { page: 'posted', to: '/user-posted-properties', label: 'Posted Properties', icon: Home },
    { page: 'shown', to: '/interest-shown', label: 'Owners Contacted', icon: MessageSquare },
    { page: 'interested', to: '/interested-in-your-properties', label: 'Contact Requests', icon: HeartHandshake },
  ];

  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white/95 p-4 backdrop-blur lg:block">
      <div className="sticky top-24">
      <div className="mb-5 rounded-lg border border-teal-100 bg-teal-50 p-5 text-slate-950">
        <LayoutDashboard className="mb-3 h-7 w-7 text-teal-700" />
        <h2 className="text-lg font-black">Account Desk</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">Manage listings, requests, and conversations.</p>
      </div>
      <nav className="space-y-2">
        {links.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.page;
          return (
            <Link
              key={item.page}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition ${
                active ? 'bg-[#0AA6A6] text-white shadow-sm' : 'text-slate-700 hover:bg-teal-50 hover:text-teal-800'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      </div>
    </aside>
  );
};

export default ListingsSidebar;
