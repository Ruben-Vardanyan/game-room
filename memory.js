// 4x4 board = 16 cards = 8 pairs. Each pair is told apart by shape AND colour,
// so the board still works if you cannot separate the colours.
const SYMBOLS = [
  { glyph: '●', name: 'circle',   tone: 'a' },
  { glyph: '■', name: 'square',   tone: 'b' },
  { glyph: '▲', name: 'triangle', tone: 'c' },
  { glyph: '◆', name: 'diamond',  tone: 'd' },
  { glyph: '★', name: 'star',     tone: 'e' },
  { glyph: '✚', name: 'cross',    tone: 'f' },
  { glyph: '♥', name: 'heart',    tone: 'g' },
  { glyph: '♠', name: 'spade',    tone: 'h' },
];

const PAIRS = SYMBOLS.length;

const PEEK_DELAY = 800;         // how long a wrong pair stays face up
const NEXT_ROUND_DELAY = 2600;  // how long the win banner stays on screen

const boardEl = document.getElementById('memory');
const statusEl = document.getElementById('status');
const movesEl = document.getElementById('moves');
const pairsEl = document.getElementById('pairs');
const bestEl = document.getElementById('best');
const resultEl = document.getElementById('result');
const resultTitleEl = document.getElementById('result-title');
const resultSubEl = document.getElementById('result-sub');

let deck = [];          // one entry per card: { symbol, up, done }
let picked = [];        // indexes of the cards currently face up
let moves = 0;
let pairs = 0;
let locked = false;     // true while a wrong pair is being shown
// The record is keyed by board size: a best from the old 4x3 board could be as
// low as 6 moves, which 8 pairs can never beat, so it would stick forever.
let best = Number(localStorage.getItem('memory-best-4x4') || 0);

// A pending flip-back or auto-restart would otherwise fire onto a fresh board.
let peekTimer = null;
let nextRoundTimer = null;

function clearTimers() {
  clearTimeout(peekTimer);
  clearTimeout(nextRoundTimer);
  peekTimer = null;
  nextRoundTimer = null;
}

// --- rendering -------------------------------------------------------------

const cards = Array.from({ length: PAIRS * 2 }, (_, i) => {
  const b = document.createElement('button');
  b.className = 'card';
  b.type = 'button';
  b.innerHTML = '<span class="card-inner">' +
                  '<span class="card-back"></span>' +
                  '<span class="card-face"></span>' +
                '</span>';
  b.addEventListener('click', () => pick(i));
  boardEl.appendChild(b);
  return b;
});

function render() {
  cards.forEach((el, i) => {
    const card = deck[i];
    const shown = card.up || card.done;
    el.className = 'card' + (shown ? ' is-up' : '') + (card.done ? ' is-done' : '');
    const face = el.querySelector('.card-face');
    face.textContent = card.symbol.glyph;
    face.dataset.tone = card.symbol.tone;
    el.disabled = card.done || card.up || locked;
    el.setAttribute('aria-label', shown
      ? `Card ${i + 1}, ${card.symbol.name}${card.done ? ', matched' : ''}`
      : `Card ${i + 1}, face down`);
  });
  movesEl.textContent = moves;
  pairsEl.textContent = pairs;
  bestEl.textContent = best || '—';
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

// --- game logic ------------------------------------------------------------

function pick(i) {
  const card = deck[i];
  if (locked || card.up || card.done) return;

  card.up = true;
  picked.push(i);

  if (picked.length < 2) {
    render();
    setStatus('Find its match');
    return;
  }

  moves++;
  const [a, b] = picked;
  const hit = deck[a].symbol.glyph === deck[b].symbol.glyph;

  if (hit) {
    deck[a].done = deck[b].done = true;
    deck[a].up = deck[b].up = false;
    picked = [];
    pairs++;
    if (pairs === PAIRS) return win();
    render();
    setStatus('Match!', 'win-x');
    return;
  }

  // Wrong pair: hold both face up long enough to memorise, then turn them back.
  locked = true;
  render();
  setStatus('Not a match', 'win-o');
  peekTimer = setTimeout(() => {
    peekTimer = null;
    deck[a].up = deck[b].up = false;
    picked = [];
    locked = false;
    render();
    setStatus('Find the eight pairs');
  }, PEEK_DELAY);
}

function win() {
  locked = true;
  const first = !best || moves < best;
  if (first) {
    best = moves;
    localStorage.setItem('memory-best-4x4', String(best));
  }
  render();
  setStatus(`All pairs found in ${moves} moves — new board…`, 'win-x');
  showResult('All matched!', first ? `New best — ${moves} moves` : `${moves} moves`, 'win-x');
  // hold the result on screen, then deal a fresh board
  nextRoundTimer = setTimeout(() => { nextRoundTimer = null; newGame(); }, NEXT_ROUND_DELAY);
}

// --- round / controls ------------------------------------------------------

function shuffled() {
  const pool = SYMBOLS.flatMap(s => [s, s]);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.map(symbol => ({ symbol, up: false, done: false }));
}

function newGame() {
  clearTimers();
  hideResult();
  deck = shuffled();
  picked = [];
  moves = 0;
  pairs = 0;
  locked = false;
  render();
  setStatus('Find the eight pairs');
}

document.getElementById('restart').addEventListener('click', () => newGame());

document.getElementById('reset-best').addEventListener('click', () => {
  best = 0;
  localStorage.removeItem('memory-best-4x4');
  render();
});

newGame();
