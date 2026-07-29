const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const scoreEls = { X: document.getElementById('score-x'), O: document.getElementById('score-o'), D: document.getElementById('score-d') };

let board = Array(9).fill('');
let turn = 'X';
let over = false;
let mode = 'cpu';           // 'cpu' | 'human'
let starter = 'X';          // alternates each round
const scores = { X: 0, O: 0, D: 0 };

// --- rendering -------------------------------------------------------------

const cells = Array.from({ length: 9 }, (_, i) => {
  const b = document.createElement('button');
  b.className = 'cell';
  b.type = 'button';
  b.setAttribute('role', 'gridcell');
  b.addEventListener('click', () => play(i));
  boardEl.appendChild(b);
  return b;
});

function render() {
  cells.forEach((cell, i) => {
    const v = board[i];
    cell.className = 'cell' + (v ? ' ' + v.toLowerCase() : '');
    cell.innerHTML = v ? `<span class="mark">${v}</span>` : '';
    cell.disabled = over || v !== '';
    cell.setAttribute('aria-label', v ? `Cell ${i + 1}, ${v}` : `Cell ${i + 1}, empty`);
  });
  scoreEls.X.textContent = scores.X;
  scoreEls.O.textContent = scores.O;
  scoreEls.D.textContent = scores.D;
}

function setStatus(text, winner) {
  statusEl.textContent = text;
  statusEl.className = 'status' + (winner ? ' win-' + winner.toLowerCase() : '');
}

// --- game logic ------------------------------------------------------------

function winnerOf(b) {
  for (const line of LINES) {
    const [a, c, d] = line;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { player: b[a], line };
  }
  return b.includes('') ? null : { player: null, line: [] };  // null player = draw
}

function play(i) {
  if (over || board[i]) return;
  if (mode === 'cpu' && turn === 'O') return;
  move(i);
  if (!over && mode === 'cpu' && turn === 'O') {
    setStatus('Computer thinking…');
    setTimeout(() => move(bestMove(board, 'O')), 320);
  }
}

function move(i) {
  board[i] = turn;
  const result = winnerOf(board);

  if (result) {
    over = true;
    if (result.player) {
      scores[result.player]++;
      const who = mode === 'cpu'
        ? (result.player === 'X' ? 'You win!' : 'Computer wins')
        : `${result.player} wins!`;
      setStatus(who, result.player);
    } else {
      scores.D++;
      setStatus("It's a draw");
    }
    render();
    result.line.forEach(n => cells[n].classList.add('win'));
    return;
  }

  turn = turn === 'X' ? 'O' : 'X';
  render();
  setStatus(turnText());
}

function turnText() {
  if (mode === 'cpu') return turn === 'X' ? 'Your turn' : 'Computer thinking…';
  return `${turn} to play`;
}

// --- perfect CPU (minimax) -------------------------------------------------

function bestMove(b, me) {
  let bestScore = -Infinity;
  let bestIdx = b.indexOf('');
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = me;
    const s = minimax(b, me === 'X' ? 'O' : 'X', me, 1);
    b[i] = '';
    if (s > bestScore) { bestScore = s; bestIdx = i; }
  }
  return bestIdx;
}

function minimax(b, current, me, depth) {
  const result = winnerOf(b);
  if (result) {
    if (!result.player) return 0;
    return result.player === me ? 10 - depth : depth - 10;
  }
  const maximizing = current === me;
  let best = maximizing ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = current;
    const s = minimax(b, current === 'X' ? 'O' : 'X', me, depth + 1);
    b[i] = '';
    best = maximizing ? Math.max(best, s) : Math.min(best, s);
  }
  return best;
}

// --- round / controls ------------------------------------------------------

function newRound(alternate = true) {
  board = Array(9).fill('');
  over = false;
  if (alternate) starter = starter === 'X' ? 'O' : 'X';
  turn = starter;
  render();
  setStatus(turnText());
  if (mode === 'cpu' && turn === 'O') {
    setTimeout(() => move(bestMove(board, 'O')), 320);
  }
}

document.querySelectorAll('.mode').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.mode === mode) return;
    mode = btn.dataset.mode;
    document.querySelectorAll('.mode').forEach(b => b.classList.toggle('is-active', b === btn));
    starter = 'O';           // so the next round starts with X
    newRound();
  });
});

document.getElementById('new-round').addEventListener('click', () => newRound());

document.getElementById('reset-all').addEventListener('click', () => {
  scores.X = scores.O = scores.D = 0;
  starter = 'O';
  newRound();
});

starter = 'O';
newRound();
