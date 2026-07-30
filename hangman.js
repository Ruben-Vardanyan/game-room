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
  { word: 'ELEPHANT', hint: 'Which land animal has a trunk and huge ears?' },
  { word: 'CASTLE',   hint: 'Which stone home did kings defend with high walls?' },
  { word: 'TORNADO',  hint: 'Which spinning column of wind tears through a town?' },
  { word: 'PARROT',   hint: 'Which colourful bird can copy the words you say?' },
  { word: 'BALLOON',  hint: 'What floats away if you let go of the string?' },
  { word: 'CAMERA',   hint: 'What do you use to take a photograph?' },
  { word: 'GARDEN',   hint: 'Where do you grow flowers beside a house?' },
  { word: 'WINDOW',   hint: 'What do you look through to see outside?' },
  { word: 'SPIDER',   hint: 'Which eight-legged creature spins a web?' },
  { word: 'BUTTER',   hint: 'What do you spread on bread with a knife?' },
  { word: 'PLANET',   hint: 'What do we call a world that circles a star?' },
  { word: 'FOREST',   hint: 'Where do thousands of trees grow together?' },
  { word: 'CIRCUS',   hint: 'Where do clowns and acrobats perform in a ring?' },
  { word: 'KETTLE',   hint: 'What do you boil water in to make tea?' },
  { word: 'PILLOW',   hint: 'What do you rest your head on at night?' },
  { word: 'SILVER',   hint: 'Which shiny metal is worth less than gold?' },
  { word: 'TUNNEL',   hint: 'Which passage goes straight through a hill?' },
  { word: 'WINTER',   hint: 'Which season brings the coldest weather?' },
  { word: 'MARKET',   hint: 'Where do traders sell food from stalls?' },
  { word: 'SHADOW',   hint: 'What follows you around whenever the sun is out?' },
  { word: 'FEATHER',  hint: 'What covers a bird and weighs almost nothing?' },
  { word: 'BLANKET',  hint: 'What do you pull over yourself to stay warm?' },
  { word: 'CHIMNEY',  hint: 'Where does smoke leave a house?' },
  { word: 'TROPHY',   hint: 'What do you lift above your head when you win?' },
  { word: 'ENGINE',   hint: 'What under the bonnet makes a car move?' },
  { word: 'HELMET',   hint: 'What protects your head when you ride a bike?' },
  { word: 'SADDLE',   hint: 'What do you sit on when riding a horse?' },
  { word: 'BAMBOO',   hint: 'Which fast-growing plant do pandas eat?' },
  { word: 'SPONGE',   hint: 'What soaks up water when you wash the dishes?' },
  { word: 'NEEDLE',   hint: 'What do you thread before you sew?' },
  { word: 'BUCKET',   hint: 'What do you carry water in by its handle?' },
  { word: 'LADDER',   hint: 'What do you climb to reach a roof?' },
  { word: 'MONKEY',   hint: 'Which animal swings through the trees by its arms?' },
  { word: 'TIGER',    hint: 'Which big orange cat wears black stripes?' },
  { word: 'CAMEL',    hint: 'Which desert animal stores fat in its hump?' },
  { word: 'SPRING',   hint: 'Which season comes straight after winter?' },
  { word: 'BAKERY',   hint: 'Where is fresh bread baked and sold?' },
  { word: 'CHEESE',   hint: 'Which food is made from milk and left to age?' },
  { word: 'HONEY',    hint: 'Which sweet golden food do bees make?' },
  { word: 'PEPPER',   hint: 'Which black spice can make you sneeze?' },
  { word: 'TOMATO',   hint: 'Which red fruit is crushed into ketchup?' },
  { word: 'BANANA',   hint: 'Which long yellow fruit do you peel?' },
  { word: 'ORANGE',   hint: 'Which fruit shares its name with a colour?' },
  { word: 'WALNUT',   hint: 'Which nut hides inside a hard wrinkled shell?' },
  { word: 'MEADOW',   hint: 'Which grassy field is scattered with wildflowers?' },
  { word: 'STREAM',   hint: 'Which small river runs shallow over stones?' },
  { word: 'HARBOUR',  hint: 'Where do boats shelter safely near the shore?' },
  { word: 'AIRPORT',  hint: 'Where do planes take off and land?' },
  { word: 'STATION',  hint: 'Where do you wait to board a train?' },
  { word: 'HOSPITAL', hint: 'Where do doctors and nurses treat the sick?' },
  { word: 'SCHOOL',   hint: 'Where do children go every day to learn?' },
  { word: 'KITCHEN',  hint: 'Which room of the house do you cook in?' },
  { word: 'BALCONY',  hint: 'Which small platform juts out from an upper floor?' },
  { word: 'CURTAIN',  hint: 'What do you draw across a window at night?' },
  { word: 'CARPET',   hint: 'What covers a floor and is soft underfoot?' },
  { word: 'CLOCK',    hint: 'What hangs on the wall and tells the time?' },
  { word: 'POCKET',   hint: 'Where do you keep your keys in your trousers?' },
  { word: 'BUTTON',   hint: 'What do you push through a hole to fasten a shirt?' },
  { word: 'JACKET',   hint: 'Which short coat do you wear outdoors?' },
  { word: 'SANDAL',   hint: 'Which open shoe do you wear in summer?' },
  { word: 'GLOVE',    hint: 'What do you pull on to keep one hand warm?' },
  { word: 'SCARF',    hint: 'What do you wrap around your neck in the cold?' },
  { word: 'UMBRELLA', hint: 'What do you open to keep the rain off?' },
  { word: 'TICKET',   hint: 'What must you buy before you enter a cinema?' },
  { word: 'POSTER',   hint: 'What do you stick on a wall to advertise a show?' },
  { word: 'WHISTLE',  hint: 'What does a referee blow to stop the game?' },
  { word: 'OCTOPUS',  hint: 'Which sea creature reaches out with eight arms?' },
  { word: 'GIRAFFE',  hint: 'Which animal has the longest neck of all?' },
  { word: 'SANDWICH', hint: 'What do you make by filling two slices of bread?' },
  { word: 'TELESCOPE',hint: 'Which tube do you look through to see distant stars?' },
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
let bag = [];               // shuffled word indices, dealt from the end
const scores = { W: 0, L: 0 };

// An auto-restart left over from the previous round would otherwise fire onto a
// fresh word, so the timer must be cancellable.
let nextRoundTimer = null;

function clearTimers() {
  clearTimeout(nextRoundTimer);
  nextRoundTimer = null;
}

// --- rendering -------------------------------------------------------------

// Laid out like a phone keyboard rather than A-Z, so your thumbs already know
// where every letter is.
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

const keyButtons = KEY_ROWS.flatMap((row, r) => {
  const rowEl = document.createElement('div');
  rowEl.className = `key-row key-row-${r + 1}`;
  keysEl.appendChild(rowEl);
  return row.split('').map(letter => {
    const b = document.createElement('button');
    b.className = 'key';
    b.type = 'button';
    b.textContent = letter;
    b.addEventListener('click', () => guess(letter));
    rowEl.appendChild(b);
    return b;
  });
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

// Words are dealt from a shuffled bag, so every word comes up once before any
// of them comes up again. The bag only refills when it runs dry or on reset.
function refillBag() {
  bag = WORDS.map((_, i) => i);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  // A refill could otherwise hand back the word just played, which is the one
  // repeat the shuffle cannot rule out.
  if (bag.length > 1 && bag[bag.length - 1] === lastIndex) {
    [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
  }
}

function pickWord() {
  if (!bag.length) refillBag();
  return bag.pop();
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
  refillBag();               // a reset starts the run of words over as well
  newRound();
});

newRound();
