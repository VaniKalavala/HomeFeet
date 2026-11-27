/**
 * HomeFeet -> Google Sheet write-back.
 *
 * Writes the owner/builder's lead stage and notes from HomeFeet into this
 * sheet, in two columns added at the end of each tab:
 *   HomeFeet Status | HomeFeet Notes
 * Your own columns are never changed.
 *
 * Setup (once per sheet):
 *   1. In this sheet: Extensions -> Apps Script. Delete what is there,
 *      paste this whole file, click Save.
 *   2. Deploy -> New deployment -> type "Web app".
 *        Execute as: Me
 *        Who has access: Anyone
 *      Click Deploy and allow access when Google asks.
 *   3. Copy the Web app URL (ends in /exec) and paste it in HomeFeet
 *      Admin Panel -> the project -> Marketing Leads -> Apps Script URL.
 */
var STATUS_HEADER = 'HomeFeet Status';
var NOTES_HEADER = 'HomeFeet Notes';

// HomeFeet calls this to check the link points at the right sheet.
function doGet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return json_({ ok: true, app: 'homefeet-writeback', version: 1, sheetId: ss.getId(), sheetName: ss.getName() });
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
    return json_({ ok: true, written: written });
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
  var values = sh.getRange(1, 1, lastRow, lastCol).getDisplayValues();

  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (rowHasPhone_(values[i], last10)) rows.push(i + 1);
  }
  if (!rows.length) return 0;

  var header = values[0].map(function (h) { return String(h).trim().replace(/\s+/g, ' ').toLowerCase(); });
  var statusCol = header.indexOf(STATUS_HEADER.toLowerCase()) + 1;
  var notesCol = header.indexOf(NOTES_HEADER.toLowerCase()) + 1;
  var next = lastCol + 1;
  if (!statusCol) statusCol = next++;
  if (!notesCol) notesCol = next++;
  var needed = Math.max(statusCol, notesCol);
  if (needed > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), needed - sh.getMaxColumns());
  if (statusCol > lastCol) sh.getRange(1, statusCol).setValue(STATUS_HEADER);
  if (notesCol > lastCol) sh.getRange(1, notesCol).setValue(NOTES_HEADER);

  rows.forEach(function (r) {
    // Leading apostrophe keeps text like "+91..." or "=..." as plain text.
    sh.getRange(r, statusCol).setValue(status ? "'" + status : '');
    sh.getRange(r, notesCol).setValue(notes ? "'" + notes : '');
  });
  return rows.length;
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
