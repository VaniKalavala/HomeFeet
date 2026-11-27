import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, User } from 'lucide-react';

// Account Desk bar shown just below the site header on account pages
// (formerly a left sidebar). `flush` drops the outer padding for pages whose
// container already pads its content (Dashboard).
const ListingsSidebar: React.FC<{ activePage: string; flush?: boolean }> = ({ activePage, flush = false }) => {
  const links = [
    { page: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { page: 'profile', to: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className={flush ? 'w-full' : 'w-full px-4 pt-6 sm:px-6 lg:px-8'}>
      <div className="flex flex-col gap-4 rounded-lg border border-teal-100 bg-teal-50 px-5 py-4 text-slate-950 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-7 w-7 shrink-0 text-teal-700" />
          <div>
            <h2 className="text-lg font-black leading-tight">Account Desk</h2>
            <p className="text-sm text-slate-600">Manage listings, requests, and conversations.</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-2">
          {links.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.page;
            return (
              <Link
                key={item.page}
                to={item.to}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
                  active ? 'bg-[#0AA6A6] text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-teal-100 hover:text-teal-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default ListingsSidebar;
