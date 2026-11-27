/**
 * HomeFeet -> Google Sheet write-back.
 *
 * Writes the owner/builder's lead stage and notes from HomeFeet into the
 * existing "Lead_Status" and "FeedBack" (or "Leads Feedback") columns of
 * each tab. What your team typed in those cells is kept: HomeFeet adds or
 * replaces only its own line, which starts with "[HomeFeet]".
 *
 * Setup (once per sheet):
 *   1. In this sheet: Extensions -> Apps Script. Delete what is there,
 *      paste this whole file, click Save.
 *   2. Deploy -> New deployment -> type "Web app".
 *        Execute as: Me
 *        Who has access: Anyone
 *      Click Deploy and allow access when Google asks.
 *      (Updating an existing script: Deploy -> Manage deployments -> edit
 *      -> Version: New version -> Deploy. The URL stays the same.)
 *   3. Copy the Web app URL (ends in /exec) and paste it in HomeFeet
 *      Admin Panel -> the project -> Marketing Leads -> Apps Script URL.
 */

// HomeFeet calls this to check the link points at the right sheet.
function doGet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return json_({ ok: true, app: 'homefeet-writeback', version: 2, sheetId: ss.getId(), sheetName: ss.getName() });
}

// Body: { phone, tabs: [tab names], status, notes }
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var last10 = String(body.phone || '').replace(/\D/g, '').slice(-10);
    if (last10.length < 10) return json_({ ok: false, error: 'No phone number' });

    var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
    var wanted = body.tabs || [];
    if (wanted.length) {
      var picked = sheets.filter(function (s) { return wanted.indexOf(s.getName()) >= 0; });
      if (picked.length) sheets = picked;
    }
    var written = 0;
    sheets.forEach(function (sh) {
      written += writeSheet_(sh, last10, String(body.status || ''), String(body.notes || ''));
    });
    return json_({ ok: true, version: 2, written: written });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function writeSheet_(sh, last10, status, notes) {
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return 0;
  var range = sh.getRange(1, 1, lastRow, lastCol);
  var values = range.getDisplayValues();

  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (rowHasPhone_(values[i], last10)) rows.push(i + 1);
  }
  if (!rows.length) return 0;

  // The team's own columns: "Lead_Status" (not Meta's lowercase
  // "lead_status") and "FeedBack" / "Leads Feedback" / remarks / notes.
  var header = values[0].map(function (h) { return String(h).trim(); });
  var statusCol = findCol_(header, function (h) { return h !== 'lead_status' && /^lead[\s_-]*status$/i.test(h); });
  var feedbackCol = findCol_(header, function (h) { return /feed\s*back/i.test(h); });
  if (!feedbackCol) feedbackCol = findCol_(header, function (h) { return /^(remarks?|comments?|notes?)$/i.test(h); });

  var statusText = status;
  var feedbackText = notes;
  if (!statusCol) feedbackText = [status, notes].filter(String).join(' — ');
  if (!feedbackCol && statusCol) statusText = [status, notes].filter(String).join(' — ');
  if (!feedbackCol && !statusCol) {
    // No usable column in this tab: add one at the end.
    feedbackCol = lastCol + 1;
    if (feedbackCol > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), 1);
    sh.getRange(1, feedbackCol).setValue('Lead_Status');
    feedbackText = [status, notes].filter(String).join(' — ');
  }

  rows.forEach(function (r) {
    if (statusCol) setOwn_(sh, r, statusCol, statusText);
    if (feedbackCol) setOwn_(sh, r, feedbackCol, feedbackText);
  });
  return rows.length;
}

function findCol_(header, test) {
  for (var c = 0; c < header.length; c++) if (test(header[c])) return c + 1;
  return 0;
}

// Keep whatever the team typed; HomeFeet owns only its "[HomeFeet] ..." line.
function setOwn_(sh, row, col, text) {
  var cell = sh.getRange(row, col);
  var team = String(cell.getDisplayValue() || '').replace(/\n?\[HomeFeet\][\s\S]*$/, '').replace(/\s+$/, '');
  var mine = text ? '[HomeFeet] ' + text : '';
  var value = team && mine ? team + '\n' + mine : (team || mine);
  // Leading apostrophe keeps text that starts with "=" or "+" as plain text.
  cell.setValue(/^[=+\-@]/.test(value) ? "'" + value : value);
}

// Any cell holding the same phone (last 10 digits), e.g. "p:+919876543210".
function rowHasPhone_(row, last10) {
  for (var c = 0; c < row.length; c++) {
    var v = String(row[c] || '').trim();
    if (/^(p:)?\s*\+?[\d\s-]{10,}$/i.test(v) && v.replace(/\D/g, '').slice(-10) === last10) return true;
  }
  return false;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
