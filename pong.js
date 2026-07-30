// Ping Pong. Your bat is the blue one on the left, the computer takes the
// orange one on the right. First to seven points wins the match. The ball
// speeds up with every return, and where it strikes the bat decides the angle -
// hit it with the edge and it flies off steeply.

const W = 360, H = 240;

const BAT_W = 8;
const BAT_H = 46;
const BAT_INSET = 14;           // gap between bat and its end of the table
const PLAYER_X = BAT_INSET;
const CPU_X = W - BAT_INSET - BAT_W;

const BALL_R = 4;
const BALL_START = 156;         // units per second at the serve
const BALL_MAX = 340;
const BALL_GAIN = 1.055;        // speed multiplier per return
const MAX_ANGLE = 0.92;         // radians off straight when the edge is hit

const PLAYER_SPEED = 265;       // keys and hold buttons; dragging is direct
const CPU_SPEED = 178;
const CPU_SLOP = 16;            // how far off centre the computer aims

const TARGET = 7;
const SERVE_DELAY = 0.9;        // seconds the ball waits at centre
const READY_DELAY = 2800;

const BG = '#151a24';
const LINE = '#2c3446';
const PLAYER_COL = '#6ea8fe';
const CPU_COL = '#ffb86b';
const BALL_COL = '#eef1f7';
const TAU = Math.PI * 2;

const canvas = document.getElementById('table');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const youEl = document.getElementById('you');
const cpuEl = document.getElementById('cpu');
const bestEl = document.getElementById('best');
const resultEl = document.getElementById('result');
const resultTitleEl = document.getElementById('result-title');
const resultSubEl = document.getElementById('result-sub');

let player = H / 2;
let cpu = H / 2;
let cpuAim = 0;                 // per-point aiming error, so it is beatable
let ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
let youScore = 0;
let cpuScore = 0;
let rally = 0;                  // returns in the point being played
let serveIn = SERVE_DELAY;
let serveDir = 1;               // +1 towards the computer, -1 towards you
let state = 'serve';            // 'serve' | 'rally' | 'over'
let best = Number(localStorage.getItem('pong-best') || 0);

const held = { up: false, down: false };

let lastTime = 0;
let dragging = false;
let readyTimer = null;

// --- helpers ---------------------------------------------------------------

const clampBat = y => Math.max(BAT_H / 2, Math.min(H - BAT_H / 2, y));

function serve() {
  ball.x = W / 2;
  ball.y = H / 2;
  ball.vx = 0;
  ball.vy = 0;
  rally = 0;
  cpuAim = (Math.random() * 2 - 1) * CPU_SLOP;
  serveIn = SERVE_DELAY;
  state = 'serve';
}

function launch() {
  const angle = (Math.random() * 2 - 1) * 0.34;
  ball.vx = Math.cos(angle) * BALL_START * serveDir;
  ball.vy = Math.sin(angle) * BALL_START;
  state = 'rally';
}

// Bounce off a bat: the further from its middle, the steeper the return.
function returnBall(batY, dir) {
  const offset = Math.max(-1, Math.min(1, (ball.y - batY) / (BAT_H / 2)));
  const speed = Math.min(Math.hypot(ball.vx, ball.vy) * BALL_GAIN, BALL_MAX);
  const angle = offset * MAX_ANGLE;
  ball.vx = Math.cos(angle) * speed * dir;
  ball.vy = Math.sin(angle) * speed;
  rally++;
}

function point(mine) {
  if (rally > best) {
    best = rally;
    localStorage.setItem('pong-best', String(best));
  }
  if (mine) youScore++; else cpuScore++;
  renderScores();

  if (youScore >= TARGET || cpuScore >= TARGET) return matchOver();

  // the loser of the point serves next, the way a real game restarts
  serveDir = mine ? 1 : -1;
  setStatus(mine ? `Your point — ${youScore}–${cpuScore}` : `Their point — ${youScore}–${cpuScore}`,
            mine ? 'win-x' : 'is-lost');
  serve();
}

// --- update ----------------------------------------------------------------

function updateBats(dt) {
  if (held.up) player = clampBat(player - PLAYER_SPEED * dt);
  if (held.down) player = clampBat(player + PLAYER_SPEED * dt);

  // The computer only chases the ball while it is coming its way; otherwise it
  // drifts back to the middle, which is what gives you an opening.
  const target = ball.vx > 0 ? ball.y + cpuAim : H / 2;
  const step = CPU_SPEED * dt;
  const diff = target - cpu;
  cpu = clampBat(cpu + Math.max(-step, Math.min(step, diff)));
}

function updateBall(dt) {
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = -ball.vy; }
  if (ball.y > H - BALL_R) { ball.y = H - BALL_R; ball.vy = -ball.vy; }

  if (ball.vx < 0 && ball.x - BALL_R < PLAYER_X + BAT_W && ball.x + BALL_R > PLAYER_X) {
    if (Math.abs(ball.y - player) < BAT_H / 2 + BALL_R) {
      ball.x = PLAYER_X + BAT_W + BALL_R;
      returnBall(player, 1);
    }
  } else if (ball.vx > 0 && ball.x + BALL_R > CPU_X && ball.x - BALL_R < CPU_X + BAT_W) {
    if (Math.abs(ball.y - cpu) < BAT_H / 2 + BALL_R) {
      ball.x = CPU_X - BALL_R;
      returnBall(cpu, -1);
    }
  }

  if (ball.x < -BALL_R) point(false);
  else if (ball.x > W + BALL_R) point(true);
}

function update(dt) {
  updateBats(dt);
  if (state === 'serve') {
    serveIn -= dt;
    if (serveIn <= 0) launch();
  } else if (state === 'rally') {
    updateBall(dt);
  }
}

// --- rendering -------------------------------------------------------------

function render() {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = PLAYER_COL;
  ctx.fillRect(PLAYER_X, player - BAT_H / 2, BAT_W, BAT_H);
  ctx.fillStyle = CPU_COL;
  ctx.fillRect(CPU_X, cpu - BAT_H / 2, BAT_W, BAT_H);

  // The ball is parked at centre between points; it still shows, so you can see
  // the serve coming.
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, TAU);
  ctx.fillStyle = BALL_COL;
  ctx.fill();
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
  youEl.textContent = youScore;
  cpuEl.textContent = cpuScore;
  bestEl.textContent = best || '—';
  canvas.setAttribute('aria-label',
    `Ping pong table, you ${youScore}, computer ${cpuScore}`);
}

// --- loop ------------------------------------------------------------------

function tick(now) {
  requestAnimationFrame(tick);
  // Clamp: a backgrounded tab returns with a huge gap that would throw the ball
  // clean through a bat in a single frame.
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (state !== 'over') update(dt);
  render();
}

function matchOver() {
  state = 'over';
  const won = youScore > cpuScore;
  const line = `${youScore}–${cpuScore}`;
  setStatus(won ? `You win ${line}` : `Computer wins ${line}`, won ? 'win-x' : 'is-lost');
  showResult(won ? 'You win' : 'You lose', line, won ? 'win-x' : 'is-lost');
  // hold the result on screen, then start a fresh match on its own
  readyTimer = setTimeout(() => { readyTimer = null; newMatch(); }, READY_DELAY);
}

// --- match / controls ------------------------------------------------------

function newMatch() {
  clearTimeout(readyTimer);
  readyTimer = null;
  resultEl.hidden = true;
  player = H / 2;
  cpu = H / 2;
  youScore = 0;
  cpuScore = 0;
  serveDir = Math.random() < 0.5 ? 1 : -1;
  for (const k in held) held[k] = false;
  serve();
  renderScores();
  setStatus('First to 7 wins');
}

const KEYS = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
};

document.addEventListener('keydown', e => {
  const k = KEYS[e.key];
  if (!k) return;
  e.preventDefault();          // arrows would otherwise scroll the page
  held[k] = true;
});

document.addEventListener('keyup', e => {
  const k = KEYS[e.key];
  if (k) held[k] = false;
});

// Hold-to-move on the pads, so a thumb can keep the bat travelling.
document.querySelectorAll('[data-hold]').forEach(btn => {
  const k = btn.dataset.hold;
  const on = e => { e.preventDefault(); held[k] = true; };
  const off = () => { held[k] = false; };
  btn.addEventListener('pointerdown', on);
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointerleave', off);
  btn.addEventListener('pointercancel', off);
});

// Dragging on the table is the quickest control: the bat follows your finger.
// The canvas is drawn at 360x240 but displayed wider or narrower, so the
// pointer has to be scaled into canvas units.
function dragTo(e) {
  const rect = canvas.getBoundingClientRect();
  player = clampBat((e.clientY - rect.top) * (H / rect.height));
}

canvas.addEventListener('pointerdown', e => {
  dragging = true;
  canvas.setPointerCapture(e.pointerId);
  dragTo(e);
});

canvas.addEventListener('pointermove', e => {
  if (dragging) dragTo(e);
});

canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('pointercancel', () => { dragging = false; });

document.getElementById('restart').addEventListener('click', () => newMatch());

document.getElementById('reset-best').addEventListener('click', () => {
  best = 0;
  localStorage.removeItem('pong-best');
  renderScores();
});

newMatch();
lastTime = performance.now();
requestAnimationFrame(tick);
