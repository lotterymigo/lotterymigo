import puppeteer from "/home/ubuntu/.npm/_npx/8003d8991b0d346b/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js";

const BASE = process.env.ANALYTICS_TEST_ORIGIN || "http://127.0.0.1:8772";
const ID = "G-YN21YZ62BC";
const results = [];

function assert(cond, message) {
  if (!cond) {
    results.push("FAIL " + message);
    throw new Error(message);
  }
  results.push("ok " + message);
}

const GTAG_STUB = `
window.__lmGtagJsLoads=(window.__lmGtagJsLoads||0)+1;
window.__lmGtagCalls=window.__lmGtagCalls||[];
var disabled=window["ga-disable-${ID}"]===true;
function emit(list){
  if(window["ga-disable-${ID}"]===true) return;
  window.__lmGtagCalls.push(list);
  if(list[0]==="config" && list[2] && list[2].send_page_view!==false){
    fetch("https://www.google-analytics.com/g/collect?en=page_view&auto=1&dl="+encodeURIComponent(location.href));
  }
  if(list[0]==="event" && list[1]==="page_view"){
    var p=list[2]||{};
    fetch("https://www.google-analytics.com/g/collect?en=page_view&dl="+encodeURIComponent(p.page_location||"")+"&dr="+encodeURIComponent(p.page_referrer||""));
  }
}
window.gtag=function(){ emit(Array.from(arguments)); };
if(!disabled){
  (window.dataLayer||[]).forEach(function(entry){ emit(Array.from(entry)); });
}
`;

function isAnalytics(url) {
  return /googletagmanager\.com\/gtag\/js|google-analytics\.com|analytics\.google\.com/.test(url);
}

async function instrument(page, hold) {
  const hits = [];
  const waiting = [];
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    if (!isAnalytics(url)) {
      req.continue();
      return;
    }
    hits.push(url);
    if (url.includes("/gtag/js")) {
      if (hold.gtag) {
        waiting.push(req);
        return;
      }
      req.respond({ status: 200, contentType: "application/javascript", body: GTAG_STUB });
      return;
    }
    req.abort();
  });
  return {
    hits,
    release() {
      hold.gtag = false;
      while (waiting.length) {
        waiting.shift().respond({ status: 200, contentType: "application/javascript", body: GTAG_STUB });
      }
    }
  };
}

async function calls(page) {
  return page.evaluate(() => (window.__lmGtagCalls || []).map((entry) => Array.from(entry)));
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});

const hold = { gtag: false };
const page = await browser.newPage();
const net = await instrument(page, hold);

await page.goto(BASE + "/?email=person@example.com&pick=1-2-3", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector("#analytics-allow");
assert(net.hits.length === 0, "no analytics request before a choice");
assert(await page.evaluate(() => localStorage.getItem("lotterymigo_analytics")) === null, "no analytics choice stored before a click");

const adsButton = await page.$(".ads-notice button");
if (adsButton) await adsButton.click();
assert(await page.evaluate(() => localStorage.getItem("lotterymigo_ads_notice")) === "ok", "advertising notice can still be dismissed");
assert(await page.evaluate(() => localStorage.getItem("lotterymigo_analytics")) === null, "advertising dismissal is not analytics consent");
assert(net.hits.length === 0, "no analytics request after the advertising notice");

await page.click("#analytics-reject");
await page.waitForFunction(() => localStorage.getItem("lotterymigo_analytics") === "denied");
assert(net.hits.length === 0, "reject does not load analytics");
await page.reload({ waitUntil: "domcontentloaded" });
assert(await page.evaluate(() => localStorage.getItem("lotterymigo_analytics")) === "denied", "reject is saved");
assert(!(await page.$("#analytics-allow")), "saved reject does not show the initial dialog");
assert(net.hits.length === 0, "a later load after reject makes no analytics request");

hold.gtag = true;
await page.evaluate(() => localStorage.removeItem("lotterymigo_analytics"));
await page.goto(BASE + "/powerball/number/21.html?token=secret&email=person@example.com", {
  waitUntil: "domcontentloaded",
  referer: "https://example.com/from?email=person@example.com&pick=9"
});
await page.waitForSelector("#analytics-allow");
await page.click("#analytics-allow");
await page.waitForFunction(() => document.querySelectorAll('script[data-lm-analytics="gtag"]').length === 1);
assert(net.hits.some((url) => url.includes("/gtag/js?id=" + ID)), "allow starts one gtag.js request for the existing id");
assert(!net.hits.some((url) => url.includes("/g/collect") || url.includes("google-analytics.com/g/collect")), "no collect while gtag.js is still loading");
await page.click("#analytics-manage");
await page.waitForSelector("#analytics-reject");
await page.click("#analytics-reject");
await page.waitForFunction((id) => localStorage.getItem("lotterymigo_analytics") === "denied" && window["ga-disable-" + id] === true, {}, ID);
net.release();
await new Promise((resolve) => setTimeout(resolve, 400));
const collectDuringRace = net.hits.filter((url) => url.includes("collect"));
assert(collectDuringRace.length === 0, "revoke during gtag.js load produced no collect request");
const queued = await page.evaluate(() => {
  const layer = window.dataLayer || [];
  return layer.some((entry) => Array.from(entry)[1] === "page_view");
});
assert(queued === false, "revoke during gtag.js load left no queued page_view");

const afterRevoke = net.hits.length;
await page.goto(BASE + "/learn/index.html?token=still-secret", { waitUntil: "domcontentloaded" });
await new Promise((resolve) => setTimeout(resolve, 300));
assert(net.hits.length === afterRevoke, "a later page after revoke made no analytics request");
assert(!(await page.$("#analytics-allow")), "a later page after revoke did not reopen the initial dialog");

await page.evaluate(() => localStorage.removeItem("lotterymigo_analytics"));
await page.goto(BASE + "/privacy.html?email=person@example.com", { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  const link = document.createElement("a");
  link.id = "leak-link";
  link.href = "/megamillions/number/10.html?email=person@example.com";
  link.textContent = "Open number";
  document.body.appendChild(link);
});
await Promise.all([
  page.waitForNavigation({ waitUntil: "domcontentloaded" }),
  page.click("#leak-link")
]);
await page.waitForSelector("#analytics-allow");
const beforeAllow = net.hits.length;
await page.click("#analytics-allow");
await page.waitForFunction(() => (window.__lmGtagCalls || []).length > 0);
const seen = await calls(page);
const configs = seen.filter((entry) => entry[0] === "config");
const views = seen.filter((entry) => entry[0] === "event" && entry[1] === "page_view");
assert(configs.length === 1, "config ran " + configs.length + " times");
assert(configs[0][2] && configs[0][2].send_page_view === false, "config did not disable the automatic page_view");
assert(views.length === 1, "explicit page_view count was " + views.length);
const params = views[0][2];
assert(params.page_path === "/megamillions/number/10.html", "page_path was " + params.page_path);
assert(params.page_location === "http://127.0.0.1:8772/megamillions/number/10.html", "page_location is path only");
assert(params.page_referrer === "http://127.0.0.1:8772/privacy.html", "page_referrer drops the query string");
assert(!JSON.stringify(seen).includes("person@example.com"), "analytics commands omit the email query");
assert(!JSON.stringify(seen).includes("token="), "analytics commands omit token queries");
const collectUrls = net.hits.slice(beforeAllow).filter((url) => url.includes("collect"));
assert(collectUrls.length === 1, "one collect request after allow");
assert(!collectUrls.some((url) => url.includes("auto=1")), "no automatic page_view collect");
assert(!collectUrls.some((url) => url.includes("email") || url.includes("secret")), "collect URL has no query secret");
assert(net.hits.filter((url) => url.includes("/gtag/js")).length === 2, "gtag.js was requested only for the two allow attempts");

await page.click("#analytics-manage");
await page.waitForSelector("#analytics-allow");
await page.click("#analytics-allow");
assert((await calls(page)).filter((entry) => entry[0] === "event" && entry[1] === "page_view").length === 1, "re-allowing on the same page did not send another page_view");

const native = await browser.newPage();
const nativeHold = { gtag: false };
const nativeNet = await instrument(native, nativeHold);
await native.evaluateOnNewDocument(() => {
  window.Capacitor = { isNativePlatform: function () { return true; } };
});
await native.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await new Promise((resolve) => setTimeout(resolve, 300));
assert(nativeNet.hits.length === 0, "native shell made no analytics request");
assert(!(await native.$("#analytics-manage")), "native shell showed no analytics choices");

await browser.close();
console.log(results.join("\n"));
console.log("analytics consent tests passed");
console.log("collect URLs after the successful opt-in:", collectUrls.length);
