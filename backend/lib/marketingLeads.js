// Marketing leads import: admin pastes a Google Sheet link on a project,
// we pull the sheet as CSV, work out which columns hold the lead's date,
// name, phone, email and call feedback, and store each row as a
// MarketingLead under that project so the project owner sees them
// date-wise on their dashboard.
//
// Column mapping: header-name heuristics always run. When an Anthropic API
// key is configured, Claude maps the columns instead (sheets differ per
// campaign - Meta lead forms name columns after the form questions), and
// the result is cached on the property until the header row changes.
const crypto = require('crypto');
const axios = require('axios');
// "HomeFeet Status" / "HomeFeet Notes" are written by us (sheetWriteBack.js)
// and must never be read back as lead data or feedback.
const { OWN_COLUMN_RE } = require('./sheetWriteBack');
const Property = require('../models/Property');
const MarketingLead = require('../models/MarketingLead');

const MAX_ROWS = 5000;

// ---------- Google Sheet link -> CSV export URL ----------

const toCsvExportUrl = (link) => {
  const url = String(link || '').trim();
  const idMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  if (!idMatch) return null;
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? `&gid=${gidMatch[1]}` : '';
  return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv${gid}`;
};

// ---------- CSV parsing (RFC 4180: quotes, escaped quotes, CRLF) ----------

const parseCsv = (text) => {
  const src = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 1; } else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ''));
};

// ---------- Column mapping ----------

const ROLE_PATTERNS = {
  dateColumn: [/^created_?time$/i, /time_?stamp/i, /^(lead_?)?date/i, /created/i, /submitted/i, /date|time/i],
  nameColumn: [/^full_?name$/i, /^name$/i, /customer_?name|lead_?name|client_?name/i, /name/i],
  phoneColumn: [/phone|mobile|contact_?(no|number)|whatsapp|cell/i],
  emailColumn: [/e-?mail/i],
  feedbackColumn: [/feedback|remark|comment|status|notes?|follow_?up/i]
};

const SYSTEM_COLUMNS = /^(id|ad_?id|ad_?name|adset_?id|adset_?name|campaign_?id|form_?id|form_?name|is_?organic|platform|lead_?status)$/i;

const heuristicMap = (headers) => {
  const used = new Set();
  const map = {};
  Object.entries(ROLE_PATTERNS).forEach(([role, patterns]) => {
    map[role] = null;
    for (const pattern of patterns) {
      const hit = headers.find((h) => !used.has(h) && !OWN_COLUMN_RE.test(h.trim()) && pattern.test(h.trim()));
      if (hit) { map[role] = hit; used.add(hit); break; }
    }
  });
  map.ignoreColumns = headers.filter((h) => SYSTEM_COLUMNS.test(h.trim()) || OWN_COLUMN_RE.test(h.trim()));
  map.labels = {};
  return map;
};

const MAPPING_SYSTEM_PROMPT = `You map the columns of a real-estate marketing leads spreadsheet so each row can be stored as a lead for an Indian property project.

The sheet usually comes from a Meta (Facebook/Instagram) lead form, Google Ads lead form, a website enquiry form, or a call-centre tracker. Column headers are often snake_case form questions such as "which_configuration_are_you_interested_in?" or "when_would_you_prefer_to_visit_<project_name>?", and may be in any order.

Identify, using the header names AND the sample values:
- dateColumn: when the lead was created/submitted (e.g. created_time, timestamp, date). Prefer the lead-creation time over a follow-up or visit date.
- nameColumn: the lead's full name.
- phoneColumn: the lead's phone / mobile / WhatsApp number.
- emailColumn: the lead's email address.
- feedbackColumn: free-text notes written by the sales or marketing team after calling the lead (e.g. "Leads Feedback", "Remarks", "Call status"). This is NOT a form answer filled by the lead.
Use null for any role with no matching column. Never assign the same column to two roles.

ignoreColumns: technical columns with no value to a salesperson (ad/adset/campaign/form ids, is_organic, platform codes, empty helper columns).

labels: for every remaining column (form answers and other useful details), a short human-readable label in Title Case, at most 5 words, e.g. "which_configuration_are_you_interested_in?" -> "Configuration", "what_is_your_approximate_budget_for_your_new_home?" -> "Budget", "when_are_you_planning_to_purchase_your_home?" -> "Purchase Timeline", "when_would_you_prefer_to_visit_vaarahi_heights?" -> "Preferred Visit".

Use column names exactly as they appear in the header list.`;

const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };
const MAPPING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['dateColumn', 'nameColumn', 'phoneColumn', 'emailColumn', 'feedbackColumn', 'ignoreColumns', 'labels'],
  properties: {
    dateColumn: nullableString,
    nameColumn: nullableString,
    phoneColumn: nullableString,
    emailColumn: nullableString,
    feedbackColumn: nullableString,
    ignoreColumns: { type: 'array', items: { type: 'string' } },
    labels: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['column', 'label'],
        properties: { column: { type: 'string' }, label: { type: 'string' } }
      }
    }
  }
};

let anthropicClient = null;
const getAnthropic = () => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropicClient) {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
};

// Returns a validated mapping or null (caller falls back to heuristics).
const claudeMap = async (headers, sampleRows, projectName) => {
  const client = getAnthropic();
  if (!client) return null;

  const sample = sampleRows.slice(0, 5).map((row) =>
    Object.fromEntries(headers.map((h, i) => [h, String(row[i] ?? '').slice(0, 120)]))
  );

  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: MAPPING_SCHEMA }
      },
      system: MAPPING_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Project: ${projectName || 'Unknown project'}

Header columns (exact names):
${JSON.stringify(headers)}

First ${sample.length} data rows:
${JSON.stringify(sample, null, 2)}`
      }]
    });

    if (response.stop_reason === 'refusal') return null;
    const text = (response.content || []).find((block) => block.type === 'text')?.text;
    if (!text) return null;
    const parsed = JSON.parse(text);

    // Only trust column names that really exist in the sheet.
    const valid = new Set(headers.filter((h) => !OWN_COLUMN_RE.test(h.trim())));
    const clean = (col) => (col && valid.has(col) ? col : null);
    const map = {
      dateColumn: clean(parsed.dateColumn),
      nameColumn: clean(parsed.nameColumn),
      phoneColumn: clean(parsed.phoneColumn),
      emailColumn: clean(parsed.emailColumn),
      feedbackColumn: clean(parsed.feedbackColumn),
      ignoreColumns: (parsed.ignoreColumns || []).filter((c) => valid.has(c)),
      labels: {}
    };
    (parsed.labels || []).forEach(({ column, label }) => {
      if (valid.has(column) && label) map.labels[column] = String(label).slice(0, 60);
    });
    return map;
  } catch (err) {
    console.error('Marketing leads column mapping (Claude) failed:', err.message || err);
    return null;
  }
};

// ---------- Value helpers ----------

// Short labels for common lead-form questions (used when Claude isn't configured).
const COMMON_LABELS = [
  [/configuration|bhk|unit_?type/i, 'Configuration'],
  [/budget|price_?range/i, 'Budget'],
  [/plan(ning)?_?to_?(buy|purchase)|purchase|buying_?time/i, 'Purchase Timeline'],
  [/visit/i, 'Preferred Visit'],
  [/comfortable.*location|location/i, 'Location OK?'],
  [/campaign_?name/i, 'Campaign'],
  [/^city$|which_?city/i, 'City']
];

const humanizeLabel = (header) => {
  const known = COMMON_LABELS.find(([re]) => re.test(header));
  if (known) return known[1];
  const text = String(header).replace(/[_?]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Meta exports answers as snake_case ("2.5_bhk", "within_1_month").
const humanizeValue = (value) => {
  const v = String(value || '').trim();
  if (!v || /\s/.test(v) || !v.includes('_')) return v;
  return v.replace(/_/g, ' ').replace(/\bbhk\b/gi, 'BHK');
};

const IST_OFFSET_MIN = 330;

// ISO (with/without offset) or Indian-style dd/mm/yyyy [hh:mm[:ss] [am|pm]].
// Timezone-less values are treated as IST.
const parseLeadDate = (value) => {
  const v = String(value || '').trim();
  if (!v) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(v);
    const d = new Date(hasZone ? v : `${v.replace(' ', 'T')}${v.length <= 10 ? 'T00:00:00' : ''}+05:30`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?/i);
  if (m) {
    let [, dd, mm, yyyy, hh = '0', min = '0', ss = '0', ampm] = m;
    let year = Number(yyyy);
    if (year < 100) year += 2000;
    let hour = Number(hh);
    if (ampm) {
      hour %= 12;
      if (ampm.toLowerCase() === 'pm') hour += 12;
    }
    const utc = Date.UTC(year, Number(mm) - 1, Number(dd), hour, Number(min), Number(ss)) - IST_OFFSET_MIN * 60000;
    const d = new Date(utc);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

// ---------- Fetching the spreadsheet ----------

const NOT_PUBLIC = 'Google Sheet is not publicly readable. Set sharing to "Anyone with the link - Viewer" and try again.';

const getSheetId = (link) => {
  const m = String(link || '').match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  return m ? m[1] : null;
};

const httpGetText = async (url) => {
  try {
    return await axios.get(url, { responseType: 'text', timeout: 20000, maxRedirects: 5, validateStatus: () => true });
  } catch (err) {
    throw new Error(`Could not reach Google Sheets (${err.message}).`);
  }
};

// All tabs (name + gid) of a link-shared spreadsheet, from its public
// htmlview page. Falls back to the tab in the link if that page changes.
const listTabs = async (sheetId, link) => {
  const res = await httpGetText(`https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`);
  const tabs = [];
  if (res.status === 200 && typeof res.data === 'string') {
    const re = /items\.push\(\{name:\s*"((?:[^"\\]|\\.)*)"[^}]*?gid:\s*"(\d+)"/g;
    let m;
    while ((m = re.exec(res.data))) {
      let name = m[1];
      try { name = JSON.parse(`"${name.replace(/\\x([0-9a-f]{2})/gi, '\\u00$1')}"`); } catch { /* keep raw */ }
      const gid = m[2];
      if (!tabs.some((t) => t.gid === gid)) tabs.push({ gid, name });
    }
  }
  if (!tabs.length) {
    const gid = (String(link).match(/[#&?]gid=(\d+)/) || [])[1] || '0';
    tabs.push({ gid, name: '' });
  }
  return tabs;
};

const fetchTabRows = async (sheetId, gid) => {
  const res = await httpGetText(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`);
  const type = String(res.headers['content-type'] || '');
  if (res.status !== 200 || !type.includes('text/csv')) throw new Error(NOT_PUBLIC);
  const rows = parseCsv(res.data);
  if (rows.length < 2) return null;
  return { headers: rows[0].map((h) => String(h).trim()), dataRows: rows.slice(1, MAX_ROWS + 1) };
};

// ---------- Turning one tab into lead rows ----------

const normalizePhone = (value) => {
  const raw = String(value || '').replace(/^p:/i, '').trim();
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return raw.replace(/\s+/g, '');
};

// Join notes, dropping case-insensitive repeats ("no response" / "No Response").
const uniqueNotes = (notes) => {
  const seen = new Set();
  return notes.flatMap((n) => String(n || '').split(' · ')).map((n) => n.trim()).filter((n) => {
    const k = n.toLowerCase().replace(/\s+/g, ' ');
    if (!n || seen.has(k)) return false;
    seen.add(k);
    return true;
  }).join(' · ');
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const PHONE_CELL = /^p:\s*\+?\d|^\+?\d[\d\s-]{9,14}$/i;

const extractTabRows = (headers, dataRows, map, campaign) => {
  const col = (name) => (name ? headers.indexOf(name) : -1);
  const idx = {
    date: col(map.dateColumn),
    name: col(map.nameColumn),
    phone: col(map.phoneColumn),
    email: col(map.emailColumn),
    feedback: col(map.feedbackColumn)
  };
  const roleIdx = new Set(Object.values(idx).filter((i) => i >= 0));
  const ignored = new Set(map.ignoreColumns || []);
  const answerCols = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h, i }) => h && !roleIdx.has(i) && !ignored.has(h) && !SYSTEM_COLUMNS.test(h) && !OWN_COLUMN_RE.test(h));
  // Form-question columns before the name column, in sheet order - Meta
  // keeps the same order in its raw export, which realignRow relies on.
  const questionCols = answerCols.filter(({ i }) => idx.name < 0 || i < idx.name);

  const cell = (row, i) => (i >= 0 ? String(row[i] ?? '').trim() : '');

  // Rows pasted straight from a raw Meta export have a different column
  // order (lead id first, then created_time, ad/campaign ids, questions,
  // name, phone). Rebuild them into this tab's layout.
  const realignRow = (row) => {
    if (idx.date < 0 || idx.name < 0 || idx.phone < 0) return row;
    if (parseLeadDate(cell(row, idx.date)) && PHONE_CELL.test(cell(row, idx.phone))) return row;
    const dateAt = row.findIndex((v) => ISO_DATE.test(String(v).trim()));
    const phoneAt = row.findIndex((v) => /^p:/i.test(String(v).trim()));
    if (dateAt < 0 || phoneAt < 1) return row;
    const fixed = new Array(headers.length).fill('');
    fixed[idx.date] = row[dateAt];
    fixed[idx.phone] = row[phoneAt];
    fixed[idx.name] = row[phoneAt - 1];
    const start = phoneAt - 1 - questionCols.length;
    if (start > dateAt) questionCols.forEach(({ i }, k) => { fixed[i] = row[start + k]; });
    return fixed;
  };

  // Teams often keep a second notes column (e.g. "Lead_Status" next to
  // "FeedBack", or notes typed under Meta's empty "id" column). Pick those
  // up, but never ids like "l:1234" or status codes like "CREATED".
  const isSpillColumn = (h) => !OWN_COLUMN_RE.test(String(h || '').trim()) && (!h || ignored.has(h) || SYSTEM_COLUMNS.test(h.trim()));
  const looksLikeCode = (v) => /^([a-z]{1,3}:)?[\d\s:_-]+$/i.test(v) || /^[A-Z_]+$/.test(v);
  const feedbackFor = (row) => {
    const notes = [cell(row, idx.feedback)];
    if (idx.feedback >= 0) {
      for (let j = idx.feedback + 1; j < headers.length && isSpillColumn(headers[j]); j += 1) {
        const v = cell(row, j);
        if (!v || looksLikeCode(v)) break;
        notes.push(v);
      }
    }
    return uniqueNotes(notes);
  };

  const isLeadRow = (row) => {
    if (headers[0] && cell(row, 0) === headers[0]) return false; // repeated header row
    return [idx.name, idx.phone, idx.email].some((i) => cell(row, i)); // skips "Oct - 16" dividers
  };

  return dataRows.map(realignRow).filter(isLeadRow).map((row) => {
    const dateRaw = cell(row, idx.date);
    return {
      campaign,
      dateRaw,
      leadAt: parseLeadDate(dateRaw),
      name: cell(row, idx.name),
      phone: normalizePhone(cell(row, idx.phone)),
      email: cell(row, idx.email),
      feedback: feedbackFor(row),
      answers: answerCols
        .map(({ h, i }) => ({ label: (map.labels && map.labels[h]) || humanizeLabel(h), value: humanizeValue(row[i]) }))
        .filter((a) => a.value)
    };
  });
};

// ---------- Sync (all tabs of the linked spreadsheet) ----------

const syncPropertyMarketingLeads = async (propertyOrId) => {
  const property = typeof propertyOrId === 'string' ? await Property.findById(propertyOrId) : propertyOrId;
  if (!property) throw new Error('Property not found');
  if (!property.marketingSheetUrl) throw new Error('No marketing leads sheet linked to this project.');

  try {
    const sheetId = getSheetId(property.marketingSheetUrl);
    if (!sheetId) throw new Error('Not a Google Sheets link. Paste the link from Share > Copy link.');

    // Column maps cached per header layout: { <headerSig>: map }. (An older
    // single-map value has a dateColumn key and is simply re-mapped.)
    const stored = property.marketingSheetColumnMap;
    const cached = stored && typeof stored === 'object' && !('dateColumn' in stored) ? stored : {};
    const usedMaps = {};
    const tabs = await listTabs(sheetId, property.marketingSheetUrl);
    const tabReport = [];
    let rowDocs = [];

    for (const tab of tabs) {
      const data = await fetchTabRows(sheetId, tab.gid);
      if (!data) { tabReport.push({ ...tab, leadCount: 0, skipped: 'empty' }); continue; }
      const sig = crypto.createHash('sha1').update(JSON.stringify(data.headers)).digest('hex');
      let map = cached[sig] || usedMaps[sig];
      if (!map) {
        map = (await claudeMap(data.headers, data.dataRows, property.projectName)) || heuristicMap(data.headers);
      }
      if (!map.nameColumn && !map.phoneColumn) {
        tabReport.push({ ...tab, leadCount: 0, skipped: 'no name/phone column' });
        continue;
      }
      usedMaps[sig] = map;
      const rows = extractTabRows(data.headers, data.dataRows, map, tab.name);
      tabReport.push({ ...tab, leadCount: rows.length });
      rowDocs = rowDocs.concat(rows);
    }
    if (!rowDocs.length) throw new Error('No lead rows found in this sheet.');

    // Same person = same name AND same phone (last 10 digits), across every
    // tab. Rows without a phone are never merged.
    const personKey = (d) => {
      const digits = d.phone.replace(/\D/g, '').slice(-10);
      const nameKey = d.name.toLowerCase().replace(/[^a-z\u0900-\u0DFF]/g, '');
      return digits && nameKey ? `${digits}|${nameKey}` : null;
    };
    // Keys must stay stable across syncs - CRM stage/notes hang off them.
    const groups = new Map();
    const rowSeen = new Map();
    rowDocs.forEach((d) => {
      let key = personKey(d);
      if (!key) {
        const base = `row|${d.campaign}|${d.dateRaw}|${d.name}|${d.email}`;
        const n = rowSeen.get(base) || 0;
        rowSeen.set(base, n + 1);
        key = `${base}#${n}`;
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(d);
    });

    const time = (d) => (d.leadAt ? d.leadAt.getTime() : 0);
    const docs = Array.from(groups.entries()).map(([key, items]) => {
      // Show the person once, on their most recent enquiry date.
      const ordered = [...items].sort((a, b) => time(b) - time(a));
      const latest = ordered[0];
      const feedback = uniqueNotes(ordered.map((d) => d.feedback));
      return {
        propertyId: String(property._id),
        ownerUserId: String(property.userId || ''),
        rowKey: crypto.createHash('sha1').update(key).digest('hex'),
        leadAt: latest.leadAt,
        name: latest.name,
        phone: latest.phone,
        email: ordered.find((d) => d.email)?.email || '',
        feedback,
        answers: latest.answers,
        campaigns: Array.from(new Set(ordered.map((d) => d.campaign).filter(Boolean))),
        repeatCount: items.length,
        isRepeated: items.length > 1 || /repeat(ed)?\s*lead/i.test(feedback),
        enquiryDates: ordered.map((d) => d.leadAt).filter(Boolean).sort((a, b) => a - b)
      };
    });

    const propertyId = String(property._id);
    await MarketingLead.bulkWrite(docs.map((doc) => ({
      updateOne: { filter: { propertyId, rowKey: doc.rowKey }, update: { $set: doc }, upsert: true }
    })), { ordered: false });
    // Rows deleted from the sheet disappear from the dashboard too.
    await MarketingLead.deleteMany({ propertyId, rowKey: { $nin: docs.map((d) => d.rowKey) } });

    property.marketingSheetColumnMap = usedMaps;
    property.marketingSheetHeaderSig = '';
    property.marketingSheetTabs = tabReport;
    property.marketingSheetSyncedAt = new Date();
    property.marketingSheetLeadCount = docs.length;
    property.marketingSheetError = '';
    property.markModified('marketingSheetColumnMap');
    await property.save();
    return { count: docs.length, syncedAt: property.marketingSheetSyncedAt, tabs: tabReport };
  } catch (err) {
    property.marketingSheetError = err.message || 'Sync failed';
    await property.save().catch(() => {});
    throw err;
  }
};

// Link (or, with an empty url, unlink) a project's sheet, then import it.
// Shared by the admin panel and the project owner's dashboard.
const setPropertyMarketingSheet = async (property, rawUrl) => {
  const url = String(rawUrl || '').trim();
  if (!url) {
    Object.assign(property, {
      marketingSheetUrl: '', marketingSheetSyncedAt: null, marketingSheetLeadCount: 0,
      marketingSheetError: '', marketingSheetHeaderSig: '', marketingSheetColumnMap: null, marketingSheetTabs: []
    });
    await property.save();
    await MarketingLead.deleteMany({ propertyId: String(property._id) });
    return { unlinked: true };
  }
  if (!getSheetId(url)) {
    const err = new Error('Please paste a Google Sheets link (docs.google.com/spreadsheets/...).');
    err.status = 400;
    throw err;
  }
  if (getSheetId(property.marketingSheetUrl) !== getSheetId(url)) {
    property.marketingSheetColumnMap = null;
  }
  property.marketingSheetUrl = url;
  await property.save();
  return syncPropertyMarketingLeads(property);
};

module.exports = {
  toCsvExportUrl,
  parseCsv,
  parseLeadDate,
  heuristicMap,
  extractTabRows,
  syncPropertyMarketingLeads,
  setPropertyMarketingSheet
};
