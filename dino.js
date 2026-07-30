// The offline dino: endless runner, one button. Jump the cacti, duck the birds.
// Everything below is measured in the canvas' own 200x60 virtual pixels.
const GROUND = 52;          // y of the ground line; sprites stand on it
const START_SPEED = 62;     // virtual pixels per second
const MAX_SPEED = 132;
const ACCEL = 1.6;          // speed gained per second of running
const GRAVITY = 300;        // px/s^2
const JUMP_V = -110;        // initial upward velocity
const DUCK_GRAVITY = 620;   // holding duck mid-air drops you fast, like the original
const READY_DELAY = 2200;   // how long Game Over stays before a fresh track is dealt

// LCD palette - grey-green screen, near-black pixels (shared with Snake)
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

// --- sprites ---------------------------------------------------------------
// Pixel masks: 'x' is on, anything else is off. Kept as strings so the shapes
// stay readable and editable in place.

const DINO_BODY = [
  '.........xxxxxx.',
  '........xxxxxxxx',
  '........xx.xxxxx',
  '........xxxxxxxx',
  '........xxxxxxxx',
  '........xxxxx...',
  'x.......xxxxxxx.',
  'x......xxxxxxx..',
  'xx....xxxxxxxx..',
  'xxx..xxxxxxxxx..',
  'xxxxxxxxxxxxx...',
  '.xxxxxxxxxxxx...',
  '..xxxxxxxxxxx...',
  '...xxxxxxxxx....',
  '....xxxxxxx.....',
];

const DINO_LEGS = [
  ['....xxx..xx.....', '....xx...xx.....', '...xxx..........'],
  ['....xxx..xx.....', '....xx...xx.....', '.........xxx....'],
];

// Standing still: both feet planted.
const DINO_STAND = ['....xxx..xx.....', '....xx...xx.....', '...xxx...xxx....'];

const DUCK_BODY = [
  '..............xxxxxx',
  '.............xxxxxxx',
  '.............xx.xxxx',
  '.............xxxxxxx',
  'x...........xxxxxxxx',
  'xx.........xxxxxxxx.',
  'xxxxxxxxxxxxxxxxxx..',
  '.xxxxxxxxxxxxxxxx...',
  '..xxxxxxxxxxxxxx....',
  '...xxxxxxxxxxx......',
];

const DUCK_LEGS = [
  ['....xx...xxx........', '...xxx...xx.........'],
  ['....xx...xxx........', '....xx....xxx.......'],
];

const CACTUS_SMALL = [
  '..xx..',
  '..xx..',
  'x.xx..',
  'x.xx.x',
  'xxxx.x',
  '.xxxxx',
  '..xxx.',
  '..xx..',
  '..xx..',
  '..xx..',
  '..xx..',
  '..xx..',
  '..xx..',
];

const CACTUS_BIG = [
  '...xx...',
  '...xx...',
  '...xx...',
  'x..xx...',
  'x..xx..x',
  'x..xx..x',
  'xxxxx..x',
  '.xxxxxxx',
  '...xxxx.',
  '...xx...',
  '...xx...',
  '...xx...',
  '...xx...',
  '...xx...',
  '...xx...',
  '...xx...',
];

const BIRD = [
  [
    '..x.............',
    '..xx............',
    '..xxx...........',
    '..xxxx..........',
    'xxxxxxxxxxxx....',
    '.xxxxxxxxxxxxxxx',
    '..xxxxxxxxx.....',
    '...xxxxx........',
  ],
  [
    '................',
    '................',
    '....xxxx........',
    'xxxxxxxxxxxx....',
    '.xxxxxxxxxxxxxxx',
    '..xxxxxxxxxxx...',
    '...xxxx.........',
    '...xx...........',
  ],
];

function drawSprite(rows, x, y) {
  ctx.fillStyle = PIXEL;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === 'x') ctx.fillRect(Math.round(x) + c, Math.round(y) + r, 1, 1);
    }
  }
}

// --- state -----------------------------------------------------------------

let state = 'ready';        // 'ready' | 'running' | 'over'
let speed = START_SPEED;
let distance = 0;           // virtual pixels travelled; score is a tenth of it
let score = 0;
let best = Number(localStorage.getItem('dino-best') || 0);

let dinoY = 0;              // offset above the ground, 0 = standing on it
let dinoV = 0;
let ducking = false;
let holdingDuck = false;
let frame = 0;              // running animation frame

let obstacles = [];
let clouds = [];
let pebbles = [];
let nextSpawn = 0;          // pixels of distance until the next obstacle

let lastTime = 0;
let rafId = null;
let readyTimer = null;

const DINO_X = 16;

function dinoBox() {
  // A 2px inset all round: forgiving hitboxes are what make the original fair.
  return ducking
    ? { x: DINO_X + 2, y: GROUND - 12 - dinoY + 2, w: 20 - 4, h: 12 - 4 }
    : { x: DINO_X + 2, y: GROUND - 18 - dinoY + 2, w: 16 - 4, h: 18 - 4 };
}

function hits(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// --- world -----------------------------------------------------------------

function spawnObstacle() {
  // Birds only show up once you have settled in, same as the original.
  const birdOk = score > 45;
  if (birdOk && Math.random() < 0.28) {
    // Altitudes: duck under the middle one, jump the low one, ignore the high one.
    const top = [22, 31, 44][Math.floor(Math.random() * 3)];
    obstacles.push({ kind: 'bird', x: 200, y: top, w: 16, h: 8 });
    return;
  }
  const big = Math.random() < 0.35;
  const rows = big ? CACTUS_BIG : CACTUS_SMALL;
  const count = big ? 1 : 1 + Math.floor(Math.random() * 3);
  const unit = rows[0].length;
  const w = unit * count;
  obstacles.push({ kind: 'cactus', rows, count, x: 200, y: GROUND - rows.length, w, h: rows.length });
}

function scheduleSpawn() {
  // Gap measured in seconds of travel, so it stays fair as the speed climbs.
  nextSpawn = speed * (0.95 + Math.random() * 0.95);
}

function render() {
  ctx.fillStyle = SCREEN;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = PIXEL;
  clouds.forEach(c => {
    ctx.fillRect(Math.round(c.x) + 2, c.y, 8, 1);
    ctx.fillRect(Math.round(c.x), c.y + 1, 12, 1);
    ctx.fillRect(Math.round(c.x) + 1, c.y + 2, 9, 1);
  });

  ctx.fillRect(0, GROUND, canvas.width, 1);
  pebbles.forEach(p => ctx.fillRect(Math.round(p.x), GROUND + p.y, p.w, 1));

  obstacles.forEach(o => {
    if (o.kind === 'bird') {
      drawSprite(BIRD[Math.floor(distance / 14) % 2], o.x, o.y);
    } else {
      for (let i = 0; i < o.count; i++) drawSprite(o.rows, o.x + i * o.rows[0].length, o.y);
    }
  });

  drawDino();
}

function drawDino() {
  const airborne = dinoY > 0;
  if (ducking) {
    const legs = state === 'running' && !airborne ? DUCK_LEGS[frame] : DUCK_LEGS[0];
    drawSprite(DUCK_BODY.concat(legs), DINO_X, GROUND - 12 - dinoY);
    return;
  }
  let legs;
  if (state === 'over') legs = DINO_STAND;
  else if (state === 'ready' || airborne) legs = DINO_STAND;
  else legs = DINO_LEGS[frame];
  drawSprite(DINO_BODY.concat(legs), DINO_X, GROUND - 18 - dinoY);

  if (state === 'over') {
    // Shut the eye - the only difference between alive and dead.
    ctx.fillStyle = PIXEL;
    ctx.fillRect(DINO_X + 10, GROUND - 18 - dinoY + 2, 1, 1);
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

function renderScores() {
  scoreEl.textContent = score;
  bestEl.textContent = best;
}

// --- loop ------------------------------------------------------------------

function tick(now) {
  rafId = requestAnimationFrame(tick);
  // Clamp: a backgrounded tab returns with a huge gap that would teleport the
  // dino straight through an obstacle.
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (state !== 'running') return;

  speed = Math.min(MAX_SPEED, speed + ACCEL * dt);
  const move = speed * dt;
  distance += move;

  const next = Math.floor(distance / 10);
  if (next !== score) {
    score = next;
    renderScores();
  }

  // Dino
  if (dinoY > 0 || dinoV < 0) {
    dinoV += (holdingDuck ? DUCK_GRAVITY : GRAVITY) * dt;
    dinoY -= dinoV * dt;
    if (dinoY <= 0) {
      dinoY = 0;
      dinoV = 0;
      ducking = holdingDuck;
    }
  } else {
    frame = Math.floor(distance / 8) % 2;
  }

  // Scenery
  clouds.forEach(c => { c.x -= move * 0.35; });
  clouds = clouds.filter(c => c.x > -14);
  if (clouds.length < 3 && Math.random() < 0.01) {
    clouds.push({ x: 200, y: 6 + Math.floor(Math.random() * 14) });
  }

  pebbles.forEach(p => { p.x -= move; });
  pebbles = pebbles.filter(p => p.x > -6);
  if (Math.random() < 0.06) {
    pebbles.push({ x: 200, y: 2 + Math.floor(Math.random() * 5), w: 1 + Math.floor(Math.random() * 3) });
  }

  // Obstacles
  nextSpawn -= move;
  if (nextSpawn <= 0) {
    spawnObstacle();
    scheduleSpawn();
  }
  obstacles.forEach(o => { o.x -= move; });
  obstacles = obstacles.filter(o => o.x + o.w > -2);

  const box = dinoBox();
  for (const o of obstacles) {
    if (hits(box, { x: o.x + 1, y: o.y + 1, w: o.w - 2, h: o.h - 2 })) return gameOver();
  }

  render();
}

function gameOver() {
  state = 'over';
  if (score > best) {
    best = score;
    localStorage.setItem('dino-best', String(best));
  }
  renderScores();
  render();

  const beat = score === best && score > 0;
  const pts = `${score} ${score === 1 ? 'point' : 'points'}`;
  setStatus(`Game over — ${pts}`, 'is-lost');
  showResult('Game over', beat ? `New best — ${pts}` : pts, 'is-lost');
  readyTimer = setTimeout(() => { readyTimer = null; ready(); }, READY_DELAY);
}

// --- round / controls ------------------------------------------------------

// A fresh track is dealt automatically, but it holds still until you jump -
// dropping straight into a moving game would kill you before you looked up.
function ready() {
  clearTimeout(readyTimer);
  readyTimer = null;
  resultEl.hidden = true;
  state = 'ready';
  speed = START_SPEED;
  distance = 0;
  score = 0;
  dinoY = 0;
  dinoV = 0;
  ducking = false;
  holdingDuck = false;
  frame = 0;
  obstacles = [];
  pebbles = [];
  clouds = [{ x: 130, y: 10 }, { x: 190, y: 20 }];
  scheduleSpawn();
  renderScores();
  render();
  setStatus('Tap the track or press space to run');
}

function jump() {
  if (state === 'over') return;
  if (state === 'ready') {
    state = 'running';
    setStatus('Run!');
  }
  if (dinoY > 0) return;          // no double jumps
  ducking = false;
  dinoV = JUMP_V;
  dinoY = 0.01;                   // lift off the ground so the loop takes over
}

function setDuck(on) {
  holdingDuck = on;
  if (state !== 'running') return;
  if (dinoY > 0) return;          // in the air, duck only speeds the fall
  ducking = on;
  render();
}

document.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    e.preventDefault();           // space would otherwise scroll the page
    jump();
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    e.preventDefault();
    setDuck(true);
  }
});

document.addEventListener('keyup', e => {
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') setDuck(false);
});

canvas.addEventListener('pointerdown', e => { e.preventDefault(); jump(); });

const duckBtn = document.getElementById('duck');
document.getElementById('jump').addEventListener('click', jump);
// Hold to duck on touch, tap-to-duck-briefly on mouse - both end on release.
duckBtn.addEventListener('pointerdown', e => { e.preventDefault(); setDuck(true); });
duckBtn.addEventListener('pointerup', () => setDuck(false));
duckBtn.addEventListener('pointercancel', () => setDuck(false));
duckBtn.addEventListener('pointerleave', () => setDuck(false));

document.getElementById('restart').addEventListener('click', () => ready());

document.getElementById('reset-best').addEventListener('click', () => {
  best = 0;
  localStorage.removeItem('dino-best');
  renderScores();
});

ready();
lastTime = performance.now();
rafId = requestAnimationFrame(tick);
