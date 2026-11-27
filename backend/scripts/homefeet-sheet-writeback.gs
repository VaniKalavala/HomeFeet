/**
 * HomeFeet -> Google Sheet write-back (one per project's leads sheet).
 *
 * Lets HomeFeet write the owner/builder's lead stage and notes into this
 * sheet's existing "Lead_Status" and "FeedBack" columns. HomeFeet decides
 * what goes in each cell; this script only reads the sheet and writes the
 * cells HomeFeet sends, so it never needs changing when HomeFeet changes.
 *
 * Setup (in each project's leads sheet):
 *   1. Open the project's leads sheet -> Extensions -> Apps Script.
 *      Delete the sample code, paste this whole file, click Save.
 *   2. Deploy -> New deployment -> type "Web app".
 *        Execute as: Me
 *        Who has access: Anyone
 *      Click Deploy and allow access when Google asks.
 *   3. Copy the Web app URL (ends in /exec) and paste it in HomeFeet
 *      Admin Panel -> that project -> Marketing Leads -> Sheet write-back.
 *
 * HOMEFEET_KEY below is unique to your HomeFeet server, so only HomeFeet can
 * use this script. Copy the script from HomeFeet's Admin Panel.
 */
var HOMEFEET_KEY = '__HOMEFEET_KEY__';
var VERSION = 5;

// HomeFeet calls this to check the link points at the right sheet.
function doGet() {
  var info = { ok: true, app: 'homefeet-writeback', version: VERSION, account: '' };
  try { info.account = Session.getEffectiveUser().getEmail(); } catch (err) { /* not available */ }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) { info.sheetId = ss.getId(); info.sheetName = ss.getName(); }
  return json_(info);
}

// Body: { key, sheetId, action: 'ping' | 'read' | 'write', ... }
//   read:  { tabs: [names] }  -> every tab (or just these) with its cell text
//   write: { tab, columns, cells: [{ row, col, value }] } (1-based row/col)
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.key !== HOMEFEET_KEY) return json_({ ok: false, error: 'Wrong HomeFeet key - copy the script again from HomeFeet' });

    var ss;
    try {
      ss = body.sheetId ? SpreadsheetApp.openById(body.sheetId) : SpreadsheetApp.getActiveSpreadsheet();
    } catch (err) {
      return json_({ ok: false, code: 'no_access', error: 'This Google account cannot open the sheet' });
    }
    if (!ss) return json_({ ok: false, code: 'no_access', error: 'No sheet given' });

    if (body.action === 'read') {
      var wanted = body.tabs || [];
      var sheets = ss.getSheets();
      var picked = sheets.filter(function (s) { return wanted.indexOf(s.getName()) >= 0; });
      var tabs = (picked.length ? picked : sheets).map(function (sh) {
        var rows = sh.getLastRow();
        var cols = sh.getLastColumn();
        return {
          title: sh.getName(),
          maxColumns: sh.getMaxColumns(),
          values: rows && cols ? sh.getRange(1, 1, rows, cols).getDisplayValues() : []
        };
      });
      return json_({ ok: true, version: VERSION, tabs: tabs });
    }

    if (body.action === 'write') {
      var sh = ss.getSheetByName(body.tab);
      if (!sh) return json_({ ok: false, error: 'Tab not found: ' + body.tab });
      try {
        var max = sh.getMaxColumns();
        if (body.columns > max) sh.insertColumnsAfter(max, body.columns - max);
        (body.cells || []).forEach(function (c) {
          var v = String(c.value == null ? '' : c.value);
          // Leading apostrophe keeps text starting with "=", "+", "-" or "@" as plain text.
          sh.getRange(c.row, c.col).setValue(/^[=+\-@]/.test(v) ? "'" + v : v);
        });
      } catch (err) {
        if (/permission|access/i.test(String(err && err.message))) {
          return json_({ ok: false, code: 'no_access', error: 'This Google account can view but not edit the sheet' });
        }
        throw err;
      }
      return json_({ ok: true, version: VERSION, written: (body.cells || []).length });
    }

    return json_({ ok: true, version: VERSION, sheetName: ss.getName() });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
