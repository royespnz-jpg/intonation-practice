/* ── Intonation Practice · parte 3 de 6 ── */

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

/* ── fin de la parte 3 de 6 ── */
