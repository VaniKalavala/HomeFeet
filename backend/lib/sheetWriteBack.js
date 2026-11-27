// Write a lead's CRM status and notes back into its Google Sheet.
//
// The import reads sheets through their public CSV export, which is
// read-only. Writing goes one of two ways:
//
// 1. Google Apps Script, one per project (preferred, no keys): admin pastes
//    backend/scripts/homefeet-sheet-writeback.gs into that project's leads
//    sheet, deploys it as a web app (Execute as: Me, Access: Anyone) and saves
//    its /exec URL on the project (property.marketingSheetScriptUrl). We POST
//    each update to it with a server key, so only HomeFeet can use the URL.
//
// 2. Fallback - a Google service account that the sheet is shared with as
//    Editor:
//   GOOGLE_SERVICE_ACCOUNT_JSON = the service account key file's JSON
//   (raw JSON or base64 of it). Its client_email is what admins share the
//   sheet with.
//
// The status (e.g. "Site Visit · follow-up 30 Nov") goes in the tab's own
// "Lead_Status" column and the notes (latest first, with date and author) in
// its "FeedBack" column. The team's text in those cells is kept: HomeFeet
// owns only a trailing "[HomeFeet] ..." line, which the importer strips
// (stripOwnText) so it never comes back in as "sheet feedback".
// OWN_COLUMN_RE: the separate "HomeFeet Status/Notes" columns written by the
// first version - still skipped on import.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

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

// Key that only this server and its copy of the script know, so nobody else
// can write through a script's public URL.
const scriptKey = () => crypto
  .createHmac('sha256', String(process.env.JWT_SECRET || 'secret'))
  .update('homefeet-sheets-writeback')
  .digest('hex')
  .slice(0, 32);

let scriptCode;
const getScriptCode = () => {
  if (scriptCode === undefined) {
    try {
      scriptCode = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'homefeet-sheet-writeback.gs'), 'utf8')
        .replace('__HOMEFEET_KEY__', scriptKey());
    } catch {
      scriptCode = '';
    }
  }
  return scriptCode;
};

const getWriteBackConfig = () => {
  const c = getCredentials();
  return { configured: Boolean(c), email: c ? c.email : '', scriptCode: getScriptCode() };
};

const SCRIPT_URL_RE = /^https:\/\/script\.google\.com\/(?:a\/[^/]+\/)?macros\/s\/[\w-]+\/exec$/;
const SCRIPT_TIMEOUT_MS = 30000;
// v1 wrote separate "HomeFeet Status/Notes" columns; v2 uses the tab's own
// Lead_Status / FeedBack columns.
// v3 checks HOMEFEET_KEY and can confirm it can edit the project's sheet.
const SCRIPT_VERSION = 3;
const OLD_SCRIPT_MESSAGE = 'This is an old HomeFeet script. Copy the script again, paste it over the old one, then Deploy -> Manage deployments -> edit -> Version: New version -> Deploy.';

class ScriptError extends Error {}

// Apps Script answers POST/GET with a redirect to the result; fetch follows
// it. HTML instead of JSON means the deployment is not open to "Anyone".
const callScript = async (url, body) => {
  const res = await fetchWithTimeout(url, body
    ? { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' }
    : { redirect: 'follow' }, SCRIPT_TIMEOUT_MS);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ScriptError(res.status === 404
      ? 'Apps Script URL not found - copy the Web app URL from Deploy -> Manage deployments'
      : 'Apps Script did not answer - deploy it as a Web app with "Who has access: Anyone"');
  }
  if (!data.ok) throw Object.assign(new ScriptError(`Apps Script error: ${data.error || 'unknown'}`), { code: data.code });
  return data;
};

const sheetIdOf = (url) => (String(url || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/) || [])[1];

const httpError = (message, status) => Object.assign(new Error(message), { status });

// Clean up a pasted web app URL and check it is a HomeFeet script.
// Returns { url, info } or { url: '' } for an empty paste.
const checkScriptUrl = async (rawUrl, minVersion) => {
  // Accept the URL with /exec or /dev, a query string or a trailing slash.
  const raw = String(rawUrl || '').trim();
  if (!raw) return { url: '' };
  const url = `${raw.replace(/\?.*$/, '').replace(/\/+$/, '').replace(/\/(dev|exec)$/, '')}/exec`;
  if (/script\.google\.com\/.*\/projects\//.test(raw)) {
    throw httpError('That is the script editor link. In Apps Script click Deploy -> New deployment -> Web app, then copy the "Web app" URL ending in /exec.', 400);
  }
  if (!SCRIPT_URL_RE.test(url)) {
    throw httpError('That is not an Apps Script web app URL. It looks like https://script.google.com/macros/s/.../exec', 400);
  }
  let info;
  try {
    info = await callScript(url);
  } catch (e) {
    throw httpError(e.message, 422);
  }
  if (info.app !== 'homefeet-writeback') {
    throw httpError('This web app is not the HomeFeet write-back script. Paste the HomeFeet script and deploy again.', 422);
  }
  if ((info.version || 1) < minVersion) throw httpError(OLD_SCRIPT_MESSAGE, 422);
  return { url, info };
};

// Link (or unlink with an empty url) a project's write-back Apps Script.
// Checks it is ours, and that it can open and edit this project's sheet.
const setPropertySheetScript = async (property, rawUrl) => {
  const checked = await checkScriptUrl(rawUrl, SCRIPT_VERSION);
  const { url } = checked;
  let { info } = checked;
  if (!url) {
    property.marketingSheetScriptUrl = '';
    property.marketingSheetScriptLinked = false;
    property.marketingSheetWriteBackStatus = '';
    property.marketingSheetWriteBackMessage = '';
    await property.save();
    return { unlinked: true };
  }
  const projectSheet = sheetIdOf(property.marketingSheetUrl);
  if (!projectSheet) throw httpError('Link this project\'s leads sheet first.', 400);
  if (info.sheetId && info.sheetId !== projectSheet) {
    throw httpError(`This script is in a different sheet ("${info.sheetName}"). Add it to this project's leads sheet.`, 422);
  }
  try {
    info = await callScript(url, { key: scriptKey(), sheetId: projectSheet, ping: true });
  } catch (e) {
    throw httpError(e.code === 'no_access'
      ? `The Google account that deployed the script (${info.account || 'yours'}) cannot open this project's sheet. Share the sheet with it as Editor, or add the script inside this sheet.`
      : e.message, 422);
  }
  property.marketingSheetScriptUrl = url;
  property.marketingSheetScriptLinked = true;
  property.marketingSheetWriteBackStatus = 'ok';
  property.marketingSheetWriteBackMessage = `Connected to "${info.sheetName}"`;
  await property.save();
  return { sheetName: info.sheetName };
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

const fetchWithTimeout = async (url, opts = {}, timeoutMs = TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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

// HomeFeet's line inside a team cell ("<team text>\n[HomeFeet] ...").
const OWN_TEXT_RE = /\n?\[HomeFeet\][\s\S]*$/;
const stripOwnText = (v) => (typeof v === 'string' && v.includes('[HomeFeet]') ? v.replace(OWN_TEXT_RE, '').trimEnd() : v);
const mergeOwnText = (current, text) => {
  const team = String(current || '').replace(OWN_TEXT_RE, '').trimEnd();
  const mine = text ? `[HomeFeet] ${text}` : '';
  return team && mine ? `${team}\n${mine}` : team || mine;
};

// Which existing columns get the status and the notes. Same rules as the
// Apps Script: the team's "Lead_Status" (not Meta's lowercase "lead_status")
// and "FeedBack" / "Leads Feedback" (else remarks/comments/notes).
const pickColumns = (header) => {
  const statusCol = header.findIndex((h) => h !== 'lead_status' && /^lead[\s_-]*status$/i.test(h));
  let feedbackCol = header.findIndex((h) => /feed\s*back/i.test(h));
  if (feedbackCol < 0) feedbackCol = header.findIndex((h) => /^(remarks?|comments?|notes?)$/i.test(h));
  return { statusCol, feedbackCol };
};

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

  const status = statusText(lead);
  const notes = notesText(lead);
  const both = [status, notes].filter(Boolean).join(' — ');
  let { statusCol, feedbackCol } = pickColumns(header);
  const data = [];
  let statusValue = status;
  let feedbackValue = notes;
  if (statusCol < 0) feedbackValue = both;
  if (feedbackCol < 0 && statusCol >= 0) statusValue = both;
  if (feedbackCol < 0 && statusCol < 0) {
    // No usable column in this tab: add one at the end.
    feedbackCol = Math.max(...values.map((r) => r.length));
    feedbackValue = both;
    if (feedbackCol + 1 > tab.columnCount) {
      await sheetsCall(`${sheetId}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ requests: [{ appendDimension: { sheetId: tab.sheetId, dimension: 'COLUMNS', length: feedbackCol + 1 - tab.columnCount } }] })
      });
    }
    data.push({ range: `${quoteTab(tab.title)}!${columnLetter(feedbackCol)}1`, values: [['Lead_Status']] });
  }

  const put = (r, c, text) => data.push({
    range: `${quoteTab(tab.title)}!${columnLetter(c)}${r + 1}`,
    values: [[mergeOwnText(values[r][c], text)]]
  });
  rows.forEach((r) => {
    if (statusCol >= 0) put(r, statusCol, statusValue);
    if (feedbackCol >= 0) put(r, feedbackCol, feedbackValue);
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
    const sheetId = sheetIdOf(property?.marketingSheetUrl);
    const last10 = String(lead.phone || '').replace(/\D/g, '').slice(-10);
    // This project's own script first, else the service account (if set).
    const scriptUrl = property?.marketingSheetScriptUrl;
    if (scriptUrl && last10.length >= 10) {
      let data;
      try {
        data = await callScript(scriptUrl, {
          key: scriptKey(), sheetId, phone: last10, tabs: lead.campaigns || [], status: statusText(lead), notes: notesText(lead)
        });
      } catch (err) {
        if (err.code === 'no_access') {
          throw new NotSharedError('The Google account that deployed the script cannot edit this sheet - share it as Editor');
        }
        throw err;
      }
      const { written = 0, version = 1 } = data;
      result = version < SCRIPT_VERSION
        ? { status: 'failed', message: OLD_SCRIPT_MESSAGE }
        : written
        ? { status: 'ok', message: `Updated ${written} row${written === 1 ? '' : 's'}` }
        : { status: 'failed', message: 'Could not find this phone number in the sheet' };
    } else if (scriptUrl) result = { status: 'skipped', message: 'Lead has no phone number to find its row' };
    else if (!getCredentials()) result = { status: 'not_configured', message: 'Connect Google Sheet write-back for this project (Admin Panel)' };
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
    result = err instanceof NotSharedError || err instanceof ScriptError
      ? { status: err instanceof ScriptError ? 'failed' : 'not_shared', message: err.message }
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

module.exports = { OWN_COLUMN_RE, stripOwnText, mergeOwnText, pickColumns, getWriteBackConfig, setPropertySheetScript, writeBackLead, statusText, notesText, columnLetter };
