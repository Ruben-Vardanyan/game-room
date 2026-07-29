// Nokia rules: the wall kills you. No wrapping, no levels - just get longer.
const GRID = 16;            // cells per side
const CELL = 16;            // pixels per cell in the canvas' own coordinates
const START_SPEED = 200;    // ms per step
const MIN_SPEED = 90;
const SPEED_STEP = 6;       // faster per apple eaten
const READY_DELAY = 2200;   // how long Game Over stays before a fresh board is dealt

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

let stepTimer = null;
let readyTimer = null;
let blinkOn = true;
let blinkTimer = null;

const VECTORS = {
  up:    { x: 0, y: -1 },
  down:  { x: 0, y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function clearTimers() {
  clearTimeout(stepTimer);
  clearTimeout(readyTimer);
  stepTimer = null;
  readyTimer = null;
}

// --- rendering -------------------------------------------------------------

function drawCell(x, y, hollow) {
  const px = x * CELL;
  const py = y * CELL;
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

  snake.forEach((s, i) => drawCell(s.x, s.y, i > 0));

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
    setStatus('Go!');
    scheduleStep();
    return;
  }
  if (queued.length < 2) queued.push(v);
}

function scheduleStep() {
  clearTimeout(stepTimer);
  stepTimer = setTimeout(step, speed);
}

function step() {
  if (state !== 'running') return;
  if (queued.length) dir = queued.shift();

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

  render();
  scheduleStep();
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

document.querySelectorAll('.pad').forEach(btn => {
  btn.addEventListener('click', () => turn(btn.dataset.dir));
});

// Swipe anywhere on the screen panel
let touch = null;
canvas.addEventListener('touchstart', e => {
  const t = e.changedTouches[0];
  touch = { x: t.clientX, y: t.clientY };
}, { passive: true });

canvas.addEventListener('touchmove', e => {
  if (touch) e.preventDefault();   // don't scroll the page mid-swipe
}, { passive: false });

canvas.addEventListener('touchend', e => {
  if (!touch) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touch.x;
  const dy = t.clientY - touch.y;
  touch = null;
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
  turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
}, { passive: true });

document.getElementById('restart').addEventListener('click', () => ready());

document.getElementById('reset-best').addEventListener('click', () => {
  best = 0;
  localStorage.removeItem('snake-best');
  renderScores();
});

// The apple blinks, like the original. Independent of the step timer so the
// blink rate stays steady as the snake speeds up.
blinkTimer = setInterval(() => {
  blinkOn = !blinkOn;
  if (state === 'running') render();
}, 300);

ready();
