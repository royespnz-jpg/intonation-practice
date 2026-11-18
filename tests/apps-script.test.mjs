import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import { splitCode, stripMarkers, MAX_LINES } from '../scripts/split-gs.mjs';
import { metaRows, writtenItems, patternRows } from '../scripts/exam-gs.mjs';
import { RESPONSES, WRITTEN, TOTAL_POINTS, normalize } from '../js/format.js';
import { SCRIPT_VERSION, SCRIPT_APP } from '../js/config.js';

const DIR = new URL('../google-apps-script/', import.meta.url);
const code = readFileSync(new URL('Code.gs', DIR), 'utf8');
const PRIVATE = new URL('private/Code.gs', DIR);
const ROOT = 'Intonation Practice — Recordings';

// A small stand-in for the Google services the script uses.
function makeEnv(src = code) {
  const sheets = new Map();
  const makeSheet = (name) => {
    const data = [];
    const formulas = new Map();
    const rules = new Map();
    return {
      name,
      data,
      formulas,
      rules,
      getLastRow: () => data.length,
      getLastColumn: () => Math.max(0, ...data.map((r) => r.length)),
      appendRow: (row) => data.push([...row]),
      setFrozenRows: () => {},
      getRange: (r, c, nr = 1, nc = 1) => ({
        setValues: (vals) => {
          vals.forEach((row, i) => row.forEach((v, j) => ((data[r - 1 + i] ??= [])[c - 1 + j] = v)));
          return { setFontWeight: () => {} };
        },
        setValue: (v) => ((data[r - 1] ??= [])[c - 1] = v),
        setFormula: (f) => formulas.set(`${r},${c}`, f),
        setDataValidation: (rule) => rules.set(`${r},${c}`, rule),
        clearContent: () => data.splice(r - 1, nr),
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => data[r - 1 + i]?.[c - 1 + j] ?? '')),
        getFormulas: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => formulas.get(`${r + i},${c + j}`) ?? '')),
        setFontWeight: () => {},
      }),
    };
  };
  const folders = new Map();
  const files = [];
  const props = new Map();
  const makeFolder = (path) => {
    if (folders.has(path)) return folders.get(path);
    const f = {
      path,
      getId: () => `folder:${path}`,
      isTrashed: () => false,
      getUrl: () => `https://drive/${encodeURIComponent(path)}`,
      getFoldersByName: (name) => iter(folders.has(`${path}/${name}`) ? [folders.get(`${path}/${name}`)] : []),
      createFolder: (name) => makeFolder(`${path}/${name}`),
      createFile: (blob) => {
        const n = files.length;
        const file = { blob, folder: path, getUrl: () => `https://drive/file/${n}`, getId: () => `id${n}`, setDescription: (d) => (file.description = d) };
        files.push(file);
        return file;
      },
    };
    folders.set(path, f);
    return f;
  };
  const iter = (items) => {
    let i = 0;
    return { hasNext: () => i < items.length, next: () => items[i++] };
  };
  const ctx = {
    console,
    Logger: { log: () => {} },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getName: () => 'Intonation 2026',
        getSheetByName: (n) => sheets.get(n) || null,
        insertSheet: (n) => {
          const s = makeSheet(n);
          sheets.set(n, s);
          return s;
        },
      }),
      newDataValidation: () => {
        const rule = {};
        const b = {
          requireNumberBetween: (min, max) => ((rule.min = min), (rule.max = max), b),
          setAllowInvalid: (allow) => ((rule.allowInvalid = allow), b),
          setHelpText: (text) => ((rule.help = text), b),
          build: () => rule,
        };
        return b;
      },
    },
    DriveApp: {
      getFoldersByName: (name) => iter(folders.has(name) ? [folders.get(name)] : []),
      createFolder: (name) => makeFolder(name),
      getFolderById: (id) => {
        const f = [...folders.values()].find((x) => x.getId() === id);
        if (!f) throw new Error('not found');
        return f;
      },
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v) }) },
    Utilities: { base64Decode: (s) => [...Buffer.from(s, 'base64')], newBlob: (bytes, type, name) => ({ bytes, type, name }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (body) => ({ body, setMimeType() { return this; } }) },
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const post = (payload) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(payload) } }).body);
  return { ctx, post, sheets, files, folders };
}

const plainJSON = (x) => JSON.parse(JSON.stringify(x));
const who = { attempt: 'mh1abc-x7y8z9', student: 'Ana Pérez', group: '3B' };
const audio = Buffer.from('fake webm').toString('base64');
const blank = WRITTEN.map(() => '');

test('setup makes the sheets, the patterns, the rubric and the Drive folder', () => {
  const { ctx, sheets, folders } = makeEnv();
  assert.match(ctx.setup(), /Listo/);
  assert.match(ctx.setup(), /no tiene la clave/, 'the public copy says it can’t grade Part 3');
  assert.deepEqual([...sheets.keys()], ['Exams', 'Responses', 'Written', 'Patterns', 'Rubric']);
  const patterns = sheets.get('Patterns').data;
  assert.equal(patterns.length, 1 + patternRows().length);
  assert.ok(patterns.slice(1).every((r) => r[4] === '' && r[5] === ''), 'the public copy has no pitch levels');
  assert.deepEqual(patterns[1].slice(0, 4), ['Reading 1', 1, 'The train leaves at noon.', 'Statement']);
  assert.equal(sheets.get('Rubric').data.length, 4);
  assert.match(sheets.get('Rubric').data[3][1], /^40 points\.$/);
  assert.ok(folders.has(ROOT));
  const info = JSON.parse(ctx.doGet().body);
  assert.deepEqual(info, { ok: true, app: 'Intonation Practice', sheet: 'Intonation 2026', version: 1, graded: false });
  assert.equal(info.app, SCRIPT_APP);
  assert.ok(info.version >= SCRIPT_VERSION);
});

test('the practice in the script is the one on the page', () => {
  const { ctx } = makeEnv();
  assert.deepEqual(plainJSON(vm.runInContext('READINGS_META', ctx)), metaRows(), 'run: npm run gs');
  assert.deepEqual(plainJSON(vm.runInContext('WRITTEN_ITEMS', ctx)), writtenItems(), 'run: npm run gs');
  assert.deepEqual(plainJSON(ctx.patternRows_()), patternRows(), 'run: npm run gs');
  assert.deepEqual(plainJSON(vm.runInContext('QUESTIONS', ctx)), RESPONSES.map((r) => r.id));
  assert.equal(vm.runInContext('TOTAL', ctx), TOTAL_POINTS);
  assert.deepEqual(plainJSON(vm.runInContext('WRITTEN_KEY', ctx)), []);
});

test('the script compares answers exactly as the page describes', () => {
  const { ctx } = makeEnv();
  // (Numbers that are no pattern of the inventory: this repository is public.)
  for (const a of [' 3 - 1 - 4 ', '3–1–4.', '1-4, 1-4, 1-4-3', '1-4 / 3-1-2', '4-1 | 4-1', 'rising 1-4', '', '=1+1', '3-4-1-2!']) {
    assert.equal(ctx.normalize_(a), normalize(a), JSON.stringify(a));
  }
});

test('a practice: start, two readings in the student’s folder, the written part, finish', () => {
  const { post, sheets, files } = makeEnv();
  assert.equal(post({ type: 'start', ...who, startedAt: '2026-11-25T15:00:00Z' }).ok, true);
  assert.equal(post({ type: 'start', ...who }).duplicate, true);
  for (const r of RESPONSES) {
    const res = post({ type: 'recording', ...who, qid: r.id, prompt: `1. Sentence of ${r.id}.`, durationSec: 59.6, mime: 'audio/webm;codecs=opus', audio });
    assert.equal(res.ok, true, res.error);
  }
  assert.equal(post({ type: 'recording', ...who, qid: 'r2', mime: 'audio/webm', audio }).duplicate, true);
  assert.equal(files.length, 2);
  assert.equal(files[0].folder, `${ROOT}/3B/Ana Pérez · x7y8z9`);
  assert.deepEqual(files.map((f) => f.blob.name), ['Reading 1.webm', 'Reading 2.webm']);
  const responses = sheets.get('Responses').data;
  assert.deepEqual(responses[1].slice(1, 6), ['Ana Pérez', '3B', 'Reading 1', '1. Sentence of r1.', 60]);
  assert.equal(responses[1][8], 15, 'out of 15');
  assert.deepEqual(plainJSON(sheets.get('Responses').rules.get('2,8')), { min: 0, max: 15, allowInvalid: false, help: 'A number from 0 to 15.' });

  // Part 3 with the public copy: saved, not graded.
  const res = post({ type: 'answers', ...who, answers: ['3-1-4', ...blank.slice(1)], sentAt: '2026-11-25T15:08:00Z' });
  assert.deepEqual(res, { ok: true, graded: false });
  assert.equal(post({ type: 'answers', ...who, answers: blank }).duplicate, true, 'sent twice: saved once');
  const written = sheets.get('Written').data;
  assert.equal(written.length, 1 + WRITTEN.length);
  // Pitch numbers stay text (the sheet would read numbers joined by hyphens as a date).
  assert.deepEqual(written[1].slice(1, 11), ['Ana Pérez', '3B', 1, 'What time does the class start?', 'Wh-question', "'3-1-4", '', '', '', who.attempt]);
  assert.equal(written[2][6], '', 'a blank answer stays blank');

  assert.equal(post({ type: 'finish', ...who, leftPage: 2, resumed: 0, finishedAt: '2026-11-25T15:09:00Z' }).ok, true);
  const exam = sheets.get('Exams').data[1];
  assert.deepEqual([exam[1], exam[2], exam[3], exam[4], exam[5], exam[7], exam[8], exam[11]], ['Ana Pérez', '3B', 'finished', 2, 'sent', 2, 0, who.attempt]);
  assert.equal(
    sheets.get('Exams').formulas.get('2,10'),
    '=IF(COUNTIFS(Responses!K:K,L2,Responses!H:H,"<>")+COUNTIFS(Written!K:K,L2,Written!J:J,"<>")=0,"",SUMIFS(Responses!H:H,Responses!K:K,L2)+SUMIFS(Written!J:J,Written!K:K,L2))',
  );
});

test('the teacher’s copy grades Part 3 with the key', { skip: !existsSync(PRIVATE) && 'the private copy is not here' }, () => {
  const priv = readFileSync(PRIVATE, 'utf8');
  const { ctx, post, sheets } = makeEnv(priv);
  assert.doesNotMatch(ctx.setup(), /no tiene la clave/);
  assert.equal(JSON.parse(ctx.doGet().body).graded, true);
  const patterns = sheets.get('Patterns').data.slice(1);
  assert.ok(patterns.every((r) => /^'[1-4]-/.test(r[4])), 'every sentence has its pitch levels, as text');
  const key = plainJSON(vm.runInContext('WRITTEN_KEY', ctx));
  assert.equal(key.length, WRITTEN.length);
  // Right answers written in different ways, one wrong, one blank.
  const answers = key.map((accepted) => accepted[0].replace(/\//g, ', ').replace(/-/g, ' - '));
  answers[1] = '3-1-4';
  answers[2] = '';
  post({ type: 'start', ...who });
  assert.deepEqual(post({ type: 'answers', ...who, answers }), { ok: true, graded: true });
  const rows = sheets.get('Written').data.slice(1);
  assert.deepEqual(rows.map((r) => r[9]), [1, 0, 0, 1, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(rows.map((r) => r[8]), ['✓', '✗', '✗', '✓', '✓', '✓', '✓', '✓', '✓', '✓']);
  assert.equal(sheets.get('Exams').data[1][5], 8);
  // Either formula the manual gives is right.
  const { post: post2, sheets: sheets2 } = makeEnv(priv);
  const second = key.map((accepted) => accepted[accepted.length - 1]);
  post2({ type: 'answers', ...who, answers: second });
  assert.ok(sheets2.get('Written').data.slice(1).every((r) => r[9] === 1));
});

test('a demo is marked as one', () => {
  const { post, sheets } = makeEnv();
  post({ type: 'start', ...who, demo: true });
  assert.equal(sheets.get('Exams').data[1][3], 'demo');
});

test('bad requests are refused with a message', () => {
  const { post } = makeEnv();
  assert.match(post({ type: 'recording', ...who, qid: 'r3', mime: 'audio/webm', audio }).error, /Lectura desconocida/);
  assert.match(post({ type: 'recording', ...who, qid: 'r1', mime: 'text/html', audio }).error, /no es un audio/);
  assert.match(post({ type: 'answers', ...who, answers: ['3-1'] }).error, /Faltan respuestas/);
  assert.match(post({ type: 'answers', ...who, attempt: '../x', answers: blank }).error, /Intento inválido/);
  assert.match(post({ type: 'start', ...who, student: ' ' }).error, /Falta el nombre/);
  assert.match(post({ type: 'nope' }).error, /Pedido desconocido/);
  const { post: post2, sheets } = makeEnv();
  post2({ type: 'start', ...who, student: '=IMPORTXML("x")' });
  assert.equal(sheets.get('Exams').data[1][1], '\'=IMPORTXML("x")');
});

test('the code still works if the editor joins its lines (only block comments)', () => {
  assert.doesNotThrow(() => new vm.Script(code.replace(/\n/g, ' ')));
});

test('the parts are the whole Code.gs, in order, and short', () => {
  for (const dir of [DIR, ...(existsSync(PRIVATE) ? [new URL('private/', DIR)] : [])]) {
    const whole = readFileSync(new URL('Code.gs', dir), 'utf8');
    const names = readdirSync(new URL('partes/', dir)).filter((f) => f.endsWith('.gs')).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)));
    const parts = names.map((n) => stripMarkers(readFileSync(new URL(`partes/${n}`, dir), 'utf8')));
    assert.deepEqual(parts, splitCode(whole), 'run: npm run gs');
    for (const p of parts) {
      assert.doesNotThrow(() => new vm.Script(p), 'each part is complete code');
      assert.ok(p.split('\n').length <= MAX_LINES, `a part has ${p.split('\n').length} lines`);
    }
    // The parts work one after the other, as the Apps Script editor loads them.
    const { ctx } = makeEnv(parts.join('\n\n'));
    assert.match(ctx.setup(), /Listo/);
  }
});
