import React, { useMemo, useState } from 'react';
import { BellRing, CalendarDays, Mail, MessageSquareText, Phone, RefreshCw, Search, StickyNote } from 'lucide-react';
import { API_BASE } from '../lib/api';

// Same pipeline stages as the builder "My Leads" CRM.
const CRM_STAGES: { value: string; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' }
];

const CRM_STAGE_STYLES: Record<string, string> = {
  new: 'border-slate-300 bg-slate-100 text-slate-700',
  contacted: 'border-sky-300 bg-sky-100 text-sky-700',
  site_visit: 'border-amber-300 bg-amber-100 text-amber-700',
  negotiation: 'border-purple-300 bg-purple-100 text-purple-700',
  won: 'border-green-300 bg-green-100 text-green-700',
  lost: 'border-red-300 bg-red-100 text-red-700'
};

const isFollowUpDue = (lead: MarketingLead) =>
  Boolean(lead.nextFollowUpAt) && new Date(lead.nextFollowUpAt!) <= new Date();

// <input type="date"> value (YYYY-MM-DD, IST) for a stored follow-up.
const toDateInput = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

export interface MarketingProject {
  propertyId: string;
  projectName: string;
  locality?: string;
  city?: string;
  sheetUrl?: string;
  syncedAt?: string | null;
  leadCount?: number;
  error?: string;
  tabs?: { gid: string; name: string; leadCount: number; skipped?: string }[];
}

// Paste a Google Sheet link for one of your projects; every tab is imported.
const SheetConnectForm: React.FC<{
  ownedProjects: { _id: string; projectName: string }[];
  defaultProjectId?: string;
  defaultUrl?: string;
  onDone: () => void;
  onCancel?: () => void;
}> = ({ ownedProjects, defaultProjectId, defaultUrl, onDone, onCancel }) => {
  const [projectId, setProjectId] = useState(defaultProjectId || ownedProjects[0]?._id || '');
  const [url, setUrl] = useState(defaultUrl || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!projectId || !url.trim()) return;
    setBusy(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/my-marketing-leads/${projectId}/sheet`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: url.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error ||
          (res.status === 404
            ? 'The server does not have the Marketing Leads feature yet (HTTP 404). Deploy the latest backend and try again.'
            : `Could not import the sheet (HTTP ${res.status}).`)
        );
      }
      onDone();
    } catch (err: any) {
      setError(err.message || 'Could not import the sheet');
    } finally {
      setBusy(false);
    }
  };

  if (!ownedProjects.length) {
    return <p className="text-sm text-slate-500">Post a project first, then connect its marketing leads sheet here.</p>;
  }

  return (
    <div className="space-y-3 text-left">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Project
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800"
          >
            {ownedProjects.map((p) => <option key={p._id} value={p._id}>{p.projectName || 'Untitled Project'}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Google Sheet link
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm normal-case tracking-normal text-slate-800"
          />
        </label>
      </div>
      <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-500">
        <li>In Google Sheets: Share → General access → <b>Anyone with the link · Viewer</b>, then Copy link.</li>
        <li>Every tab is imported (e.g. one tab per campaign). Each tab needs a date column and a name or phone column.</li>
        <li>Same name + phone in any tab is shown once and marked <b className="text-red-600">Repeated lead</b>.</li>
      </ul>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !url.trim() || !projectId}
          className="flex items-center gap-2 rounded-lg bg-[#0AA6A6] px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {busy && <RefreshCw className="h-4 w-4 animate-spin" />}
          {busy ? 'Importing all tabs...' : 'Connect & Import Leads'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export interface MarketingLead {
  _id: string;
  propertyId: string;
  leadAt?: string | null;
  name?: string;
  phone?: string;
  email?: string;
  feedback?: string;
  answers?: { label: string; value: string }[];
  isRepeated?: boolean;
  repeatCount?: number;
  enquiryDates?: string[];
  campaigns?: string[];
  crmStage?: string;
  nextFollowUpAt?: string | null;
  notes?: { _id?: string; text: string; createdAt: string; createdBy?: string }[];
}

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });

interface Props {
  projects: MarketingProject[];
  leads: MarketingLead[];
  loading: boolean;
  projectFilter: string;
  onProjectFilterChange: (propertyId: string) => void;
  onRefresh: (propertyId: string) => void;
  syncingId: string;
  onLeadUpdated: (lead: MarketingLead) => void;
  ownedProjects: { _id: string; projectName: string }[];
  onSheetChanged: () => void;
}

const IST = 'Asia/Kolkata';

// YYYY-MM-DD in IST, so a lead at 00:30 IST lands on the right day.
const dayKey = (value?: string | null) => {
  if (!value) return 'undated';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'undated';
  return d.toLocaleDateString('en-CA', { timeZone: IST });
};

const dayLabel = (key: string) => {
  if (key === 'undated') return 'No date';
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86400000).toISOString());
  const pretty = new Date(`${key}T12:00:00+05:30`).toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: IST
  });
  if (key === today) return `Today · ${pretty}`;
  if (key === yesterday) return `Yesterday · ${pretty}`;
  return pretty;
};

const timeLabel = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: IST });
};

const syncedLabel = (value?: string | null) => {
  if (!value) return 'Not synced yet';
  return `Synced ${new Date(value).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: IST
  })}`;
};

const MarketingLeadsPanel: React.FC<Props> = ({
  projects, leads, loading, projectFilter, onProjectFilterChange, onRefresh, syncingId, onLeadUpdated,
  ownedProjects, onSheetChanged
}) => {
  const [campaignFilter, setCampaignFilter] = useState('all');
  // '' = closed, 'new' = connect another project, or a propertyId being re-linked.
  const [sheetFormFor, setSheetFormFor] = useState('');

  const unlinkSheet = async (propertyId: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/my-marketing-leads/${propertyId}/sheet`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url: '' })
    });
    if (!res.ok) alert('Could not unlink the sheet.');
    onSheetChanged();
  };

  const campaignOptions = useMemo(
    () => Array.from(new Set(leads.flatMap((l) => l.campaigns || []))).sort(),
    [leads]
  );
  const [stageFilter, setStageFilter] = useState('all');
  const [dueOnly, setDueOnly] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [openNotesId, setOpenNotesId] = useState('');
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const saveLead = async (id: string, path: 'crm' | 'notes', body: object) => {
    setSavingId(id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/my-marketing-leads/lead/${id}/${path}`, {
        method: path === 'crm' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update lead');
      onLeadUpdated(data.lead);
      return true;
    } catch (err: any) {
      alert(err.message || 'Failed to update lead');
      return false;
    } finally {
      setSavingId('');
    }
  };

  const addNote = async (id: string) => {
    const text = (noteDraft[id] || '').trim();
    if (!text) return;
    if (await saveLead(id, 'notes', { text })) setNoteDraft((prev) => ({ ...prev, [id]: '' }));
  };

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [repeatedOnly, setRepeatedOnly] = useState(false);

  const projectName = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.propertyId, p.projectName])),
    [projects]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (projectFilter !== 'all' && lead.propertyId !== projectFilter) return false;
      if (repeatedOnly && !lead.isRepeated) return false;
      if (stageFilter !== 'all' && (lead.crmStage || 'new') !== stageFilter) return false;
      if (dueOnly && !isFollowUpDue(lead)) return false;
      if (campaignFilter !== 'all' && !(lead.campaigns || []).includes(campaignFilter)) return false;
      const key = dayKey(lead.leadAt);
      if (fromDate && (key === 'undated' || key < fromDate)) return false;
      if (toDate && (key === 'undated' || key > toDate)) return false;
      if (!q) return true;
      return [lead.name, lead.phone, lead.email, lead.feedback, ...(lead.answers || []).map((a) => a.value)]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [leads, projectFilter, search, fromDate, toDate, repeatedOnly, stageFilter, dueOnly, campaignFilter]);

  // Leads arrive newest-first from the API; keep that order inside each day.
  const groups = useMemo(() => {
    const map = new Map<string, MarketingLead[]>();
    filtered.forEach((lead) => {
      const key = dayKey(lead.leadAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(lead);
    });
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'undated') return 1;
      if (b === 'undated') return -1;
      return a < b ? 1 : -1;
    });
  }, [filtered]);

  const stats = useMemo(() => {
    const scoped = leads.filter((l) => projectFilter === 'all' || l.propertyId === projectFilter);
    const today = dayKey(new Date().toISOString());
    const weekAgo = dayKey(new Date(Date.now() - 6 * 86400000).toISOString());
    return {
      total: scoped.length,
      today: scoped.filter((l) => dayKey(l.leadAt) === today).length,
      week: scoped.filter((l) => {
        const k = dayKey(l.leadAt);
        return k !== 'undated' && k >= weekAgo;
      }).length,
      repeated: scoped.filter((l) => l.isRepeated).length,
      due: scoped.filter(isFollowUpDue).length,
      won: scoped.filter((l) => l.crmStage === 'won').length
    };
  }, [leads, projectFilter]);

  const visibleProjects = projectFilter === 'all' ? projects : projects.filter((p) => p.propertyId === projectFilter);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-teal-600" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
        <p className="text-lg font-black text-slate-900">Connect your marketing leads sheet</p>
        <p className="mt-1 mb-5 text-sm text-slate-500">
          Paste the Google Sheet where your Meta / Google ad leads land. Leads show up here day by day,
          with a CRM to track calls, follow-ups and site visits.
        </p>
        <SheetConnectForm ownedProjects={ownedProjects} onDone={onSheetChanged} />
      </div>
    );
  }

  const unlinkedProjects = ownedProjects.filter((p) => !projects.some((lp) => lp.propertyId === p._id));

  return (
    <div>
      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={projectFilter}
            onChange={(e) => onProjectFilterChange(e.target.value)}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.propertyId} value={p.propertyId}>{p.projectName}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            From
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700" />
          </label>
          <label className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            To
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700" />
          </label>
          <div className="relative min-w-[10rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, feedback"
              className="w-full rounded-full border border-slate-200 py-1.5 pl-9 pr-3 text-sm"
            />
          </div>
          {campaignOptions.length > 1 && (
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
            >
              <option value="all">All Campaigns</option>
              {campaignOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700"
          >
            <option value="all">All Stages</option>
            {CRM_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
            <input type="checkbox" checked={dueOnly} onChange={(e) => setDueOnly(e.target.checked)} className="accent-amber-600" />
            Follow-up due
          </label>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
            <input type="checkbox" checked={repeatedOnly} onChange={(e) => setRepeatedOnly(e.target.checked)} className="accent-red-600" />
            Repeated only
          </label>
          {(search || fromDate || toDate || repeatedOnly || dueOnly || stageFilter !== 'all' || campaignFilter !== 'all') && (
            <button type="button" onClick={() => {
              setSearch(''); setFromDate(''); setToDate(''); setRepeatedOnly(false); setDueOnly(false);
              setStageFilter('all'); setCampaignFilter('all');
            }}
              className="text-sm font-semibold text-teal-700 hover:underline">
              Reset
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
          {[
            ['Total', stats.total], ['Today', stats.today], ['Last 7 days', stats.week],
            ['Repeated', stats.repeated], ['Follow-ups due', stats.due], ['Won', stats.won]
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-slate-50 px-2 py-2">
              <p className="text-xl font-black text-slate-900">{value}</p>
              <p className="text-xs font-semibold text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {visibleProjects.map((p) => (
            <div key={p.propertyId} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-bold text-slate-700">{p.projectName}</span>
                <span>{syncedLabel(p.syncedAt)}</span>
                {p.sheetUrl && (
                  <a href={p.sheetUrl} target="_blank" rel="noreferrer" className="font-semibold text-slate-600 hover:underline">
                    Open sheet ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onRefresh(p.propertyId)}
                  disabled={syncingId === p.propertyId}
                  className="flex items-center gap-1 font-semibold text-teal-700 hover:underline disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncingId === p.propertyId ? 'animate-spin' : ''}`} />
                  {syncingId === p.propertyId ? 'Refreshing...' : 'Refresh from sheet'}
                </button>
                <button type="button" onClick={() => setSheetFormFor(p.propertyId)} className="font-semibold text-slate-600 hover:underline">
                  Change link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Unlink the sheet from ${p.projectName}? Its imported leads, stages and notes will be removed.`)) {
                      unlinkSheet(p.propertyId);
                    }
                  }}
                  className="font-semibold text-red-600 hover:underline"
                >
                  Unlink
                </button>
              </div>
              {(p.tabs || []).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(p.tabs || []).map((t) => (
                    <span key={t.gid} className={`rounded-full px-2 py-0.5 ${t.skipped ? 'bg-slate-200 text-slate-500' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>
                      {t.name || 'Sheet'}: {t.skipped ? `skipped (${t.skipped})` : `${t.leadCount} rows`}
                    </span>
                  ))}
                </div>
              )}
              {p.error && <p className="mt-1 font-semibold text-red-600">Last sync failed: {p.error}</p>}
              {sheetFormFor === p.propertyId && (
                <div className="mt-3 rounded-md bg-white p-3">
                  <SheetConnectForm
                    ownedProjects={ownedProjects.filter((o) => o._id === p.propertyId)}
                    defaultProjectId={p.propertyId}
                    defaultUrl={p.sheetUrl}
                    onDone={() => { setSheetFormFor(''); onSheetChanged(); }}
                    onCancel={() => setSheetFormFor('')}
                  />
                </div>
              )}
            </div>
          ))}
          {unlinkedProjects.length > 0 && (
            sheetFormFor === 'new' ? (
              <div className="rounded-md border border-dashed border-slate-300 p-3">
                <SheetConnectForm
                  ownedProjects={unlinkedProjects}
                  onDone={() => { setSheetFormFor(''); onSheetChanged(); }}
                  onCancel={() => setSheetFormFor('')}
                />
              </div>
            ) : (
              <button type="button" onClick={() => setSheetFormFor('new')} className="text-xs font-bold text-teal-700 hover:underline">
                + Connect a leads sheet for another project
              </button>
            )
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
          No leads match these filters.
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([key, dayLeads]) => (
            <section key={key}>
              <div className="mb-2 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-teal-700" />
                <h3 className="text-sm font-black text-slate-900">{dayLabel(key)}</h3>
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-bold text-[#0AA6A6]">
                  {dayLeads.length} lead{dayLeads.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {dayLeads.map((lead) => (
                  <div
                    key={lead._id}
                    className={`rounded-lg border bg-white p-3 shadow-sm ${lead.isRepeated ? 'border-red-300 border-l-4 border-l-red-500' : 'border-slate-200'}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-bold text-slate-950">{lead.name || 'Unnamed lead'}</p>
                          {lead.isRepeated && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                              Repeated lead{(lead.repeatCount || 1) > 1 ? ` ×${lead.repeatCount}` : ''}
                            </span>
                          )}
                        </div>
                        {(lead.enquiryDates?.length || 0) > 1 && (
                          <p className="text-xs text-red-700">
                            Enquired on {lead.enquiryDates!.map(shortDate).join(', ')}
                          </p>
                        )}
                        {projectFilter === 'all' && projects.length > 1 && (
                          <p className="text-xs font-semibold text-slate-400">{projectName[lead.propertyId]}</p>
                        )}
                        {(lead.campaigns || []).length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {(lead.campaigns || []).map((c) => (
                              <span key={c} className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700">{c}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-slate-500">{timeLabel(lead.leadAt)}</span>
                    </div>

                    {(lead.phone || lead.email) && (
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-1 font-semibold text-teal-700 hover:underline">
                            <Phone className="h-3.5 w-3.5" /> {lead.phone}
                          </a>
                        )}
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-slate-600 hover:underline">
                            <Mail className="h-3.5 w-3.5" /> {lead.email}
                          </a>
                        )}
                      </div>
                    )}

                    {lead.answers && lead.answers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {lead.answers.map((a) => (
                          <span key={a.label} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                            <span className="font-semibold text-slate-500">{a.label}:</span> {a.value}
                          </span>
                        ))}
                      </div>
                    )}

                    {lead.feedback && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-sm text-amber-900">
                        <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0" />
                        <p><span className="font-semibold">Sheet feedback:</span> {lead.feedback}</p>
                      </div>
                    )}

                    {/* CRM */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 text-sm">
                      <select
                        value={lead.crmStage || 'new'}
                        disabled={savingId === lead._id}
                        onChange={(e) => saveLead(lead._id, 'crm', { crmStage: e.target.value })}
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold ${CRM_STAGE_STYLES[lead.crmStage || 'new']}`}
                      >
                        {CRM_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <label className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                        <BellRing className="h-3.5 w-3.5" /> Follow-up
                        <input
                          type="date"
                          value={toDateInput(lead.nextFollowUpAt)}
                          disabled={savingId === lead._id}
                          onChange={(e) => saveLead(lead._id, 'crm', {
                            nextFollowUpAt: e.target.value ? `${e.target.value}T10:00:00+05:30` : null
                          })}
                          className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-700"
                        />
                      </label>
                      {isFollowUpDue(lead) && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Follow-up due</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setOpenNotesId(openNotesId === lead._id ? '' : lead._id)}
                        className="ml-auto flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
                      >
                        <StickyNote className="h-3.5 w-3.5" /> Notes ({lead.notes?.length || 0})
                      </button>
                    </div>

                    {openNotesId === lead._id && (
                      <div className="mt-2 space-y-2 rounded-md bg-slate-50 p-2">
                        {(lead.notes || []).length === 0 ? (
                          <p className="text-xs text-slate-500">No notes yet. Log each call or visit here.</p>
                        ) : (
                          [...(lead.notes || [])].reverse().map((note, i) => (
                            <div key={note._id || i} className="text-sm">
                              <p className="text-slate-800">{note.text}</p>
                              <p className="text-xs text-slate-400">
                                {note.createdBy || 'You'} · {new Date(note.createdAt).toLocaleString('en-IN', {
                                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: IST
                                })}
                              </p>
                            </div>
                          ))
                        )}
                        <div className="flex gap-2">
                          <input
                            value={noteDraft[lead._id] || ''}
                            onChange={(e) => setNoteDraft((prev) => ({ ...prev, [lead._id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') addNote(lead._id); }}
                            placeholder="e.g. Called, will visit Sunday"
                            className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-sm"
                          />
                          <button
                            type="button"
                            disabled={savingId === lead._id || !(noteDraft[lead._id] || '').trim()}
                            onClick={() => addNote(lead._id)}
                            className="rounded bg-teal-600 px-3 py-1 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketingLeadsPanel;
