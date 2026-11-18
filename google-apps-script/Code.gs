/*
 * ── Intonation Practice · Google Apps Script ──
 *
 * Recibe las grabaciones de la práctica de entonación (Readings 1 y 2) y las
 * respuestas escritas de la Part 3, y las guarda en tu Google Drive y en esta
 * planilla: una fila por lectura para que pongas la nota, y una por respuesta
 * escrita, corregida sola con la clave.
 *
 * La clave (los patrones con números) solo está en tu copia del script, nunca
 * en la página ni en el repositorio: pegá la copia que te mandaron, no la del
 * repositorio (esa no corrige la Part 3).
 *
 * Instalación (una vez):
 *   1. Creá una planilla nueva (sheets.new) → Extensiones → Apps Script.
 *   2. Borrá lo que haya, pegá todo este archivo (o las partes, en orden) y guardá.
 *   3. Elegí la función «setup» → ▶ Ejecutar → aceptá los permisos.
 *   4. Implementar → Nueva implementación → Aplicación web · Ejecutar como: Yo ·
 *      Quién tiene acceso: Cualquier persona → copiá la URL que termina en /exec.
 * Si cambiás este código: Implementar → Administrar implementaciones → ✏ →
 * Nueva versión.
 */

const APP = 'Intonation Practice';
const VERSION = 1;
const ROOT_FOLDER = 'Intonation Practice — Recordings';
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

const SHEETS = {
  exams: {
    name: 'Exams',
    headers: [
      'Started', 'Student', 'Group', 'Status', 'Readings', 'Written', 'Finished',
      'Left the page', 'Restarts', 'Total', 'Folder', 'Attempt',
    ],
  },
  responses: {
    name: 'Responses',
    headers: [
      'Recorded', 'Student', 'Group', 'Reading', 'Sentences (pattern)',
      'Seconds', 'Recording', 'Score', 'Out of', 'Comments', 'Attempt',
    ],
  },
  written: {
    name: 'Written',
    headers: [
      'Sent', 'Student', 'Group', 'Item', 'Sentence', 'Pattern', 'Answer',
      'Accepted', 'Correct', 'Point', 'Attempt',
    ],
  },
  patterns: {
    name: 'Patterns',
    headers: ['Part', 'Item', 'Sentence (words in bold in CAPITALS)', 'Pattern', 'Pitch levels', 'Note'],
  },
  rubric: {
    name: 'Rubric',
    headers: ['Part', 'How to score'],
  },
};
const EX = { status: 4, readings: 5, written: 6, finished: 7, left: 8, restarts: 9, total: 10, folder: 11, attempt: 12 };
const RE = { label: 4, recording: 7, score: 8, max: 9, attempt: 11 };
const WR = { point: 10, attempt: 11 };

/* exam:start */
/* The practice, as the page shows it. Made from js/format.js: npm run gs. */
const READINGS_META = [
  ["r1","Reading 1",15],
  ["r2","Reading 2",15],
];
const QUESTIONS = READINGS_META.map(function (r) { return r[0]; });
const LABELS = {};
const MAX = {};
READINGS_META.forEach(function (r) { LABELS[r[0]] = r[1]; MAX[r[0]] = r[2]; });
const TOTAL = 40;
const WRITTEN_ITEMS = [
  [1,"What time does the class start?","Wh-question"],
  [2,"Is the museum open on Sundays?","Yes-no question"],
  [3,"You saw who at the party?","Echo question"],
  [4,"Summer here is hotter than winter.","Comparison"],
  [5,"WHEN THE RAIN STOPS, we’ll go outside.","Nonfinal: closely connected"],
  [6,"I need eggs, milk, and butter.","Series with and"],
  [7,"Do you want the red one, or the blue one?","Alternative question requiring a choice"],
  [8,"Would you like some soup, or a salad?","Double yes-no question"],
  [9,"KEVIN, can you hear me?","Direct address"],
  [10,"This exercise is easy, ISN’T IT?","Tag question (agreement expected)"],
];
/* The answers of Part 3: only in the teacher’s own copy (empty: Part 3 is not graded). */
const WRITTEN_KEY = [];

/* ✂ */

/* Every sentence and its pattern (the «Patterns» tab); the pitch levels only in the teacher’s copy. */
const PATTERNS_1 = [
  ["Reading 1",1,"The train leaves at noon.","Statement","",""],
  ["Reading 1",2,"Did you finish the report?","Yes-no question","",""],
  ["Reading 1",3,"She moved to which city?","Echo question","",""],
  ["Reading 1",4,"My brother is taller than my father.","Comparison","",""],
  ["Reading 1",5,"I never said that.","Implicit contrast","",""],
  ["Reading 1",6,"DON’T WAIT FOR ME; I’ll be late.","Nonfinal: distantly connected","",""],
  ["Reading 1",7,"We bought apples, pears, and grapes.","Series with and","",""],
  ["Reading 1",8,"You can pay in cash, by card, or by check.","Alternatives with or","",""],
  ["Reading 1",9,"Would you like tea, or coffee?","Alternative question requiring a choice","",""],
  ["Reading 1",10,"Have you been to Mexico, or Peru?","Double yes-no question","",""],
  ["Reading 1",11,"PROFESSOR, may I come in?","Direct address","",""],
  ["Reading 1",12,"The meeting isn’t today, IS IT?","Tag question (real question)","",""],
  ["Reading 1",13,"That movie was great, WASN’T IT?","Tag question (agreement expected)","",""],
  ["Reading 1",14,"Did YOU take my keys?","Focus","",""],
  ["Reading 1",15,"WHEN I OPENED THE DOOR, the room was empty.","Nonfinal: suspense","",""],
];
const PATTERNS_2 = [
  ["Reading 2",1,"Why is the store closed today?","Wh-question","",""],
  ["Reading 2",2,"You’re leaving already?","Yes-no question (statement word order)","",""],
  ["Reading 2",3,"You left your phone where?","Echo question","",""],
  ["Reading 2",4,"She studies at night, not in the morning.","Contrast","",""],
  ["Reading 2",5,"THIS one is broken.","Implicit contrast","",""],
  ["Reading 2",6,"IF YOU NEED HELP, just call me.","Nonfinal: closely connected","",""],
  ["Reading 2",7,"She speaks English, French, and German.","Series with and","",""],
  ["Reading 2",8,"We can meet on Monday, Tuesday, or Friday.","Alternatives with or","",""],
  ["Reading 2",9,"Is your class at ten, or at eleven?","Alternative question requiring a choice","",""],
  ["Reading 2",10,"Do you need a pen, or some paper?","Double yes-no question","",""],
  ["Reading 2",11,"DOCTOR SMITH, your patient is here.","Direct address","",""],
  ["Reading 2",12,"You didn’t lock the door, DID YOU?","Tag question (real question)","",""],
  ["Reading 2",13,"It’s cold this morning, ISN’T IT?","Tag question (agreement expected)","",""],
  ["Reading 2",14,"Are you driving to WORK tomorrow?","Focus","",""],
  ["Reading 2",15,"Close the window, ANNA.","Command + direct address","",""],
];
const PATTERNS_3 = [
  ["Part 3",1,"What time does the class start?","Wh-question","",""],
  ["Part 3",2,"Is the museum open on Sundays?","Yes-no question","",""],
  ["Part 3",3,"You saw who at the party?","Echo question","",""],
  ["Part 3",4,"Summer here is hotter than winter.","Comparison","",""],
  ["Part 3",5,"WHEN THE RAIN STOPS, we’ll go outside.","Nonfinal: closely connected","",""],
  ["Part 3",6,"I need eggs, milk, and butter.","Series with and","",""],
  ["Part 3",7,"Do you want the red one, or the blue one?","Alternative question requiring a choice","",""],
  ["Part 3",8,"Would you like some soup, or a salad?","Double yes-no question","",""],
  ["Part 3",9,"KEVIN, can you hear me?","Direct address","",""],
  ["Part 3",10,"This exercise is easy, ISN’T IT?","Tag question (agreement expected)","",""],
];

function patternRows_() {
  return [].concat(PATTERNS_1, PATTERNS_2, PATTERNS_3);
}
/* exam:end */

/* ✂ */

function setup() {
  return withLock_(function () {
    Object.keys(SHEETS).forEach(function (k) { sheet_(k); });
    reference_('patterns', patternRows_().map(function (r) {
      return r.slice(0, 4).concat([asText_(r[4]), r[5]]);
    }));
    reference_('rubric', rubric_());
    rootFolder_();
    const msg = 'Listo: hojas Exams, Responses, Written, Patterns y Rubric, y la carpeta «' + ROOT_FOLDER +
      '» en tu Drive.' + (WRITTEN_KEY.length ? '' : ' OJO: esta copia no tiene la clave y no corrige la Part 3.') +
      ' Ahora implementá la aplicación web.';
    Logger.log(msg);
    return msg;
  });
}

function rubric_() {
  return [
    ['Readings 1 and 2', 'A point for each sentence said with the intonation of its pattern: 0 to ' + MAX.r1 +
      ' for each reading. The pitch levels of every sentence are on the «Patterns» tab.'],
    ['Part 3', 'Graded by the script: a point for each pattern written correctly, 0 to ' + WRITTEN_ITEMS.length +
      '. The «Written» tab shows each answer and the answers accepted.'],
    ['Total', TOTAL + ' points.'],
  ];
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu(APP).addItem('Configurar (setup)', 'setup').addToUi();
}

function doGet() {
  const name = SpreadsheetApp.getActiveSpreadsheet().getName();
  return json_({ ok: true, app: APP, sheet: name, version: VERSION, graded: WRITTEN_KEY.length > 0 });
}

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data.type === 'start') return json_(withLock_(function () { return start_(data); }));
    if (data.type === 'recording') return json_(recording_(data));
    if (data.type === 'answers') return json_(withLock_(function () { return answers_(data); }));
    if (data.type === 'finish') return json_(withLock_(function () { return finish_(data); }));
    throw new Error('Pedido desconocido: ' + String(data.type));
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

/* ─── requests ─── */

function start_(d) {
  const who = person_(d);
  const sheet = sheet_('exams');
  if (findRow_(sheet, EX.attempt, who.attempt)) return { ok: true, duplicate: true };
  const folder = studentFolder_(who);
  sheet.appendRow([
    date_(d.startedAt), text_(who.student), text_(who.group), d.demo ? 'demo' : 'started',
    0, '', '', '', '', '', folder.getUrl(), who.attempt,
  ]);
  const r = sheet.getLastRow();
  const a = 'L' + r;
  sheet.getRange(r, EX.total).setFormula(
    '=IF(COUNTIFS(Responses!K:K,' + a + ',Responses!H:H,"<>")+COUNTIFS(Written!K:K,' + a + ',Written!J:J,"<>")=0,"",' +
      'SUMIFS(Responses!H:H,Responses!K:K,' + a + ')+SUMIFS(Written!J:J,Written!K:K,' + a + '))'
  );
  return { ok: true };
}

function finish_(d) {
  const who = person_(d);
  const sheet = sheet_('exams');
  let row = findRow_(sheet, EX.attempt, who.attempt);
  if (!row) {
    start_(d);
    row = sheet.getLastRow();
  }
  sheet.getRange(row, EX.status).setValue('finished');
  sheet.getRange(row, EX.readings).setValue(countRows_(sheet_('responses'), RE.attempt, who.attempt));
  sheet.getRange(row, EX.finished).setValue(date_(d.finishedAt));
  sheet.getRange(row, EX.left).setValue(Number(d.leftPage) || 0);
  sheet.getRange(row, EX.restarts).setValue(Number(d.resumed) || 0);
  return { ok: true };
}

/* ✂ */

function recording_(d) {
  const who = person_(d);
  if (QUESTIONS.indexOf(d.qid) < 0) throw new Error('Lectura desconocida.');
  const mime = String(d.mime || '').split(';')[0];
  if (mime.indexOf('audio/') !== 0) throw new Error('Eso no es un audio.');
  if (!d.audio) throw new Error('No llegó el audio.');
  const bytes = Utilities.base64Decode(d.audio);
  if (bytes.length > MAX_AUDIO_BYTES) throw new Error('La grabación es demasiado grande.');

  /* The same reading sent again (the first one did arrive) gets the same file back. */
  const sheet = sheet_('responses');
  const existing = findResponse_(sheet, who.attempt, d.qid);
  if (existing) return { ok: true, duplicate: true, url: existing };

  const ext = /mp4|m4a|aac/.test(d.mime) ? 'm4a' : /ogg/.test(d.mime) ? 'ogg' : 'webm';
  const file = studentFolder_(who).createFile(Utilities.newBlob(bytes, mime, LABELS[d.qid] + '.' + ext));
  file.setDescription(String(d.prompt || '').slice(0, 1000));
  const url = file.getUrl();

  withLock_(function () {
    if (findResponse_(sheet, who.attempt, d.qid)) return;
    sheet.appendRow([
      date_(d.recordedAt), text_(who.student), text_(who.group), LABELS[d.qid],
      text_(String(d.prompt || '').slice(0, 2000)), Math.round(Number(d.durationSec) || 0),
      '', '', MAX[d.qid], '', who.attempt,
    ]);
    const last = sheet.getLastRow();
    sheet.getRange(last, RE.recording).setFormula('=HYPERLINK("' + url + '","▶ Listen")');
    scoreRule_(sheet.getRange(last, RE.score), MAX[d.qid]);
    const exams = sheet_('exams');
    const row = findRow_(exams, EX.attempt, who.attempt);
    if (row) exams.getRange(row, EX.readings).setValue(countRows_(sheet, RE.attempt, who.attempt));
  });
  return { ok: true, url: url, id: file.getId() };
}

/* Part 3: one row per sentence, graded with the key (if this copy has it). */
function answers_(d) {
  const who = person_(d);
  const list = Array.isArray(d.answers) ? d.answers : [];
  if (list.length !== WRITTEN_ITEMS.length) throw new Error('Faltan respuestas.');
  const sheet = sheet_('written');
  if (countRows_(sheet, WR.attempt, who.attempt)) return { ok: true, duplicate: true };
  const graded = WRITTEN_KEY.length === WRITTEN_ITEMS.length;
  let points = 0;
  WRITTEN_ITEMS.forEach(function (item, i) {
    const answer = String(list[i] == null ? '' : list[i]).slice(0, 40);
    const accepted = graded ? WRITTEN_KEY[i] : [];
    const right = graded && accepted.map(normalize_).indexOf(normalize_(answer)) >= 0 && normalize_(answer) !== '';
    if (right) points++;
    sheet.appendRow([
      date_(d.sentAt), text_(who.student), text_(who.group), item[0], item[1], item[2],
      asText_(answer), asText_(accepted.join('  or  ')), graded ? (right ? '✓' : '✗') : '', graded ? (right ? 1 : 0) : '',
      who.attempt,
    ]);
  });
  const exams = sheet_('exams');
  const row = findRow_(exams, EX.attempt, who.attempt);
  if (row) exams.getRange(row, EX.written).setValue(graded ? points : 'sent');
  return { ok: true, graded: graded };
}

/* A written answer as it is compared: no spaces around the hyphens, a slash between
   thought groups (a comma or a bar counts as one), only digits, hyphens and slashes. */
function normalize_(answer) {
  return String(answer || '')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s*[\/|,;]\s*/g, '/')
    .replace(/\s*-\s*/g, '-')
    .replace(/[^0-9\/-]/g, '')
    .replace(/^[\/-]+|[\/-]+$/g, '');
}

/* ✂ */

/* ─── helpers ─── */

function person_(d) {
  const attempt = String(d.attempt || '');
  if (!/^[\w-]{6,40}$/.test(attempt)) throw new Error('Intento inválido.');
  const student = String(d.student || '').trim().slice(0, 80);
  if (!student) throw new Error('Falta el nombre.');
  const group = String(d.group || '').trim().slice(0, 40);
  return { attempt: attempt, student: student, group: group };
}

/* The score cell only takes a number from 0 to the points of its reading. */
function scoreRule_(range, max) {
  try {
    range.setDataValidation(
      SpreadsheetApp.newDataValidation().requireNumberBetween(0, max).setAllowInvalid(false)
        .setHelpText('A number from 0 to ' + max + '.').build()
    );
  } catch (err) {
    Logger.log('Score rule: ' + err.message);
  }
}

/* The Patterns and Rubric tabs are rewritten each time setup runs. */
function reference_(key, rows) {
  const sheet = sheet_(key);
  const headers = SHEETS[key].headers;
  if (sheet.getLastRow() > 0) {
    sheet.getRange(1, 1, sheet.getLastRow(), Math.max(sheet.getLastColumn(), headers.length)).clearContent();
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function sheet_(key) {
  const def = SHEETS[key];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(def.name);
  if (!sheet) {
    sheet = ss.insertSheet(def.name);
    sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRow_(sheet, col, value) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const values = sheet.getRange(2, col, last - 1, 1).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (String(values[i][0]) === value) return i + 2;
  }
  return 0;
}

function countRows_(sheet, col, value) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  return sheet.getRange(2, col, last - 1, 1).getValues()
    .filter(function (r) { return String(r[0]) === value; }).length;
}

/* ✂ */

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
