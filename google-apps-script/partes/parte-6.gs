/* ── Intonation Practice · parte 6 de 6 ── */

/* The recording link of a reading already saved, or ''. */
function findResponse_(sheet, attempt, qid) {
  const last = sheet.getLastRow();
  if (last < 2) return '';
  const rows = sheet.getRange(2, 1, last - 1, SHEETS.responses.headers.length).getValues();
  const formulas = sheet.getRange(2, RE.recording, last - 1, 1).getFormulas();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][RE.attempt - 1]) === attempt && String(rows[i][RE.label - 1]) === LABELS[qid]) {
      const m = String(formulas[i][0]).match(/HYPERLINK\("([^"]+)"/);
      return m ? m[1] : 'saved';
    }
  }
  return '';
}

/* The practice's folder. The script remembers which one it is, so a second
   folder with the same name is never made (and it can be renamed or moved). */
function rootFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ROOT_FOLDER_ID');
  if (id) {
    try {
      const kept = DriveApp.getFolderById(id);
      if (!kept.isTrashed()) return kept;
    } catch (err) {
      Logger.log('The folder is gone: making it again.');
    }
  }
  const it = DriveApp.getFoldersByName(ROOT_FOLDER);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(ROOT_FOLDER);
  props.setProperty('ROOT_FOLDER_ID', folder.getId());
  return folder;
}

function childFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/* Intonation Practice — Recordings / <group> / <student> · <attempt> */
function studentFolder_(who) {
  const group = childFolder_(rootFolder_(), who.group || 'No group');
  return childFolder_(group, who.student.replace(/[\\/:*?"<>|]/g, '-') + ' · ' + who.attempt.slice(-6));
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* Pitch numbers stay text: the sheet would read numbers joined by hyphens as a date. */
function asText_(s) {
  s = String(s || '');
  return s ? "'" + s : '';
}

/* Text that looks like a formula is kept as text. */
function text_(s) {
  s = String(s || '');
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function date_(iso) {
  const d = new Date(iso);
  return isNaN(d) ? new Date() : d;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ── fin de la parte 6 de 6 ── */
