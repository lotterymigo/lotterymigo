import { bingoHasLine, dealScratch } from "../assets/scratch-deals.js";

const matchTheme = {
  kind: "match",
  pool: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  prizes: ["10 PTS", "25 PTS", "50 PTS", "100 PTS", "250 PTS", "500 PTS"]
};

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

let bingoWins = 0;
let slotWins = 0;
let matchWins = 0;
for (let i = 0; i < 400; i++) {
  const bingo = dealScratch({ kind: "bingo" });
  const slots = dealScratch({ kind: "slots" });
  const match = dealScratch(matchTheme);
  if (bingo.won) {
    bingoWins++;
    assert(bingoHasLine(bingo.cells), "winning bingo has no line");
    assert(bingo.prizePoints === 100, "bingo prize");
  } else {
    assert(!bingoHasLine(bingo.cells), "losing bingo completed a line");
    assert(bingo.prize === "", "losing bingo prize text");
  }
  assert(bingo.cells.length === 25, "bingo grid");
  assert(bingo.cells[12].label === "FREE" && bingo.cells[12].called, "free square");
  if (slots.won) {
    slotWins++;
    assert(slots.reels.join("") === "777", "slot win reels");
    assert(slots.prize === "777 PTS", "slot prize");
  } else {
    assert(slots.reels.join("") !== "777", "losing slots showed 777");
    assert(slots.prize === "", "losing slot prize");
  }
  if (match.won) {
    matchWins++;
    assert(match.player.some((value) => match.winning.includes(value)), "match win has no shared symbol");
    assert(match.prizePoints > 0, "match points");
  } else {
    assert(match.player.every((value) => !match.winning.includes(value)), "losing match shared a symbol");
  }
}

assert(bingoWins > 40 && bingoWins < 160, "bingo win rate " + bingoWins);
assert(slotWins > 40 && slotWins < 160, "slot win rate " + slotWins);
assert(matchWins > 40 && matchWins < 160, "match win rate " + matchWins);
console.log("scratch deals ok", { bingoWins, slotWins, matchWins });
