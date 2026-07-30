// Nokia rules: the wall kills you. No wrapping, no levels - just get longer.
const GRID = 16;            // cells per side
const CELL = 16;            // pixels per cell in the canvas' own coordinates
const START_SPEED = 340;    // ms per step
const MIN_SPEED = 180;      // the fastest it ever gets, ~6 cells a second
const SPEED_STEP = 4;       // faster per apple eaten
const READY_DELAY = 2200;   // how long Game Over stays before a fresh board is dealt
const SWIPE = 16;           // pixels of drag that count as a swipe
const EARLY_TURN = 0.55;    // how far into a step a turn may pull the next one forward

// LCD palette - grey-green screen, near-black pixels
const SCREEN = '#a8bd8f';
const PIXEL = '#232b1c';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const resultEl = document.getElementById('result');
const resultTitleEl = document.getElementById('result-title');
const resultSubEl = document.getElementById('result-sub');

let snake = [];
let dir = null;             // null while waiting for the first input
let queued = [];            // direction presses, applied one per step
let food = { x: 0, y: 0 };
let score = 0;
let speed = START_SPEED;
let state = 'ready';        // 'ready' | 'running' | 'over'
let best = Number(localStorage.getItem('snake-best') || 0);

// The grid rules are pure Nokia - one whole cell per step. Only the drawing is
// smooth: every frame the snake is rendered part-way between where it was and
// where the step has already put it.
let prevSnake = [];         // cell positions at the start of the current step
let stepT = 0;              // 0..1 progress through the current step
let acc = 0;                // ms banked towards the next step
let clock = 0;              // ms since the page loaded, drives the food blink
let lastTime = 0;

let readyTimer = null;
let blinkOn = true;

const VECTORS = {
  up:    { x: 0, y: -1 },
  down:  { x: 0, y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function clearTimers() {
  clearTimeout(readyTimer);
  readyTimer = null;
}

// --- rendering -------------------------------------------------------------

// x and y arrive part-way between cells. They snap to whole canvas pixels so
// the LCD stays crisp - at 16 pixels a cell that is still 16 steps of movement
// where there used to be one.
function drawCell(x, y, hollow) {
  const px = Math.round(x * CELL);
  const py = Math.round(y * CELL);
  ctx.fillStyle = PIXEL;
  ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
  if (hollow) {
    // Body segments are rings, like the original - the head stays solid.
    ctx.fillStyle = SCREEN;
    ctx.fillRect(px + 5, py + 5, CELL - 10, CELL - 10);
  }
}

function render() {
  ctx.fillStyle = SCREEN;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Every segment slides into the cell the one ahead of it just left, so the
  // whole body crawls instead of jumping. A segment with no previous position
  // is the one just grown by an apple - it sits still until the body reaches it.
  const t = state === 'running' ? stepT : 1;
  snake.forEach((s, i) => {
    const p = prevSnake[i] || s;
    drawCell(p.x + (s.x - p.x) * t, p.y + (s.y - p.y) * t, i > 0);
  });

  if (blinkOn || state !== 'running') {
    ctx.fillStyle = PIXEL;
    ctx.fillRect(food.x * CELL + 4, food.y * CELL + 4, CELL - 8, CELL - 8);
  }
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

function hideResult() {
  resultEl.hidden = true;
}

function renderScores() {
  scoreEl.textContent = score;
  bestEl.textContent = best;
}

// --- game logic ------------------------------------------------------------

function placeFood() {
  const free = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!snake.some(s => s.x === x && s.y === y)) free.push({ x, y });
    }
  }
  if (!free.length) return false;          // board full - perfect game
  food = free[Math.floor(Math.random() * free.length)];
  return true;
}

function turn(name) {
  const v = VECTORS[name];
  if (!v) return;
  // Compare against the last queued turn, not the current one, so two quick
  // presses (right then down) both register instead of cancelling out.
  const last = queued.length ? queued[queued.length - 1] : dir;
  if (last && last.x === -v.x && last.y === -v.y) return;   // no 180 turns
  if (last && last.x === v.x && last.y === v.y) return;     // already going there

  if (state === 'over') return;
  if (state === 'ready') {
    dir = v;
    state = 'running';
    acc = 0;
    stepT = 0;
    // Take the first step at once: the glide is the animation of that step, so
    // the snake answers the key immediately instead of after a step's pause.
    step();
    setStatus('Go!');
    return;
  }
  // Late in a step the snake is all but into the next cell, so waiting for the
  // clock makes a turn feel ignored. Take the step now instead. The rhythm
  // simply restarts, so this cannot be spammed for extra speed.
  if (!queued.length && stepT >= EARLY_TURN) {
    dir = v;
    acc = 0;
    stepT = 0;
    step();
    return;
  }
  if (queued.length < 3) queued.push(v);
}

function step() {
  if (state !== 'running') return;
  if (queued.length) dir = queued.shift();

  // Where each segment is coming from, for this step's animation.
  prevSnake = snake.slice();

  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Nokia rules: walls are lethal.
  if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) return gameOver();

  const ate = head.x === food.x && head.y === food.y;
  // The tail vacates this step unless we just ate, so it is safe to move onto.
  const body = ate ? snake : snake.slice(0, -1);
  if (body.some(s => s.x === head.x && s.y === head.y)) return gameOver();

  snake.unshift(head);
  if (ate) {
    score++;
    speed = Math.max(MIN_SPEED, START_SPEED - score * SPEED_STEP);
    renderScores();
    if (!placeFood()) return gameOver(true);
  } else {
    snake.pop();
  }
}

// One frame: bank the elapsed time, take whole steps out of it, and draw the
// leftover as part-way movement.
function tick(now) {
  requestAnimationFrame(tick);
  // Clamp: a backgrounded tab comes back with a huge gap that would run off
  // several steps at once.
  const dt = Math.min(now - lastTime, 100);
  lastTime = now;
  clock += dt;
  blinkOn = Math.floor(clock / 300) % 2 === 0;

  if (state === 'running') {
    acc += dt;
    while (acc >= speed) {
      acc -= speed;
      step();
      if (state !== 'running') { acc = 0; break; }
    }
    stepT = Math.min(1, acc / speed);
  }
  render();
}

function gameOver(perfect = false) {
  state = 'over';
  clearTimers();
  if (score > best) {
    best = score;
    localStorage.setItem('snake-best', String(best));
  }
  renderScores();
  render();

  const beat = score === best && score > 0;
  const pts = `${score} ${score === 1 ? 'point' : 'points'}`;
  if (perfect) {
    setStatus(`Perfect game! ${pts}`, 'win-x');
    showResult('Perfect!', `You filled the screen — ${pts}`, 'win-x');
  } else {
    setStatus(`Game over — ${pts}`, 'is-lost');
    showResult('Game over', beat ? `New best — ${pts}` : pts, 'is-lost');
  }
  // hold the result on screen, then deal a fresh board that waits for input
  readyTimer = setTimeout(() => { readyTimer = null; ready(); }, READY_DELAY);
}

// --- round / controls ------------------------------------------------------

// A fresh board is dealt automatically, but it holds still until you steer -
// dropping straight into a moving game would kill you before you looked up.
function ready() {
  clearTimers();
  hideResult();
  const mid = Math.floor(GRID / 2);
  snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
  prevSnake = snake.slice();
  stepT = 0;
  acc = 0;
  dir = null;
  queued = [];
  score = 0;
  speed = START_SPEED;
  state = 'ready';
  placeFood();
  renderScores();
  render();
  setStatus('Swipe or press an arrow to start');
}

document.addEventListener('keydown', e => {
  const map = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
  };
  const name = map[e.key] || map[e.key.toLowerCase()];
  if (!name) return;
  e.preventDefault();          // arrows would otherwise scroll the page
  turn(name);
});

// The pads answer on press rather than on click: a click needs the finger to
// land and lift on the same button, which in a hurry it often does not.
document.querySelectorAll('.pad').forEach(btn => {
  let pressedAt = -1e9;
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    pressedAt = e.timeStamp;
    turn(btn.dataset.dir);
  });
  // Keyboard and assistive clicks still arrive as clicks with no press first;
  // the guard only swallows the click that a press of our own just produced.
  btn.addEventListener('click', e => {
    if (e.timeStamp - pressedAt > 500) turn(btn.dataset.dir);
  });
});

// Steering by drag. The turn happens the moment the finger has travelled far
// enough - waiting for it to lift made every turn feel a beat late. After each
// turn the origin moves to the finger, so one unbroken drag can trace a whole
// path: right, down, right again, without ever lifting off.
let drag = null;

canvas.addEventListener('pointerdown', e => {
  drag = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  if (Math.abs(dx) < SWIPE && Math.abs(dy) < SWIPE) return;
  turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  drag = { x: e.clientX, y: e.clientY };
});

const endDrag = () => { drag = null; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

document.getElementById('restart').addEventListener('click', () => ready());

document.getElementById('reset-best').addEventListener('click', () => {
  best = 0;
  localStorage.removeItem('snake-best');
  renderScores();
});

// The apple blinks, like the original. Driven by the clock rather than the
// steps, so the blink rate stays steady as the snake speeds up.

ready();
lastTime = performance.now();
requestAnimationFrame(tick);
