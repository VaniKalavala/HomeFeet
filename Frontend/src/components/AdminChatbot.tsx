import React, { useMemo, useState } from 'react';
import { Bot, ExternalLink, MessageCircle, Send, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isAdminUser } from '../lib/admin';
import { API_BASE } from '../lib/api';

type ChatMessage = {
  from: 'bot' | 'admin';
  text: string;
  kind?: 'text' | 'whatsapp-group' | 'whatsapp-digest';
  digest?: {
    period: 'morning' | 'evening' | 'all';
    morningPending: number;
    eveningPending: number;
    totalPending: number;
    properties: Array<{
      _id: string;
      developmentType?: string;
      listingIntent?: string;
      totalArea?: string;
      areaUnit?: string;
      locality?: string;
      city?: string;
      state?: string;
      contactPhone?: string;
      phone?: string;
      source?: string;
      createdAt?: string;
    }>;
  };
};

const adminWhatsappGroupUrl = 'https://chat.whatsapp.com/LGoh96GsvrrI6yCNZpWzXp?s=sh&p=a&ilr=1';

const quickReplies = [
  'Property approval',
  'Assisted upload',
  'Membership reset',
  'Builder verification',
  'Contact inquiries',
  'WhatsApp group',
  'Morning WhatsApp properties',
  'Evening WhatsApp properties',
];

const getBotReply = (message: string) => {
  const text = message.toLowerCase();

  if (text.includes('approval') || text.includes('approve') || text.includes('property')) {
    return 'Open Admin Panel > Property Approval to review pending, approved, rejected, and closed listings. Use View Details before approving.';
  }

  if (text.includes('assist') || text.includes('upload') || text.includes('owner') || text.includes('mediator')) {
    return 'For admin-assisted upload, open Post Property. Enter owner/mediator mobile number first. If already registered, the profile is reused; otherwise fill their details and submit.';
  }

  if (text.includes('member') || text.includes('reset') || text.includes('extend')) {
    return 'Open Admin Panel > Membership Access. You can reset access or extend 3, 6, or 12 month membership for builder, owner, or mediator accounts.';
  }

  if (text.includes('builder') || text.includes('verification') || text.includes('rera')) {
    return 'Open Admin Panel > Builder Verification to approve or reject builder registrations after checking company and RERA details.';
  }

  if (text.includes('inquiry') || text.includes('contact') || text.includes('lead')) {
    return 'Open Admin Panel > Contact Inquiries to review incoming buyer, builder, owner, and company inquiries with phone, email, website, and message details.';
  }

  if (text.includes('whatsapp') || text.includes('group')) {
    return 'WhatsApp group chat cannot be read inside the website. For automatic intake, owners or mediators must send or forward property details to the connected WhatsApp Business number, or admin can add them from Assisted Upload.';
  }

  if (text.includes('help') || text.includes('start')) {
    return 'I can help with property approval, assisted upload, membership reset, builder verification, and contact inquiries. Choose a quick option or type your question.';
  }

  return 'I can guide admin operations like property approval, assisted owner/mediator upload, membership reset, builder verification, and inquiries. Please type one of those topics.';
};

export default function AdminChatbot() {
  const isAdmin = isAdminUser(localStorage.getItem('phone'), localStorage.getItem('accountType'), localStorage.getItem('email'));
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: 'bot',
      text: 'Admin assistant ready. Ask about property approval, assisted upload, membership reset, builder verification, or inquiries.'
    }
  ]);

  const visibleMessages = useMemo(() => messages.slice(-8), [messages]);

  if (!isAdmin) return null;

  const fetchWhatsAppDigest = async (period: 'morning' | 'evening' | 'all') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/admin/whatsapp-intakes?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load WhatsApp intake');
      setMessages(prev => [
        ...prev,
        {
          from: 'bot',
          text: `${period} WhatsApp pending properties`,
          kind: 'whatsapp-digest',
          digest: {
            period,
            morningPending: data.counts?.morningPending || 0,
            eveningPending: data.counts?.eveningPending || 0,
            totalPending: data.counts?.totalPending || 0,
            properties: data.pendingProperties || []
          }
        }
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { from: 'bot', text: error instanceof Error ? error.message : 'Unable to load WhatsApp pending properties.' }
      ]);
    }
  };

  const sendMessage = (value = input) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const isWhatsappRequest = /whatsapp|group/i.test(trimmed);
    const isDigestRequest = /morning|evening|pending/i.test(trimmed) && /whatsapp|property|properties/i.test(trimmed);

    setMessages(prev => [
      ...prev,
      { from: 'admin', text: trimmed }
    ]);

    if (isDigestRequest) {
      const period = /morning/i.test(trimmed) ? 'morning' : /evening/i.test(trimmed) ? 'evening' : 'all';
      fetchWhatsAppDigest(period);
      setInput('');
      return;
    }

    setMessages(prev => [
      ...prev,
      isWhatsappRequest
        ? { from: 'bot', text: 'Admin WhatsApp group', kind: 'whatsapp-group' }
        : { from: 'bot', text: getBotReply(trimmed) }
    ]);
    setInput('');
  };

  const showWhatsappGroupLink = () => {
    setMessages(prev => [
      ...prev,
      {
        from: 'bot',
        text: 'Admin WhatsApp group',
        kind: 'whatsapp-group'
      }
    ]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      {open && (
        <div className="mb-3 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-teal-300" />
              <div>
                <p className="text-sm font-black">Admin Chatbot</p>
                <p className="text-xs text-slate-300">Admin credentials required</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/10" aria-label="Close admin chatbot">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {visibleMessages.map((message, index) => (
              <div
                key={`${message.from}-${index}`}
                className={`rounded-xl px-3 py-2 text-sm leading-6 ${
                  message.from === 'admin'
                    ? 'ml-8 bg-teal-700 text-white'
                    : 'mr-8 border border-slate-200 bg-white text-slate-700'
                }`}
              >
                {message.kind === 'whatsapp-group' ? (
                  <div className="space-y-3">
                    <div>
                      <p className="font-black text-slate-950">Admin WhatsApp Group</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Use this for admin coordination. WhatsApp group messages are not automatically readable by this website; automatic property intake works when the owner or mediator sends/forwards details to the connected WhatsApp Business number.
                      </p>
                    </div>
                    <a
                      href={adminWhatsappGroupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700"
                    >
                      Open WhatsApp Group <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : message.kind === 'whatsapp-digest' && message.digest ? (
                  <div className="space-y-3">
                    <p className="font-black text-slate-950">
                      {message.digest.period === 'morning'
                        ? 'Morning pending WhatsApp properties'
                        : message.digest.period === 'evening'
                          ? 'Evening pending WhatsApp properties'
                          : 'WhatsApp pending properties'}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                      <div className="rounded-lg bg-blue-50 px-2 py-2 text-blue-800">Morning<br /><span className="text-base">{message.digest.morningPending}</span></div>
                      <div className="rounded-lg bg-amber-50 px-2 py-2 text-amber-800">Evening<br /><span className="text-base">{message.digest.eveningPending}</span></div>
                      <div className="rounded-lg bg-slate-50 px-2 py-2 text-slate-800">Total<br /><span className="text-base">{message.digest.totalPending}</span></div>
                    </div>
                    {message.digest.properties.length > 0 ? (
                      <div className="space-y-2">
                        {message.digest.properties.slice(0, 3).map(property => (
                          <div key={property._id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5">
                            <p className="font-black text-slate-950">
                              {property.developmentType || 'Property'} in {property.locality || property.city || 'review'}
                            </p>
                            <p className="text-slate-600">
                              {[property.totalArea && `${property.totalArea} ${property.areaUnit || ''}`.trim(), property.locality, property.city, property.state]
                                .filter(Boolean)
                                .join(' | ')}
                            </p>
                            <p className="font-semibold text-slate-700">
                              Owner: {property.contactPhone || property.phone || 'Phone not available'}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                        No pending WhatsApp property records found. Ask the owner or mediator to send/forward property details to the connected WhatsApp Business number, or use Assisted Upload.
                      </p>
                    )}
                    <Link to="/admin" className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">
                      Open WhatsApp Intake <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ) : (
                  message.text
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 p-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickReplies.map(reply => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => sendMessage(reply)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-teal-300 hover:text-teal-700"
                >
                  {reply}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') sendMessage();
                }}
                placeholder="Ask admin assistant..."
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
              <button type="button" onClick={() => sendMessage()} className="rounded-lg bg-teal-700 px-3 py-2 text-white hover:bg-teal-800" aria-label="Send message">
                <Send className="h-4 w-4" />
              </button>
            </div>
            <Link to="/admin" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900">
              Open Admin Panel <ExternalLink className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={showWhatsappGroupLink}
              className="ml-4 mt-3 inline-flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-900"
            >
              Show Admin WhatsApp Group
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#0AA6A6] text-white shadow-2xl transition hover:bg-[#087f7f]"
        aria-label="Open admin chatbot"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
