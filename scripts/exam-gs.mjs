#!/usr/bin/env node
// Copies the practice into Code.gs, so the teacher's script and sheet always
// match the page: the readings (READINGS_META), the sentences of Part 3
// (WRITTEN_ITEMS) and every sentence with its pattern (the «Patterns» tab).
// Then split the script again:
//
//   node scripts/exam-gs.mjs && node scripts/split-gs.mjs   (npm run gs)
//
// The pitch levels of the sentences are private: they are the answers of
// Part 3. The public Code.gs leaves them out (and its Part 3 is not graded).
// If the private key (key/key.mjs, never committed) is here, the teacher's own
// copy — with the levels and the answers of Part 3 — is written to
// google-apps-script/private/ (also never committed); that is the one the
// teacher pastes.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { READINGS, WRITTEN, READING_POINTS, TOTAL_POINTS, caps } from '../js/format.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'google-apps-script', 'Code.gs');
export const PRIVATE = join(ROOT, 'google-apps-script', 'private');
const KEY_FILE = join(ROOT, 'key', 'key.mjs');

const isFormula = (s) => /^[1-4](-[1-4])+(\/[1-4](-[1-4])+)*$/.test(s);
// Spaces around the slashes between thought groups (easier to read on the sheet).
const shown = (f) => f.replace(/\//g, ' / ');

export const metaRows = () => READINGS.map((r, i) => [r.id, `Reading ${r.n}`, READING_POINTS[i]]);
export const writtenItems = () => WRITTEN.map((s, i) => [i + 1, caps(s.text), s.label]);

// One row per sentence: part, item, the sentence, its pattern, its pitch levels and a note
// (the last two only with the key).
export function patternRows(key = null) {
  const row = (part, entries, s, i) => {
    const e = entries ? entries[i] : [];
    return [part, i + 1, caps(s.text), s.label, e.filter(isFormula).map(shown).join('  or  '), e.filter((x) => !isFormula(x)).join('; ')];
  };
  return [
    ...READINGS.flatMap((r) => r.sentences.map((s, i) => row(`Reading ${r.n}`, key && key[r.id], s, i))),
    ...WRITTEN.map((s, i) => row('Part 3', key && key.written, s, i)),
  ];
}

// The answers of Part 3 the script accepts, sentence by sentence.
export const writtenKey = (key) => key.written.map((e) => e.filter(isFormula));

const rows = (list) => list.map((r) => `  ${JSON.stringify(r)},`).join('\n');

export function examBlock(key = null) {
  const pr = patternRows(key);
  const per = READINGS.map((r) => pr.filter(([part]) => part === `Reading ${r.n}`));
  return [
    '/* exam:start */',
    '/* The practice, as the page shows it. Made from js/format.js: npm run gs. */',
    `const READINGS_META = [\n${rows(metaRows())}\n];`,
    'const QUESTIONS = READINGS_META.map(function (r) { return r[0]; });',
    'const LABELS = {};',
    'const MAX = {};',
    'READINGS_META.forEach(function (r) { LABELS[r[0]] = r[1]; MAX[r[0]] = r[2]; });',
    `const TOTAL = ${TOTAL_POINTS};`,
    `const WRITTEN_ITEMS = [\n${rows(writtenItems())}\n];`,
    '/* The answers of Part 3: only in the teacher’s own copy (empty: Part 3 is not graded). */',
    `const WRITTEN_KEY = [${key ? `\n${rows(writtenKey(key))}\n` : ''}];`,
    '',
    '/* ✂ */',
    '',
    '/* Every sentence and its pattern (the «Patterns» tab); the pitch levels only in the teacher’s copy. */',
    ...per.map((list, i) => `const PATTERNS_${i + 1} = [\n${rows(list)}\n];`),
    `const PATTERNS_3 = [\n${rows(pr.filter(([part]) => part === 'Part 3'))}\n];`,
    '',
    `function patternRows_() {\n  return [].concat(${[...per.map((_, i) => `PATTERNS_${i + 1}`), 'PATTERNS_3'].join(', ')});\n}`,
    '/* exam:end */',
  ].join('\n');
}

export const EXAM_RE = /\/\* exam:start \*\/[\s\S]*?\/\* exam:end \*\//;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const code = readFileSync(SRC, 'utf8');
  if (!EXAM_RE.test(code)) throw new Error('the exam block (exam:start … exam:end) is not in Code.gs');
  // A function as the replacement: the text could have "$", which replace() would read as a pattern.
  const build = (key) => code.replace(EXAM_RE, () => examBlock(key));
  writeFileSync(SRC, build(null));
  console.log(`Code.gs: ${patternRows().length} sentences (public: without the pitch levels; Part 3 not graded)`);
  if (existsSync(KEY_FILE)) {
    const { KEY } = await import(pathToFileURL(KEY_FILE).href);
    mkdirSync(PRIVATE, { recursive: true });
    writeFileSync(join(PRIVATE, 'Code.gs'), build(KEY));
    console.log('private/Code.gs: the teacher’s copy, with the pitch levels and the answers of Part 3');
  } else {
    console.log('No key/key.mjs here: only the public Code.gs was made.');
  }
}
