// Top-down tank arena. Drive, turn, shoot the orange tanks before they shoot
// you. Three lives, one hit each way - a tank dies to a single shell, yours
// included, so cover matters more than reflexes.

const SIZE = 360;
const WALL = 8;                 // arena border thickness
const MIN = WALL, MAX = SIZE - WALL;

const TANK_R = 9;               // collision radius; the drawn body is a little wider
const PLAYER_SPEED = 58;        // units per second
const PLAYER_REVERSE = 40;
const PLAYER_TURN = 2.7;        // radians per second
const PLAYER_COOLDOWN = 0.42;   // seconds between shots
const PLAYER_BULLET = 200;

const ENEMY_SPEED = 34;
const ENEMY_TURN = 1.7;
const ENEMY_BULLET = 132;
const ENEMY_RANGE = 240;        // will not fire from further than this
const ENEMY_STANDOFF = 72;      // stops closing in once this near
const ENEMY_AIM = 0.30;         // radians of slop allowed before it fires
const ENEMY_RELOAD = [1.5, 2.6];// seconds, picked per shot

const BULLET_R = 2.5;
const BULLET_LIFE = 2.6;        // seconds before a shell fizzles out
const LIVES = 3;
const INVULN = 1.6;             // seconds of blinking safety after a respawn
const SPAWN_GAP = 1.1;          // seconds before a destroyed tank is replaced
const READY_DELAY = 2800;

const BG = '#151a24';
const WALL_COL = '#2c3446';
const BLOCK = '#39435c';
const PLAYER_COL = '#6ea8fe';
const PLAYER_DARK = '#3d6db8';
const ENEMY_COL = '#ffb86b';
const ENEMY_DARK = '#b8783a';
const SHELL = '#eef1f7';
const TAU = Math.PI * 2;

// A fixed layout, so the arena is something you can learn rather than reroll.
const BLOCKS = [
  { x: 58,  y: 58,  w: 74, h: 14 },
  { x: 228, y: 58,  w: 74, h: 14 },
  { x: 58,  y: 288, w: 74, h: 14 },
  { x: 228, y: 288, w: 74, h: 14 },
  { x: 173, y: 96,  w: 14, h: 72 },
  { x: 173, y: 192, w: 14, h: 72 },
];

const canvas = document.getElementById('arena');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const bestEl = document.getElementById('best');
const resultEl = document.getElementById('result');
const resultTitleEl = document.getElementById('result-title');
const resultSubEl = document.getElementById('result-sub');

let player = null;
let enemies = [];
let bullets = [];
let score = 0;
let lives = LIVES;
let invuln = 0;
let spawnIn = 0;
let state = 'running';          // 'running' | 'over'
let best = Number(localStorage.getItem('tanks-best') || 0);
let clock = 0;                  // seconds since the round started

const held = { fwd: false, back: false, left: false, right: false, fire: false };

let lastTime = 0;
let rafId = null;
let readyTimer = null;

// --- geometry --------------------------------------------------------------

function inBlock(x, y, pad = 0) {
  return BLOCKS.some(b => x > b.x - pad && x < b.x + b.w + pad &&
                          y > b.y - pad && y < b.y + b.h + pad);
}

function blocked(x, y) {
  if (x < MIN + TANK_R || x > MAX - TANK_R || y < MIN + TANK_R || y > MAX - TANK_R) return true;
  return inBlock(x, y, TANK_R);
}

// Cheap line of sight: walk the segment and see if it clips any block. Without
// this the enemies happily shoot the scenery.
function canSee(ax, ay, bx, by) {
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 6);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (inBlock(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

// Shortest signed turn from a to b, so tanks always rotate the near way round.
function angleDelta(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

// Slide along whichever axis is clear, so grazing a block does not dead-stop
// the tank the way a single combined check would.
function moveTank(t, dist) {
  const nx = t.x + Math.cos(t.a) * dist;
  const ny = t.y + Math.sin(t.a) * dist;
  if (!blocked(nx, ny)) { t.x = nx; t.y = ny; return true; }
  if (!blocked(nx, t.y)) { t.x = nx; return true; }
  if (!blocked(t.x, ny)) { t.y = ny; return true; }
  return false;
}

function freeSpot(awayFrom, minDist) {
  for (let i = 0; i < 80; i++) {
    const x = MIN + TANK_R + Math.random() * (MAX - MIN - TANK_R * 2);
    const y = MIN + TANK_R + Math.random() * (MAX - MIN - TANK_R * 2);
    if (blocked(x, y)) continue;
    if (awayFrom && Math.hypot(x - awayFrom.x, y - awayFrom.y) < minDist) continue;
    return { x, y };
  }
  return { x: SIZE / 2, y: SIZE / 2 };
}

// --- spawning --------------------------------------------------------------

// The arena gets busier as you get better, but never so busy that there is
// nowhere left to drive.
function maxEnemies() {
  return score >= 14 ? 4 : score >= 6 ? 3 : 2;
}

function spawnEnemy() {
  const spot = freeSpot(player, 130);
  enemies.push({
    x: spot.x, y: spot.y,
    a: Math.random() * TAU,
    reload: ENEMY_RELOAD[0] + Math.random() * (ENEMY_RELOAD[1] - ENEMY_RELOAD[0]),
    nudge: 0,
  });
}

function fire(t, speed, mine) {
  bullets.push({
    x: t.x + Math.cos(t.a) * (TANK_R + 5),
    y: t.y + Math.sin(t.a) * (TANK_R + 5),
    vx: Math.cos(t.a) * speed,
    vy: Math.sin(t.a) * speed,
    life: BULLET_LIFE,
    mine,
  });
}

// --- update ----------------------------------------------------------------

function updatePlayer(dt) {
  if (held.left) player.a -= PLAYER_TURN * dt;
  if (held.right) player.a += PLAYER_TURN * dt;
  if (held.fwd) moveTank(player, PLAYER_SPEED * dt);
  else if (held.back) moveTank(player, -PLAYER_REVERSE * dt);

  player.reload -= dt;
  if (held.fire && player.reload <= 0) {
    fire(player, PLAYER_BULLET, true);
    player.reload = PLAYER_COOLDOWN;
  }
}

function updateEnemies(dt) {
  for (const e of enemies) {
    const dist = Math.hypot(player.x - e.x, player.y - e.y);
    const want = Math.atan2(player.y - e.y, player.x - e.x);
    const turn = angleDelta(e.a, want) + e.nudge;
    e.a += Math.max(-ENEMY_TURN * dt, Math.min(ENEMY_TURN * dt, turn));

    if (dist > ENEMY_STANDOFF) {
      // A tank grinding against a block veers off for a moment rather than
      // pushing at it forever.
      if (!moveTank(e, ENEMY_SPEED * dt)) e.nudge = e.nudge || (Math.random() < 0.5 ? -1 : 1);
      else e.nudge *= 0.88;
    }

    e.reload -= dt;
    if (e.reload <= 0 && dist < ENEMY_RANGE &&
        Math.abs(angleDelta(e.a, want)) < ENEMY_AIM &&
        canSee(e.x, e.y, player.x, player.y)) {
      fire(e, ENEMY_BULLET, false);
      e.reload = ENEMY_RELOAD[0] + Math.random() * (ENEMY_RELOAD[1] - ENEMY_RELOAD[0]);
    }
  }
}

function updateBullets(dt) {
  for (const b of bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.x < MIN || b.x > MAX || b.y < MIN || b.y > MAX || inBlock(b.x, b.y)) b.life = 0;
  }

  for (const b of bullets) {
    if (b.life <= 0) continue;
    if (b.mine) {
      const i = enemies.findIndex(e => Math.hypot(e.x - b.x, e.y - b.y) < TANK_R + BULLET_R);
      if (i >= 0) {
        enemies.splice(i, 1);
        b.life = 0;
        score++;
        spawnIn = SPAWN_GAP;
        renderScores();
        setStatus(`Tank down — ${score} ${score === 1 ? 'kill' : 'kills'}`, 'win-x');
      }
    } else if (invuln <= 0 && Math.hypot(player.x - b.x, player.y - b.y) < TANK_R + BULLET_R) {
      b.life = 0;
      hitPlayer();
    }
  }

  bullets = bullets.filter(b => b.life > 0);
}

function hitPlayer() {
  lives--;
  renderScores();
  if (lives <= 0) return gameOver();
  const spot = freeSpot(enemies[0], 110);
  player.x = spot.x;
  player.y = spot.y;
  invuln = INVULN;
  setStatus(`Hit! ${lives} ${lives === 1 ? 'life' : 'lives'} left`, 'is-lost');
}

function update(dt) {
  clock += dt;
  if (invuln > 0) invuln -= dt;
  updatePlayer(dt);
  updateEnemies(dt);
  updateBullets(dt);

  if (enemies.length < maxEnemies()) {
    spawnIn -= dt;
    if (spawnIn <= 0) { spawnEnemy(); spawnIn = SPAWN_GAP; }
  }
}

// --- rendering -------------------------------------------------------------

function drawTank(t, body, trim) {
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.a);
  ctx.fillStyle = trim;
  ctx.fillRect(-9, -10, 18, 4);        // treads
  ctx.fillRect(-9, 6, 18, 4);
  ctx.fillRect(2, -1.5, 15, 3);        // barrel
  ctx.fillStyle = body;
  ctx.fillRect(-8, -6, 16, 12);        // hull
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, TAU);
  ctx.fillStyle = trim;
  ctx.fill();
  ctx.restore();
}

function render() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.fillStyle = WALL_COL;
  ctx.fillRect(0, 0, SIZE, WALL);
  ctx.fillRect(0, SIZE - WALL, SIZE, WALL);
  ctx.fillRect(0, 0, WALL, SIZE);
  ctx.fillRect(SIZE - WALL, 0, WALL, SIZE);

  ctx.fillStyle = BLOCK;
  BLOCKS.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));

  enemies.forEach(e => drawTank(e, ENEMY_COL, ENEMY_DARK));

  // A respawned tank blinks while it cannot be hurt, so the safety is visible.
  if (state === 'running' && (invuln <= 0 || Math.floor(clock * 10) % 2 === 0)) {
    drawTank(player, PLAYER_COL, PLAYER_DARK);
  }

  bullets.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, BULLET_R, 0, TAU);
    ctx.fillStyle = b.mine ? SHELL : ENEMY_COL;
    ctx.fill();
  });
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
  livesEl.textContent = Math.max(0, lives);
  bestEl.textContent = best || '—';
  canvas.setAttribute('aria-label',
    `Battle arena, ${score} kills, ${Math.max(0, lives)} lives, ${enemies.length} enemy tanks`);
}

// --- loop ------------------------------------------------------------------

function tick(now) {
  rafId = requestAnimationFrame(tick);
  // Clamp: a backgrounded tab returns with a huge gap that would teleport every
  // shell across the arena in one frame.
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
    localStorage.setItem('tanks-best', String(best));
  }
  renderScores();
  const kills = `${score} ${score === 1 ? 'kill' : 'kills'}`;
  setStatus(`Destroyed — ${kills}`, 'is-lost');
  showResult('Destroyed', beat ? `New best — ${kills}` : kills, 'is-lost');
  // hold the result on screen, then deal a fresh arena
  readyTimer = setTimeout(() => { readyTimer = null; newGame(); }, READY_DELAY);
}

// --- round / controls ------------------------------------------------------

function newGame() {
  clearTimeout(readyTimer);
  readyTimer = null;
  resultEl.hidden = true;
  player = { x: SIZE / 2, y: SIZE - 56, a: -Math.PI / 2, reload: 0 };
  enemies = [];
  bullets = [];
  score = 0;
  lives = LIVES;
  invuln = INVULN;
  spawnIn = 0;
  clock = 0;
  state = 'running';
  for (const k in held) held[k] = false;
  spawnEnemy();
  spawnEnemy();
  renderScores();
  setStatus('Drive, aim and fire');
}

const KEYS = {
  ArrowUp: 'fwd', w: 'fwd', W: 'fwd',
  ArrowDown: 'back', s: 'back', S: 'back',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ' ': 'fire',
};

document.addEventListener('keydown', e => {
  const k = KEYS[e.key];
  if (!k) return;
  e.preventDefault();          // arrows and space would otherwise scroll
  held[k] = true;
});

document.addEventListener('keyup', e => {
  const k = KEYS[e.key];
  if (k) held[k] = false;
});

// Hold-to-act on touch: the pads and the fire button all latch on press and
// release on lift, so driving and shooting can overlap.
document.querySelectorAll('[data-hold]').forEach(btn => {
  const k = btn.dataset.hold;
  const on = e => { e.preventDefault(); held[k] = true; };
  const off = () => { held[k] = false; };
  btn.addEventListener('pointerdown', on);
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointerleave', off);
  btn.addEventListener('pointercancel', off);
});

document.getElementById('restart').addEventListener('click', () => newGame());

document.getElementById('reset-best').addEventListener('click', () => {
  best = 0;
  localStorage.removeItem('tanks-best');
  renderScores();
});

newGame();
lastTime = performance.now();
rafId = requestAnimationFrame(tick);
