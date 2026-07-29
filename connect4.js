const COLS = 7;
const ROWS = 6;
const R = 'R';              // Blue, moves first
const Y = 'Y';              // Amber
const DEPTH = 5;            // plies the computer looks ahead

const CPU_DELAY = 340;          // pause before the computer answers
const NEXT_ROUND_DELAY = 2600;  // how long the result stays on screen

// Centre-out move ordering makes alpha-beta prune far more branches.
const ORDER = [3, 2, 4, 1, 5, 0, 6];

const gridEl = document.getElementById('grid');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const resultTitleEl = document.getElementById('result-title');
const resultSubEl = document.getElementById('result-sub');
const scoreEls = { R: document.getElementById('score-r'), Y: document.getElementById('score-y'), D: document.getElementById('score-d') };

let board = new Array(COLS * ROWS).fill('');
let turn = R;
let over = false;
let mode = 'cpu';           // 'cpu' | 'human'
let starter = R;            // alternates each round
let winLine = [];
let lastDrop = null;        // the disc just played, animated once the board renders
const scores = { R: 0, Y: 0, D: 0 };

// Pending timers must be cancellable: a CPU move or auto-restart left over from
// the previous round would otherwise fire onto a fresh board.
let cpuTimer = null;
let nextRoundTimer = null;

function clearTimers() {
  clearTimeout(cpuTimer);
  clearTimeout(nextRoundTimer);
  cpuTimer = null;
  nextRoundTimer = null;
}

const at = (c, r) => c + r * COLS;

// --- rendering -------------------------------------------------------------

const slots = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const b = document.createElement('button');
    b.className = 'slot';
    b.type = 'button';
    b.setAttribute('role', 'gridcell');
    b.innerHTML = '<span class="disc"></span>';
    b.addEventListener('click', () => play(c));
    gridEl.appendChild(b);
    slots[at(c, r)] = b;
  }
}

function render() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = at(c, r);
      const v = board[i];
      const el = slots[i];
      el.className = 'slot' + (v ? ' ' + v.toLowerCase() : '') + (winLine.includes(i) ? ' win' : '');
      el.disabled = over || dropRow(board, c) < 0;
      el.setAttribute('aria-label',
        `Column ${c + 1}, row ${ROWS - r}, ${v === R ? 'blue' : v === Y ? 'amber' : 'empty'}`);
    }
  }
  scoreEls.R.textContent = scores.R;
  scoreEls.Y.textContent = scores.Y;
  scoreEls.D.textContent = scores.D;
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

// --- board helpers ---------------------------------------------------------

// Lowest empty row in a column, or -1 when the column is full.
function dropRow(b, c) {
  for (let r = ROWS - 1; r >= 0; r--) if (!b[at(c, r)]) return r;
  return -1;
}

// Every run of four that includes the disc just played at (c, r).
function lineThrough(b, c, r) {
  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const me = b[at(c, r)];
  for (const [dc, dr] of dirs) {
    const line = [at(c, r)];
    for (const sign of [1, -1]) {
      let cc = c + dc * sign;
      let rr = r + dr * sign;
      while (cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && b[at(cc, rr)] === me) {
        line.push(at(cc, rr));
        cc += dc * sign;
        rr += dr * sign;
      }
    }
    if (line.length >= 4) return line;
  }
  return null;
}

const isFull = b => b.every(v => v);

// --- game logic ------------------------------------------------------------

function play(c) {
  if (over) return;
  if (mode === 'cpu' && turn === Y) return;
  if (dropRow(board, c) < 0) return;
  drop(c);
  if (!over && mode === 'cpu' && turn === Y) {
    setStatus('Computer thinking…');
    cpuTimer = setTimeout(() => { cpuTimer = null; drop(bestMove(board, Y)); }, CPU_DELAY);
  }
}

function drop(c) {
  const r = dropRow(board, c);
  if (r < 0) return;
  board[at(c, r)] = turn;
  lastDrop = { c, r };

  const line = lineThrough(board, c, r);
  if (line) {
    winLine = line;
    return end(turn);
  }
  if (isFull(board)) return end(null);

  turn = turn === R ? Y : R;
  render();
  animateDrop(c, r);
  setStatus(turnText());
}

// The disc falls in from above its column; the distance scales with the row so
// every disc appears to enter at the top of the board.
function animateDrop(c, r) {
  const disc = slots[at(c, r)].querySelector('.disc');
  disc.style.setProperty('--rows', String(r + 1));
  disc.classList.remove('is-dropping');
  void disc.offsetWidth;
  disc.classList.add('is-dropping');
}

function end(winner) {
  over = true;
  if (winner) {
    scores[winner]++;
    const who = mode === 'cpu'
      ? (winner === R ? 'You win!' : 'Computer wins!')
      : (winner === R ? 'Blue wins!' : 'Amber wins!');
    setStatus(`${who} — next round…`, winner === R ? 'win-x' : 'win-o');
    showResult(who, 'Four in a row', winner === R ? 'win-x' : 'win-o');
  } else {
    scores.D++;
    setStatus('Board full — a draw. Next round…');
    showResult("It's a draw", 'The board is full');
  }
  render();
  // The closing disc skipped its fall in drop(), so play it here.
  if (lastDrop) animateDrop(lastDrop.c, lastDrop.r);
  // hold the result on screen, then deal a fresh board
  nextRoundTimer = setTimeout(() => { nextRoundTimer = null; newRound(); }, NEXT_ROUND_DELAY);
}

function turnText() {
  if (mode === 'cpu') return turn === R ? 'Your turn' : 'Computer thinking…';
  return turn === R ? 'Blue to play' : 'Amber to play';
}

// --- computer player (alpha-beta) ------------------------------------------

// A full search is far too wide for a 7x6 board, so the search is depth-capped
// and leaf positions are scored by how many open runs of four each side owns.
function bestMove(b, me) {
  let bestScore = -Infinity;
  let bestCol = ORDER.find(c => dropRow(b, c) >= 0);
  for (const c of ORDER) {
    const r = dropRow(b, c);
    if (r < 0) continue;
    b[at(c, r)] = me;
    const s = lineThrough(b, c, r)
      ? 1e6
      : search(b, DEPTH - 1, me === R ? Y : R, me, -Infinity, Infinity);
    b[at(c, r)] = '';
    if (s > bestScore) { bestScore = s; bestCol = c; }
  }
  return bestCol;
}

function search(b, depth, current, me, alpha, beta) {
  if (isFull(b)) return 0;
  if (depth === 0) return evaluate(b, me);

  const maximizing = current === me;
  let best = maximizing ? -Infinity : Infinity;

  for (const c of ORDER) {
    const r = dropRow(b, c);
    if (r < 0) continue;
    b[at(c, r)] = current;

    let s;
    if (lineThrough(b, c, r)) {
      // Prefer winning sooner and losing later.
      s = maximizing ? 1e5 + depth : -1e5 - depth;
    } else {
      s = search(b, depth - 1, current === R ? Y : R, me, alpha, beta);
    }
    b[at(c, r)] = '';

    if (maximizing) {
      best = Math.max(best, s);
      alpha = Math.max(alpha, s);
    } else {
      best = Math.min(best, s);
      beta = Math.min(beta, s);
    }
    if (beta <= alpha) break;
  }
  return best === Infinity || best === -Infinity ? evaluate(b, me) : best;
}

function evaluate(b, me) {
  const opp = me === R ? Y : R;
  let score = 0;

  // Centre control is worth real tempo in Connect Four.
  for (let r = 0; r < ROWS; r++) {
    const v = b[at(3, r)];
    if (v === me) score += 3;
    else if (v === opp) score -= 3;
  }

  const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dc, dr] of dirs) {
        const endC = c + dc * 3;
        const endR = r + dr * 3;
        if (endC < 0 || endC >= COLS || endR < 0 || endR >= ROWS) continue;
        let mine = 0, theirs = 0;
        for (let k = 0; k < 4; k++) {
          const v = b[at(c + dc * k, r + dr * k)];
          if (v === me) mine++;
          else if (v === opp) theirs++;
        }
        if (mine && theirs) continue;              // blocked window, worthless
        if (mine === 3) score += 50;
        else if (mine === 2) score += 10;
        else if (mine === 1) score += 1;
        else if (theirs === 3) score -= 80;        // block before you build
        else if (theirs === 2) score -= 10;
        else if (theirs === 1) score -= 1;
      }
    }
  }
  return score;
}

// --- round / controls ------------------------------------------------------

function newRound(alternate = true) {
  clearTimers();
  hideResult();
  board = new Array(COLS * ROWS).fill('');
  winLine = [];
  lastDrop = null;
  over = false;
  if (alternate) starter = starter === R ? Y : R;
  turn = starter;
  render();
  setStatus(turnText());
  if (mode === 'cpu' && turn === Y) {
    cpuTimer = setTimeout(() => { cpuTimer = null; drop(bestMove(board, Y)); }, CPU_DELAY);
  }
}

document.querySelectorAll('.mode').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.mode === mode) return;
    mode = btn.dataset.mode;
    document.querySelectorAll('.mode').forEach(b => b.classList.toggle('is-active', b === btn));
    starter = Y;             // so the next round starts with Blue
    newRound();
  });
});

document.getElementById('new-round').addEventListener('click', () => newRound());

document.getElementById('reset-all').addEventListener('click', () => {
  scores.R = scores.Y = scores.D = 0;
  starter = Y;
  newRound();
});

starter = Y;
newRound();
