import puppeteer from "/home/ubuntu/.npm/_npx/8003d8991b0d346b/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js";

const BASE = process.env.ANALYTICS_TEST_ORIGIN || "http://127.0.0.1:8772";
const ID = "G-YN21YZ62BC";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function instrument(page) {
  const hits = [];
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    if (/googletagmanager\.com\/gtag\/js|google-analytics\.com|analytics\.google\.com/.test(url)) {
      hits.push(url);
      if (url.includes("/gtag/js")) {
        req.respond({
          status: 200,
          contentType: "application/javascript",
          body: "window.__lmGtagJsLoads=(window.__lmGtagJsLoads||0)+1;"
        });
        return;
      }
      req.abort();
      return;
    }
    req.continue();
  });
  return hits;
}

async function pageViews(page) {
  return page.evaluate(() => {
    const layer = window.dataLayer || [];
    let count = 0;
    layer.forEach((entry) => {
      const list = Array.from(entry);
      if (list[0] === "event" && list[1] === "page_view") count += 1;
    });
    return count;
  });
}

async function choice(page) {
  return page.evaluate(() => localStorage.getItem("lotterymigo_analytics"));
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});

const page = await browser.newPage();
const hits = await instrument(page);
await page.goto(BASE + "/?email=person@example.com&pick=1-2-3", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector("#analytics-allow");
assert(hits.length === 0, "analytics requests fired before a choice");
assert(await choice(page) === null, "a choice was stored before the visitor picked one");
assert(await page.$("#analytics-reject"), "reject button missing");

const adsButton = await page.$(".ads-notice button");
if (adsButton) await adsButton.click();
assert(await page.evaluate(() => localStorage.getItem("lotterymigo_ads_notice")) === "ok", "ads notice was not dismissed");
assert(await choice(page) === null, "dismissing the advertising note was treated as analytics consent");
assert(hits.length === 0, "analytics requests fired after the advertising notice");

await page.click("#analytics-reject");
await page.waitForFunction(() => localStorage.getItem("lotterymigo_analytics") === "denied");
assert(hits.length === 0, "analytics requests fired after reject");
assert(!(await page.$("#analytics-allow")), "choice dialog stayed open after reject");
await page.reload({ waitUntil: "domcontentloaded" });
assert(await choice(page) === "denied", "reject was not saved");
assert(!(await page.$("#analytics-allow")), "dialog returned after a saved reject");
assert(hits.length === 0, "analytics requests fired on a later visit after reject");

await page.evaluate(() => localStorage.removeItem("lotterymigo_analytics"));
await page.goto(BASE + "/learn/index.html?token=secret", { waitUntil: "domcontentloaded" });
await page.waitForSelector("#analytics-allow");
const beforeAllow = hits.length;
await page.click("#analytics-allow");
await page.waitForFunction(() => (window.dataLayer || []).length > 0);
const views = await pageViews(page);
const params = await page.evaluate(() => {
  const layer = window.dataLayer || [];
  for (const entry of layer) {
    const list = Array.from(entry);
    if (list[0] === "event" && list[1] === "page_view") return list[2];
  }
  return null;
});
assert(views === 1, "expected one page_view after allow, got " + views);
assert(params && params.page_path === "/learn/index.html", "page_path was not the pathname");
assert(params.page_location === BASE.replace(/\/$/, "") + "/learn/index.html" || params.page_location.endsWith("/learn/index.html"), "page_location kept a query string: " + params.page_location);
assert(!JSON.stringify(params).includes("secret"), "query string was sent to analytics");
assert(!JSON.stringify(params).includes("@"), "an email-like value was sent to analytics");
const gtagLoads = hits.filter((url) => url.includes("/gtag/js")).length;
assert(gtagLoads === 1, "gtag.js loaded " + gtagLoads + " times");
assert(hits[hits.length - 1].includes("id=" + ID) || hits.some((url) => url.includes("id=" + ID)), "measurement id was not requested");
assert(hits.length - beforeAllow >= 1, "no analytics request after allow");

await page.click("#analytics-manage");
await page.waitForSelector("#analytics-allow");
await page.click("#analytics-allow");
assert(await pageViews(page) === 1, "allowing again sent a second page_view");
assert(hits.filter((url) => url.includes("/gtag/js")).length === 1, "gtag.js was added twice");

await page.click("#analytics-manage");
await page.waitForSelector("#analytics-reject");
const hitsBeforeRevoke = hits.length;
await page.click("#analytics-reject");
await page.waitForFunction(() => localStorage.getItem("lotterymigo_analytics") === "denied");
assert(await page.evaluate((id) => window["ga-disable-" + id] === true, ID), "revoke did not disable collection");
assert(hits.length === hitsBeforeRevoke, "revoke sent another analytics request");
await page.reload({ waitUntil: "domcontentloaded" });
assert(hits.filter((url) => url.includes("/gtag/js")).length === 1, "a revoked browser loaded gtag.js again");

const native = await browser.newPage();
const nativeHits = await instrument(native);
await native.evaluateOnNewDocument(() => {
  window.Capacitor = { isNativePlatform: function () { return true; } };
});
await native.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await new Promise((resolve) => setTimeout(resolve, 300));
assert(nativeHits.length === 0, "native shell loaded analytics");
assert(!(await native.$("#analytics-allow")), "native shell showed the analytics choice");
assert(!(await native.$("#analytics-manage")), "native shell showed analytics choices");

await browser.close();
console.log("analytics consent tests passed");
console.log("gtag requests intercepted:", hits.filter((url) => url.includes("/gtag/js")).length);
console.log("page_view events after opt-in: 1; before choice and after reject: 0");
