const WORDS = [
  { word: 'PLANET',   hint: 'Space' },
  { word: 'GUITAR',   hint: 'Music' },
  { word: 'PENGUIN',  hint: 'Animal' },
  { word: 'COMPASS',  hint: 'Travel' },
  { word: 'VOLCANO',  hint: 'Nature' },
  { word: 'DIAMOND',  hint: 'Mineral' },
  { word: 'HARVEST',  hint: 'Farming' },
  { word: 'LANTERN',  hint: 'Light' },
  { word: 'MAGNET',   hint: 'Physics' },
  { word: 'ORCHID',   hint: 'Flower' },
  { word: 'GLACIER',  hint: 'Nature' },
  { word: 'PYRAMID',  hint: 'History' },
  { word: 'DOLPHIN',  hint: 'Animal' },
  { word: 'CASTLE',   hint: 'Building' },
  { word: 'ROCKET',   hint: 'Space' },
  { word: 'BAMBOO',   hint: 'Plant' },
  { word: 'THUNDER',  hint: 'Weather' },
  { word: 'JOURNEY',  hint: 'Travel' },
  { word: 'MUSEUM',   hint: 'Culture' },
  { word: 'FALCON',   hint: 'Animal' },
  { word: 'CIRCUIT',  hint: 'Electronics' },
  { word: 'MEADOW',   hint: 'Nature' },
  { word: 'PUZZLE',   hint: 'Games' },
  { word: 'ANCHOR',   hint: 'Sailing' },
  { word: 'GARLIC',   hint: 'Cooking' },
  { word: 'MARBLE',   hint: 'Material' },
  { word: 'SUNSET',   hint: 'Sky' },
  { word: 'WALRUS',   hint: 'Animal' },
  { word: 'BALLOON',  hint: 'Party' },
  { word: 'CACTUS',   hint: 'Plant' },
  { word: 'HELMET',   hint: 'Safety' },
  { word: 'ISLAND',   hint: 'Geography' },
  { word: 'MONSOON',  hint: 'Weather' },
  { word: 'VIOLIN',   hint: 'Music' },
  { word: 'TUNNEL',   hint: 'Engineering' },
  { word: 'ORBIT',    hint: 'Space' },
  { word: 'PEPPER',   hint: 'Cooking' },
  { word: 'SAFARI',   hint: 'Travel' },
  { word: 'CANYON',   hint: 'Nature' },
  { word: 'MIRROR',   hint: 'Household' },
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const TOTAL_ROUNDS = 10;
const MAX_LIVES = 5;

const el = {
  status: document.getElementById('status'),
  round: document.getElementById('round'),
  bar: document.getElementById('bar'),
  barFill: document.getElementById('bar-fill'),
  lives: document.getElementById('lives'),
  hint: document.getElementById('hint'),
  word: document.getElementById('word'),
  keys: document.getElementById('keys'),
  parts: Array.from(document.querySelectorAll('.part')),
  overlay: document.getElementById('overlay'),
  sheetEmoji: document.getElementById('sheet-emoji'),
  sheetTitle: document.getElementById('sheet-title'),
  sheetText: document.getElementById('sheet-text'),
  sheetBtn: document.getElementById('sheet-btn'),
};

let pool = [];        // words not yet used this run
let current = null;   // { word, hint }
let guessed = new Set();
let lives = MAX_LIVES;
let round = 1;
let locked = false;   // input frozen between rounds / after game over

// --- keyboard --------------------------------------------------------------

const keyButtons = new Map();
ALPHABET.forEach(letter => {
  const b = document.createElement('button');
  b.className = 'key';
  b.type = 'button';
  b.textContent = letter;
  b.addEventListener('click', () => guess(letter));
  el.keys.appendChild(b);
  keyButtons.set(letter, b);
});

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const letter = e.key.toUpperCase();
  if (ALPHABET.includes(letter)) guess(letter);
});

// --- run / round setup -----------------------------------------------------

function shuffled(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newGame() {
  pool = shuffled(WORDS);
  round = 1;
  lives = MAX_LIVES;          // lives last the whole game, not just one word
  el.overlay.hidden = true;
  startRound();
}

function startRound() {
  current = pool.pop();
  guessed = new Set();
  locked = false;
  el.hint.textContent = current.hint;
  setStatus('Guess a letter');
  render();
}

// --- guessing --------------------------------------------------------------

function guess(letter) {
  if (locked || guessed.has(letter)) return;
  guessed.add(letter);

  const hit = current.word.includes(letter);
  if (!hit) lives--;

  render();
  setStatus(hit ? `${letter} — yes` : `No ${letter}`);

  if (isSolved()) {
    locked = true;
    if (round === TOTAL_ROUNDS) return finish(true);
    setStatus(`${current.word} — correct!`);
    round++;
    setTimeout(startRound, 1100);
  } else if (lives === 0) {
    locked = true;
    render();
    finish(false);
  }
}

function isSolved() {
  return current.word.split('').every(c => guessed.has(c));
}

function finish(won) {
  locked = true;
  if (won) {
    el.barFill.style.width = '100%';
    el.bar.setAttribute('aria-valuenow', TOTAL_ROUNDS);
  }
  el.sheetEmoji.textContent = won ? '🎉' : '💀';
  el.sheetTitle.textContent = won ? 'You win!' : 'Game over';
  el.sheetText.textContent = won
    ? `You cleared all ${TOTAL_ROUNDS} words with ${lives} ${lives === 1 ? 'life' : 'lives'} to spare.`
    : `The word was ${current.word}. You got ${round - 1} of ${TOTAL_ROUNDS} words.`;
  el.sheetBtn.textContent = won ? 'Play again' : 'Try again';
  el.overlay.hidden = false;
  el.sheetBtn.focus();
}

// --- rendering -------------------------------------------------------------

function render() {
  // word slots
  el.word.innerHTML = current.word
    .split('')
    .map(c => `<span class="slot${guessed.has(c) ? ' filled' : ''}">${guessed.has(c) ? c : ''}</span>`)
    .join('');

  // lives as pips
  const used = MAX_LIVES - lives;
  el.lives.innerHTML = Array.from({ length: MAX_LIVES }, (_, i) =>
    `<span class="pip${i < lives ? '' : ' spent'}"></span>`).join('');

  // hangman parts
  el.parts.forEach(p => {
    p.classList.toggle('show', Number(p.dataset.part) <= used);
  });

  // keys
  keyButtons.forEach((btn, letter) => {
    const done = guessed.has(letter);
    btn.disabled = done || locked;
    btn.className = 'key' + (done ? (current.word.includes(letter) ? ' hit' : ' miss') : '');
  });

  // progress
  el.round.textContent = round;
  const done = round - 1;
  el.barFill.style.width = `${(done / TOTAL_ROUNDS) * 100}%`;
  el.bar.setAttribute('aria-valuenow', done);
}

function setStatus(text) {
  el.status.textContent = text;
}

// --- controls --------------------------------------------------------------

document.getElementById('new-game').addEventListener('click', newGame);

el.sheetBtn.addEventListener('click', newGame);

newGame();
