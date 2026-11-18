/* ── Intonation Practice · parte 1 de 6 ── */

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

/* ── fin de la parte 1 de 6 ── */
