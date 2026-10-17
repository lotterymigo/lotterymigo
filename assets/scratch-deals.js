/* ============================================================
   Scratch deals
   ------------------------------------------------------------
   Pure functions only. The page paints the result.
   About 1 in 4 cards win. Points are virtual.
   Edit SCRATCH_WIN_ODDS or a game block without touching HTML.
   ============================================================ */

export const SCRATCH_WIN_ODDS = 0.25;

const BINGO_LINES = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20]
];

const SLOT_SYMBOLS = ["7", "BAR", "★", "♥", "♦"];

function shuffle(list, random) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = copy[i];
    copy[i] = copy[j];
    copy[j] = swap;
  }
  return copy;
}

function pickFromRange(min, max, count, random) {
  const bag = [];
  for (let n = min; n <= max; n++) bag.push(n);
  return shuffle(bag, random).slice(0, count);
}

export function bingoHasLine(cells) {
  return BINGO_LINES.some((line) => line.every((index) => cells[index].called));
}

function buildBingoCard(random) {
  const columns = [
    pickFromRange(1, 15, 5, random),
    pickFromRange(16, 30, 5, random),
    pickFromRange(31, 45, 4, random),
    pickFromRange(46, 60, 5, random),
    pickFromRange(61, 75, 5, random)
  ];
  const cells = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (row === 2 && col === 2) {
        cells.push({ label: "FREE", called: true, free: true });
        continue;
      }
      const stack = columns[col];
      const label = col === 2 ? stack[row > 2 ? row - 1 : row] : stack[row];
      cells.push({ label: String(label), called: false, free: false });
    }
  }
  return cells;
}

function dealBingo(random, won) {
  const cells = buildBingoCard(random);
  if (won) {
    const line = BINGO_LINES[Math.floor(random() * BINGO_LINES.length)];
    line.forEach((index) => {
      cells[index].called = true;
    });
    return { won: true, prize: "100 PTS", prizePoints: 100, kind: "bingo", cells };
  }
  const order = shuffle(cells.map((_, index) => index).filter((index) => !cells[index].free), random);
  let marked = 1;
  for (const index of order) {
    if (marked >= 8) break;
    cells[index].called = true;
    if (bingoHasLine(cells)) cells[index].called = false;
    else marked++;
  }
  return { won: false, prize: "", prizePoints: 0, kind: "bingo", cells };
}

function dealSlots(random, won) {
  if (won) {
    return { won: true, prize: "777 PTS", prizePoints: 777, kind: "slots", reels: ["7", "7", "7"] };
  }
  const reels = [0, 1, 2].map(() => SLOT_SYMBOLS[Math.floor(random() * SLOT_SYMBOLS.length)]);
  if (reels.every((symbol) => symbol === "7")) reels[2] = "BAR";
  return { won: false, prize: "", prizePoints: 0, kind: "slots", reels };
}

function pickDistinct(pool, count, blocked, random) {
  const banned = new Set(blocked || []);
  const choices = pool.filter((value) => !banned.has(value));
  const picked = [];
  let guard = 0;
  while (picked.length < count && choices.length && guard < 1000) {
    guard++;
    const value = choices[Math.floor(random() * choices.length)];
    if (!picked.includes(value)) picked.push(value);
  }
  return picked;
}

function dealMatch(theme, random, won) {
  const winning = pickDistinct(theme.pool, 2, [], random);
  const player = pickDistinct(theme.pool, 6, winning, random);
  let prize = "";
  let prizePoints = 0;
  if (won && player.length && winning.length) {
    const matchAt = Math.floor(random() * player.length);
    player[matchAt] = winning[Math.floor(random() * winning.length)];
    prize = theme.prizes[matchAt] || theme.prizes[0];
    prizePoints = parseInt(prize, 10) || 0;
  }
  return { won: !!prize, prize, prizePoints, kind: "match", winning, player };
}

export function dealScratch(theme, random = Math.random) {
  const won = random() < SCRATCH_WIN_ODDS;
  if (theme.kind === "bingo") return dealBingo(random, won);
  if (theme.kind === "slots") return dealSlots(random, won);
  return dealMatch(theme, random, won);
}
