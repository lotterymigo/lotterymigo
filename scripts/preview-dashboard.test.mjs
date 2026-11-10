import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GAMES, newestFirst, poolView, sortRows, summarize, tableCaption } from "../assets/preview-model.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const archive = JSON.parse(await readFile(path.join(root, "data/draws.json"), "utf8"));
const html = await readFile(path.join(root, "preview/dashboard.html"), "utf8");
const home = await readFile(path.join(root, "index.html"), "utf8");
const results = [];

function assert(cond, message) {
  if (!cond) throw new Error(message);
  results.push("ok " + message);
}

function manualCount(draws, start, pick, pool) {
  return draws.filter((draw) => {
    if (draw.date < start) return false;
    return pool === "bonus" ? Number(draw.special) === pick : (draw.whites || []).map(Number).includes(pick);
  }).length;
}

const pb = archive.games.POWERBALL.draws;
const mm = archive.games.MEGAMILLIONS.draws;

const pbWhite21 = manualCount(pb, "2015-10-07", 21, "white");
const view = poolView(pb, GAMES.POWERBALL, "white", "current");
assert(view.rows.find((row) => row.n === 21).count === pbWhite21, "Powerball white 21 matches a direct count (" + pbWhite21 + ")");
assert(view.rows.find((row) => row.n === 21).count > 0, "Powerball white 21 appears in the current field");
assert(newestFirst(pb, "2015-10-07").every((draw) => draw.date >= "2015-10-07"), "Powerball window excludes drawings before 2015-10-07");
assert(newestFirst(pb, "2015-10-07").some((draw) => pb.some((raw) => raw.date < "2015-10-07")) || pb.some((raw) => raw.date < "2015-10-07"), "the archive still contains pre-2015 Powerball drawings");

const last30 = poolView(pb, GAMES.POWERBALL, "white", "last30");
assert(last30.total === Math.min(30, view.available), "last 30 uses the newest current-field drawings (" + last30.total + ")");
assert(last30.newest >= last30.oldest, "last 30 date range runs newest to oldest");

const mmBonus = poolView(mm, GAMES.MEGAMILLIONS, "bonus", "current");
assert(mmBonus.rows.length === 24, "current Mega Ball field is 1 through 24");
assert(mmBonus.oldest >= "2025-04-08", "Mega Ball counts start on 2025-04-08 (" + mmBonus.oldest + ")");
assert(!mmBonus.rows.some((row) => row.n === 25), "retired Mega Ball 25 is outside the current field");
const bonus12 = manualCount(mm, "2025-04-08", 12, "bonus");
assert(mmBonus.rows.find((row) => row.n === 12).count === bonus12, "Mega Ball 12 matches a direct count (" + bonus12 + ")");

const mmWhite = poolView(mm, GAMES.MEGAMILLIONS, "white", "current");
assert(mmWhite.oldest >= "2017-10-31", "Mega Millions white balls start on 2017-10-31");
assert(mmWhite.total !== mmBonus.total, "white and Mega Ball pools use different current fields (" + mmWhite.total + " vs " + mmBonus.total + ")");

const capped = poolView(mm, GAMES.MEGAMILLIONS, "bonus", "last100");
assert(capped.total === Math.min(100, mmBonus.available), "last 100 does not invent drawings (" + capped.total + " of " + mmBonus.available + ")");

const sorted = sortRows(view.rows, "gap", "desc");
assert(sorted[0].gap >= sorted[1].gap, "gap sort is descending");
assert(sorted[0].count === view.rows.find((row) => row.n === sorted[0].n).count, "sorted rows keep the counted frequency");

const empty = summarize([], GAMES.POWERBALL.white);
assert(empty.total === 0 && empty.rows[0].count === 0 && empty.rows[0].gap === 0, "an empty pool reports zero drawings and zero gap");

assert(html.includes('content="noindex, nofollow"'), "preview is noindex");
assert(!html.includes("adsbygoogle") && !html.includes("ca-pub-"), "preview does not load AdSense");
assert(!html.includes("analytics.js") && !html.includes("gtag") && !html.includes("G-YN21YZ62BC"), "preview does not load Analytics");
assert(html.includes("preview-dashboard.js") && html.includes("preview-dashboard.css"), "preview uses its own assets");
assert(html.includes('href="/#section-account"') && html.includes('href="/#section-heatmap"'), "preview links to the account and the chart");
assert(tableCaption("Powerball", "Powerball") === "Powerball in the selected window", "caption does not repeat Powerball");
assert(tableCaption("Powerball", "White balls") === "Powerball White balls in the selected window", "white-ball caption keeps the game name");
assert(tableCaption("Mega Millions", "Mega Ball") === "Mega Millions Mega Ball in the selected window", "Mega Ball caption keeps both names");
assert(html.includes("float-bounds") && html.includes("motion-toggle"), "preview reserves a decorative ball strip and a motion control");
assert(!html.includes("analytics.js") && !html.includes("gtag"), "preview still has no analytics loader");
assert(!home.includes("noindex"), "homepage stays indexable");
assert(home.includes("https://www.lotterymigo.com/"), "homepage canonical host is present");
assert(home.includes("Powerball and Mega Millions Statistics: Hot, Most Common and Overdue Numbers"), "homepage keeps the production H1");
assert(home.includes('content="mT-NZ9gT1zrEcQ4GcRFZ3N1Oo6bRwOL4S5UIhm1CUYk"'), "homepage keeps the Search Console meta");
assert((home.match(/ca-pub-4173178569579798/g) || []).length === 1, "homepage has one AdSense client id");
assert((home.match(/assets\/analytics\.js/g) || []).length === 1, "homepage loads analytics.js once");
assert(home.includes('id="section-stats"') && home.includes('id="section-account"') && home.includes('id="btn-export-csv"'), "homepage keeps stats, account, and CSV hooks");
assert(home.includes('id="key-facts"') && home.includes('id="home-dataset"'), "homepage keeps key facts and dataset schema");
assert(home.includes("float-bounds") && home.includes("Moving balls"), "homepage includes the decorative balls");
assert(!home.includes("Design preview"), "homepage does not use the preview label");

console.log(results.join("\n"));
console.log("preview dashboard tests passed");
console.log("Powerball white 21:", pbWhite21, "drawings since 2015-10-07");
console.log("Mega Millions white drawings:", mmWhite.total, mmWhite.oldest, "to", mmWhite.newest);
console.log("Mega Ball drawings:", mmBonus.total, mmBonus.oldest, "to", mmBonus.newest);
