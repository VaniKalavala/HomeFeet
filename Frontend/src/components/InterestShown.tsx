import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import ListingsSidebar from './ListingsSidebar';
import { API_BASE } from '../lib/api';

const InterestShown: React.FC = () => {
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    const fetchInterestShown = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/my-interests?as=buyer`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setRecords(data);
      } catch (err) {
        console.error('Failed to load contact requests:', err);
      }
    };

    fetchInterestShown();
  }, []);

  return (
    <div className="bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col">
      <ListingsSidebar activePage="shown" />
      <div className="min-w-0 flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-2 text-slate-900">Owners You Contacted</h1>
        <p className="mb-6 text-slate-600">Track owner approvals, paid-member direct unlocks, contact details, and chat history.</p>

        {records.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-600">
            You have not requested owner contact yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {records.map((record: any) => {
              const property = record.propertyId || {};
              return (
                <div key={record._id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{property.societyName || property.locality || 'Property'}</p>
                      <p className="text-sm text-slate-600">{property.locality}, {property.city}</p>
                    </div>
                    <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold uppercase text-teal-800">{record.status}</span>
                  </div>
                  <p className="mb-4 text-sm text-slate-500">Requested on {new Date(record.timestamp).toLocaleString()}</p>
                  {record.unlockedVia === 'subscription' && (
                    <p className="mb-4 rounded bg-teal-50 p-3 text-sm font-semibold text-teal-800">
                      Paid membership: contact unlocked without owner approval.
                    </p>
                  )}
                  {record.contact && (
                    <div className="mb-4 rounded bg-slate-50 p-3 text-sm text-slate-700">
                      <p><span className="font-semibold">Owner Phone:</span> {record.contact.phone || 'Not available'}</p>
                      {record.contact.email && <p><span className="font-semibold">Owner Email:</span> {record.contact.email}</p>}
                    </div>
                  )}
                  {record.status === 'accepted' && (
                    <Link to={`/chat/${record._id}`} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800">
                      <MessageCircle className="h-4 w-4" /> Open Chat
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default InterestShown;
