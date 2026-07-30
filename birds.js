// Birds cross the sky, you tap them. Aiming is the pointer itself, so the only
// thing stopping a player spraying taps everywhere is the magazine: three
// shells, and an empty gun takes a moment to reload.

const W = 360, H = 270;
const GROUND = H - 42;          // top of the grass
const CEILING = 26;             // birds stay below this so they are never clipped

const MAG = 3;                  // shells in the gun
const RELOAD = 1.1;             // seconds to refill an empty gun
const HIT_R = 20;               // how close a tap must land; generous, for thumbs
const ESCAPES = 3;              // birds allowed past before the game ends

const BASE_SPEED = 54;          // pixels per second at nil score
const MAX_SPEED = 116;
const SPEED_STEP = 2.2;         // faster per bird shot
const BASE_GAP = 1.55;          // seconds between birds at nil score
const MIN_GAP = 0.72;
const GAP_STEP = 0.035;

const FALL_GRAVITY = 240;
const FLASH_LIFE = 0.22;        // how long the shot marker lingers
const READY_DELAY = 2800;

const SKY_TOP = '#1b2440';
const SKY_LOW = '#2d3a5c';
const HILL = '#141a2a';
const GRASS = '#1d2a22';
const GRASS_TIP = '#2a3d31';
const BIRD_BODY = '#e9e1cc';
const BIRD_WING = '#c2b79c';
const BIRD_DEAD = '#8792a8';
const BEAK = '#ffb86b';
const FLASH = '#ffe066';
const SHELL_ON = '#ffb86b';
const SHELL_OFF = '#3d465e';
const TAU = Math.PI * 2;

const canvas = document.getElementById('sky');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const scoreEl = document.getElementById('score');
const escapedEl = document.getElementById('escaped');
const bestEl = document.getElementById('best');
const resultEl = document.getElementById('result');
const resultTitleEl = document.getElementById('result-title');
const resultSubEl = document.getElementById('result-sub');

let birds = [];
let flashes = [];
let score = 0;
let escaped = 0;
let ammo = MAG;
let reloadIn = 0;
let spawnIn = 0;
let clock = 0;
let state = 'running';          // 'running' | 'over'
let best = Number(localStorage.getItem('birds-best') || 0);

let lastTime = 0;
let rafId = null;
let readyTimer = null;

// --- world -----------------------------------------------------------------

function speed() {
  return Math.min(MAX_SPEED, BASE_SPEED + score * SPEED_STEP);
}

function gap() {
  return Math.max(MIN_GAP, BASE_GAP - score * GAP_STEP);
}

function spawnBird() {
  const fromLeft = Math.random() < 0.5;
  const s = speed() * (0.85 + Math.random() * 0.4);
  birds.push({
    x: fromLeft ? -20 : W + 20,
    y: CEILING + Math.random() * (GROUND - CEILING - 40),
    dir: fromLeft ? 1 : -1,
    vx: (fromLeft ? 1 : -1) * s,
    bob: 10 + Math.random() * 16,          // how far it rises and falls
    rate: 1.1 + Math.random() * 1.2,       // and how quickly
    phase: Math.random() * TAU,
    flap: Math.random() * TAU,
    dead: false,
    vy: 0,
    spin: 0,
  });
}

// --- shooting --------------------------------------------------------------

function shoot(x, y) {
  if (state !== 'running') return;
  if (ammo <= 0) {
    setStatus('Reloading…');
    return;
  }

  ammo--;
  if (ammo === 0) reloadIn = RELOAD;
  flashes.push({ x, y, life: FLASH_LIFE });

  // Nearest live bird inside the radius, so a tap between two birds always
  // takes the one it was closest to rather than whichever was spawned first.
  let best = null, bestD = HIT_R;
  for (const b of birds) {
    if (b.dead) continue;
    const d = Math.hypot(b.x - x, b.y - y);
    if (d < bestD) { bestD = d; best = b; }
  }

  if (!best) {
    setStatus(ammo ? 'Missed' : 'Missed — reloading…');
    return;
  }

  best.dead = true;
  best.vy = -20;
  best.spin = (Math.random() < 0.5 ? -1 : 1) * 3.4;
  score++;
  renderScores();
  setStatus(`Hit! ${score} down`, 'win-x');
}

// --- update ----------------------------------------------------------------

function update(dt) {
  clock += dt;

  if (ammo <= 0) {
    reloadIn -= dt;
    if (reloadIn <= 0) {
      ammo = MAG;
      if (state === 'running') setStatus('Reloaded');
    }
  }

  spawnIn -= dt;
  if (spawnIn <= 0) { spawnBird(); spawnIn = gap(); }

  for (const b of birds) {
    b.flap += dt * 11;
    if (b.dead) {
      b.vy += FALL_GRAVITY * dt;
      b.y += b.vy * dt;
      b.x += b.vx * 0.25 * dt;       // shot birds keep a little momentum
      b.spin += dt * 6;
      continue;
    }
    b.phase += b.rate * dt;
    b.x += b.vx * dt;
    b.y += Math.cos(b.phase) * b.bob * b.rate * dt;
    b.y = Math.max(CEILING, Math.min(GROUND - 30, b.y));
  }

  // A live bird reaching the far side has got away.
  const gone = birds.filter(b => !b.dead && (b.x < -30 || b.x > W + 30));
  if (gone.length) {
    escaped += gone.length;
    renderScores();
    if (escaped >= ESCAPES) return gameOver();
    setStatus(`It got away — ${ESCAPES - escaped} left`, 'is-lost');
  }

  birds = birds.filter(b => b.y < H + 30 && b.x > -30 && b.x < W + 30);

  flashes.forEach(f => { f.life -= dt; });
  flashes = flashes.filter(f => f.life > 0);
}

// --- rendering -------------------------------------------------------------

function drawBird(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  if (b.dead) ctx.rotate(b.spin);
  ctx.scale(b.dir, 1);

  const body = b.dead ? BIRD_DEAD : BIRD_BODY;
  const wing = b.dead ? BIRD_DEAD : BIRD_WING;
  // A shot bird folds its wings; a live one beats them.
  const lift = b.dead ? -2 : Math.sin(b.flap) * 9;

  ctx.fillStyle = wing;
  ctx.beginPath();                      // far wing, trailing slightly
  ctx.moveTo(-1, -1);
  ctx.lineTo(-13, -3 - lift * 0.8);
  ctx.lineTo(3, 3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 5, 0, 0, TAU);   // body
  ctx.fill();
  ctx.beginPath();
  ctx.arc(7, -3, 4, 0, TAU);            // head
  ctx.fill();

  ctx.fillStyle = BEAK;
  ctx.beginPath();
  ctx.moveTo(10, -4);
  ctx.lineTo(16, -2);
  ctx.lineTo(10, -1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = wing;
  ctx.beginPath();                      // near wing
  ctx.moveTo(-1, -2);
  ctx.lineTo(-11, -6 - lift);
  ctx.lineTo(4, 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawScene() {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(1, SKY_LOW);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND);

  // Two hill silhouettes, so the sky has a horizon to read against.
  ctx.fillStyle = HILL;
  ctx.beginPath();
  ctx.moveTo(-10, GROUND);
  ctx.quadraticCurveTo(70, GROUND - 54, 160, GROUND);
  ctx.quadraticCurveTo(250, GROUND - 72, 370, GROUND);
  ctx.lineTo(370, GROUND);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = GRASS;
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = GRASS_TIP;
  for (let x = 4; x < W; x += 9) {
    ctx.fillRect(x, GROUND - 3, 2, 4);
  }
}

function drawAmmo() {
  for (let i = 0; i < MAG; i++) {
    const x = 10 + i * 12;
    const y = H - 16;
    ctx.fillStyle = i < ammo ? SHELL_ON : SHELL_OFF;
    ctx.fillRect(x, y, 7, 12);
    ctx.fillStyle = i < ammo ? '#10131a' : '#252c3d';
    ctx.fillRect(x, y + 8, 7, 2);
  }
}

function render() {
  drawScene();
  birds.forEach(drawBird);

  flashes.forEach(f => {
    const t = f.life / FLASH_LIFE;
    ctx.save();
    ctx.globalAlpha = t;
    ctx.strokeStyle = FLASH;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.x, f.y, HIT_R * (1.2 - t * 0.5), 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(f.x - 9, f.y); ctx.lineTo(f.x + 9, f.y);
    ctx.moveTo(f.x, f.y - 9); ctx.lineTo(f.x, f.y + 9);
    ctx.stroke();
    ctx.restore();
  });

  drawAmmo();
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
  escapedEl.textContent = `${Math.min(escaped, ESCAPES)}/${ESCAPES}`;
  bestEl.textContent = best || '—';
  canvas.setAttribute('aria-label',
    `Sky with flying birds, ${score} shot, ${Math.min(escaped, ESCAPES)} of ${ESCAPES} escaped`);
}

// --- loop ------------------------------------------------------------------

function tick(now) {
  rafId = requestAnimationFrame(tick);
  // Clamp: a backgrounded tab returns with a huge gap that would fly every bird
  // clean across the sky in a single frame.
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (state === 'running') update(dt);
  render();
}

function gameOver() {
  state = 'over';
  const beat = score > best;
  if (beat) {
    best = score;
    localStorage.setItem('birds-best', String(best));
  }
  renderScores();
  const birdsShot = `${score} ${score === 1 ? 'bird' : 'birds'}`;
  setStatus(`Three got away — ${birdsShot}`, 'is-lost');
  showResult('They got away', beat ? `New best — ${birdsShot}` : birdsShot, 'is-lost');
  // hold the result on screen, then open a fresh sky
  readyTimer = setTimeout(() => { readyTimer = null; newGame(); }, READY_DELAY);
}

// --- round / controls ------------------------------------------------------

function newGame() {
  clearTimeout(readyTimer);
  readyTimer = null;
  resultEl.hidden = true;
  birds = [];
  flashes = [];
  score = 0;
  escaped = 0;
  ammo = MAG;
  reloadIn = 0;
  spawnIn = 0.4;
  clock = 0;
  state = 'running';
  renderScores();
  setStatus('Tap a bird to shoot it');
}

// The canvas is scaled by CSS, so a tap has to be mapped back into its own
// coordinates before it can be compared with anything.
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (W / r.width),
    y: (e.clientY - r.top) * (H / r.height),
  };
}

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  const p = canvasPoint(e);
  shoot(p.x, p.y);
});

document.getElementById('restart').addEventListener('click', () => newGame());

document.getElementById('reset-best').addEventListener('click', () => {
  best = 0;
  localStorage.removeItem('birds-best');
  renderScores();
});

newGame();
lastTime = performance.now();
rafId = requestAnimationFrame(tick);
