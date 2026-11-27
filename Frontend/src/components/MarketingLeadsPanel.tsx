import React, { useMemo, useState } from 'react';
import { BellRing, CalendarDays, Mail, MessageSquareText, Pencil, Phone, Search, StickyNote, Trash2 } from 'lucide-react';
import { API_BASE } from '../lib/api';

// Same pipeline stages as the builder "Direct Leads" CRM.
const CRM_STAGES: { value: string; label: string }[] = [
  { value: 'new', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Deal Closed' },
  { value: 'lost', label: 'Not Interested' }
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
  autoWhatsApp?: boolean;
  autoWhatsAppSince?: string | null;
  autoWhatsAppLastRunAt?: string | null;
  autoWhatsAppLastResult?: string;
}

const WHATSAPP_STATUS: Record<string, { label: string; cls: string }> = {
  sent: { label: 'WhatsApp sent', cls: 'bg-green-100 text-green-800' },
  sending: { label: 'WhatsApp sending', cls: 'bg-slate-100 text-slate-600' },
  failed: { label: 'WhatsApp failed', cls: 'bg-red-100 text-red-700' },
  skipped: { label: 'WhatsApp skipped', cls: 'bg-slate-100 text-slate-600' }
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
  whatsappStatus?: string;
  whatsappSentAt?: string | null;
  whatsappError?: string;
  sheetSyncStatus?: string;
  sheetSyncMessage?: string;
  crmStage?: string;
  nextFollowUpAt?: string | null;
  notes?: { _id?: string; text: string; createdAt: string; createdBy?: string; editedAt?: string | null }[];
}

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });

interface Props {
  projects: MarketingProject[];
  leads: MarketingLead[];
  loading: boolean;
  projectFilter: string;
  onProjectFilterChange: (propertyId: string) => void;
  onLeadUpdated: (lead: MarketingLead) => void;
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

const MarketingLeadsPanel: React.FC<Props> = ({
  projects, leads, loading, projectFilter, onProjectFilterChange, onLeadUpdated
}) => {
  const [campaignFilter, setCampaignFilter] = useState('all');
  const campaignOptions = useMemo(
    () => Array.from(new Set(leads.flatMap((l) => l.campaigns || []))).sort(),
    [leads]
  );
  const [stageFilter, setStageFilter] = useState('all');
  const [dueOnly, setDueOnly] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [openNotesId, setOpenNotesId] = useState('');
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const [editingNote, setEditingNote] = useState<{ leadId: string; noteId: string; text: string } | null>(null);

  const saveLead = async (id: string, path: string, body?: object, method?: 'PATCH' | 'POST' | 'DELETE') => {
    setSavingId(id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/my-marketing-leads/lead/${id}/${path}`, {
        method: method || (path === 'crm' ? 'PATCH' : 'POST'),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-teal-600" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
        <p className="text-lg font-bold text-slate-800">No marketing leads yet</p>
        <p className="mt-2 text-sm text-slate-500">
          Once your project is enrolled for marketing, the HomeFeet team adds its leads here day by day,
          with a CRM to track calls, follow-ups and site visits.
        </p>
      </div>
    );
  }

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
            ['Repeated', stats.repeated], ['Follow-ups due', stats.due], ['Deal Closed', stats.won]
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-slate-50 px-2 py-2">
              <p className="text-xl font-black text-slate-900">{value}</p>
              <p className="text-xs font-semibold text-slate-500">{label}</p>
            </div>
          ))}
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
                          {/* Campaign = the sheet tab the lead came from (e.g. "Diwali Offer Leads"). */}
                          {(lead.campaigns || []).map((c) => (
                            <span key={c} className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-700">{c}</span>
                          ))}
                          {lead.whatsappStatus && WHATSAPP_STATUS[lead.whatsappStatus] && (
                            <span
                              title={lead.whatsappError || (lead.whatsappSentAt ? new Date(lead.whatsappSentAt).toLocaleString('en-IN') : '')}
                              className={`rounded-full px-2 py-0.5 text-xs font-bold ${WHATSAPP_STATUS[lead.whatsappStatus].cls}`}
                            >
                              {WHATSAPP_STATUS[lead.whatsappStatus].label}
                            </span>
                          )}
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
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-slate-500">{timeLabel(lead.leadAt)}</span>
                    </div>

                    {/* Contact + form answers on one line (wraps on small screens). */}
                    {(lead.phone || lead.email || (lead.answers && lead.answers.length > 0)) && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="flex shrink-0 items-center gap-1 font-semibold text-teal-700 hover:underline">
                            <Phone className="h-3.5 w-3.5" /> {lead.phone}
                          </a>
                        )}
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="flex shrink-0 items-center gap-1 text-slate-600 hover:underline">
                            <Mail className="h-3.5 w-3.5" /> {lead.email}
                          </a>
                        )}
                        {lead.answers && lead.answers.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {lead.answers.map((a) => (
                              <span key={a.label} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                                <span className="font-semibold text-slate-500">{a.label}:</span> {a.value}
                              </span>
                            ))}
                          </div>
                        )}
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
                      {lead.sheetSyncStatus === 'ok' && (
                        <span title={lead.sheetSyncMessage} className="ml-auto text-xs font-semibold text-green-700">✓ Saved to sheet</span>
                      )}
                      {(lead.sheetSyncStatus === 'failed' || lead.sheetSyncStatus === 'not_shared') && (
                        <span title={lead.sheetSyncMessage} className="ml-auto max-w-md text-right text-xs font-semibold text-red-600">
                          Not saved to sheet{lead.sheetSyncMessage ? `: ${lead.sheetSyncMessage}` : ''}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setOpenNotesId(openNotesId === lead._id ? '' : lead._id)}
                        className={`${lead.sheetSyncStatus === 'ok' || lead.sheetSyncStatus === 'failed' ? '' : 'ml-auto '}flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline`}
                      >
                        <StickyNote className="h-3.5 w-3.5" /> Notes ({lead.notes?.length || 0})
                      </button>
                    </div>

                    {openNotesId === lead._id && (
                      <div className="mt-2 space-y-2 rounded-md bg-slate-50 p-2">
                        {(lead.notes || []).length === 0 ? (
                          <p className="text-xs text-slate-500">No notes yet. Log each call or visit here.</p>
                        ) : (
                          [...(lead.notes || [])].reverse().map((note, i) => {
                            const isEditing = editingNote?.leadId === lead._id && editingNote?.noteId === note._id;
                            const saveEdit = async () => {
                              const text = editingNote?.text.trim();
                              if (!text || !note._id) return;
                              if (await saveLead(lead._id, `notes/${note._id}`, { text }, 'PATCH')) setEditingNote(null);
                            };
                            return (
                              <div key={note._id || i} className="group text-sm">
                                {isEditing ? (
                                  <div className="flex gap-2">
                                    <input
                                      autoFocus
                                      value={editingNote!.text}
                                      onChange={(e) => setEditingNote({ ...editingNote!, text: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit();
                                        if (e.key === 'Escape') setEditingNote(null);
                                      }}
                                      className="min-w-0 flex-1 rounded border border-teal-300 px-2 py-1 text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={saveEdit}
                                      disabled={savingId === lead._id || !editingNote!.text.trim()}
                                      className="rounded bg-teal-600 px-3 py-1 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingNote(null)}
                                      className="rounded border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-white"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-slate-800">{note.text}</p>
                                )}
                                <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                                  <span>
                                    {note.createdBy || 'You'} · {new Date(note.createdAt).toLocaleString('en-IN', {
                                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: IST
                                    })}
                                    {note.editedAt && ' · edited'}
                                  </span>
                                  {note._id && !isEditing && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setEditingNote({ leadId: lead._id, noteId: note._id!, text: note.text })}
                                        className="flex items-center gap-0.5 font-semibold text-teal-700 hover:underline"
                                      >
                                        <Pencil className="h-3 w-3" /> Edit
                                      </button>
                                      <button
                                        type="button"
                                        disabled={savingId === lead._id}
                                        onClick={() => {
                                          if (window.confirm('Delete this note?')) {
                                            saveLead(lead._id, `notes/${note._id}`, undefined, 'DELETE');
                                          }
                                        }}
                                        className="flex items-center gap-0.5 font-semibold text-red-600 hover:underline disabled:opacity-50"
                                      >
                                        <Trash2 className="h-3 w-3" /> Delete
                                      </button>
                                    </>
                                  )}
                                </p>
                              </div>
                            );
                          })
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
