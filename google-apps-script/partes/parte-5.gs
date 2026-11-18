/* ── Intonation Practice · parte 5 de 6 ── */

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

/* ── fin de la parte 5 de 6 ── */
