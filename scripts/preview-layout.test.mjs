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

function contrast(fg, bg) {
  const parse = (c) => c.match(/\d+/g).slice(0, 3).map(Number);
  const lin = (v) => { const n = v / 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; };
  const L = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  const a = L(parse(fg));
  const b = L(parse(bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (!rel || rel.endsWith("/")) rel += "index.html";
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
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + server.address().port;
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});

try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(origin + "/preview/dashboard.html", { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.body.textContent.includes("128 of 1429"));
  await page.addStyleTag({ content: "html{scroll-behavior:auto !important}" });

  const inactive = await page.evaluate(() => {
    const btn = [...document.querySelectorAll(".pool-btn")].find((el) => el.textContent === "Powerball");
    const cs = getComputedStyle(btn);
    return { color: cs.color, bg: cs.backgroundColor, h: btn.getBoundingClientRect().height };
  });
  const ratio = contrast(inactive.color, inactive.bg);
  assert(ratio >= 4.5, "inactive Powerball pool button contrast is " + ratio.toFixed(2) + ":1");
  assert(inactive.h >= 44, "pool button height is " + inactive.h);

  await page.evaluate(() => [...document.querySelectorAll(".pool-btn")].find((el) => el.textContent === "Powerball").focus());
  const focused = await page.evaluate(() => {
    const btn = document.activeElement.getBoundingClientRect();
    const nav = document.querySelector(".nav").getBoundingClientRect();
    return { top: btn.top, navBottom: nav.bottom, label: document.activeElement.textContent };
  });
  assert(focused.top >= focused.navBottom - 1, "focused pool button clears the nav (" + Math.round(focused.top) + " vs " + Math.round(focused.navBottom) + ")");

  const point = await page.evaluate(() => {
    const btn = document.activeElement.getBoundingClientRect();
    return { x: btn.left + btn.width / 2, y: btn.top + btn.height / 2 };
  });
  await page.mouse.click(point.x, point.y);
  const pressed = await page.evaluate(() => [...document.querySelectorAll(".pool-btn")].find((el) => el.textContent === "Powerball").getAttribute("aria-pressed"));
  assert(pressed === "true", "ordinary click activates the pool button that was under the old nav band");
  const caption = await page.$eval("caption", (el) => el.textContent);
  assert(caption === "Powerball in the selected window", "bonus caption is " + caption);

  const before = await page.$eval("tbody tr td", (el) => el.textContent);
  const ball = await page.evaluateHandle(() => document.querySelector(".float-ball"));
  const start = await page.evaluate((el) => el.style.transform, ball);
  await ball.click();
  await ball.click();
  await new Promise((resolve) => setTimeout(resolve, 180));
  const moved = await page.evaluate((el) => el.style.transform, ball);
  assert(moved !== start, "clicking a decorative ball changes its position");
  assert(await page.$eval("tbody tr td", (el) => el.textContent) === before, "decorative click does not change the table");

  await page.evaluate(() => document.querySelector("#motion-toggle").click());
  assert(await page.evaluate(() => localStorage.getItem("lotterymigo_preview_motion")) === "off", "motion preference is saved as off");
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#motion-toggle");
  assert(await page.$eval("#motion-toggle", (el) => el.getAttribute("aria-pressed")) === "false", "reloaded page keeps moving balls off");

  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.evaluate(() => localStorage.setItem("lotterymigo_preview_motion", "on"));
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".float-ball");
  const still = await page.evaluate((el) => el.style.transform, await page.$(".float-ball"));
  await new Promise((resolve) => setTimeout(resolve, 400));
  const later = await page.evaluate((el) => el.style.transform, await page.$(".float-ball"));
  assert(still === later, "reduced motion keeps decorative balls still");
  assert(errors.length === 0, "no page errors");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  assert(!overflow, "no horizontal overflow at 1280");

  console.log(results.join("\n"));
  console.log("preview layout tests passed");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
