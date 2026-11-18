// The intonation practice: two readings aloud and a written part.
//
//   Reading 1 and Reading 2   15 separate sentences each, every one with the
//                             name of its intonation pattern. 50 seconds to
//                             prepare, then the microphone records for 1 minute.
//   Part 3                    10 sentences with the name of their pattern: the
//                             students write the pattern with pitch numbers
//                             (1 low, 2 normal, 3 high, 4 extra-high).
//
// The patterns are the 14 of the inventory in Lessons 6 and 7 of the Manual of
// American English Pronunciation ("Inventory of Intonation Patterns Having
// Grammatical Meanings"). Every reading has all 14, plus one more: another
// kind of nonfinal intonation (Reading 1) or two patterns in one sentence
// (Reading 2).
//
// The words in **bold** carry the pattern when it is only part of the
// sentence (the tag, the name, the first thought group, the word in focus);
// without bold, the pattern is the whole sentence.
//
// The pitch numbers of the patterns are not here: this page and its repository
// are public, and Part 3 asks for them. They are only in the teacher's Apps
// Script, made from a private file that is not in the repository.

export const PREP = 50;
export const RESPONSE = 60;
export const WRITE = 300;

// How a length of time is said: 60 → "one minute", 50 → "50 seconds", 300 → "5 minutes".
export const duration = (s) => (s % 60 ? `${s} seconds` : s === 60 ? 'one minute' : `${s / 60} minutes`);

// The 14 patterns of the manual's inventory, and the names the sentences use for them.
export const PATTERNS = [
  [1, 'Statements, requests, commands, wh-questions'],
  [2, 'Yes-no questions'],
  [3, 'Echo questions'],
  [4, 'Contrasts, comparisons'],
  [5, 'Implicit contrasts'],
  [6, 'Nonfinal intonation (distantly connected, closely connected, suspense)'],
  [7, 'Series with and'],
  [8, 'Alternatives with or'],
  [9, 'Alternative questions requiring a choice'],
  [10, 'Double yes-no questions'],
  [11, 'Direct address'],
  [12, 'Tag questions (real questions)'],
  [13, 'Tag questions (agreement expected)'],
  [14, 'Focus'],
];

export const LABELS = {
  Statement: [1],
  'Wh-question': [1],
  Command: [1],
  Request: [1],
  'Yes-no question': [2],
  'Yes-no question (statement word order)': [2],
  'Echo question': [3],
  Contrast: [4],
  Comparison: [4],
  'Implicit contrast': [5],
  'Nonfinal: distantly connected': [6],
  'Nonfinal: closely connected': [6],
  'Nonfinal: suspense': [6],
  'Series with and': [7],
  'Alternatives with or': [8],
  'Alternative question requiring a choice': [9],
  'Double yes-no question': [10],
  'Direct address': [11],
  'Tag question (real question)': [12],
  'Tag question (agreement expected)': [13],
  Focus: [14],
  'Command + direct address': [1, 11],
};

export const READINGS = [
  {
    id: 'r1',
    n: 1,
    title: 'Intonation patterns',
    sentences: [
      { text: 'The train leaves at noon.', label: 'Statement' },
      { text: 'Did you finish the report?', label: 'Yes-no question' },
      { text: 'She moved to which city?', label: 'Echo question' },
      { text: 'My brother is taller than my father.', label: 'Comparison' },
      { text: '**I** never said that.', label: 'Implicit contrast' },
      { text: '**Don’t wait for me**; I’ll be late.', label: 'Nonfinal: distantly connected' },
      { text: 'We bought apples, pears, and grapes.', label: 'Series with and' },
      { text: 'You can pay in cash, by card, or by check.', label: 'Alternatives with or' },
      { text: 'Would you like tea, or coffee?', label: 'Alternative question requiring a choice' },
      { text: 'Have you been to Mexico, or Peru?', label: 'Double yes-no question' },
      { text: '**Professor**, may I come in?', label: 'Direct address' },
      { text: 'The meeting isn’t today, **is it**?', label: 'Tag question (real question)' },
      { text: 'That movie was great, **wasn’t it**?', label: 'Tag question (agreement expected)' },
      { text: 'Did **you** take my keys?', label: 'Focus' },
      { text: '**When I opened the door**, the room was empty.', label: 'Nonfinal: suspense' },
    ],
  },
  {
    id: 'r2',
    n: 2,
    title: 'Intonation patterns',
    sentences: [
      { text: 'Why is the store closed today?', label: 'Wh-question' },
      { text: 'You’re leaving already?', label: 'Yes-no question (statement word order)' },
      { text: 'You left your phone where?', label: 'Echo question' },
      { text: 'She studies at night, not in the morning.', label: 'Contrast' },
      { text: '**This** one is broken.', label: 'Implicit contrast' },
      { text: '**If you need help**, just call me.', label: 'Nonfinal: closely connected' },
      { text: 'She speaks English, French, and German.', label: 'Series with and' },
      { text: 'We can meet on Monday, Tuesday, or Friday.', label: 'Alternatives with or' },
      { text: 'Is your class at ten, or at eleven?', label: 'Alternative question requiring a choice' },
      { text: 'Do you need a pen, or some paper?', label: 'Double yes-no question' },
      { text: '**Doctor Smith**, your patient is here.', label: 'Direct address' },
      { text: 'You didn’t lock the door, **did you**?', label: 'Tag question (real question)' },
      { text: 'It’s cold this morning, **isn’t it**?', label: 'Tag question (agreement expected)' },
      { text: 'Are you driving to **work** tomorrow?', label: 'Focus' },
      { text: 'Close the window, **Anna**.', label: 'Command + direct address' },
    ],
  },
];

// Part 3: the students write the pattern of each sentence with pitch numbers.
export const WRITTEN = [
  { text: 'What time does the class start?', label: 'Wh-question' },
  { text: 'Is the museum open on Sundays?', label: 'Yes-no question' },
  { text: 'You saw who at the party?', label: 'Echo question' },
  { text: 'Summer here is hotter than winter.', label: 'Comparison' },
  { text: '**When the rain stops**, we’ll go outside.', label: 'Nonfinal: closely connected' },
  { text: 'I need eggs, milk, and butter.', label: 'Series with and' },
  { text: 'Do you want the red one, or the blue one?', label: 'Alternative question requiring a choice' },
  { text: 'Would you like some soup, or a salad?', label: 'Double yes-no question' },
  { text: '**Kevin**, can you hear me?', label: 'Direct address' },
  { text: 'This exercise is easy, **isn’t it**?', label: 'Tag question (agreement expected)' },
];

// "**word**" → the plain text (what the teacher's sheet keeps), and the words in bold.
export const plain = (s) => s.replace(/\*\*/g, '');
export const bold = (s) => [...s.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1]);
// The sentence with the words in bold in CAPITALS (the teacher's sheet).
export const caps = (s) => s.replace(/\*\*(.+?)\*\*/g, (m, w) => w.toUpperCase());

// Points: a point for each sentence read with the right intonation, and a
// point for each pattern written correctly.
export const READING_POINTS = READINGS.map((r) => r.sentences.length);
export const WRITTEN_POINTS = WRITTEN.length;
export const TOTAL_POINTS = READING_POINTS.reduce((a, b) => a + b, 0) + WRITTEN_POINTS;

export const INTRO =
  'This is the intonation practice. It has three parts. In Readings 1 and 2, you will read aloud fifteen sentences; ' +
  'next to each sentence you will see the name of its intonation pattern. ' +
  `For each reading you will have ${duration(PREP)} to prepare and ${duration(RESPONSE)} to read the sentences aloud. ` +
  'In Part 3, you will write the intonation pattern of ten sentences with pitch numbers. ' +
  'The practice runs by itself. Your microphone turns on when it is time to read and turns off when the time is up. You cannot pause or go back.';

export const directions = () =>
  'In this part, you will read aloud the sentences on the screen. Say each sentence with the intonation pattern written next to it. ' +
  'When part of a sentence is in bold, those words carry the pattern. ' +
  `You will have ${duration(PREP)} to prepare. Then you will have ${duration(RESPONSE)} to read the sentences aloud.`;

export const WRITTEN_DIRECTIONS =
  'In this part, you will write the intonation pattern of each sentence with pitch numbers: 1 is low, 2 is normal, 3 is high, and 4 is extra-high. ' +
  'Put a hyphen between the numbers, and a slash between thought groups. ' +
  'When part of a sentence is in bold, write the pattern of the words in bold; otherwise, write the pattern of the whole sentence. ' +
  `You will have ${duration(WRITE)}. You can send your answers before the time is up.`;

// The recorded answers, in order.
export const RESPONSES = READINGS.map((r) => ({ id: r.id, label: `Reading ${r.n}`, short: String(r.n), title: r.title }));

// Every step of the practice, in order. `scale` shortens the clocks (quick tests of the page).
//   intro     – general directions, spoken
//   part      – the directions of a part, spoken (the sentences are not shown yet)
//   prep      – preparation time on the clock; the sentences appear
//   response  – the microphone records for `seconds`
//   write     – Part 3: the sentences, a box for each pattern, and the clock
export function buildTimeline({ scale = 1 } = {}) {
  const t = (s) => Math.max(3, Math.round(s * scale));
  const steps = [{ type: 'intro', say: INTRO }];
  for (const r of READINGS) {
    steps.push({ type: 'part', reading: r.id, say: `Reading ${r.n}. ${directions(r)}` });
    steps.push({ type: 'prep', reading: r.id, seconds: t(PREP), say: 'Begin preparing now.' });
    steps.push({
      type: 'response',
      reading: r.id,
      id: r.id,
      seconds: t(RESPONSE),
      say: 'Begin reading aloud now.',
      prompt: r.sentences.map((s, i) => `${i + 1}. ${caps(s.text)} (${s.label})`).join(' '),
    });
  }
  steps.push({ type: 'part', part: 'written', say: `Part 3. Write the patterns. ${WRITTEN_DIRECTIONS}` });
  steps.push({ type: 'write', part: 'written', seconds: t(WRITE), say: 'Begin writing now.' });
  return steps;
}

// How long the practice takes, in seconds, not counting the spoken directions.
export function timedSeconds(steps) {
  return steps.reduce((n, s) => n + (s.seconds || 0), 0);
}

// After a reload: start again from the reading that was interrupted, or from
// Part 3 once both readings are recorded.
export function resumeIndex(steps, done) {
  let last = -1;
  steps.forEach((s, i) => s.type === 'response' && done.includes(s.id) && (last = i));
  return last + 1;
}

// A written answer as the script compares it: no spaces around the hyphens,
// a slash between thought groups (a comma or a bar counts as one), and only
// digits, hyphens and slashes. (The script does the same; tests keep them equal.)
export function normalize(answer) {
  return String(answer || '')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s*[/|,;]\s*/g, '/')
    .replace(/\s*-\s*/g, '-')
    .replace(/[^0-9/-]/g, '')
    .replace(/^[/-]+|[/-]+$/g, '');
}
