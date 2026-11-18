import { READINGS, WRITTEN, RESPONSES, INTRO, WRITTEN_DIRECTIONS, READING_POINTS, WRITTEN_POINTS, TOTAL_POINTS, PREP, RESPONSE, WRITE, duration, directions, buildTimeline, timedSeconds, resumeIndex } from './format.js?v=202611180437';
import { clockHtml, runClock, idleClock, fmt } from './clock.js?v=202611180437';
import { unlockAudio, beep, speak, stopSpeaking, openMicrophone, closeMicrophone, levelMeter, startRecording } from './audio.js?v=202611180437';
import { scriptUrl, saveScriptUrl, isScriptUrl, ping, post, report, enqueue, onUpload, pendingUploads, resumeUploads } from './api.js?v=202611180437';
import { saveRecording, allRecordings } from './store.js?v=202611180437';
import { TEACHER_CODE, SCRIPT_VERSION, SCRIPT_APP } from './config.js?v=202611180437';

const app = document.getElementById('app');
// A length of time, short: 60 → "1 min", 50 → "50 s".
const short = (s) => (s % 60 ? `${s} s` : `${s / 60} min`);
const params = new URLSearchParams(location.search);
// ?demo=1: the teacher's try-out, with the real clocks; the sheet marks it "demo".
const DEMO = params.has('demo');
// ?quick=1 shortens every clock to 10 % (for testing the page only).
const SCALE = params.has('quick') ? 0.1 : 1;
const SESSION = 'into.session';
const NAME = 'Intonation Practice';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// "**word**" → <b>word</b>
const bold = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

// The bars at the top: the two readings and Part 3.
const PROGRESS = [...RESPONSES.map((r) => ({ id: r.id, label: r.label })), { id: 'p3', label: 'Part 3' }];

let S = null; // { student, group, attempt, steps, stepIndex, done, draft, answers, answersSent, leftPage, resumed, finished }

function persist() {
  if (!S) return;
  const { steps, ...keep } = S;
  try {
    sessionStorage.setItem(SESSION, JSON.stringify(keep));
  } catch {
    /* storage unavailable */
  }
}

function savedSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION) || 'null');
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION);
  } catch {
    /* storage unavailable */
  }
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const who = () => (S ? `${esc(S.student)}${S.group ? ` · ${esc(S.group)}` : ''}` : 'Student name');

// ─── 1 · start ──────────────────────────────────────────────────────────────

function renderStart(error = '') {
  const saved = S || {};
  app.innerHTML = `<main class="screen start">
    <section class="start-hero">
      <p class="eyebrow">${NAME}${DEMO ? ' · <b>demo</b>' : ''}</p>
      <h1>Let your voice rise and fall.</h1>
      <p class="lede">Two readings of fifteen sentences, each with the name of its intonation pattern, and a written part.
        A clock counts down the time to prepare; when it reaches zero you hear a beep, your microphone turns on, and it
        records while you read aloud.</p>
      <ol class="parts-overview">
        ${READINGS.map((r) => `<li><span class="po-label">Reading ${r.n}</span><span class="po-title">${r.sentences.length} sentences, read aloud</span>
          <span class="po-time">${short(PREP)} to prepare · ${short(RESPONSE)} to read</span></li>`).join('')}
        <li><span class="po-label">Part 3</span><span class="po-title">Write the patterns of ${WRITTEN.length} sentences</span>
          <span class="po-time">${short(WRITE)} to write</span></li>
      </ol>
      <p class="po-points">${TOTAL_POINTS} points: a point for each sentence read with its pattern, and for each pattern written right.</p>
    </section>
    <form class="card start-form" data-start novalidate>
      <h2>Your details</h2>
      <label>Full name<input name="student" required maxlength="80" autocomplete="name" value="${esc(saved.student || '')}"></label>
      <p class="form-error" data-error role="alert">${esc(error)}</p>
      <button class="btn primary big" type="submit">Continue</button>
      <p class="muted small">${scriptUrl() ? 'Your recordings and answers go to your teacher’s Google Drive.' : 'This practice is not connected to your teacher’s sheet yet.'}
        · <a href="#teacher">Teacher</a></p>
    </form>
  </main>`;
}

function submitStart(form) {
  const data = Object.fromEntries(new FormData(form));
  const err = form.querySelector('[data-error]');
  if (!String(data.student || '').trim()) {
    err.textContent = 'Write your full name.';
    return;
  }
  S = {
    student: data.student.trim(),
    // Students only write their name. A teacher's link with ?g=<group> files the recordings by group.
    group: String(params.get('g') || '').trim().slice(0, 40),
    attempt: newId(),
    steps: buildTimeline({ scale: SCALE }),
    stepIndex: 0,
    done: [],
    draft: [],
    answers: null,
    answersSent: false,
    leftPage: 0,
    resumed: 0,
  };
  persist();
  renderCheck();
}

// ─── 2 · microphone and sound check ─────────────────────────────────────────

let stopMeter = () => {};

function meterHtml() {
  return `<div class="meter" aria-hidden="true">${'<i></i>'.repeat(14)}</div>`;
}

function showLevel(el, level) {
  const bars = el.querySelectorAll('.meter i');
  const lit = Math.round(level * bars.length);
  bars.forEach((b, i) => b.classList.toggle('on', i < lit));
}

function renderCheck(resuming = false) {
  const total = timedSeconds(S.steps);
  app.innerHTML = `<main class="screen check">
    <header class="check-head">
      <p class="eyebrow">${who()}</p>
      <h1>${resuming ? 'Continue your practice' : 'Check your microphone and sound'}</h1>
      <p class="lede">${
        resuming
          ? 'Your practice was interrupted. It will continue from the part you were doing.'
          : `About ${Math.round(total / 60) + 3} minutes. Use headphones if you can, in a quiet place.`
      }</p>
    </header>
    <div class="check-grid">
      <section class="card check-step" data-mic-step>
        <span class="step-num">1</span>
        <h2>Microphone</h2>
        <p>Allow the microphone, then say something: the bars should move.</p>
        ${meterHtml()}
        <div class="row"><button type="button" class="btn" data-mic>Allow the microphone</button>
          <button type="button" class="btn ghost" data-test-rec disabled>Record a 3-second test</button></div>
        <p class="status" data-mic-status aria-live="polite"></p>
        <audio data-test-audio controls hidden></audio>
      </section>
      <section class="card check-step">
        <span class="step-num">2</span>
        <h2>Sound</h2>
        <p>You will hear the directions, and a beep before you read.</p>
        <div class="row"><button type="button" class="btn" data-sound>Play the beep and a voice</button></div>
        <p class="status" data-sound-status aria-live="polite"></p>
      </section>
      <section class="card check-step rules">
        <span class="step-num">3</span>
        <h2>Once you start</h2>
        <ul>
          <li>The practice runs by itself. You can’t pause it or go back.</li>
          <li>The sentences appear when the <b>Preparation time</b> starts: read them silently.</li>
          <li>When the clock says <b>Reading time</b>, the microphone is recording: read aloud with the pattern of each sentence.</li>
          <li>Stay on this page until the end, when your recordings and answers are sent.</li>
        </ul>
      </section>
    </div>
    <div class="check-go">
      <button type="button" class="btn primary big" data-begin disabled>${resuming ? 'Continue the practice' : 'Start the practice'}</button>
      <button type="button" class="btn ghost" data-back>Back</button>
    </div>
  </main>`;
}

async function allowMic(button) {
  const status = app.querySelector('[data-mic-status]');
  button.disabled = true;
  try {
    await openMicrophone();
    unlockAudio();
    stopMeter();
    const card = app.querySelector('[data-mic-step]');
    stopMeter = levelMeter((l) => showLevel(card, l));
    status.textContent = '✓ The microphone is on.';
    status.className = 'status ok';
    button.textContent = 'Microphone on';
    app.querySelector('[data-test-rec]').disabled = false;
    app.querySelector('[data-begin]').disabled = false;
  } catch (e) {
    button.disabled = false;
    status.textContent = e.message;
    status.className = 'status bad';
  }
}

async function testRecording(button) {
  const status = app.querySelector('[data-mic-status]');
  button.disabled = true;
  status.textContent = 'Recording… say a sentence.';
  const rec = startRecording();
  await new Promise((r) => setTimeout(r, 3000));
  const { blob } = await rec.stop();
  const audio = app.querySelector('[data-test-audio]');
  audio.src = URL.createObjectURL(blob);
  audio.hidden = false;
  audio.play().catch(() => {});
  status.textContent = '✓ Listen to your test. If you can’t hear yourself, check the microphone.';
  status.className = 'status ok';
  button.disabled = false;
}

async function testSound(button) {
  unlockAudio();
  button.disabled = true;
  const status = app.querySelector('[data-sound-status]');
  await beep();
  await speak('This is the sound check. If you can hear this voice, your sound is working.');
  status.textContent = '✓ If you heard the beep and the voice, your sound works.';
  status.className = 'status ok';
  button.disabled = false;
}

// ─── 3 · the practice ───────────────────────────────────────────────────────

let wakeLock = null;
async function keepAwake() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch {
    /* not supported */
  }
}

const stepPart = (step) => (step.reading ? step.reading : step.part === 'written' ? 'p3' : null);
const partLabel = (id) => PROGRESS.find((p) => p.id === id)?.label || 'Introduction';

function examShell() {
  app.innerHTML = `<div class="stage">
    <header class="stage-top">
      <div class="brand"><span class="dot"></span>${NAME}</div>
      <div class="progress">
        <span class="progress-label" data-progress-label>${esc(PROGRESS[0].label)}</span>
        <span class="progress-bars" aria-hidden="true">${PROGRESS.map((p) => `<i data-q="${p.id}"></i>`).join('')}</span>
      </div>
      <div class="who">${who()}</div>
    </header>
    <main class="stage-main">
      <section class="task" data-task aria-live="polite"></section>
      <aside class="clock-panel">
        ${clockHtml()}
        <div class="rec" data-rec hidden><span class="rec-dot"></span><b>Recording</b>${meterHtml()}</div>
        <p class="cue" data-cue aria-live="assertive"></p>
        <button type="button" class="btn primary" data-send-answers hidden>Send my answers</button>
      </aside>
    </main>
  </div>`;
  S.done.forEach((id) => app.querySelector(`[data-q="${id}"]`)?.classList.add('done'));
  if (S.answers) app.querySelector('[data-q="p3"]')?.classList.add('done');
}

// The sentences of a reading, each with the name of its pattern.
export function readingHtml(r) {
  return `<ol class="reading sentences patterns">${r.sentences
    .map((s) => `<li><span class="s-text">${bold(s.text)}</span><span class="pattern">${esc(s.label)}</span></li>`)
    .join('')}</ol>`;
}

// Part 3: each sentence, the name of its pattern and a box for the pitch numbers.
function writtenHtml(draft = [], locked = false) {
  return `<form class="written" data-written novalidate autocomplete="off">
    <ol class="reading sentences patterns">${WRITTEN.map(
      (s, i) => `<li><span class="s-text">${bold(s.text)}</span><span class="pattern">${esc(s.label)}</span>
        <label class="answer"><span class="sr-only">Pattern of sentence ${i + 1}</span>
          <input name="a${i + 1}" value="${esc(draft[i] || '')}" maxlength="30" spellcheck="false" autocapitalize="off"
            inputmode="text" placeholder="pitch numbers" ${locked ? 'disabled' : ''}></label></li>`,
    ).join('')}</ol>
  </form>`;
}

function taskHtml(step, preview = false) {
  if (step.type === 'intro') {
    return `<p class="task-label">${preview ? 'Teacher preview' : who()}</p><h2>Intonation practice</h2>
      <p class="directions">${esc(INTRO)}</p>`;
  }
  if (step.part === 'written') {
    const head = `<p class="task-label">Part 3</p><h2>Write the patterns</h2>`;
    if (step.type === 'part') return `${head}<p class="directions"><b>Directions:</b> ${esc(WRITTEN_DIRECTIONS)}</p>`;
    return `${head}<p class="directions compact">1 low · 2 normal · 3 high · 4 extra-high. A hyphen between numbers, a slash between thought groups.
      Bold words: their pattern; otherwise, the whole sentence.</p>${writtenHtml(S?.draft || [], preview)}`;
  }
  const r = READINGS.find((x) => x.id === step.reading);
  const head = `<p class="task-label">Reading ${r.n} of ${READINGS.length}</p><h2>${esc(r.title)}</h2>`;
  // The sentences appear only when the preparation clock starts: during the
  // directions there is nothing to read, so everyone gets the same preparation time.
  if (step.type === 'part') return `${head}<p class="directions"><b>Directions:</b> ${esc(directions(r))}</p>`;
  return head + readingHtml(r);
}

function setCue(text, kind = '') {
  const cue = app.querySelector('[data-cue]');
  cue.textContent = text;
  cue.className = `cue ${kind}`;
}

const readAnswers = () => WRITTEN.map((_, i) => String(app.querySelector(`[name="a${i + 1}"]`)?.value || '').trim().slice(0, 30));

// Part 3: the clock runs until the time is up or the student sends the answers.
async function writePart(step, clock) {
  const button = app.querySelector('[data-send-answers]');
  const form = app.querySelector('[data-written]');
  form.addEventListener('input', () => {
    S.draft = readAnswers();
    persist();
  });
  app.querySelector('[name="a1"]')?.focus();
  button.hidden = false;
  const timer = runClock(clock, step.seconds, { mode: 'prep', phase: 'Writing time', sub: 'Write' });
  const sent = new Promise((resolve) => button.addEventListener('click', resolve, { once: true }));
  await Promise.race([timer.done, sent]);
  timer.stop();
  button.hidden = true;
  S.answers = readAnswers();
  S.draft = S.answers;
  form.querySelectorAll('input').forEach((i) => (i.disabled = true));
  app.querySelector('[data-q="p3"]')?.classList.add('done');
  persist();
  sendAnswers();
}

// The answers of Part 3 go to the teacher's script; a failed send is tried again.
let sendingAnswers = false;
const WAITS = [2000, 5000, 15000, 30000];
async function sendAnswers() {
  if (!S?.answers || S.answersSent || sendingAnswers) return;
  if (!scriptUrl()) return answersStatus('local');
  sendingAnswers = true;
  const mine = S;
  for (let tries = 0; ; tries++) {
    answersStatus('sending');
    try {
      await post({ type: 'answers', attempt: mine.attempt, student: mine.student, group: mine.group, answers: mine.answers, sentAt: new Date().toISOString() });
      mine.answersSent = true;
      if (S === mine) persist();
      answersStatus('sent');
      break;
    } catch (err) {
      answersStatus('retrying', err.message);
      await new Promise((r) => setTimeout(r, WAITS[Math.min(tries, WAITS.length - 1)]));
    }
  }
  sendingAnswers = false;
}

function answersStatus(status, error = '') {
  const row = app.querySelector('[data-up="p3"]');
  if (!row) return;
  row.dataset.status = status;
  row.querySelector('.up-status').textContent = STATUS[status] || status;
  if (error) row.querySelector('.up-status').title = error;
  updateDone();
}

let running = false;

async function runExam() {
  running = true;
  examShell();
  keepAwake();
  const clock = app.querySelector('.clock');
  const recEl = app.querySelector('[data-rec]');
  if (S.stepIndex === 0) report({ type: 'start', attempt: S.attempt, student: S.student, group: S.group, demo: DEMO || SCALE < 1, startedAt: new Date().toISOString(), userAgent: navigator.userAgent });

  for (let i = S.stepIndex; i < S.steps.length; i++) {
    S.stepIndex = i;
    persist();
    const step = S.steps[i];
    const task = app.querySelector('[data-task]');
    const show = (html) => {
      if (task.dataset.html === html) return;
      task.innerHTML = html;
      task.dataset.html = html;
      // New content starts at the top (on a phone, the page may be scrolled down).
      window.scrollTo({ top: 0 });
    };
    // The sentences appear when the clock starts, after its cue.
    if (step.type !== 'prep' && step.type !== 'write') show(taskHtml(step));
    const part = stepPart(step);
    app.querySelectorAll('.progress [data-q]').forEach((bar) => bar.classList.toggle('now', bar.dataset.q === part));
    app.querySelector('[data-progress-label]').textContent = partLabel(part);

    if (step.type === 'intro' || step.type === 'part') {
      idleClock(clock, { phase: 'Listen', time: '··', sub: 'Directions' });
      setCue('Listen to the directions.');
      await speak(step.say);
    } else if (step.type === 'prep') {
      idleClock(clock, { phase: 'Preparation time', time: fmt(step.seconds) });
      setCue(step.say);
      await speak(step.say);
      show(taskHtml(step));
      setCue('Read the sentences silently and prepare.', 'prep');
      await runClock(clock, step.seconds, { mode: 'prep', phase: 'Preparation time', sub: 'Prepare' }).done;
    } else if (step.type === 'response') {
      idleClock(clock, { phase: 'Reading time', time: fmt(step.seconds) });
      setCue(step.say);
      await speak(step.say);
      await beep();
      const rec = startRecording();
      recEl.hidden = false;
      const stop = levelMeter((l) => showLevel(recEl, l));
      setCue('Read aloud now: the microphone is recording.', 'live');
      await runClock(clock, step.seconds, { mode: 'response', phase: 'Reading time', sub: 'Recording' }).done;
      const { blob, seconds } = await rec.stop();
      stop();
      recEl.hidden = true;
      setCue('Time is up.', 'done');
      const meta = RESPONSES.find((r) => r.id === step.id);
      const saved = {
        key: `${S.attempt}:${step.id}`,
        attempt: S.attempt,
        student: S.student,
        group: S.group,
        qid: step.id,
        label: meta.label,
        prompt: step.prompt,
        seconds,
        blob,
        recordedAt: new Date().toISOString(),
        uploaded: false,
      };
      await saveRecording(saved);
      enqueue(saved);
      if (!S.done.includes(step.id)) S.done.push(step.id);
      app.querySelector(`[data-q="${step.id}"]`)?.classList.add('done');
      persist();
      await new Promise((r) => setTimeout(r, 1200));
      // The microphone is not needed for Part 3.
      if (!S.steps.slice(i + 1).some((s) => s.type === 'response')) closeMicrophone();
    } else if (step.type === 'write') {
      idleClock(clock, { phase: 'Writing time', time: fmt(step.seconds) });
      setCue(step.say);
      await speak(step.say);
      show(taskHtml(step));
      setCue('Write the pattern of each sentence.', 'prep');
      await writePart(step, clock);
    }
  }
  running = false;
  S.stepIndex = S.steps.length;
  S.finished = true;
  persist();
  closeMicrophone();
  stopSpeaking();
  wakeLock?.release?.().catch(() => {});
  report({ type: 'finish', attempt: S.attempt, student: S.student, group: S.group, leftPage: S.leftPage, resumed: S.resumed, finishedAt: new Date().toISOString() });
  renderDone();
}

// ─── 4 · the end ────────────────────────────────────────────────────────────

const STATUS = {
  waiting: 'Waiting…',
  sending: 'Sending…',
  retrying: 'Trying again…',
  sent: '✓ Sent',
  local: 'Saved on this device',
};

async function renderDone() {
  const recs = (await allRecordings()).filter((r) => r.attempt === S.attempt);
  const connected = Boolean(scriptUrl());
  const p3 = !S.answers ? 'missing' : S.answersSent ? 'sent' : connected ? 'waiting' : 'local';
  app.innerHTML = `<main class="screen done">
    <p class="eyebrow">${who()}</p>
    <h1 data-done-title>${connected ? 'Sending your recordings and answers…' : 'The practice is over'}</h1>
    <p class="lede" data-done-lede>${
      connected
        ? 'Keep this page open until every part says “Sent”.'
        : 'This practice isn’t connected to your teacher’s sheet. Download your recordings and send them to your teacher.'
    }</p>
    <ol class="card uploads">
      ${RESPONSES.map((r) => {
        const rec = recs.find((x) => x.qid === r.id);
        const status = !rec ? 'missing' : rec.uploaded ? 'sent' : connected ? 'waiting' : 'local';
        return `<li data-up="${r.id}" data-status="${status}">
          <span class="up-label">${esc(r.label)}</span>
          <span class="up-time">${rec ? fmt(Math.round(rec.seconds)) : '—'}</span>
          <span class="up-status">${status === 'missing' ? 'Not recorded' : STATUS[status]}</span>
          ${rec ? `<a class="btn ghost small" download="${esc(S.student)} - ${esc(r.label)}.${/mp4/.test(rec.blob.type) ? 'm4a' : 'webm'}" href="${URL.createObjectURL(rec.blob)}">Download</a>` : ''}
        </li>`;
      }).join('')}
      <li data-up="p3" data-status="${p3}">
        <span class="up-label">Part 3 · ${S.answers ? `${S.answers.filter(Boolean).length} of ${WRITTEN.length} answered` : 'written patterns'}</span>
        <span class="up-time"></span>
        <span class="up-status">${p3 === 'missing' ? 'Not answered' : STATUS[p3]}</span>
      </li>
    </ol>
  </main>`;
  sendAnswers();
  updateDone();
}

function updateDone() {
  if (!S?.finished) return;
  const title = app.querySelector('[data-done-title]');
  if (!title || !scriptUrl()) return;
  const rows = [...app.querySelectorAll('[data-up]')];
  const toSend = rows.filter((r) => r.dataset.status !== 'missing');
  if (toSend.length && toSend.every((r) => r.dataset.status === 'sent') && !pendingUploads()) {
    title.textContent = '✓ Your recordings and answers were sent';
    app.querySelector('[data-done-lede]').textContent = 'Your teacher has them. You can close this page.';
    clearSession();
  }
}

onUpload(({ qid, key, status, error }) => {
  if (S && !key.startsWith(`${S.attempt}:`)) return;
  const row = app.querySelector(`[data-up="${qid}"]`);
  if (!row) return;
  row.dataset.status = status;
  row.querySelector('.up-status').textContent = STATUS[status] || status;
  if (error) row.querySelector('.up-status').title = error;
  updateDone();
});

// ─── teacher ────────────────────────────────────────────────────────────────

function renderTeacher(message = '') {
  const url = scriptUrl();
  const base = `${location.origin}${location.pathname}`;
  const link = (extra = '') => `${base}?${url ? `s=${encodeURIComponent(url)}&` : ''}${extra}`.replace(/[?&]$/, '');
  const minutes = Math.round(timedSeconds(buildTimeline()) / 60) + 3;
  app.innerHTML = `<main class="screen teacher">
    <div class="teacher-head"><div><p class="eyebrow">Teacher</p>
    <h1>Set up the practice</h1></div><button type="button" class="btn ghost small" data-lock>Lock and leave</button></div>
    <form class="card" data-teacher>
      <h2>1 · Your Google Script</h2>
      <p>Paste the web app URL of the practice’s Google Apps Script (it ends in <code>/exec</code>). Recordings go to your
        Drive and a row for each reading and each written answer to your sheet.</p>
      <div class="row"><input name="url" value="${esc(url)}" placeholder="https://script.google.com/macros/s/…/exec" spellcheck="false">
        <button class="btn" type="button" data-test-script>Test</button><button class="btn primary" type="submit">Save</button></div>
      <p class="status" data-teacher-status aria-live="polite">${esc(message)}</p>
    </form>
    <section class="card">
      <h2>2 · The link for your students</h2>
      <p>It carries your script, so the recordings and answers go to your sheet. Students write their full name and start.</p>
      <label class="group-field">Group <span class="muted small">(optional: each group’s recordings get their own folder)</span>
        <input data-group maxlength="40" placeholder="e.g. 3B" spellcheck="false" autocomplete="off"></label>
      <div class="link-row"><code data-link>${esc(link())}</code><button class="btn small" data-copy="${esc(link())}">Copy</button></div>
    </section>
    <section class="card">
      <h2>3 · Go through the practice</h2>
      <p>See every step as the students see it — the directions, the preparation and the reading of each part, and Part 3 —
        in any order, with the clock and the voice. Nothing is recorded or sent.</p>
      <p><a class="btn primary" href="#preview">Open the preview</a></p>
    </section>
    <section class="card">
      <h2>4 · The sentences</h2>
      <p class="muted small">Readings: ${READING_POINTS.join(' + ')} points (you score them on the sheet). Part 3: ${WRITTEN_POINTS} points,
        graded by your script. The pitch levels of every sentence are on the «Patterns» tab of your sheet, never on this page.</p>
      ${READINGS.map((r) => `<h3>Reading ${r.n}</h3>${readingHtml(r)}`).join('')}
      <h3>Part 3</h3>
      <ol class="reading sentences patterns">${WRITTEN.map((s) => `<li><span class="s-text">${bold(s.text)}</span><span class="pattern">${esc(s.label)}</span></li>`).join('')}</ol>
    </section>
    <section class="card">
      <h2>5 · Try it</h2>
      <p>Try the whole practice with its real clocks (about ${minutes} minutes); your recordings and answers go to your
        sheet like a student’s, marked <i>demo</i>.</p>
      <p><a class="btn ghost" href="${esc(link('demo=1'))}">Try the practice</a></p>
    </section>
  </main>`;
}

// ─── teacher access ─────────────────────────────────────────────────────────
// The teacher pages show every sentence, so students get a code screen first.
// The code opens them for this tab only (sessionStorage).

const UNLOCK = 'into.teacher';

function unlocked() {
  try {
    return sessionStorage.getItem(UNLOCK) === TEACHER_CODE;
  } catch {
    return false;
  }
}

function setUnlocked(on) {
  try {
    if (on) sessionStorage.setItem(UNLOCK, TEACHER_CODE);
    else sessionStorage.removeItem(UNLOCK);
  } catch {
    /* storage unavailable */
  }
}

function renderCode(error = '') {
  app.innerHTML = `<main class="screen code">
    <form class="card code-card" data-code novalidate>
      <p class="eyebrow">Teacher</p>
      <h1>Teacher access</h1>
      <p class="muted">Write the teacher’s code to set up the practice and to go through its sentences.</p>
      <label>Code<input name="code" inputmode="numeric" autocomplete="off" maxlength="12" autofocus></label>
      <p class="form-error" data-error role="alert">${esc(error)}</p>
      <div class="row"><button class="btn primary" type="submit">Enter</button><a class="btn ghost" href="#">Back</a></div>
    </form>
  </main>`;
  app.querySelector('[name="code"]').focus();
}

// ─── teacher preview ────────────────────────────────────────────────────────
// Every step, as the students see it, in any order: nothing is recorded or sent.

const PREVIEW = { steps: buildTimeline(), at: 0, clock: null };
const STEP_NAMES = { part: 'Directions', prep: 'Prepare', response: 'Read', write: 'Write' };

function renderPreview() {
  const P = PREVIEW;
  P.clock?.stop();
  P.clock = null;
  stopSpeaking();
  const step = P.steps[P.at];
  const part = stepPart(step);
  const first = (id) => P.steps.findIndex((s) => stepPart(s) === id);
  const chip = (label, go, now, title = label) =>
    `<button type="button" class="pv-step${now ? ' now' : ''}" data-pv-go="${go}" title="${esc(title)}" aria-current="${now ? 'true' : 'false'}">${esc(label)}</button>`;
  const mine = part ? P.steps.map((s, i) => [s, i]).filter(([s]) => stepPart(s) === part) : [];
  const groups = [
    `<div class="pv-group pv-readings"><span class="pv-group-label">Parts</span>${chip('Intro', 0, !part, 'Introduction')}${PROGRESS.map((p) => chip(p.label, first(p.id), p.id === part)).join('')}</div>`,
    mine.length ? `<div class="pv-group"><span class="pv-group-label">${esc(partLabel(part))}</span>${mine.map(([s, i]) => chip(STEP_NAMES[s.type], i, i === P.at)).join('')}</div>` : '',
  ];
  app.innerHTML = `<div class="stage preview">
    <header class="stage-top">
      <div class="brand"><span class="dot"></span>${NAME}</div>
      <div class="progress">
        <span class="progress-label">${esc(partLabel(part))}</span>
        <span class="progress-bars" aria-hidden="true">${PROGRESS.map((p) => `<i class="${p.id === part ? 'now' : ''}"></i>`).join('')}</span>
      </div>
      <div class="who"><span class="pv-badge">Teacher preview</span></div>
    </header>
    <nav class="pv-bar" aria-label="Steps of the practice">
      <div class="pv-steps">${groups.join('')}</div>
      <div class="pv-actions">
        <button type="button" class="btn small" data-pv-prev ${P.at === 0 ? 'disabled' : ''}>← Previous</button>
        <button type="button" class="btn small" data-pv-next ${P.at === P.steps.length - 1 ? 'disabled' : ''}>Next →</button>
        <button type="button" class="btn small ghost" data-pv-say>▶ Hear what they hear</button>
        ${step.seconds ? `<button type="button" class="btn small ghost" data-pv-clock>Start the ${step.seconds}-second clock</button>` : ''}
        <a class="btn small ghost" href="#teacher">Teacher page</a>
      </div>
      <p class="pv-note">${esc(part ? `${partLabel(part)} · ${STEP_NAMES[step.type]}` : 'Introduction')} · step ${P.at + 1} of ${P.steps.length}. Nothing is recorded or sent in the preview. Use ← → to move.</p>
    </nav>
    <main class="stage-main">
      <section class="task" data-task>${taskHtml(step, true)}</section>
      <aside class="clock-panel">
        ${clockHtml()}
        ${step.type === 'response' ? `<div class="rec"><span class="rec-dot"></span><b>Recording</b><span class="muted small">(not in the preview)</span></div>` : ''}
        <p class="cue" data-cue></p>
      </aside>
    </main>
  </div>`;
  const clock = app.querySelector('.clock');
  if (step.type === 'prep') {
    idleClock(clock, { phase: 'Preparation time', time: fmt(step.seconds), sub: 'Prepare' });
    setCue('Read the sentences silently and prepare.', 'prep');
  } else if (step.type === 'response') {
    idleClock(clock, { phase: 'Reading time', time: fmt(step.seconds), sub: 'Recording' });
    setCue('Read aloud now: the microphone is recording.', 'live');
  } else if (step.type === 'write') {
    idleClock(clock, { phase: 'Writing time', time: fmt(step.seconds), sub: 'Write' });
    setCue('Write the pattern of each sentence.', 'prep');
  } else {
    idleClock(clock, { phase: 'Listen', time: '··', sub: 'Directions' });
    setCue('Listen to the directions.');
  }
}

function previewGo(i) {
  PREVIEW.at = Math.max(0, Math.min(PREVIEW.steps.length - 1, i));
  renderPreview();
  window.scrollTo({ top: 0 });
}

function previewClock(button) {
  const step = PREVIEW.steps[PREVIEW.at];
  if (PREVIEW.clock) {
    PREVIEW.clock.stop();
    return;
  }
  const clock = app.querySelector('.clock');
  const reading = step.type === 'response';
  PREVIEW.clock = runClock(clock, step.seconds, {
    mode: reading ? 'response' : 'prep',
    phase: reading ? 'Reading time' : step.type === 'write' ? 'Writing time' : 'Preparation time',
    sub: reading ? 'Recording' : step.type === 'write' ? 'Write' : 'Prepare',
  });
  button.textContent = 'Stop the clock';
  PREVIEW.clock.done.then(() => {
    PREVIEW.clock = null;
    if (button.isConnected) button.textContent = `Start the ${step.seconds}-second clock`;
  });
}

// ─── events ─────────────────────────────────────────────────────────────────

document.addEventListener('submit', (e) => {
  const form = e.target;
  e.preventDefault();
  if (form.matches('[data-start]')) submitStart(form);
  if (form.matches('[data-code]')) {
    if (String(new FormData(form).get('code') || '').trim() !== TEACHER_CODE) return renderCode('That is not the teacher’s code.');
    setUnlocked(true);
    start();
  }
  if (form.matches('[data-teacher]')) {
    const url = String(new FormData(form).get('url') || '').trim();
    if (url && !isScriptUrl(url)) return renderTeacher('That is not an Apps Script web app URL (it ends in /exec).');
    saveScriptUrl(url);
    renderTeacher(url ? '✓ Saved. The link below now sends the recordings and answers to your sheet.' : 'Removed.');
  }
});

document.addEventListener('click', async (e) => {
  const t = e.target.closest('button, a');
  if (!t) return;
  if (t.matches('[data-pv-go]')) previewGo(Number(t.dataset.pvGo));
  else if (t.matches('[data-pv-prev]')) previewGo(PREVIEW.at - 1);
  else if (t.matches('[data-pv-next]')) previewGo(PREVIEW.at + 1);
  else if (t.matches('[data-pv-say]')) {
    unlockAudio();
    stopSpeaking();
    speak(PREVIEW.steps[PREVIEW.at].say);
  } else if (t.matches('[data-pv-clock]')) previewClock(t);
  else if (t.matches('[data-lock]')) {
    setUnlocked(false);
    location.hash = '';
  } else if (t.matches('[data-mic]')) allowMic(t);
  else if (t.matches('[data-test-rec]')) testRecording(t);
  else if (t.matches('[data-sound]')) testSound(t);
  else if (t.matches('[data-back]')) {
    stopMeter();
    closeMicrophone();
    renderStart();
  } else if (t.matches('[data-begin]')) {
    stopMeter();
    unlockAudio();
    runExam();
  } else if (t.matches('[data-copy]')) {
    try {
      await navigator.clipboard.writeText(t.dataset.copy);
      t.textContent = 'Copied';
    } catch {
      t.textContent = 'Select and copy';
    }
  } else if (t.matches('[data-test-script]')) {
    const status = app.querySelector('[data-teacher-status]');
    const url = app.querySelector('[name="url"]').value.trim();
    status.textContent = 'Testing…';
    try {
      const info = await ping(url);
      status.textContent =
        info.app !== SCRIPT_APP
          ? `That is the script of “${info.sheet}” (${info.app || 'another exam'}), not the ${SCRIPT_APP} one.`
          : (info.version || 1) < SCRIPT_VERSION
            ? `Connected to “${info.sheet}”, but its script is an old version: paste the new Code.gs, run setup, and deploy a new version (Deploy → Manage deployments → ✏ → New version).`
            : info.graded === false
              ? `Connected to “${info.sheet}”, but that copy of the script has no key: Part 3 won’t be graded. Paste your own copy (the one with the key) and deploy a new version.`
              : `✓ Connected to “${info.sheet}”. Press Save.`;
    } catch (err) {
      status.textContent = `Couldn’t connect: ${err.message}`;
    }
  }
});

// Enter in a box of Part 3 goes to the next box instead of sending the form.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('[data-written] input')) {
    e.preventDefault();
    const inputs = [...app.querySelectorAll('[data-written] input')];
    inputs[inputs.indexOf(e.target) + 1]?.focus();
    return;
  }
  if (location.hash !== '#preview' || !unlocked() || e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowRight') previewGo(PREVIEW.at + 1);
  if (e.key === 'ArrowLeft') previewGo(PREVIEW.at - 1);
});

// Teacher page: the students’ link carries the group as it is typed.
document.addEventListener('input', (e) => {
  if (!e.target.matches('[data-group]')) return;
  const code = app.querySelector('[data-link]');
  const copy = code?.nextElementSibling;
  if (!code || !copy) return;
  const base = code.dataset.base || (code.dataset.base = code.textContent);
  const g = e.target.value.trim();
  const url = g ? `${base}${base.includes('?') ? '&' : '?'}g=${encodeURIComponent(g)}` : base;
  code.textContent = url;
  copy.dataset.copy = url;
  copy.textContent = 'Copy';
});

document.addEventListener('visibilitychange', () => {
  if (!running) return;
  if (document.hidden) {
    S.leftPage++;
    persist();
  } else keepAwake();
});

window.addEventListener('beforeunload', (e) => {
  if (running || (S?.finished && (pendingUploads() || (S.answers && !S.answersSent)))) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ─── start ──────────────────────────────────────────────────────────────────

function start() {
  resumeUploads();
  stopSpeaking();
  PREVIEW.clock?.stop();
  if (location.hash === '#teacher' || location.hash === '#preview') {
    if (!unlocked()) return renderCode();
    return location.hash === '#preview' ? renderPreview() : renderTeacher();
  }
  const saved = savedSession();
  if (saved && !saved.finished && !saved.answers) {
    S = { draft: [], ...saved, steps: buildTimeline({ scale: SCALE }) };
    S.stepIndex = resumeIndex(S.steps, S.done);
    S.resumed = (S.resumed || 0) + 1;
    persist();
    renderCheck(true);
    // Only Part 3 is left: no microphone needed to go on.
    if (!S.steps.slice(S.stepIndex).some((s) => s.type === 'response')) app.querySelector('[data-begin]').disabled = false;
    return;
  }
  if (saved && (saved.finished || saved.answers)) {
    // Part 3 was sent but the page closed before the end was reported.
    if (!saved.finished) report({ type: 'finish', attempt: saved.attempt, student: saved.student, group: saved.group, leftPage: saved.leftPage, resumed: saved.resumed, finishedAt: new Date().toISOString() });
    S = { ...saved, steps: buildTimeline({ scale: SCALE }), finished: true };
    persist();
    return renderDone();
  }
  renderStart();
}

window.addEventListener('hashchange', () => !running && start());
start();
