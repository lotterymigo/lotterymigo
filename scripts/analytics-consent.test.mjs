import { createServer } from "node:http";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ID = "G-YN21YZ62BC";
const QUERY = "email=test-only&q=test-only";
const results = [];

function assert(cond, message) {
  if (!cond) {
    results.push("FAIL " + message);
    throw new Error(message);
  }
  results.push("ok " + message);
}

async function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {}
  }
  throw new Error("Set CHROME_PATH to a Chrome or Chromium binary");
}

function contentType(file) {
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".webmanifest")) return "application/manifest+json";
  return "text/html; charset=utf-8";
}

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      if (!rel || rel.endsWith("/")) rel += "index.html";
      const file = path.resolve(ROOT, rel);
      if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      try {
        const body = await readFile(file);
        res.writeHead(200, { "content-type": contentType(file) });
        res.end(body);
      } catch {
        const missing = await readFile(path.join(ROOT, "404.html"));
        res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
        res.end(missing);
      }
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        server,
        origin: "http://127.0.0.1:" + port,
        close: () => new Promise((done) => server.close(() => done()))
      });
    });
  });
}

function isLibrary(url) {
  return url.includes("googletagmanager.com/gtag/js");
}

function isCollect(url) {
  return /google-analytics\.com|analytics\.google\.com|stats\.g\.doubleclick\.net|\/g\/collect/i.test(url);
}

async function watch(page, gate) {
  const collects = [];
  await page.evaluateOnNewDocument(() => {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = () => Promise.reject(new Error("disabled"));
    }
  });
  const client = await page.createCDPSession();
  await client.send("Fetch.enable", {
    patterns: [
      { urlPattern: "*google-analytics.com*", requestStage: "Request" },
      { urlPattern: "*analytics.google.com*", requestStage: "Request" },
      { urlPattern: "*stats.g.doubleclick.net*", requestStage: "Request" },
      { urlPattern: "*google.com/g/collect*", requestStage: "Request" },
      { urlPattern: "*googletagmanager.com/gtag/js*", requestStage: "Request" }
    ]
  });
  client.on("Fetch.requestPaused", (event) => {
    const url = event.request.url;
    const done = (method, params) => client.send(method, params).catch(() => {});
    if (isCollect(url)) {
      collects.push({ url, post: event.request.postData || "" });
      done("Fetch.fulfillRequest", {
        requestId: event.requestId,
        responseCode: 204,
        responseHeaders: [{ name: "Content-Type", value: "text/plain" }]
      });
      return;
    }
    if (gate && gate.hold && isLibrary(url)) {
      gate.pending.push({ client, requestId: event.requestId });
      return;
    }
    done("Fetch.continueRequest", { requestId: event.requestId });
  });
  return collects;
}

function release(gate) {
  gate.hold = false;
  while (gate.pending.length) {
    const item = gate.pending.shift();
    item.client.send("Fetch.continueRequest", { requestId: item.requestId }).catch(() => {});
  }
}

function decodeCollect(entry) {
  const parsed = new URL(entry.url);
  const lines = entry.post.split(/\r?\n/).filter(Boolean);
  if (!lines.length) lines.push("");
  return lines.map((line) => {
    const params = new URLSearchParams(line);
    const event = { en: parsed.searchParams.get("en") || "" };
    parsed.searchParams.forEach((value, key) => { event[key] = value; });
    params.forEach((value, key) => { event[key] = value; });
    if (!event.en && params.get("en")) event.en = params.get("en");
    return event;
  });
}

function eventsOf(collects) {
  return collects.flatMap(decodeCollect);
}

function assertClean(events, label) {
  events.forEach((event) => {
    ["dl", "dr"].forEach((key) => {
      if (!event[key]) return;
      if (event[key].includes("?") || event[key].includes("email") || event[key].includes("test-only")) {
        assert(false, label + " " + key + " was not limited to the path: " + event[key]);
      }
    });
    Object.entries(event).forEach(([key, value]) => {
      if (/search_term/i.test(key) || String(value).includes("email=test-only") || String(value).includes("q=test-only")) {
        assert(false, label + " leaked the test query in " + key + "=" + value);
      }
    });
  });
  assert(true, label + " collection payloads omit the query, email, and search term");
}

async function allow(page) {
  await page.waitForSelector("#analytics-allow", { timeout: 10000 });
  await page.evaluate(() => document.querySelector("#analytics-allow").click());
}

async function rejectFromFooter(page) {
  await page.waitForSelector("#analytics-manage", { timeout: 10000 });
  await page.evaluate(() => document.querySelector("#analytics-manage").click());
  await page.waitForSelector("#analytics-reject");
  await page.evaluate(() => document.querySelector("#analytics-reject").click());
  await page.waitForFunction(() => localStorage.getItem("lotterymigo_analytics") === "denied");
}

const server = await startServer();
const browser = await puppeteer.launch({
  executablePath: await chromePath(),
  headless: true,
  protocolTimeout: 25000,
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});

try {
  const gate = { hold: true, pending: [] };
  const slow = await browser.newPage();
  const slowHits = await watch(slow, gate);
  await slow.goto(server.origin + "/?" + QUERY, { waitUntil: "domcontentloaded" });
  await allow(slow);
  await slow.waitForFunction(() => document.querySelector('script[data-lm-analytics="gtag"]'));
  assert(slowHits.length === 0, "no collection request while gtag.js is held");
  await rejectFromFooter(slow);
  assert(await slow.evaluate((id) => window["ga-disable-" + id] === true, ID), "revoke sets ga-disable before gtag.js runs");
  release(gate);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  assert(slowHits.length === 0, "no collection request after revoke while gtag.js was still loading");

  const page = await browser.newPage();
  const hits = await watch(page, null);
  await page.goto(server.origin + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.removeItem("lotterymigo_analytics"));
  await page.goto(server.origin + "/privacy.html?" + QUERY, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    const link = document.createElement("a");
    link.id = "leak-link";
    link.href = "/powerball/number/21.html?" + "email=test-only&q=test-only";
    link.textContent = "Open number";
    document.body.appendChild(link);
  });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page.evaluate(() => document.querySelector("#leak-link").click())
  ]);
  assert(hits.length === 0, "number page sent no analytics before opt-in");
  await allow(page);
  await page.waitForFunction(() => performance.getEntriesByType("resource").some((entry) => entry.name.includes("gtag/js")));
  await new Promise((resolve) => setTimeout(resolve, 2500));
  await page.evaluate(() => {
    const link = document.createElement("a");
    link.href = "https://example.com/leave?email=test-only&q=test-only";
    link.textContent = "Leave";
    link.id = "outbound";
    document.body.appendChild(link);
    const form = document.createElement("form");
    form.action = "/search?q=test-only";
    const input = document.createElement("input");
    input.name = "q";
    input.value = "test-only";
    form.appendChild(input);
    document.body.appendChild(form);
    input.focus();
    link.addEventListener("click", (event) => event.preventDefault());
    form.addEventListener("submit", (event) => event.preventDefault());
    link.click();
    if (form.requestSubmit) form.requestSubmit();
    window.scrollTo(0, document.body.scrollHeight);
    window.dispatchEvent(new Event("pagehide"));
  });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const byHost = new Map();
  hits.forEach((hit) => {
    const host = new URL(hit.url).host;
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(hit);
  });
  assert(byHost.size > 0, "real gtag.js produced an intercepted collection request");
  let sampleView = null;
  byHost.forEach((hostHits, host) => {
    const events = eventsOf(hostHits);
    const pageViews = events.filter((event) => event.en === "page_view");
    assert(pageViews.length === 1, host + " page_view count was " + pageViews.length + " (" + events.map((event) => event.en).join(", ") + ")");
    assertClean(events, host);
    sampleView = pageViews[0];
  });
  assert(sampleView.dl === server.origin + "/powerball/number/21.html", "page_view dl was " + sampleView.dl);
  assert(sampleView.dr === server.origin + "/privacy.html", "page_view dr was " + sampleView.dr);

  const blockedMark = hits.length;
  await page.evaluate(() => {
    navigator.sendBeacon("https://www.google-analytics.com/g/collect?v=2&tid=G-YN21YZ62BC&en=page_view", new Blob(["en=page_view&dl=http://127.0.0.1/?email=test-only"]));
    navigator.sendBeacon("https://www.google-analytics.com/g/collect?v=2&en=view_search_results", "en=view_search_results&search_term=test-only&dl=http://127.0.0.1/?q=test-only");
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://www.google-analytics.com/g/collect?v=2&en=page_view");
    xhr.send(new Blob(["en=page_view&email=test-only"]));
    navigator.sendBeacon("/ping-non-analytics", "hello");
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert(hits.length === blockedMark, "blocked analytics payloads were not sent");

  const cookiesBefore = await page.evaluate(() => document.cookie);
  assert(/(?:^|; )_ga=|_ga_/.test(cookiesBefore), "real gtag.js set a _ga cookie: " + cookiesBefore);
  const hitCount = hits.length;
  await rejectFromFooter(page);
  const cookiesAfter = await page.evaluate(() => document.cookie);
  assert(!/(?:^|; )_ga=|_ga_/.test(cookiesAfter), "revoke expired _ga and _ga_* cookies");
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event("pagehide"));
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert(hits.length === hitCount, "current page sent no further hit after revoke");

  const laterMark = hits.length;
  await page.goto(server.origin + "/learn/index.html?" + QUERY, { waitUntil: "domcontentloaded" });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert(hits.length === laterMark, "later page sent no collection after revoke");
  assert(!(await page.$("#analytics-allow")), "later page kept the saved reject");

  const context = await browser.createBrowserContext();
  const tabA = await context.newPage();
  const tabB = await context.newPage();
  const hitsA = await watch(tabA, null);
  const hitsB = await watch(tabB, null);
  await tabA.goto(server.origin + "/?" + QUERY, { waitUntil: "domcontentloaded" });
  await allow(tabA);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  assert(eventsOf(hitsA).some((event) => event.en === "page_view"), "first tab sent a page view");
  await tabB.bringToFront();
  await tabB.goto(server.origin + "/faq.html?" + QUERY, { waitUntil: "domcontentloaded" });
  await new Promise((resolve) => setTimeout(resolve, 2500));
  if (!eventsOf(hitsB).some((event) => event.en === "page_view")) {
    await tabB.evaluate(() => {
      window.gtag("event", "page_view", {
        page_location: location.origin + location.pathname,
        page_referrer: ""
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  const tabBEvents = eventsOf(hitsB);
  assert(tabBEvents.some((event) => event.en === "page_view"), "second tab sent a page view while allowed");
  assertClean(tabBEvents, "two-tab");
  assert(tabBEvents.every((event) => !event.dl || event.dl === server.origin + "/faq.html"), "second tab document URL was " + tabBEvents.map((event) => event.dl).join(" "));
  assertClean(eventsOf(hitsA), "first-tab");
  const markB = hitsB.length;
  await rejectFromFooter(tabA);
  await tabB.waitForFunction((id) => window["ga-disable-" + id] === true, {}, ID);
  await tabB.evaluate(() => {
    if (window.gtag) {
      window.gtag("event", "page_view", { page_location: location.origin + location.pathname });
    }
    window.scrollTo(0, document.body.scrollHeight);
    window.dispatchEvent(new Event("pagehide"));
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert(hitsB.length === markB, "other open tab sent nothing after revoke");
  await context.close();

  const missing = await browser.newPage();
  const missingHits = await watch(missing, null);
  await missing.goto(server.origin + "/", { waitUntil: "domcontentloaded" });
  await missing.evaluate(() => localStorage.removeItem("lotterymigo_analytics"));
  await missing.goto(server.origin + "/not-a-real-lottery-path?" + QUERY, { waitUntil: "domcontentloaded" });
  await allow(missing);
  await new Promise((resolve) => setTimeout(resolve, 2500));
  if (!eventsOf(missingHits).some((event) => event.en === "page_view")) {
    await missing.evaluate(() => {
      window.gtag("event", "page_view", {
        page_location: location.origin + location.pathname,
        page_referrer: ""
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  const missingEvents = eventsOf(missingHits);
  assert(missingEvents.some((event) => event.en === "page_view"), "404 path sent a page view");
  assert(missingEvents.every((event) => !event.dl || event.dl === server.origin + "/not-a-real-lottery-path"), "404 document URL was the path alone");
  assertClean(missingEvents, "404");

  const mapped = await puppeteer.launch({
    executablePath: await chromePath(),
    headless: true,
    protocolTimeout: 25000,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-features=HttpsUpgrades,HttpsFirstBalancedModeAutoEnable",
      "--host-resolver-rules=MAP www.lotterymigo.com 127.0.0.1, MAP lotterymigo.com 127.0.0.1"
    ]
  });
  try {
    const hostPage = await mapped.newPage();
    const hostHits = await watch(hostPage, null);
    const site = "http://www.lotterymigo.com:" + new URL(server.origin).port + "/";
    await hostPage.goto(site, { waitUntil: "domcontentloaded", timeout: 20000 });
    await allow(hostPage);
    await hostPage.waitForFunction(() => document.cookie.indexOf("_ga") !== -1, { timeout: 8000 });
    const client = await hostPage.createCDPSession();
    const before = (await client.send("Network.getAllCookies")).cookies.filter((cookie) => cookie.name === "_ga" || cookie.name.startsWith("_ga_"));
    const domains = before.map((cookie) => cookie.name + "@" + cookie.domain).join(", ");
    assert(before.some((cookie) => cookie.domain === ".lotterymigo.com" || cookie.domain === "lotterymigo.com"), "GA cookie domain included the parent: " + domains);
    assert(hostHits.every((hit) => hit.url.indexOf("google-analytics.com") !== -1 || hit.url.indexOf("google.com/g/collect") !== -1 || hit.url.indexOf("analytics.google.com") !== -1), "collection stayed on an intercepted analytics host");
    await rejectFromFooter(hostPage);
    const after = (await client.send("Network.getAllCookies")).cookies.filter((cookie) => cookie.name === "_ga" || cookie.name.startsWith("_ga_"));
    assert(after.length === 0, after.length ? "parent-domain GA cookies remained after revoke: " + after.map((cookie) => cookie.name + "@" + cookie.domain).join(", ") : "revoke expired the .lotterymigo.com GA cookies");
    const visible = await hostPage.evaluate(() => document.cookie);
    assert(visible.indexOf("_ga") === -1, visible.indexOf("_ga") === -1 ? "www document.cookie had no GA cookie after revoke" : "www document.cookie still listed a GA cookie: " + visible);
  } finally {
    await mapped.close();
  }

  console.log(results.join("\n"));
  console.log("analytics consent tests passed");
  console.log("intercepted collection requests:", hits.length + slowHits.length + hitsA.length + hitsB.length + missingHits.length);
} finally {
  await browser.close();
  await server.close();
}
