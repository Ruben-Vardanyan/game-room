# Game Room

A little arcade of ten classic games that runs in a web browser. No sign-up,
no install, no adverts — open the page, pick a game, play.

Everything works on a phone as well as a computer.

---

## Getting started

Open **`index.html`** — that is the home page. It shows a list of the ten
games; tap one to play it, and use the **All games** button at the top of any
game to come back.

That is the whole thing. There is nothing to install and nothing to set up.

---

## The games

| Game | What you do | How you control it |
|---|---|---|
| **Tic Tac Toe** | Get three in a row | Tap a square |
| **Hangman** | Guess the word from a question, 5 lives | Tap the on-screen keyboard, or type |
| **Snake** | Eat apples, grow long, don't hit a wall | Arrow keys, WASD, the pad, or drag on the screen |
| **Memory Match** | Turn over 16 cards and find the 8 pairs | Tap a card |
| **Connect Four** | Line up four of your colour | Tap a column to drop a disc |
| **Dino Run** | Jump the cacti, duck the birds, run forever | Space or tap to jump, ↓ to duck |
| **Darts** | Nine darts, score as high as you can | Tap once to set left–right, again for up–down |
| **Tank Battle** | Shoot the orange tanks before they shoot you | Arrows/WASD to drive, Space or **Fire** to shoot |
| **Bird Shoot** | Shoot the birds crossing the sky | Tap straight onto a bird |
| **Ping Pong** | Beat the computer to seven points | Drag on the table, ▲▼, or arrows/WS |

### A few things worth knowing

- **Two-player mode.** Tic Tac Toe and Connect Four have a **2 Players** button
  at the top, so two people can play on the same screen. Otherwise you play the
  computer.
- **Rounds start themselves.** When a round ends you get a short message, then
  the next round is dealt automatically. You never have to press a button to
  keep playing.
- **Snake steers by dragging.** Drag on the screen and it turns the moment your
  finger has moved far enough — no need to lift off. Keep dragging and it keeps
  turning, so one stroke can trace a whole path.
- **Darts aims in two steps.** A line sweeps side to side — tap to stop it. Then
  a second line sweeps up and down — tap again. The dart lands exactly where the
  two lines crossed.
- **Bird Shoot has limited ammo.** You get three shells, shown at the bottom of
  the sky. When they run out the gun reloads on its own after about a second, so
  tapping wildly does not pay off.
- **Ping Pong follows your finger.** Drag anywhere on the table and the blue
  bat tracks it. The ball speeds up with every return, and hitting it with the
  edge of the bat sends it back at a steeper angle.
- **Tank Battle needs two thumbs** on a phone — the direction pad and the Fire
  button are separate.

---

## Your scores

Seven of the games remember your personal best on the device you played on:

| Game | What "best" means |
|---|---|
| Snake | Most apples eaten |
| Memory Match | **Fewest** moves to clear the board |
| Dino Run | Longest run |
| Darts | Highest nine-dart total |
| Tank Battle | Most tanks destroyed |
| Bird Shoot | Most birds shot |
| Ping Pong | Longest rally |

Tic Tac Toe, Connect Four and Hangman keep a running tally of wins and losses
while the page is open, but it starts again from zero when you reload.

Every game has a **Reset best** or **Reset scores** button if you want a clean
slate.

Scores live in your own browser, on your own device. They are not shared with
anyone, they do not travel to your other devices, and clearing your browser data
will erase them.

---

## How it is built

Plain HTML, CSS and JavaScript. No frameworks, no build step, no server, no
database. The only outside resource is Google Fonts for the two typefaces.

That means the folder can be published as-is: whatever is in it *is* the
website.

### The files

```
index.html        Home page — the menu of games
styles.css        Every style for every page, in one file

tictactoe.html  + app.js         Tic Tac Toe
hangman.html    + hangman.js     Hangman
snake.html      + snake.js       Snake
memory.html     + memory.js      Memory Match
connect4.html   + connect4.js    Connect Four
dino.html       + dino.js        Dino Run
darts.html      + darts.js       Darts
tanks.html      + tanks.js       Tank Battle
birds.html      + birds.js       Bird Shoot
pong.html       + pong.js        Ping Pong
```

Each game is one HTML page plus one JavaScript file, and nothing else. Games do
not share code with each other, so changing one can never break another. The
only shared file is `styles.css`.

### If you edit anything

Each page loads its files with a version tag, like
`<script src="snake.js?v=3">`. **Bump that number whenever you change the file**,
otherwise browsers will keep serving the old copy from cache and your change
will appear to do nothing. If you change `styles.css`, bump its tag on *every*
page, since they all share it.
