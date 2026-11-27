import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MessageCircle, X } from 'lucide-react';
import ListingsSidebar from './ListingsSidebar';
import { API_BASE } from '../lib/api';

const InterestedInYourProperties = () => {
  const [records, setRecords] = useState<any[]>([]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API_BASE}/my-interests?as=owner`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) setRecords(data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const respond = async (id: string, status: 'accepted' | 'rejected') => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/interests/${id}/respond`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
    if (res.ok) fetchData();
  };

  return (
    <div className="bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col">
      <ListingsSidebar activePage="interested" />
      <div className="min-w-0 flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Contact Requests</h1>
        <p className="mb-6 text-slate-600">Approve or reject free builder requests. Paid builder members are auto-approved and can open contact/chat directly.</p>

        {records.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-600">
            No contact requests yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {records.map((r) => (
              <div key={r._id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Property</p>
                    <p className="font-semibold text-slate-900">{r.propertyId?.societyName || r.propertyId?.locality || 'Property'}</p>
                    <p className="text-sm text-slate-600">{r.propertyId?.locality}, {r.propertyId?.city}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase text-amber-800">{r.status}</span>
                </div>
                {r.message && <p className="mb-4 rounded bg-slate-50 p-3 text-sm text-slate-700">{r.message}</p>}
                {r.unlockedVia === 'subscription' && (
                  <p className="mb-4 rounded bg-teal-50 p-3 text-sm font-semibold text-teal-800">
                    Paid membership: owner approval was not required for this builder.
                  </p>
                )}
                <p className="mb-4 text-sm text-slate-500">Requested on {new Date(r.timestamp).toLocaleString()}</p>
                {r.status === 'requested' ? (
                  <div className="flex gap-2">
                    <button onClick={() => respond(r._id, 'accepted')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700">
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button onClick={() => respond(r._id, 'rejected')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700">
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </div>
                ) : r.status === 'accepted' ? (
                  <Link to={`/chat/${r._id}`} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800">
                    <MessageCircle className="h-4 w-4" /> Open Chat
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default InterestedInYourProperties;
