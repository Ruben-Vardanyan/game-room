// Nine darts, highest total. Aiming is pure timing: a vertical line sweeps and
// you stop it to fix the across position, then a horizontal line sweeps for the
// up-down. Where you stop it is exactly where the dart lands - no hidden wobble,
// so a good throw is always your own.

// The canvas is laid out in millimetres of a real 170mm-radius board, so every
// ring below is the regulation measurement.
const SIZE = 400;
const CX = SIZE / 2, CY = SIZE / 2;
const R_BULL_IN = 6.35;     // 50
const R_BULL_OUT = 15.9;    // 25
const R_TREBLE_IN = 99;
const R_TREBLE_OUT = 107;
const R_DOUBLE_IN = 162;
const R_DOUBLE_OUT = 170;   // outside this is a miss
const R_NUMBERS = 184;

// Sector numbers clockwise from the top. 20 is up, 3 is straight down.
const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

const DARTS = 9;
// Slow enough that a treble is a judgement call rather than a coin toss: the
// sight sits inside the 8mm treble bed for ~73ms, and over the bull for ~115ms.
const SWEEP_SPEED = 110;    // canvas units per second
const THROW_PAUSE = 850;    // how long a landed dart is read before the next one
const READY_DELAY = 2800;   // how long the result stays before a fresh round

const CREAM = '#e9e1cc';
const BLACK = '#1b2130';
const RED = '#d95448';
const GREEN = '#3f9e6a';
const WIRE = '#3d465e';
const SURROUND = '#141924';
const SIGHT = '#6ea8fe';
const TAU = Math.PI * 2;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const dartEl = document.getElementById('dart');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const resultEl = document.getElementById('result');
const resultTitleEl = document.getElementById('result-title');
const resultSubEl = document.getElementById('result-sub');

const MIN = CX - R_DOUBLE_OUT;
const MAX = CX + R_DOUBLE_OUT;

let state = 'aim-x';        // 'aim-x' | 'aim-y' | 'thrown' | 'over'
let sweep = MIN;
let dir = 1;
let aimX = CX;
let thrown = [];            // { x, y, value, label }
let total = 0;
let best = Number(localStorage.getItem('darts-best') || 0);

let lastTime = 0;
let rafId = null;
let pauseTimer = null;
let readyTimer = null;

function clearTimers() {
  clearTimeout(pauseTimer);
  clearTimeout(readyTimer);
  pauseTimer = null;
  readyTimer = null;
}

// --- scoring ---------------------------------------------------------------

function scoreAt(x, y) {
  const dx = x - CX, dy = y - CY;
  const r = Math.hypot(dx, dy);
  if (r > R_DOUBLE_OUT) return { value: 0, label: 'Missed the board' };
  if (r <= R_BULL_IN) return { value: 50, label: 'Bullseye' };
  if (r <= R_BULL_OUT) return { value: 25, label: 'Outer bull' };

  // Angle clockwise from straight up, so sector 0 (the 20) straddles the top.
  let a = Math.atan2(dx, -dy);
  if (a < 0) a += TAU;
  const n = SECTORS[Math.floor((a + Math.PI / 20) / (Math.PI / 10)) % 20];

  if (r >= R_DOUBLE_IN) return { value: n * 2, label: `Double ${n}` };
  if (r >= R_TREBLE_IN && r <= R_TREBLE_OUT) return { value: n * 3, label: `Treble ${n}` };
  return { value: n, label: `${n}` };
}

// --- board -----------------------------------------------------------------

// Angles are measured clockwise from up; the canvas measures from the +x axis.
function wedge(r0, r1, a0, a1, fill) {
  const c0 = a0 - Math.PI / 2, c1 = a1 - Math.PI / 2;
  ctx.beginPath();
  ctx.arc(CX, CY, r1, c0, c1);
  ctx.arc(CX, CY, r0, c1, c0, true);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function disc(r, fill) {
  ctx.beginPath();
  ctx.arc(CX, CY, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

function ring(r) {
  ctx.beginPath();
  ctx.arc(CX, CY, r, 0, TAU);
  ctx.strokeStyle = WIRE;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawBoard() {
  disc(SIZE / 2, SURROUND);

  const half = Math.PI / 20;
  for (let i = 0; i < 20; i++) {
    const mid = i * Math.PI / 10;
    const a0 = mid - half, a1 = mid + half;
    // Sector 20 is black with red rings; they alternate from there.
    const dark = i % 2 === 0;
    wedge(R_BULL_OUT, R_TREBLE_IN, a0, a1, dark ? BLACK : CREAM);
    wedge(R_TREBLE_OUT, R_DOUBLE_IN, a0, a1, dark ? BLACK : CREAM);
    wedge(R_TREBLE_IN, R_TREBLE_OUT, a0, a1, dark ? RED : GREEN);
    wedge(R_DOUBLE_IN, R_DOUBLE_OUT, a0, a1, dark ? RED : GREEN);
  }

  disc(R_BULL_OUT, GREEN);
  disc(R_BULL_IN, RED);

  // Wires
  ctx.save();
  ctx.strokeStyle = WIRE;
  ctx.lineWidth = 1;
  for (let i = 0; i < 20; i++) {
    const a = (i + 0.5) * Math.PI / 10 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * R_BULL_OUT, CY + Math.sin(a) * R_BULL_OUT);
    ctx.lineTo(CX + Math.cos(a) * R_DOUBLE_OUT, CY + Math.sin(a) * R_DOUBLE_OUT);
    ctx.stroke();
  }
  [R_BULL_IN, R_BULL_OUT, R_TREBLE_IN, R_TREBLE_OUT, R_DOUBLE_IN, R_DOUBLE_OUT].forEach(ring);
  ctx.restore();

  // Numbers around the rim
  ctx.fillStyle = CREAM;
  ctx.font = '600 17px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 20; i++) {
    const mid = i * Math.PI / 10;
    ctx.fillText(String(SECTORS[i]),
      CX + Math.sin(mid) * R_NUMBERS,
      CY - Math.cos(mid) * R_NUMBERS);
  }
}

function drawDart(d, latest) {
  ctx.beginPath();
  ctx.arc(d.x, d.y, latest ? 5 : 3.5, 0, TAU);
  ctx.fillStyle = latest ? '#ffffff' : '#c9d3e6';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#10131a';
  ctx.stroke();
}

function render() {
  drawBoard();

  // The locked across-position stays visible while you set the height, so you
  // can see which column of the board you have committed to.
  if (state === 'aim-y' || state === 'aim-x') {
    ctx.save();
    ctx.lineWidth = 2;
    if (state === 'aim-y') {
      ctx.strokeStyle = 'rgba(110, 168, 254, .45)';
      ctx.beginPath();
      ctx.moveTo(aimX, MIN); ctx.lineTo(aimX, MAX);
      ctx.stroke();
      ctx.strokeStyle = SIGHT;
      ctx.beginPath();
      ctx.moveTo(MIN, sweep); ctx.lineTo(MAX, sweep);
      ctx.stroke();
    } else {
      ctx.strokeStyle = SIGHT;
      ctx.beginPath();
      ctx.moveTo(sweep, MIN); ctx.lineTo(sweep, MAX);
      ctx.stroke();
    }
    ctx.restore();
  }

  thrown.forEach((d, i) => drawDart(d, i === thrown.length - 1));
}

function setStatus(text, tone) {
  statusEl.textContent = text;
  statusEl.className = 'status' + (tone ? ' ' + tone : '');
}

// The banner replays its entrance animation each time it is shown.
function showResult(title, sub, tone) {
  resultTitleEl.textContent = title;
  resultTitleEl.className = 'result-title' + (tone ? ' ' + tone : '');
  resultSubEl.textContent = sub;
  resultEl.hidden = false;
  resultEl.style.animation = 'none';
  void resultEl.offsetWidth;
  resultEl.style.animation = '';
}

function renderScores() {
  dartEl.textContent = `${Math.min(thrown.length + 1, DARTS)}/${DARTS}`;
  scoreEl.textContent = total;
  bestEl.textContent = best || '—';
  canvas.setAttribute('aria-label', thrown.length
    ? `Dartboard, last throw ${thrown[thrown.length - 1].label}, ${total} total`
    : 'Dartboard, no darts thrown');
}

// --- loop ------------------------------------------------------------------

function tick(now) {
  rafId = requestAnimationFrame(tick);
  // Clamp: a backgrounded tab returns with a huge gap that would jump the sight
  // across the board in a single frame.
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (state !== 'aim-x' && state !== 'aim-y') return;

  sweep += dir * SWEEP_SPEED * dt;
  if (sweep >= MAX) { sweep = MAX; dir = -1; }
  if (sweep <= MIN) { sweep = MIN; dir = 1; }
  render();
}

// --- throwing --------------------------------------------------------------

function throwDart() {
  if (state === 'aim-x') {
    aimX = sweep;
    state = 'aim-y';
    sweep = MIN;
    dir = 1;
    setStatus('Now stop the across line');
    render();
    return;
  }
  if (state !== 'aim-y') return;

  const hit = scoreAt(aimX, sweep);
  thrown.push({ x: aimX, y: sweep, ...hit });
  total += hit.value;
  state = 'thrown';
  renderScores();
  render();

  const tone = hit.value === 0 ? 'is-lost' : hit.value >= 40 ? 'win-x' : null;
  setStatus(hit.value ? `${hit.label} — ${hit.value}` : hit.label, tone);

  pauseTimer = setTimeout(() => {
    pauseTimer = null;
    if (thrown.length >= DARTS) return finish();
    nextDart();
  }, THROW_PAUSE);
}

function nextDart() {
  state = 'aim-x';
  sweep = MIN;
  dir = 1;
  renderScores();
  setStatus('Stop the up-down line');
  render();
}

function finish() {
  state = 'over';
  const beat = total > best;
  if (beat) {
    best = total;
    localStorage.setItem('darts-best', String(best));
  }
  renderScores();
  render();
  setStatus(`${total} with nine darts — next round…`, 'win-x');
  showResult(`${total}`, beat ? 'New best!' : `Best is ${best}`, 'win-x');
  // hold the result on screen, then deal a fresh round
  readyTimer = setTimeout(() => { readyTimer = null; newRound(); }, READY_DELAY);
}

// --- round / controls ------------------------------------------------------

function newRound() {
  clearTimers();
  resultEl.hidden = true;
  thrown = [];
  total = 0;
  aimX = CX;
  nextDart();
}

document.addEventListener('keydown', e => {
  if (e.key !== ' ' && e.key !== 'Enter') return;
  if (e.target.tagName === 'BUTTON') return;   // the button fires its own click
  e.preventDefault();                          // space would otherwise scroll
  throwDart();
});

canvas.addEventListener('pointerdown', e => { e.preventDefault(); throwDart(); });
document.getElementById('throw').addEventListener('click', throwDart);
document.getElementById('restart').addEventListener('click', () => newRound());

document.getElementById('reset-best').addEventListener('click', () => {
  best = 0;
  localStorage.removeItem('darts-best');
  renderScores();
});

newRound();
lastTime = performance.now();
rafId = requestAnimationFrame(tick);
