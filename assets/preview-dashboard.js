import { GAMES, poolView, sortRows, leader } from "./preview-model.mjs";

const stage = document.getElementById("stage");
const note = document.getElementById("window-note");
const live = document.getElementById("live");
const sourceLine = document.getElementById("source-line");
const dialog = document.getElementById("detail");
const state = { game: "POWERBALL", windowId: "current", pool: "white", sortKey: "count", sortDir: "desc" };
let archive = null;
let lastFocus = null;

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(iso) {
  if (!iso) return "Not drawn";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return months[Number(parts[1]) - 1] + " " + Number(parts[2]) + ", " + parts[0];
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function showError(message) {
  clear(stage);
  const box = el("p", "error", message + " The live results pages are still available.");
  const link = document.createElement("a");
  link.href = "/powerball/results.html";
  link.textContent = " Powerball results";
  box.appendChild(link);
  stage.appendChild(box);
  note.textContent = "The draw archive did not load.";
}

function currentGame() {
  return GAMES[state.game];
}

function viewFor(poolName) {
  const game = currentGame();
  return poolView(archive.games[state.game].draws, game, poolName, state.windowId);
}

function windowLabel(view, pool) {
  const noun = view.total === 1 ? "drawing" : "drawings";
  if (!view.total) return pool.name + " have no drawings in this field.";
  const capped = view.capped && view.total < view.requested
    ? " Requested " + view.requested + "; " + view.available + " exist since " + formatDate(pool.start) + "."
    : "";
  return pool.name + ": " + view.total + " " + noun + ", " + formatDate(view.oldest) + " to " + formatDate(view.newest) + "." + capped;
}

function render() {
  const game = currentGame();
  document.body.classList.toggle("is-pb", state.game === "POWERBALL");
  document.body.classList.toggle("is-mm", state.game === "MEGAMILLIONS");
  const white = viewFor("white");
  const bonus = viewFor("bonus");
  const active = state.pool === "bonus" ? bonus : white;
  const pool = state.pool === "bonus" ? game.bonus : game.white;
  const rows = sortRows(active.rows, state.sortKey, state.sortDir);
  const hot = leader(white.rows, "count");
  const cold = leader(white.rows, "gap");
  const bonusHot = leader(bonus.rows, "count");
  const maxCount = rows.reduce((max, row) => Math.max(max, row.count), 0) || 1;

  note.textContent = windowLabel(white, game.white) + " " + windowLabel(bonus, game.bonus);
  live.textContent = game.label + ". " + note.textContent;

  clear(stage);
  stage.appendChild(metrics(game, white, bonus, hot, cold, bonusHot));
  stage.appendChild(poolSwitch(game));
  stage.appendChild(grid(rows, state.pool, game));
  stage.appendChild(bars(rows.slice(0, 8), maxCount, pool.name));
  stage.appendChild(table(rows, maxCount, game, pool));
}

function metrics(game, white, bonus, hot, cold, bonusHot) {
  const wrap = el("div", "bento");
  wrap.appendChild(card("card card-lead", "Most frequent white ball", hot ? String(hot.n) : "—", hot ? hot.count + " of " + white.total + " drawings" : "No drawings", game.label));
  wrap.appendChild(card("card card-count", "Drawings in the white-ball window", String(white.total), formatDate(white.oldest) + " – " + formatDate(white.newest)));
  wrap.appendChild(card("card card-range", "Bonus-ball window", String(bonus.total), game.bonus.name + ", " + formatDate(bonus.oldest) + " – " + formatDate(bonus.newest)));
  wrap.appendChild(card("card card-overdue", "Longest white-ball wait", cold ? String(cold.gap) : "—", cold ? "drawings since ball " + cold.n + (cold.count ? ", last " + formatDate(cold.lastDate) : ". Not drawn in this window.") : "No drawings"));
  wrap.appendChild(card("card card-bonus", "Most frequent " + game.bonus.name, bonusHot ? String(bonusHot.n) : "—", bonusHot ? bonusHot.count + " of " + bonus.total + " drawings" : "No drawings"));
  return wrap;
}

function card(className, title, value, detail) {
  const node = el("article", className);
  node.appendChild(el("h2", "", title));
  node.appendChild(el("span", "num", value));
  node.appendChild(el("p", "meta", detail));
  return node;
}

function poolSwitch(game) {
  const wrap = el("div", "pool-switch");
  wrap.appendChild(poolButton("white", game.white.name));
  wrap.appendChild(poolButton("bonus", game.bonus.name));
  return wrap;
}

function poolButton(pool, label) {
  const button = el("button", "pool-btn" + (state.pool === pool ? " is-on" : ""), label);
  button.type = "button";
  button.setAttribute("aria-pressed", state.pool === pool ? "true" : "false");
  button.addEventListener("click", () => {
    state.pool = pool;
    render();
  });
  return button;
}

function grid(rows, pool, game) {
  const wrap = el("div", "grid" + (pool === "bonus" ? " bonus-grid" : ""));
  const top = leader(rows, "count");
  rows.slice().sort((a, b) => a.n - b.n).forEach((row) => {
    const button = el("button", "ball" + (top && row.n === top.n && row.count ? " is-top" : ""));
    button.type = "button";
    button.appendChild(el("span", "ball-n", String(row.n)));
    button.appendChild(el("span", "ball-c", String(row.count)));
    const poolName = pool === "bonus" ? game.bonus.name : "White ball";
    button.setAttribute("aria-label", poolName + " " + row.n + ", drawn in " + row.count + " drawings. Open details.");
    button.addEventListener("click", () => openDetail(pool, row));
    wrap.appendChild(button);
  });
  return wrap;
}

function bars(rows, maxCount, poolName) {
  const section = el("section", "viz");
  const head = el("div", "viz-head");
  head.appendChild(el("h2", "", "Highest in the current sort"));
  head.appendChild(el("p", "meta", poolName + ". The same order is in the table."));
  section.appendChild(head);
  const list = el("div", "bars");
  rows.forEach((row) => {
    const line = el("div", "bar-row");
    line.appendChild(el("span", "", String(row.n)));
    const track = el("div", "bar-track");
    const fill = el("span", "bar-fill");
    fill.style.width = Math.round((row.count / maxCount) * 100) + "%";
    track.appendChild(fill);
    track.setAttribute("role", "img");
    track.setAttribute("aria-label", "Ball " + row.n + ", " + row.count + " drawings");
    line.appendChild(track);
    line.appendChild(el("span", "", String(row.count)));
    list.appendChild(line);
  });
  section.appendChild(list);
  return section;
}

function table(rows, maxCount, game, pool) {
  const scroll = el("div", "table-scroll");
  const tableNode = document.createElement("table");
  const caption = el("caption", "", game.label + " " + pool.name + " in the selected window");
  tableNode.appendChild(caption);
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.appendChild(sortHeader("n", "Ball"));
  headRow.appendChild(sortHeader("count", "Times drawn"));
  headRow.appendChild(document.createElement("th")).textContent = "Share of drawings";
  headRow.appendChild(sortHeader("gap", "Gap"));
  headRow.appendChild(sortHeader("lastDate", "Last drawn"));
  headRow.appendChild(document.createElement("th")).textContent = "Bar";
  thead.appendChild(headRow);
  tableNode.appendChild(thead);
  const body = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const share = rows.length && viewTotal(row) ? Math.round((row.count / activeTotal()) * 1000) / 10 + "%" : "0%";
    tr.appendChild(cell(String(row.n)));
    tr.appendChild(cell(String(row.count)));
    tr.appendChild(cell(share));
    tr.appendChild(cell(String(row.gap)));
    tr.appendChild(cell(formatDate(row.lastDate)));
    const barCell = document.createElement("td");
    const bar = el("span", "row-bar");
    bar.style.width = Math.max(4, Math.round((row.count / maxCount) * 88)) + "px";
    bar.setAttribute("aria-hidden", "true");
    barCell.appendChild(bar);
    tr.appendChild(barCell);
    body.appendChild(tr);
  });
  tableNode.appendChild(body);
  scroll.appendChild(tableNode);
  return scroll;

  function viewTotal() {
    return viewFor(state.pool).total || 1;
  }
  function activeTotal() {
    return viewFor(state.pool).total;
  }
  function cell(text) {
    return el("td", "", text);
  }
}

function sortHeader(key, label) {
  const th = document.createElement("th");
  const pressed = state.sortKey === key;
  th.setAttribute("aria-sort", pressed ? (state.sortDir === "asc" ? "ascending" : "descending") : "none");
  const button = el("button", "", label + (pressed ? (state.sortDir === "asc" ? " ascending" : " descending") : ""));
  button.type = "button";
  button.addEventListener("click", () => {
    if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    else {
      state.sortKey = key;
      state.sortDir = key === "n" ? "asc" : "desc";
    }
    render();
  });
  th.appendChild(button);
  return th;
}

function openDetail(pool, row) {
  const game = currentGame();
  const spec = pool === "bonus" ? game.bonus : game.white;
  const singular = pool === "bonus" ? game.bonus.name : "White ball";
  lastFocus = document.activeElement;
  document.getElementById("detail-kicker").textContent = game.label + " · " + spec.name;
  document.getElementById("detail-title").textContent = singular + " " + row.n;
  const facts = document.getElementById("detail-facts");
  clear(facts);
  [["Times drawn", String(row.count)], ["Gap", String(row.gap) + " drawings"], ["Last drawn", formatDate(row.lastDate)], ["Field", spec.min + "–" + spec.max]].forEach((pair) => {
    const wrap = document.createElement("div");
    wrap.appendChild(el("dt", "", pair[0]));
    wrap.appendChild(el("dd", "", pair[1]));
    facts.appendChild(wrap);
  });
  const list = document.getElementById("detail-recent");
  clear(list);
  const empty = document.getElementById("detail-empty");
  empty.hidden = row.recent.length > 0;
  row.recent.forEach((draw) => {
    const item = document.createElement("li");
    item.appendChild(el("span", "", formatDate(draw.date) + " "));
    item.appendChild(el("span", "", draw.whites.map((n) => String(n)).join(" · ") + "  +  " + draw.special));
    if ((pool !== "bonus" && draw.whites.map(Number).includes(row.n)) || (pool === "bonus" && Number(draw.special) === row.n)) {
      item.classList.add("hit");
    }
    list.appendChild(item);
  });
  const link = document.getElementById("detail-link");
  link.href = pool === "bonus" ? game.bonusHref(row.n) : game.whiteHref(row.n);
  link.textContent = "Open the full " + singular.toLowerCase() + " " + row.n + " page";
  dialog.showModal();
}

document.getElementById("detail-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener("close", () => {
  if (lastFocus && lastFocus.focus) lastFocus.focus();
});

document.querySelectorAll("[data-game]").forEach((button) => {
  button.addEventListener("click", () => {
    state.game = button.getAttribute("data-game");
    document.querySelectorAll("[data-game]").forEach((item) => item.classList.toggle("is-on", item === button));
    render();
  });
});
document.querySelectorAll("[data-window]").forEach((button) => {
  button.addEventListener("click", () => {
    state.windowId = button.getAttribute("data-window");
    document.querySelectorAll("[data-window]").forEach((item) => item.classList.toggle("is-on", item === button));
    render();
  });
});

async function boot() {
  try {
    const response = await fetch("/data/draws.json");
    if (!response.ok) throw new Error("The draw archive returned status " + response.status + ".");
    archive = await response.json();
    if (!archive.games || !archive.games.POWERBALL || !archive.games.MEGAMILLIONS) {
      throw new Error("The archive does not include both games.");
    }
    const fetched = archive.fetchedAt ? formatDate(String(archive.fetchedAt).slice(0, 10)) : "the file date";
    sourceLine.textContent = "Counts use " + (archive.source || "the NY Open Data archive") + ", fetched " + fetched + ". Powerball dataset " + archive.games.POWERBALL.datasetId + ". Mega Millions dataset " + archive.games.MEGAMILLIONS.datasetId + ".";
    render();
  } catch (err) {
    showError(err && err.message ? err.message : "The draw archive could not be read.");
  }
}

boot();
