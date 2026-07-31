// 2048: slide the board, equal tiles join, keep going until nothing can move.
const N = 4;                // cells per side
const MOVE_MS = 120;        // how long a slide takes before merges resolve
const WIN_HOLD = 1800;      // how long the 2048 banner stays before play resumes
const OVER_DELAY = 2400;    // how long Game Over stays before a fresh board is dealt
const SWIPE = 24;           // pixels of drag that count as a swipe

const boardEl = document.getElementById('board');
const tilesEl = document.getElementById('tiles');
const statusEl = document.getElementById('status');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const resultEl = document.getElementById('result');
const resultTitleEl = document.getElementById('result-title');
const resultSubEl = document.getElementById('result-sub');

const VECTORS = {
  up:    { x: 0, y: -1 },
  down:  { x: 0, y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

let grid = [];              // grid[y][x] = tile or null
let tiles = [];             // every live tile, for cleanup
let score = 0;
let best = Number(localStorage.getItem('g2048-best') || 0);
let state = 'running';      // 'running' | 'over'
let reached2048 = false;
let prompting = true;       // the opening prompt is still showing
let moveTimer = null;       // the pending end-of-slide tidy-up
let overTimer = null;
let winTimer = null;

// --- tiles -----------------------------------------------------------------

function faceClass(v) {
  const digits = String(v).length;
  return 'tile-face t-' + (v > 2048 ? 'big' : v) + (digits > 3 ? ' d4' : digits === 3 ? ' d3' : '');
}

function paint(t) {
  t.face.className = faceClass(t.v);
  t.face.textContent = t.v;
}

function place(t) {
  t.el.style.setProperty('--x', t.x);
  t.el.style.setProperty('--y', t.y);
}

function addTile(x, y, v, fresh) {
  const el = document.createElement('div');
  el.className = 'tile';
  const face = document.createElement('div');
  el.appendChild(face);
  const t = { x, y, v, el, face, dead: false, merged: false };
  paint(t);
  if (fresh) t.face.classList.add('is-new');
  place(t);
  tilesEl.appendChild(el);
  tiles.push(t);
  grid[y][x] = t;
  return t;
}

function emptyCells() {
  const free = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) if (!grid[y][x]) free.push({ x, y });
  }
  return free;
}

// The classic split: nine 2s for every 4.
function spawn() {
  const free = emptyCells();
  if (!free.length) return;
  const c = free[Math.floor(Math.random() * free.length)];
  addTile(c.x, c.y, Math.random() < 0.9 ? 2 : 4, true);
}

// --- board -----------------------------------------------------------------

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
  scoreEl.textContent = score;
  bestEl.textContent = best;
}

function canMove() {
  if (emptyCells().length) return true;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const v = grid[y][x].v;
      if (x + 1 < N && grid[y][x + 1].v === v) return true;
      if (y + 1 < N && grid[y + 1][x].v === v) return true;
    }
  }
  return false;
}

// --- moving ----------------------------------------------------------------

// Tidy up after a slide: the tiles that merged away are gone, the survivors
// show their new value, and one new tile drops in.
function settle() {
  clearTimeout(moveTimer);
  moveTimer = null;

  tiles.forEach(t => {
    if (t.dead) t.el.remove();
    else if (t.merged) {
      t.merged = false;
      paint(t);
      // restart the pop, otherwise a tile merging twice in a row only bumps once
      t.face.classList.remove('is-merged');
      void t.face.offsetWidth;
      t.face.classList.add('is-merged');
    }
  });
  tiles = tiles.filter(t => !t.dead);

  spawn();

  if (reached2048 === 'fresh') {
    reached2048 = true;
    showResult('2048!', 'Keep going — see how far you get', 'win-o');
    setStatus('2048! Keep going', 'win-o');
    winTimer = setTimeout(() => {
      winTimer = null;
      resultEl.hidden = true;
      if (state === 'running') setStatus('Keep joining');
    }, WIN_HOLD);
  }

  if (!canMove()) gameOver();
}

// A move landing mid-slide finishes the previous one first, so quick play never
// loses a turn or leaves a merged tile showing its old number.
function flush() {
  if (moveTimer) settle();
}

function move(dir) {
  if (state !== 'running') return;
  flush();

  const v = VECTORS[dir];
  if (!v) return;
  // Walk the board from the far side, so the tile nearest the wall settles first.
  const xs = v.x > 0 ? [3, 2, 1, 0] : [0, 1, 2, 3];
  const ys = v.y > 0 ? [3, 2, 1, 0] : [0, 1, 2, 3];
  let moved = false;

  for (const y of ys) {
    for (const x of xs) {
      const t = grid[y][x];
      if (!t) continue;
      grid[y][x] = null;

      // slide over empty cells
      let nx = x;
      let ny = y;
      while (true) {
        const tx = nx + v.x;
        const ty = ny + v.y;
        if (tx < 0 || ty < 0 || tx >= N || ty >= N || grid[ty][tx]) break;
        nx = tx;
        ny = ty;
      }

      // join with the tile in the way, if it matches and has not already joined
      const tx = nx + v.x;
      const ty = ny + v.y;
      const other = tx < 0 || ty < 0 || tx >= N || ty >= N ? null : grid[ty][tx];
      if (other && other.v === t.v && !other.merged) {
        // this tile slides underneath and is removed once it arrives
        t.x = tx;
        t.y = ty;
        t.dead = true;
        place(t);
        other.v *= 2;
        other.merged = true;
        score += other.v;
        if (other.v === 2048 && !reached2048) reached2048 = 'fresh';
        moved = true;
        continue;
      }

      grid[ny][nx] = t;
      if (nx !== t.x || ny !== t.y) moved = true;
      t.x = nx;
      t.y = ny;
      place(t);
    }
  }

  if (!moved) {
    // undo the merge flags: nothing happened, so nothing is spent
    tiles.forEach(t => { t.merged = false; });
    return;
  }

  if (score > best) {
    best = score;
    localStorage.setItem('g2048-best', String(best));
  }
  // The opening prompt has done its job once the board has actually moved.
  if (prompting) {
    prompting = false;
    setStatus('Keep joining');
  }
  renderScores();
  moveTimer = setTimeout(settle, MOVE_MS);
}

function gameOver() {
  state = 'over';
  const beat = score === best && score > 0;
  setStatus(`No moves left — ${score}`, 'is-lost');
  showResult('No moves left', beat ? `New best — ${score}` : `You scored ${score}`, 'is-lost');
  // hold the result on screen, then deal a fresh board
  overTimer = setTimeout(() => { overTimer = null; deal(); }, OVER_DELAY);
}

// --- round / controls ------------------------------------------------------

function deal() {
  clearTimeout(moveTimer);
  clearTimeout(overTimer);
  clearTimeout(winTimer);
  moveTimer = overTimer = winTimer = null;
  resultEl.hidden = true;
  tilesEl.textContent = '';
  grid = Array.from({ length: N }, () => Array(N).fill(null));
  tiles = [];
  score = 0;
  state = 'running';
  reached2048 = false;
  prompting = true;
  renderScores();
  spawn();
  spawn();
  setStatus('Swipe or press an arrow to join the tiles');
}

const KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
};

document.addEventListener('keydown', e => {
  const name = KEYS[e.key] || KEYS[e.key.toLowerCase()];
  if (!name) return;
  e.preventDefault();          // arrows would otherwise scroll the page
  move(name);
});

// The pads answer on press rather than on click: a click needs the finger to
// land and lift on the same button, which in a hurry it often does not.
document.querySelectorAll('.pad').forEach(btn => {
  let pressedAt = -1e9;
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    pressedAt = e.timeStamp;
    move(btn.dataset.dir);
  });
  // Keyboard and assistive clicks arrive with no press first; the guard only
  // swallows the click that a press of our own just produced.
  btn.addEventListener('click', e => {
    if (e.timeStamp - pressedAt > 500) move(btn.dataset.dir);
  });
});

// One swipe is one move: the board slides as soon as the finger has travelled
// far enough, then waits for it to lift before the next one.
let drag = null;

boardEl.addEventListener('pointerdown', e => {
  drag = { x: e.clientX, y: e.clientY, done: false };
  boardEl.setPointerCapture(e.pointerId);
});

boardEl.addEventListener('pointermove', e => {
  if (!drag || drag.done) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  if (Math.abs(dx) < SWIPE && Math.abs(dy) < SWIPE) return;
  drag.done = true;
  move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
});

const endDrag = () => { drag = null; };
boardEl.addEventListener('pointerup', endDrag);
boardEl.addEventListener('pointercancel', endDrag);

document.getElementById('restart').addEventListener('click', () => deal());

document.getElementById('reset-best').addEventListener('click', () => {
  best = 0;
  localStorage.removeItem('g2048-best');
  renderScores();
});

deal();
