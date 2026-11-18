/* ── Intonation Practice · parte 4 de 6 ── */

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

/* ── fin de la parte 4 de 6 ── */
