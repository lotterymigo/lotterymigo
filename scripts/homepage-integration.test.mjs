import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
function assert(cond, message) {
  if (!cond) throw new Error(message);
  results.push("ok " + message);
}

const archive = JSON.parse(await readFile(path.join(root, "data/draws.json"), "utf8"));
const older = structuredClone(archive);
for (const key of ["POWERBALL", "MEGAMILLIONS"]) {
  const newest = older.games[key].draws.map((draw) => draw.date).sort().at(-1);
  older.games[key].draws = older.games[key].draws.filter((draw) => draw.date < newest);
  older.games[key].latestDrawDate = older.games[key].draws.map((draw) => draw.date).sort().at(-1);
}
const fullNewest = archive.games.POWERBALL.draws.map((draw) => draw.date).sort().at(-1);
const olderNewest = older.games.POWERBALL.draws.map((draw) => draw.date).sort().at(-1);

function startServer(drawBody) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      if (!rel || rel.endsWith("/")) rel += "index.html";
      if (drawBody && rel === "data/draws.json") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(drawBody);
        return;
      }
      const file = path.resolve(root, rel);
      if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
      const body = await readFile(file);
      const ext = path.extname(file);
      const types = { ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".html": "text/html", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
      res.writeHead(200, { "content-type": types[ext] || "text/plain" });
      res.end(body);
    } catch {
      if (!res.headersSent) { res.writeHead(404); res.end("missing"); }
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const server = await startServer();
const origin = "http://127.0.0.1:" + server.address().port;
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});

try {
  const home = await browser.newPage();
  const draws = [];
  home.on("request", (req) => { if (req.url().includes("/data/draws.json")) draws.push(req.url()); });
  await home.evaluateOnNewDocument(() => {
    localStorage.setItem("lotterymigo_font_px", "24");
    localStorage.setItem("lotterymigo_contrast", "on");
    localStorage.setItem("lotterymigo_motion", "off");
  });
  await home.setViewport({ width: 1280, height: 900 });
  await home.goto(origin + "/", { waitUntil: "domcontentloaded" });
  await home.waitForFunction(() => document.body.textContent.includes("128 of"));
  const saved = await home.evaluate(() => ({
    font: getComputedStyle(document.documentElement).getPropertyValue("--lm-font").trim(),
    contrast: document.documentElement.classList.contains("lm-contrast"),
    motion: document.documentElement.classList.contains("lm-motion-off"),
    pressed: document.getElementById("motion-toggle").getAttribute("aria-pressed"),
    smaller: !!document.getElementById("lm-font-down"),
    display: !!document.getElementById("lm-display-toggle"),
    h1InMain: !!document.querySelector("main h1")
  }));
  assert(saved.font === "24px", "saved text size is applied on the homepage");
  assert(saved.contrast, "saved high contrast is applied on the homepage");
  assert(saved.smaller && saved.display, "homepage has the text-size and Display controls");
  assert(saved.motion && saved.pressed === "false", "saved site motion off stops the homepage balls");
  assert(saved.h1InMain, "the homepage H1 is inside main");
  const frozen = await home.$eval(".float-ball", (el) => el.style.transform);
  await new Promise((resolve) => setTimeout(resolve, 280));
  assert(await home.$eval(".float-ball", (el) => el.style.transform) === frozen, "balls do not drift while site motion is off");

  await home.click("#lm-display-toggle");
  await home.click("#lm-motion-toggle");
  assert(await home.evaluate(() => localStorage.getItem("lotterymigo_motion")) === "on", "the Display control turns site motion on");
  await home.click("#motion-toggle");
  assert(await home.evaluate(() => localStorage.getItem("lotterymigo_motion") === "off" && document.getElementById("lm-motion-toggle").getAttribute("aria-pressed") === "false"), "the hero control uses the same site motion setting");

  const other = await browser.newPage();
  await other.goto(origin + "/about.html", { waitUntil: "domcontentloaded" });
  const about = await other.evaluate(() => ({
    top: !!document.querySelector("header .header-top"),
    nav: !!document.querySelector("header .header-bar > .nav"),
    font: !!document.getElementById("lm-font-down")
  }));
  assert(about.top && about.nav && about.font, "other pages keep the standard header and Display controls");
  await other.close();

  const second = await browser.newPage();
  await second.goto(origin + "/", { waitUntil: "domcontentloaded" });
  await second.waitForFunction(() => typeof window.lmSyncMotion === "function");
  await home.evaluate(() => localStorage.setItem("lotterymigo_motion", "off"));
  await second.waitForFunction(() => document.getElementById("motion-toggle").getAttribute("aria-pressed") === "false");
  assert(true, "another tab stops its balls when site motion is turned off");
  await second.close();

  await home.click("#game-mm");
  await home.waitForFunction(() => document.getElementById("history-special-header").textContent.includes("Mega"));
  const synced = await home.evaluate(() => ({
    note: document.getElementById("window-note").textContent,
    label: document.getElementById("history-count-label").textContent,
    heat: document.getElementById("heatmap-blurb").textContent,
    history: document.getElementById("history-blurb").textContent
  }));
  const whiteCount = (synced.note.match(/White balls: ([\d,]+)/) || [])[1];
  assert(whiteCount && synced.label.includes(whiteCount) && synced.heat.includes(whiteCount) && synced.history.startsWith("Mega Millions"), "Mega Millions dashboard, history, and heatmap use the same archive (" + whiteCount + ")");
  assert(draws.length === 1, "the website fetches draws.json once (" + draws.length + ")");

  await home.setViewport({ width: 390, height: 844 });
  await home.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const menu = await home.$(".nav-menu-btn");
  assert(menu, "the phone header has a Menu button");
  await menu.click();
  const account = await home.evaluate(() => {
    const link = [...document.querySelectorAll("header .nav a")].find((el) => el.textContent.trim() === "Account");
    const box = link.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + 8, box.top + box.height / 2);
    return { open: document.querySelector(".nav-menu-btn").getAttribute("aria-expanded"), width: box.width, bottom: box.bottom, hit: hit === link || (link && link.contains(hit)) };
  });
  assert(account.open === "true" && account.hit && account.width > 40 && account.bottom < 844, "a tap opens Account inside the phone menu");
  await home.keyboard.press("Escape");
  assert(await home.$eval(".nav-menu-btn", (el) => el.getAttribute("aria-expanded")) === "false", "Escape closes the phone menu");
  await home.focus(".nav-menu-btn");
  await home.keyboard.press("Enter");
  assert(await home.$eval(".nav-menu-btn", (el) => el.getAttribute("aria-expanded")) === "true", "the keyboard opens the phone menu");

  const shiftContext = await browser.createBrowserContext();
  const shift = await shiftContext.newPage();
  await shift.evaluateOnNewDocument(() => {
    localStorage.setItem("lotterymigo_analytics", "denied");
    localStorage.setItem("lotterymigo_ads_notice", "ok");
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await shift.setRequestInterception(true);
  shift.on("request", (req) => {
    if (/fonts\.(gstatic|googleapis)\.com/.test(req.url())) setTimeout(() => req.continue().catch(() => {}), 450);
    else req.continue().catch(() => {});
  });
  await shift.setViewport({ width: 1280, height: 900 });
  await shift.goto(origin + "/", { waitUntil: "load" });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const coldDesktop = await shift.evaluate(() => window.__cls);
  await shift.evaluate(() => { window.__cls = 0; });
  await shift.setViewport({ width: 390, height: 844 });
  await shift.goto(origin + "/", { waitUntil: "load" });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const coldPhone = await shift.evaluate(() => window.__cls);
  assert(coldDesktop < 0.05, "uncached desktop layout shift is " + coldDesktop.toFixed(4));
  assert(coldPhone < 0.08, "uncached phone layout shift is " + coldPhone.toFixed(4));
  await shift.close();

  const nativeServer = await startServer(JSON.stringify(older));
  const nativeOrigin = "http://127.0.0.1:" + nativeServer.address().port;
  const native = await browser.newPage();
  await native.evaluateOnNewDocument(() => {
    const mark = () => { if (window.Capacitor) window.Capacitor.isNativePlatform = () => true; };
    mark();
    const timer = setInterval(mark, 20);
    setTimeout(() => clearInterval(timer), 8000);
  });
  await native.setRequestInterception(true);
  native.on("request", (req) => {
    if (req.url() === "https://www.lotterymigo.com/data/draws.json") {
      req.respond({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(archive)
      }).catch(() => {});
    } else req.continue().catch(() => {});
  });
  await native.goto(nativeOrigin + "/", { waitUntil: "domcontentloaded" });
  await native.waitForFunction((date) => {
    const snap = window.lmGetDrawAlertSnapshot && window.lmGetDrawAlertSnapshot();
    return snap && snap.source === "remote" && snap.powerball === date && document.getElementById("window-note").textContent.includes("2026");
  }, { timeout: 12000 }, fullNewest);
  const remoteAgree = await native.evaluate((date) => {
    const row = document.querySelector("#history-table-body tr td");
    return row && row.textContent.trim() === date;
  }, fullNewest);
  assert(remoteAgree, "native history and dashboard use the newer remote archive");
  await native.close();

  const offline = await browser.newPage();
  await offline.evaluateOnNewDocument(() => {
    const mark = () => { if (window.Capacitor) window.Capacitor.isNativePlatform = () => true; };
    mark();
    const timer = setInterval(mark, 20);
    setTimeout(() => clearInterval(timer), 8000);
  });
  await offline.setRequestInterception(true);
  offline.on("request", (req) => {
    if (req.url().includes("www.lotterymigo.com/data/draws.json")) req.abort().catch(() => {});
    else req.continue().catch(() => {});
  });
  await offline.goto(nativeOrigin + "/", { waitUntil: "domcontentloaded" });
  await offline.waitForFunction((date) => {
    const snap = window.lmGetDrawAlertSnapshot && window.lmGetDrawAlertSnapshot();
    const row = document.querySelector("#history-table-body tr td");
    return snap && snap.source === "bundled" && row && row.textContent.trim() === date;
  }, { timeout: 12000 }, olderNewest);
  assert(true, "native offline views stay on the bundled archive");
  await offline.close();
  await new Promise((resolve) => nativeServer.close(resolve));

  console.log(results.join("\n"));
  console.log("homepage integration tests passed");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
