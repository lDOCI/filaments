// =============================================================
// SPOOL WEIGHTS — receiver for user contributions
// =============================================================
// Setup:
// 1. Open the target Google Sheet:
//    https://docs.google.com/spreadsheets/d/1idl558M-zNY70qAzq89uUnyKYhOy0rJzmWw5GexVQiY/edit
// 2. Extensions → Apps Script. Delete default code, paste this file.
// 3. Save (project name: "spool-weights-receiver").
// 4. Deploy → New deployment → type "Web app".
//    - Description: spool-weights v1
//    - Execute as: Me
//    - Who has access: Anyone
//    - Click Deploy → authorize → copy the Web app URL.
// 5. Send the URL back. Site will POST JSON to it.
// =============================================================

// CONFIG
const SHEET_NAME = 'Submissions';   // tab name; created if missing
const PHOTO_FOLDER_NAME = 'Spool weights — photos'; // Drive folder; created if missing

// One row = one contribution. Header row written automatically.
const HEADERS = [
  'Timestamp',
  'Filament ID',
  'Brand + Material',
  'Spool weight (g)',
  'Comment',
  'Nick',
  'Photo URL',
  'Status',           // empty = new; you fill 'approved' / 'rejected' manually
  'User-Agent',
  'IP (best-effort)',
];

// ============= Public endpoint =============
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Basic validation
    if (!data.filamentId || !data.brandMaterial || !data.spoolWeight) {
      return _json({ ok: false, error: 'missing required fields' });
    }
    const weight = Number(data.spoolWeight);
    if (!isFinite(weight) || weight <= 0 || weight > 5000) {
      return _json({ ok: false, error: 'invalid weight' });
    }

    // Optional photo (base64 dataURL)
    let photoUrl = '';
    if (data.photoDataUrl) {
      photoUrl = _savePhoto(data.photoDataUrl, data.filamentId);
    }

    const sheet = _ensureSheet();
    sheet.appendRow([
      new Date(),
      String(data.filamentId).slice(0, 200),
      String(data.brandMaterial).slice(0, 300),
      weight,
      String(data.comment || '').slice(0, 1000),
      String(data.nick || '').slice(0, 100),
      photoUrl,
      '',
      String((e.parameter && e.parameter.ua) || '').slice(0, 200),
      '',
    ]);

    return _json({ ok: true });
  } catch (err) {
    return _json({ ok: false, error: String(err && err.message || err) });
  }
}

// CORS preflight
function doOptions() {
  return _json({}).setHeader('Access-Control-Allow-Origin', '*');
}

// Optional GET ping — useful to test the endpoint in the browser
function doGet() {
  return _json({ ok: true, hint: 'POST JSON here: { filamentId, brandMaterial, spoolWeight, comment?, nick?, photoDataUrl? }' });
}

// ============= internals =============
function _ensureSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    // Format
    const range = sheet.getRange(1, 1, 1, HEADERS.length);
    range.setFontWeight('bold').setBackground('#fff4b0');
    sheet.setColumnWidth(1, 150);   // timestamp
    sheet.setColumnWidth(2, 180);   // id
    sheet.setColumnWidth(3, 240);   // brand+material
    sheet.setColumnWidth(4, 110);   // weight
    sheet.setColumnWidth(5, 280);   // comment
    sheet.setColumnWidth(6, 120);   // nick
    sheet.setColumnWidth(7, 240);   // photo url
    sheet.setColumnWidth(8, 100);   // status
  }
  return sheet;
}

function _savePhoto(dataUrl, filamentId) {
  const m = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return '';
  const mime = m[1];
  const bytes = Utilities.base64Decode(m[2]);
  const blob = Utilities.newBlob(bytes, mime, `${filamentId}_${Date.now()}.${mime.split('/')[1] || 'jpg'}`);

  const folder = _ensureFolder();
  const file = folder.createFile(blob);
  // make link-shareable
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function _ensureFolder() {
  const it = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(PHOTO_FOLDER_NAME);
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
