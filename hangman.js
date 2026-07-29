// Each word ships with its help question - the clue is part of the puzzle,
// not a bonus, so it is always on screen.
const WORDS = [
  { word: 'GUITAR',   hint: 'Which instrument has six strings and a wooden body?' },
  { word: 'PENGUIN',  hint: 'Which bird swims well but cannot fly?' },
  { word: 'VOLCANO',  hint: 'Which mountain can erupt with lava?' },
  { word: 'LIBRARY',  hint: 'Where do you borrow books for free?' },
  { word: 'DIAMOND',  hint: 'Which gemstone is the hardest of them all?' },
  { word: 'COMPASS',  hint: 'Which tool always points you north?' },
  { word: 'PYRAMID',  hint: 'Which stone monument did the Egyptians build?' },
  { word: 'RAINBOW',  hint: 'What appears in the sky after rain and sun?' },
  { word: 'CACTUS',   hint: 'Which plant stores water and is covered in spines?' },
  { word: 'HARVEST',  hint: 'What do farmers call gathering the ripe crops?' },
  { word: 'ANCHOR',   hint: 'What holds a ship in place at sea?' },
  { word: 'MAGNET',   hint: 'What pulls iron towards it without touching it?' },
  { word: 'BRIDGE',   hint: 'What lets a road cross over a river?' },
  { word: 'FALCON',   hint: 'Which bird is the fastest animal alive?' },
  { word: 'CANDLE',   hint: 'What gives light while slowly melting away?' },
  { word: 'GLACIER',  hint: 'Which slow river is made entirely of ice?' },
  { word: 'THUNDER',  hint: 'Which sound follows a flash of lightning?' },
  { word: 'MUSEUM',   hint: 'Where can you go to see art and old objects?' },
  { word: 'PUZZLE',   hint: 'What do you solve by fitting pieces together?' },
  { word: 'ISLAND',   hint: 'Which piece of land has water on every side?' },
  { word: 'ROCKET',   hint: 'What carries astronauts up into space?' },
  { word: 'JUNGLE',   hint: 'Which hot forest is thick with vines and animals?' },
  { word: 'WHISPER',  hint: 'How do you speak when you are very quiet?' },
  { word: 'TREASURE', hint: 'What do pirates bury and mark with an X?' },
  { word: 'DOLPHIN',  hint: 'Which clever sea animal breathes air and clicks?' },
  { word: 'MIRROR',   hint: 'What shows you your own reflection?' },
  { word: 'DESERT',   hint: 'Which sandy place almost never gets rain?' },
  { word: 'VIOLIN',   hint: 'Which small instrument do you play with a bow?' },
  { word: 'LANTERN',  hint: 'Which lamp can you carry by its handle?' },
  { word: 'ORBIT',    hint: 'What is the path a moon takes around a planet?' },
];

const LIVES = 5;                // one body part per life lost
const NEXT_ROUND_DELAY = 3000;  // how long the result stays on screen

const statusEl = document.getElementById('status');
const wordEl = document.getElementById('word');
const hintEl = document.getElementById('hint');
const pipsEl = document.getElementById('pips');
const keysEl = document.getElementById('keys');
const figureEl = document.getElementById('figure');
const resultEl = document.getElementById('result');
const resultTitleEl = document.getElementById('result-title');
const resultSubEl = document.getElementById('result-sub');
const scoreEls = { W: document.getElementById('score-w'), L: document.getElementById('score-l') };

const parts = Array.from(figureEl.querySelectorAll('.part'));

let current = WORDS[0];
let guessed = new Set();
let wrong = 0;
let over = false;
let lastIndex = -1;
const scores = { W: 0, L: 0 };

// An auto-restart left over from the previous round would otherwise fire onto a
// fresh word, so the timer must be cancellable.
let nextRoundTimer = null;

function clearTimers() {
  clearTimeout(nextRoundTimer);
  nextRoundTimer = null;
}

// --- rendering -------------------------------------------------------------

const keyButtons = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => {
  const b = document.createElement('button');
  b.className = 'key';
  b.type = 'button';
  b.textContent = letter;
  b.addEventListener('click', () => guess(letter));
  keysEl.appendChild(b);
  return b;
});

function renderWord() {
  wordEl.innerHTML = current.word
    .split('')
    .map(ch => {
      const shown = guessed.has(ch) || over;
      const missed = shown && !guessed.has(ch);
      return `<span class="letter${shown ? ' is-shown' : ''}${missed ? ' is-missed' : ''}">${shown ? ch : ''}</span>`;
    })
    .join('');
  wordEl.setAttribute('aria-label', current.word
    .split('')
    .map(ch => (guessed.has(ch) || over) ? ch : 'blank')
    .join(' '));
}

function renderKeys() {
  keyButtons.forEach(b => {
    const letter = b.textContent;
    const used = guessed.has(letter);
    const hit = used && current.word.includes(letter);
    b.className = 'key' + (used ? (hit ? ' is-hit' : ' is-miss') : '');
    b.disabled = over || used;
  });
}

function renderLives() {
  const left = LIVES - wrong;
  pipsEl.innerHTML = Array.from({ length: LIVES },
    (_, i) => `<span class="pip${i < left ? '' : ' is-gone'}"></span>`).join('');
  pipsEl.setAttribute('aria-label', `${left} of ${LIVES} lives left`);
}

function renderFigure() {
  parts.forEach(p => p.classList.toggle('is-on', Number(p.dataset.part) <= wrong));
  figureEl.classList.toggle('is-dead', wrong >= LIVES);
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

function solved() {
  return current.word.split('').every(ch => guessed.has(ch));
}

function guess(letter) {
  if (over || guessed.has(letter)) return;
  guessed.add(letter);

  const hit = current.word.includes(letter);
  if (!hit) wrong++;

  if (solved()) return end(true);
  if (wrong >= LIVES) return end(false);

  renderWord();
  renderKeys();
  renderLives();
  renderFigure();
  setStatus(hit ? `Yes - ${letter} is in the word` : `No ${letter}. ${LIVES - wrong} lives left`,
            hit ? 'win-x' : 'win-o');
}

function end(won) {
  over = true;
  if (won) {
    scores.W++;
    setStatus('You saved him! — next word…', 'win-x');
    showResult('You win!', 'You saved him', 'win-x');
  } else {
    scores.L++;
    setStatus(`Hanged. The word was ${current.word} — next word…`, 'win-o');
    showResult('Hanged!', `The word was ${current.word}`, 'is-lost');
  }
  renderWord();
  renderKeys();
  renderLives();
  renderFigure();
  renderScores();
  // hold the result on screen, then deal a fresh word
  nextRoundTimer = setTimeout(() => { nextRoundTimer = null; newRound(); }, NEXT_ROUND_DELAY);
}

function renderScores() {
  scoreEls.W.textContent = scores.W;
  scoreEls.L.textContent = scores.L;
}

// --- round / controls ------------------------------------------------------

function pickWord() {
  if (WORDS.length < 2) return 0;
  let i = lastIndex;
  while (i === lastIndex) i = Math.floor(Math.random() * WORDS.length);
  return i;
}

function newRound() {
  clearTimers();
  hideResult();
  lastIndex = pickWord();
  current = WORDS[lastIndex];
  guessed = new Set();
  wrong = 0;
  over = false;
  hintEl.textContent = current.hint;
  renderWord();
  renderKeys();
  renderLives();
  renderFigure();
  renderScores();
  setStatus('Guess the word');
}

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const letter = e.key.toUpperCase();
  if (letter >= 'A' && letter <= 'Z' && letter.length === 1) guess(letter);
});

document.getElementById('new-word').addEventListener('click', () => newRound());

document.getElementById('reset-all').addEventListener('click', () => {
  scores.W = scores.L = 0;
  newRound();
});

newRound();
