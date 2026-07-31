// A maze you walk out of. Every level is generated fresh, gets one ring wider,
// and the next one deals itself the moment you reach the exit.
const SIZE = 360;           // canvas side in its own coordinates
const FIRST = 9;            // cells per side on level 1
const MAX_CELLS = 21;       // widest the maze ever gets
const STEP_MS = 105;        // how long one cell of walking takes
const NEXT_DELAY = 1600;    // how long "Level cleared" stays before the next maze
const SWIPE = 14;           // pixels of drag that count as a direction

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const levelEl = document.getElementById('level');
const timeEl = document.getElementById('time');
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

let n = FIRST;              // cells per side
let cell = SIZE / n;        // pixels per cell
let cells = [];             // each: { walls: {up,down,left,right} }
let pos = { x: 0, y: 0 };   // the cell you are standing in
let from = { x: 0, y: 0 };  // the cell the current step started in
let stepT = 1;              // 0..1 through the current step; 1 = standing still
let moving = false;
let trail = [];             // cells already walked, drawn faintly
let level = 1;
let best = Number(localStorage.getItem('maze-best') || 1);
let state = 'ready';        // 'ready' | 'running' | 'cleared'
let startedAt = 0;
let elapsed = 0;
let lastTime = 0;
let nextTimer = null;

// Held directions, newest last, so a finger rolling from one pad to the next
// follows the newest press but falls back to one still held down.
let heldKeys = [];
let padDir = null;
let dragDir = null;

function heldDir() {
  return dragDir || padDir || (heldKeys.length ? heldKeys[heldKeys.length - 1] : null);
}

// --- maze generation -------------------------------------------------------

const idx = (x, y) => y * n + x;

// Recursive backtracker: carve a path as far as it goes, then reverse to the
// last cell with an unvisited neighbour. Gives long winding corridors and
// exactly one route between any two cells.
function generate() {
  cells = [];
  for (let i = 0; i < n * n; i++) {
    cells.push({ walls: { up: true, down: true, left: true, right: true }, seen: false });
  }

  const stack = [{ x: 0, y: 0 }];
  cells[0].seen = true;

  while (stack.length) {
    const c = stack[stack.length - 1];
    const options = [];
    for (const name of Object.keys(VECTORS)) {
      const v = VECTORS[name];
      const nx = c.x + v.x;
      const ny = c.y + v.y;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      if (cells[idx(nx, ny)].seen) continue;
      options.push({ name, nx, ny });
    }
    if (!options.length) { stack.pop(); continue; }

    const pick = options[Math.floor(Math.random() * options.length)];
    const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' }[pick.name];
    cells[idx(c.x, c.y)].walls[pick.name] = false;
    cells[idx(pick.nx, pick.ny)].walls[opposite] = false;
    cells[idx(pick.nx, pick.ny)].seen = true;
    stack.push({ x: pick.nx, y: pick.ny });
  }
}

const atExit = () => pos.x === n - 1 && pos.y === n - 1;
const canGo = (name) => {
  const v = VECTORS[name];
  if (!v) return false;
  if (cells[idx(pos.x, pos.y)].walls[name]) return false;
  const nx = pos.x + v.x;
  const ny = pos.y + v.y;
  return nx >= 0 && ny >= 0 && nx < n && ny < n;
};

// --- rendering -------------------------------------------------------------

function roundedDot(x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function render() {
  ctx.fillStyle = '#141a24';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Breadcrumbs: where you have already been, so a dead end reads as one.
  ctx.fillStyle = 'rgba(110, 168, 254, .14)';
  const crumb = Math.max(3, cell * 0.26);
  for (const t of trail) {
    ctx.fillRect((t.x + .5) * cell - crumb / 2, (t.y + .5) * cell - crumb / 2, crumb, crumb);
  }

  // The exit, breathing gently so the eye finds it straight away.
  const pulse = 0.5 + 0.5 * Math.sin(lastTime / 420);
  const ex = (n - 1 + .5) * cell;
  const ey = (n - 1 + .5) * cell;
  ctx.fillStyle = `rgba(255, 184, 107, ${0.22 + 0.16 * pulse})`;
  ctx.fillRect((n - 1) * cell + 2, (n - 1) * cell + 2, cell - 4, cell - 4);
  roundedDot(ex, ey, cell * (0.2 + 0.03 * pulse), '#ffb86b');

  // Walls
  ctx.strokeStyle = '#46516b';
  ctx.lineWidth = Math.max(2, cell * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const w = cells[idx(x, y)].walls;
      const px = x * cell;
      const py = y * cell;
      // Only the top and left of each cell are drawn, plus the outer edges,
      // so no wall is stroked twice.
      if (w.up)    { ctx.moveTo(px, py);               ctx.lineTo(px + cell, py); }
      if (w.left)  { ctx.moveTo(px, py);               ctx.lineTo(px, py + cell); }
      if (y === n - 1 && w.down)  { ctx.moveTo(px, py + cell);        ctx.lineTo(px + cell, py + cell); }
      if (x === n - 1 && w.right) { ctx.moveTo(px + cell, py);        ctx.lineTo(px + cell, py + cell); }
    }
  }
  ctx.stroke();

  // The walker, drawn part-way between the cell it left and the one it entered.
  const t = moving ? stepT : 1;
  const wx = (from.x + (pos.x - from.x) * t + .5) * cell;
  const wy = (from.y + (pos.y - from.y) * t + .5) * cell;
  roundedDot(wx, wy, cell * 0.3, 'rgba(110, 168, 254, .25)');
  roundedDot(wx, wy, cell * 0.2, '#6ea8fe');
}

function setStatus(text, tone) {
  statusEl.textContent = text;
  statusEl.className = 'status' + (tone ? ' ' + tone : '');
}

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
  levelEl.textContent = level;
  timeEl.textContent = Math.floor(elapsed / 1000) + 's';
  bestEl.textContent = best;
}

// --- walking ---------------------------------------------------------------

function startStep(name) {
  if (!canGo(name)) return false;
  const v = VECTORS[name];
  from = { x: pos.x, y: pos.y };
  pos = { x: pos.x + v.x, y: pos.y + v.y };
  if (!trail.some(c => c.x === from.x && c.y === from.y)) trail.push(from);
  stepT = 0;
  moving = true;
  return true;
}

// A press starts walking. Holding it keeps you walking, one cell after another,
// until a wall stops you.
function press(name) {
  if (state === 'cleared') return;
  if (state === 'ready') {
    state = 'running';
    startedAt = lastTime;
    setStatus('Go!');
  }
  if (!moving) startStep(name);
}

function cleared() {
  state = 'cleared';
  // Same rounding as the Time box, so the two never disagree by a second.
  const secs = Math.max(1, Math.floor(elapsed / 1000));
  renderScores();
  setStatus(`Out in ${secs}s — level ${level + 1} coming up`, 'win-o');
  showResult('You found the exit', `${secs}s on level ${level}`, 'win-o');
  nextTimer = setTimeout(() => {
    nextTimer = null;
    level++;
    deal();
  }, NEXT_DELAY);
}

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(now - lastTime, 100);
  lastTime = now;

  if (state === 'running') {
    elapsed = now - startedAt;
    if (moving) {
      stepT += dt / STEP_MS;
      while (stepT >= 1) {
        const over = (stepT - 1) * STEP_MS;
        moving = false;
        stepT = 1;
        if (atExit()) { cleared(); break; }
        // Carry the overshoot into the next cell so a held direction walks a
        // corridor at one steady pace instead of stuttering at every cell.
        const held = heldDir();
        if (held && startStep(held)) stepT = over / STEP_MS;
        else break;
      }
    }
    renderScores();
  }
  render();
}

// --- levels / controls -----------------------------------------------------

function deal() {
  clearTimeout(nextTimer);
  nextTimer = null;
  resultEl.hidden = true;
  n = Math.min(MAX_CELLS, FIRST + (level - 1) * 2);
  cell = SIZE / n;
  generate();
  pos = { x: 0, y: 0 };
  from = { x: 0, y: 0 };
  trail = [];
  stepT = 1;
  moving = false;
  elapsed = 0;
  state = 'ready';
  // Best is the deepest level ever reached, so it counts the moment one is dealt.
  if (level > best) {
    best = level;
    localStorage.setItem('maze-best', String(best));
  }
  renderScores();
  setStatus('Find the orange square');
}

const KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
};

document.addEventListener('keydown', e => {
  const name = KEYS[e.key] || KEYS[e.key.toLowerCase()];
  if (!name) return;
  e.preventDefault();            // arrows would otherwise scroll the page
  if (e.repeat) return;
  heldKeys = heldKeys.filter(k => k !== name);
  heldKeys.push(name);
  press(name);
});

document.addEventListener('keyup', e => {
  const name = KEYS[e.key] || KEYS[e.key.toLowerCase()];
  if (name) heldKeys = heldKeys.filter(k => k !== name);
});

// The pads answer on press rather than on click, and keep walking while held.
document.querySelectorAll('.pad').forEach(btn => {
  let pressedAt = -1e9;
  const release = () => { if (padDir === btn.dataset.dir) padDir = null; };
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    pressedAt = e.timeStamp;
    padDir = btn.dataset.dir;
    press(padDir);
  });
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('pointerleave', release);
  // Keyboard and assistive clicks arrive with no press first; the guard only
  // swallows the click that a press of our own just produced.
  btn.addEventListener('click', e => {
    if (e.timeStamp - pressedAt > 500) press(btn.dataset.dir);
  });
});

// Steering by drag: hold the finger off to one side and you keep walking that
// way. Moving it past the threshold again turns the corner, no lifting off.
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
  dragDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  press(dragDir);
  drag = { x: e.clientX, y: e.clientY };
});

const endDrag = () => { drag = null; dragDir = null; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

document.getElementById('restart').addEventListener('click', () => { level = 1; deal(); });

document.getElementById('reset-best').addEventListener('click', () => {
  best = 1;
  localStorage.removeItem('maze-best');
  renderScores();
});

deal();
lastTime = performance.now();
requestAnimationFrame(tick);
