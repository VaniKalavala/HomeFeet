// Write a lead's CRM status and notes back into its Google Sheet.
//
// The import reads sheets through their public CSV export, which is
// read-only. Writing needs a Google service account that the sheet is
// shared with as Editor:
//   GOOGLE_SERVICE_ACCOUNT_JSON = the service account key file's JSON
//   (raw JSON or base64 of it). Its client_email is what admins share the
//   sheet with.
//
// We never touch the team's own columns. Two columns are added at the end
// of each tab the first time a lead there is updated:
//   HomeFeet Status - e.g. "Site Visit · follow-up 30 Nov"
//   HomeFeet Notes  - latest note first, with date and author
// The importer skips these columns (OWN_COLUMN_RE), so they never come back
// in as "sheet feedback".
const jwt = require('jsonwebtoken');

const STATUS_HEADER = 'HomeFeet Status';
const NOTES_HEADER = 'HomeFeet Notes';
const OWN_COLUMN_RE = /^homefeet\s*(status|notes)$/i;
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const TIMEOUT_MS = 10000;

const STAGE_LABELS = {
  new: 'New', contacted: 'Contacted', site_visit: 'Site Visit',
  negotiation: 'Negotiation', won: 'Won', lost: 'Lost'
};

let credentials;
const getCredentials = () => {
  if (credentials !== undefined) return credentials;
  credentials = null;
  const raw = String(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    if (parsed.client_email && parsed.private_key) {
      credentials = { email: parsed.client_email, key: parsed.private_key.replace(/\\n/g, '\n') };
    }
  } catch (err) {
    console.error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON:', err.message);
  }
  return credentials;
};

const getWriteBackConfig = () => {
  const c = getCredentials();
  return { configured: Boolean(c), email: c ? c.email : '' };
};

let cachedToken = { value: '', expiresAt: 0 };
const getAccessToken = async () => {
  if (cachedToken.value && Date.now() < cachedToken.expiresAt - 60000) return cachedToken.value;
  const c = getCredentials();
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { iss: c.email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 },
    c.key,
    { algorithm: 'RS256' }
  );
  const res = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(`Google login failed: ${data.error_description || data.error || res.status}`);
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return cachedToken.value;
};

const fetchWithTimeout = async (url, opts = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } catch (err) {
    throw new Error(err.name === 'AbortError' ? 'Google Sheets timed out' : err.message);
  } finally {
    clearTimeout(timer);
  }
};

class NotSharedError extends Error {}

const sheetsCall = async (path, opts = {}) => {
  const token = await getAccessToken();
  const res = await fetchWithTimeout(`${SHEETS_API}/${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 403 || res.status === 404) {
    throw new NotSharedError(`Share the sheet with ${getCredentials().email} as Editor`);
  }
  if (!res.ok) throw new Error(data.error?.message || `Google Sheets error ${res.status}`);
  return data;
};

const columnLetter = (index) => {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const quoteTab = (title) => `'${String(title).replace(/'/g, "''")}'`;

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });

const statusText = (lead) => {
  const parts = [STAGE_LABELS[lead.crmStage] || 'New'];
  if (lead.nextFollowUpAt) parts.push(`follow-up ${formatDate(lead.nextFollowUpAt)}`);
  return parts.join(' · ');
};

const notesText = (lead) => [...(lead.notes || [])]
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  .map((n) => `${formatDate(n.createdAt)}: ${n.text}${n.createdBy ? ` (${n.createdBy})` : ''}`)
  .join(' | ')
  .slice(0, 2000);

// Does this sheet row belong to the lead? Any cell holding the same phone
// (last 10 digits) - works for normal rows and raw-Meta-order rows alike.
const rowMatchesPhone = (row, last10) => row.some((cell) => {
  const v = String(cell || '').trim();
  if (!/^(p:)?\s*\+?[\d\s-]{10,}$/i.test(v)) return false;
  return v.replace(/\D/g, '').slice(-10) === last10;
});

// Update one tab. Returns the number of rows written.
const writeTab = async (sheetId, tab, lead, last10) => {
  const range = encodeURIComponent(`${quoteTab(tab.title)}!A1:ZZ5000`);
  const { values = [] } = await sheetsCall(`${sheetId}/values/${range}?majorDimension=ROWS`);
  if (!values.length) return 0;

  const header = values[0].map((h) => String(h || '').trim());
  const rows = [];
  values.forEach((row, i) => {
    if (i > 0 && rowMatchesPhone(row, last10)) rows.push(i);
  });
  if (!rows.length) return 0;

  // Find our two columns, or add them after the last used column.
  const width = Math.max(...values.map((r) => r.length));
  let statusCol = header.findIndex((h) => /^homefeet\s*status$/i.test(h));
  let notesCol = header.findIndex((h) => /^homefeet\s*notes$/i.test(h));
  const data = [];
  let next = width;
  if (statusCol < 0) { statusCol = next++; data.push({ range: `${quoteTab(tab.title)}!${columnLetter(statusCol)}1`, values: [[STATUS_HEADER]] }); }
  if (notesCol < 0) { notesCol = next++; data.push({ range: `${quoteTab(tab.title)}!${columnLetter(notesCol)}1`, values: [[NOTES_HEADER]] }); }

  // The grid may be narrower than the new columns need.
  const needed = Math.max(statusCol, notesCol) + 1;
  if (needed > tab.columnCount) {
    await sheetsCall(`${sheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests: [{ appendDimension: { sheetId: tab.sheetId, dimension: 'COLUMNS', length: needed - tab.columnCount } }] })
    });
  }

  const status = statusText(lead);
  const notes = notesText(lead);
  rows.forEach((r) => {
    data.push({ range: `${quoteTab(tab.title)}!${columnLetter(statusCol)}${r + 1}`, values: [[status]] });
    data.push({ range: `${quoteTab(tab.title)}!${columnLetter(notesCol)}${r + 1}`, values: [[notes]] });
  });
  await sheetsCall(`${sheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'RAW', data })
  });
  return rows.length;
};

// Write the lead's status + notes to every row of it in the property's sheet.
// Never throws - returns { status, message } and records it on the lead.
const writeBackLead = async (lead, property) => {
  let result;
  try {
    const sheetId = (String(property?.marketingSheetUrl || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/) || [])[1];
    const last10 = String(lead.phone || '').replace(/\D/g, '').slice(-10);
    if (!getCredentials()) result = { status: 'not_configured', message: 'GOOGLE_SERVICE_ACCOUNT_JSON is not set on the server' };
    else if (!sheetId) result = { status: 'failed', message: 'Project has no leads sheet linked' };
    else if (last10.length < 10) result = { status: 'skipped', message: 'Lead has no phone number to find its row' };
    else {
      const meta = await sheetsCall(`${sheetId}?fields=sheets.properties(sheetId,title,gridProperties.columnCount)`);
      const allTabs = (meta.sheets || []).map((s) => ({
        sheetId: s.properties.sheetId,
        title: s.properties.title,
        columnCount: s.properties.gridProperties?.columnCount || 26
      }));
      const wanted = new Set(lead.campaigns || []);
      const tabs = wanted.size ? allTabs.filter((t) => wanted.has(t.title)) : allTabs;
      let written = 0;
      for (const tab of (tabs.length ? tabs : allTabs)) written += await writeTab(sheetId, tab, lead, last10);
      result = written
        ? { status: 'ok', message: `Updated ${written} row${written === 1 ? '' : 's'}` }
        : { status: 'failed', message: 'Could not find this phone number in the sheet' };
    }
  } catch (err) {
    result = err instanceof NotSharedError
      ? { status: 'not_shared', message: err.message }
      : { status: 'failed', message: String(err.message || err).slice(0, 300) };
  }

  lead.sheetSyncStatus = result.status;
  lead.sheetSyncMessage = result.message;
  lead.sheetSyncedAt = new Date();
  await lead.save().catch(() => {});
  if (property && property.marketingSheetWriteBackStatus !== result.status) {
    property.marketingSheetWriteBackStatus = result.status;
    property.marketingSheetWriteBackMessage = result.message;
    await property.save().catch(() => {});
  }
  return result;
};

module.exports = { OWN_COLUMN_RE, getWriteBackConfig, writeBackLead, statusText, notesText, columnLetter };
