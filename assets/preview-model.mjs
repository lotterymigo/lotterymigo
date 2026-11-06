/** Current-game pools for the design preview. Dates match the published matrix rules. */

export const WINDOWS = [
  { id: "current", label: "Current field" },
  { id: "last30", label: "Last 30" },
  { id: "last100", label: "Last 100" }
];

export const GAMES = {
  POWERBALL: {
    id: "POWERBALL",
    label: "Powerball",
    white: { name: "White balls", start: "2015-10-07", min: 1, max: 69, perDraw: 5 },
    bonus: { name: "Powerball", start: "2015-10-07", min: 1, max: 26, perDraw: 1 },
    whiteHref: (n) => "/powerball/number/" + n + ".html",
    bonusHref: (n) => "/powerball/powerball/" + n + ".html",
    note: "White balls and the Powerball are both counted from drawings on or after October 7, 2015, the current 5/69 and 1/26 field."
  },
  MEGAMILLIONS: {
    id: "MEGAMILLIONS",
    label: "Mega Millions",
    white: { name: "White balls", start: "2017-10-31", min: 1, max: 70, perDraw: 5 },
    bonus: { name: "Mega Ball", start: "2025-04-08", min: 1, max: 24, perDraw: 1 },
    whiteHref: (n) => "/megamillions/number/" + n + ".html",
    bonusHref: (n) => "/megamillions/megaball/" + n + ".html",
    note: "White balls use drawings on or after October 31, 2017. The Mega Ball uses drawings on or after April 8, 2025, when the field became 1 through 24. Mega Ball 25 is retired and is not in these counts."
  }
};

export function newestFirst(draws, start) {
  return (draws || [])
    .filter((draw) => draw && draw.date >= start)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function applyWindow(draws, windowId) {
  if (windowId === "last30") return draws.slice(0, 30);
  if (windowId === "last100") return draws.slice(0, 100);
  return draws;
}

function oncePerDraw(values) {
  const seen = new Set();
  const unique = [];
  values.forEach((value) => {
    const n = Number(value);
    if (!seen.has(n)) {
      seen.add(n);
      unique.push(n);
    }
  });
  return unique;
}

export function summarize(drawsNewestFirst, pool) {
  const draws = drawsNewestFirst || [];
  const total = draws.length;
  const rows = [];
  for (let n = pool.min; n <= pool.max; n += 1) {
    rows.push({
      n,
      count: 0,
      lastDate: null,
      gap: total,
      recent: []
    });
  }
  const byN = new Map(rows.map((row) => [row.n, row]));
  draws.forEach((draw, index) => {
    const nums = pool.perDraw === 1 ? [draw.special] : draw.whites;
    oncePerDraw(nums).forEach((n) => {
      const row = byN.get(n);
      if (!row) return;
      row.count += 1;
      if (!row.lastDate) {
        row.lastDate = draw.date;
        row.gap = index;
      }
      if (row.recent.length < 8) {
        row.recent.push({
          date: draw.date,
          whites: (draw.whites || []).slice(),
          special: draw.special
        });
      }
    });
  });
  return {
    total,
    newest: total ? draws[0].date : "",
    oldest: total ? draws[total - 1].date : "",
    requested: total,
    rows
  };
}

export function poolView(gameDraws, game, poolName, windowId) {
  const pool = game[poolName];
  const field = newestFirst(gameDraws, pool.start);
  const windowed = applyWindow(field, windowId);
  const summary = summarize(windowed, pool);
  summary.available = field.length;
  summary.windowId = windowId;
  summary.capped = windowId === "last30" || windowId === "last100";
  summary.requested = windowId === "last30" ? 30 : windowId === "last100" ? 100 : field.length;
  return summary;
}

export function sortRows(rows, key, direction) {
  const dir = direction === "asc" ? 1 : -1;
  return rows.slice().sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return a.n - b.n;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return a.n - b.n;
  });
}

export function leader(rows, key) {
  if (!rows.length) return null;
  return sortRows(rows, key, "desc")[0];
}

export function tableCaption(gameLabel, poolName) {
  if (gameLabel === poolName) return poolName + " in the selected window";
  return gameLabel + " " + poolName + " in the selected window";
}
