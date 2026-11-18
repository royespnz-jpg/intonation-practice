import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  READINGS, WRITTEN, PATTERNS, LABELS, RESPONSES, PREP, RESPONSE, WRITE, READING_POINTS, WRITTEN_POINTS, TOTAL_POINTS,
  INTRO, WRITTEN_DIRECTIONS, directions, duration, buildTimeline, timedSeconds, resumeIndex, plain, bold, caps, normalize,
} from '../js/format.js';
import { fmt } from '../js/clock.js';
import { syllablesOf } from './syllables.mjs';

const repeated = (list) => list.filter((x, i) => list.indexOf(x) !== i);
const all = [...READINGS.flatMap((r) => r.sentences), ...WRITTEN];
// The patterns whose words in bold carry them (the rest are the whole sentence).
const PARTIAL = ['Implicit contrast', 'Nonfinal: distantly connected', 'Nonfinal: closely connected', 'Nonfinal: suspense',
  'Direct address', 'Tag question (real question)', 'Tag question (agreement expected)', 'Focus', 'Command + direct address'];

test('two readings of 15 sentences, 50 seconds to prepare and one minute to read, then Part 3', () => {
  assert.equal(PREP, 50);
  assert.equal(RESPONSE, 60);
  assert.equal(WRITE, 300);
  const steps = buildTimeline();
  assert.deepEqual(steps.map((s) => `${s.type}:${s.reading || s.part || ''}:${s.seconds || ''}`), [
    'intro::', 'part:r1:', 'prep:r1:50', 'response:r1:60', 'part:r2:', 'prep:r2:50', 'response:r2:60', 'part:written:', 'write:written:300',
  ]);
  assert.equal(timedSeconds(steps), 520);
  assert.deepEqual(steps.filter((s) => s.type === 'response').map((s) => s.id), RESPONSES.map((r) => r.id));
  assert.deepEqual(READINGS.map((r) => r.sentences.length), [15, 15]);
  assert.equal(WRITTEN.length, 10);
  // A point for each sentence read and for each pattern written: 40 points.
  assert.deepEqual(READING_POINTS, [15, 15]);
  assert.equal(WRITTEN_POINTS, 10);
  assert.equal(TOTAL_POINTS, 40);
});

test('the directions say the same clocks', () => {
  assert.match(INTRO, /For each reading you will have 50 seconds to prepare and one minute to read the sentences aloud\./);
  assert.match(directions(READINGS[0]), /You will have 50 seconds to prepare\. Then you will have one minute to read the sentences aloud\.$/);
  assert.match(WRITTEN_DIRECTIONS, /1 is low, 2 is normal, 3 is high, and 4 is extra-high\./);
  assert.match(WRITTEN_DIRECTIONS, /You will have 5 minutes\./);
  assert.deepEqual([60, 50, 300].map(duration), ['one minute', '50 seconds', '5 minutes']);
  const steps = buildTimeline();
  assert.equal(steps[2].say, 'Begin preparing now.');
  assert.equal(steps[3].say, 'Begin reading aloud now.');
  assert.equal(steps.at(-1).say, 'Begin writing now.');
  // The sheet keeps the sentences, numbered, with their patterns.
  assert.match(steps[3].prompt, /^1\. The train leaves at noon\. \(Statement\) 2\. Did you finish the report\? \(Yes-no question\) /);
});

test('every reading has the 14 patterns of the manual’s inventory, plus one more', () => {
  assert.deepEqual(PATTERNS.map(([n]) => n), Array.from({ length: 14 }, (_, i) => i + 1));
  for (const s of all) assert.ok(LABELS[s.label], `unknown pattern: ${s.label}`);
  for (const r of READINGS) {
    const covered = new Set(r.sentences.flatMap((s) => LABELS[s.label]));
    assert.deepEqual([...covered].sort((a, b) => a - b), PATTERNS.map(([n]) => n), r.id);
  }
  // Reading 1: a second kind of nonfinal intonation. Reading 2: two patterns in one sentence.
  assert.equal(READINGS[0].sentences.filter((s) => s.label.startsWith('Nonfinal')).length, 2);
  assert.equal(READINGS[1].sentences.filter((s) => LABELS[s.label].length === 2).length, 1);
  // Between them, all three kinds of nonfinal intonation, and both kinds of tag question.
  const labels = all.map((s) => s.label);
  for (const l of ['Nonfinal: distantly connected', 'Nonfinal: closely connected', 'Nonfinal: suspense']) assert.ok(labels.includes(l), l);
  // Part 3: ten different patterns.
  assert.deepEqual(repeated(WRITTEN.map((s) => s.label)), []);
});

test('separate sentences; bold only where the pattern is part of the sentence', () => {
  for (const s of all) {
    assert.equal(s.text.split('**').length % 2, 1, `unbalanced ** in: ${s.text}`);
    assert.match(plain(s.text), /^[A-Z].*[.?!]$/, `one whole sentence: ${s.text}`);
    assert.doesNotMatch(plain(s.text), /[.?!]\s/, `one sentence per line: ${s.text}`);
    assert.equal(bold(s.text).length > 0, PARTIAL.includes(s.label), `${s.label}: ${s.text}`);
  }
  // Questions end in a question mark, the rest don't (a name in direct address can come with either).
  for (const s of all.filter((x) => x.label !== 'Direct address')) {
    const question = /question/i.test(s.label) || s.label === 'Focus';
    assert.equal(plain(s.text).endsWith('?'), question, s.text);
  }
  // Series and alternatives have three items; questions with "or" have two.
  for (const s of all.filter((x) => /Series|Alternatives with/.test(x.label))) assert.equal(plain(s.text).split(',').length, 3, s.text);
  for (const s of all.filter((x) => /choice|Double/.test(x.label))) assert.match(plain(s.text), /, or /, s.text);
});

test('no sentence twice, and none from the manual, the assignment or its example', () => {
  assert.deepEqual(repeated(all.map((s) => plain(s.text).toLowerCase())), []);
  const text = all.map((s) => plain(s.text).toLowerCase()).join(' | ');
  for (const taken of [
    "it's raining", 'let’s go', 'what time is it', 'did she answer', 'his arabic', 'like her mother', "wouldn't do that", 'wouldn’t do that',
    'can you believe that', 'let’s not go', 'if you say so', 'you know what', 'we read plays', 'come at eleven', 'speak first',
    'say nothing', 'sell chicken', 'can you help me', 'isn’t jones', 'nice day', 'buy the house', 'getting hotter',
    'what’s your name', 'i’m ann', 'where do you live', 'beautiful place', 'drive to the office',
  ]) {
    assert.ok(!text.includes(taken), `“${taken}” is in the manual or the assignment`);
  }
});

test('each reading fits its minute, with time to spare', () => {
  // A learner reading steadily says about 3.5 syllables a second, with a short pause between sentences.
  for (const r of READINGS) {
    const syl = r.sentences.reduce((n, s) => n + syllablesOf(plain(s.text)), 0);
    const seconds = syl / 3.5 + 0.6 * (r.sentences.length - 1);
    assert.ok(seconds <= 50, `${r.id}: about ${Math.round(seconds)} s (${syl} syllables)`);
    assert.ok(syl >= 90, `${r.id}: ${syl} syllables`);
  }
});

test('the page never says the pitch levels (they are the answers of Part 3)', () => {
  for (const f of ['../js/format.js', '../js/app.js', '../google-apps-script/Code.gs', '../README.md']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /\b[1-4]\s*-\s*[1-4](\s*-\s*[1-4])*\b(?!\s*(minutes|seconds|points))/, f);
  }
  for (const s of all) assert.deepEqual(Object.keys(s), ['text', 'label'], s.text);
});

test('written answers are compared without spaces, dashes or separators getting in the way', () => {
  // (Numbers that are no pattern of the inventory: this repository is public.)
  assert.equal(normalize(' 3 - 1 - 4 '), '3-1-4');
  assert.equal(normalize('3–1–4.'), '3-1-4');
  assert.equal(normalize('1-4, 1-4, 1-4-3'), '1-4/1-4/1-4-3');
  assert.equal(normalize('1-4 / 3-1-2'), '1-4/3-1-2');
  assert.equal(normalize('4-1 | 4-1'), '4-1/4-1');
  assert.equal(normalize('rising 1-4'), '1-4');
  assert.equal(normalize(''), '');
  assert.equal(normalize(null), '');
});

test('after a reload: back to the interrupted reading, or on to Part 3', () => {
  const steps = buildTimeline();
  const at = (pred) => steps.findIndex(pred);
  assert.equal(resumeIndex(steps, []), 0);
  assert.equal(resumeIndex(steps, ['r1']), at((s) => s.type === 'part' && s.reading === 'r2'));
  assert.equal(resumeIndex(steps, ['r1', 'r2']), at((s) => s.part === 'written'));
});

test('the quick demo shortens every clock but keeps at least 3 seconds', () => {
  assert.deepEqual(buildTimeline({ scale: 0.1 }).filter((s) => s.seconds).map((s) => s.seconds), [5, 6, 5, 6, 30]);
  assert.ok(buildTimeline({ scale: 0.001 }).filter((s) => s.seconds).every((s) => s.seconds === 3));
});

test('helpers: plain text, words in bold, capitals', () => {
  const s = 'You didn’t lock the door, **did you**?';
  assert.equal(plain(s), 'You didn’t lock the door, did you?');
  assert.deepEqual(bold(s), ['did you']);
  assert.equal(caps(s), 'You didn’t lock the door, DID YOU?');
});

test('the clock shows mm:ss and rounds up', () => {
  assert.equal(fmt(300), '05:00');
  assert.equal(fmt(49.2), '00:50');
  assert.equal(fmt(-1), '00:00');
});
