/* Optional GA4 page views for the public website.
   Nothing loads until the visitor chooses Allow.
   The app build removes this script. */
(function () {
  if (window.__lmAnalyticsBooted) return;
  window.__lmAnalyticsBooted = true;

  var STORAGE_KEY = "lotterymigo_analytics";

  function isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }

  function measurementId() {
    var config = window.LOTTERYMIGO_CONFIG || {};
    var firebase = config.firebase || {};
    var id = String(firebase.measurementId || "");
    return /^G-[A-Z0-9]+$/.test(id) ? id : "";
  }

  function readChoice() {
    try {
      var value = localStorage.getItem(STORAGE_KEY);
      return value === "granted" || value === "denied" ? value : "";
    } catch (err) {
      return "";
    }
  }

  function writeChoice(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (err) {}
  }

  function sanitizedReferrer() {
    if (!document.referrer) return "";
    try {
      var url = new URL(document.referrer);
      return url.origin + url.pathname;
    } catch (err) {
      return "";
    }
  }

  function pageViewParams() {
    return {
      page_title: document.title,
      page_path: location.pathname,
      page_location: location.origin + location.pathname,
      page_referrer: sanitizedReferrer()
    };
  }

  var sent = false;
  var cancelled = false;
  var scriptEl = null;

  function cleanUrl(value) {
    if (!value) return "";
    try {
      var url = new URL(String(value), location.origin);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "";
      return url.origin + url.pathname;
    } catch (err) {
      return "";
    }
  }

  function isCollectUrl(value) {
    return /google-analytics\.com|analytics\.google\.com|stats\.g\.doubleclick\.net|google\.com\/.*collect|googletagmanager\.com\/.*collect/i.test(String(value || ""));
  }

  function sanitizeParams(params) {
    if ((params.get("en") || "") === "view_search_results") return null;
    var keys = [];
    params.forEach(function (_value, key) { keys.push(key); });
    keys.forEach(function (key) {
      var value = params.get(key);
      if (!value) return;
      if (key === "dl" || key === "dr" || /link_url|form_destination|page_location|page_referrer/i.test(key)) {
        params.set(key, cleanUrl(value));
        return;
      }
      if (/search_term/i.test(key)) {
        params.delete(key);
        return;
      }
      if (/^https?:\/\//i.test(value)) params.set(key, cleanUrl(value));
    });
    return params;
  }

  function serializeParams(params) {
    return params.toString();
  }

  function payloadText(data) {
    if (data == null) return "";
    if (typeof data === "string") return data;
    if (typeof URLSearchParams !== "undefined" && data instanceof URLSearchParams) return data.toString();
    return null;
  }

  function sanitizeCollect(url, body) {
    var text = payloadText(body);
    if (text === null) return { block: true };
    var parsed = new URL(url, location.origin);
    var shared = sanitizeParams(parsed.searchParams);
    if (!shared) return { block: true };
    var lines = text.split(/\r?\n/).filter(function (line) { return line.length; });
    var kept = [];
    lines.forEach(function (line) {
      var params = sanitizeParams(new URLSearchParams(line));
      if (params) kept.push(serializeParams(params));
    });
    if (lines.length && !kept.length) return { block: true };
    parsed.search = shared.toString();
    return { block: false, url: parsed.toString(), body: kept.join("\n") };
  }

  function collectionAllowed() {
    var id = measurementId();
    return readChoice() === "granted" && !cancelled && !(id && window["ga-disable-" + id] === true);
  }

  function installSanitizer() {
    if (window.__lmAnalyticsSanitizer) return;
    window.__lmAnalyticsSanitizer = true;
    var beacon = navigator.sendBeacon;
    if (beacon) {
      navigator.sendBeacon = function (url, data) {
        if (!isCollectUrl(url)) return beacon.call(navigator, url, data);
        if (!collectionAllowed()) return true;
        var cleaned = sanitizeCollect(String(url), data);
        if (cleaned.block) return true;
        return beacon.call(navigator, cleaned.url, cleaned.body);
      };
    }
    var origFetch = window.fetch;
    if (origFetch) {
      window.fetch = function (input, init) {
        var url = typeof input === "string" ? input : (input && input.url);
        if (!isCollectUrl(url)) return origFetch.apply(this, arguments);
        if (!collectionAllowed()) return Promise.resolve(new Response(null, { status: 204 }));
        if (typeof input !== "string") return Promise.resolve(new Response(null, { status: 204 }));
        var rawBody = init ? init.body : undefined;
        var cleaned = sanitizeCollect(String(url), rawBody === undefined ? "" : rawBody);
        if (cleaned.block) return Promise.resolve(new Response(null, { status: 204 }));
        var nextInit = init ? Object.assign({}, init) : {};
        if (rawBody != null) nextInit.body = cleaned.body;
        return origFetch.call(this, cleaned.url, nextInit);
      };
    }
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__lmMethod = method;
      this.__lmUrl = url;
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
      if (!isCollectUrl(this.__lmUrl)) return origSend.apply(this, arguments);
      if (!collectionAllowed()) return;
      var cleaned = sanitizeCollect(String(this.__lmUrl), body === undefined ? "" : body);
      if (cleaned.block) return;
      origOpen.call(this, this.__lmMethod || "POST", cleaned.url);
      return origSend.call(this, cleaned.body);
    };
  }

  function gaCookieDomain() {
    var host = String(location.hostname || "").toLowerCase();
    if (host === "lotterymigo.com" || (host.length > 16 && host.slice(-16) === ".lotterymigo.com")) return "lotterymigo.com";
    return "auto";
  }

  function cookieExpiryDomains() {
    var host = location.hostname;
    var domains = [""];
    if (!host || host === "localhost") return domains;
    domains.push(host);
    if (host.indexOf(".") !== -1) domains.push("." + host);
    var parts = host.split(".");
    var i;
    for (i = 1; i < parts.length; i++) {
      var parent = parts.slice(i).join(".");
      if (parent.indexOf(".") === -1) break;
      domains.push(parent);
      domains.push("." + parent);
    }
    return domains;
  }

  function expireGaCookies() {
    var names = [];
    (document.cookie || "").split(";").forEach(function (part) {
      var name = part.split("=")[0].replace(/^\s+/, "");
      if (name === "_ga" || name.indexOf("_ga_") === 0) names.push(name);
    });
    var domains = cookieExpiryDomains();
    names.forEach(function (name) {
      var expiry = name + "=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
      domains.forEach(function (domain) {
        document.cookie = domain ? expiry + "; domain=" + domain : expiry;
      });
    });
  }

  function disableCollection(id) {
    if (id) window["ga-disable-" + id] = true;
  }

  function clearQueue() {
    if (window.dataLayer && window.dataLayer.length) window.dataLayer.length = 0;
  }

  function flushPageView(id) {
    if (sent || cancelled || readChoice() !== "granted" || window["ga-disable-" + id]) return;
    sent = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    var params = pageViewParams();
    window.gtag("js", new Date());
    window.gtag("config", id, {
      page_location: params.page_location,
      page_referrer: params.page_referrer,
      cookie_domain: gaCookieDomain(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  }

  function sendPageView(id) {
    if (cancelled || readChoice() !== "granted") return;
    installSanitizer();
    var firstScript = !scriptEl;
    flushPageView(id);
    if (!firstScript) return;
    scriptEl = document.createElement("script");
    scriptEl.async = true;
    scriptEl.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    scriptEl.setAttribute("data-lm-analytics", "gtag");
    document.head.appendChild(scriptEl);
  }

  function applyGranted() {
    var id = measurementId();
    if (!id || readChoice() !== "granted") return;
    cancelled = false;
    window["ga-disable-" + id] = false;
    sendPageView(id);
  }

  function applyDenied() {
    var id = measurementId();
    cancelled = true;
    sent = false;
    disableCollection(id);
    clearQueue();
    expireGaCookies();
  }

  var dialog = null;

  function hideDialog() {
    if (dialog && dialog.parentNode) dialog.parentNode.removeChild(dialog);
    dialog = null;
  }

  function showDialog() {
    if (dialog) {
      dialog.focus();
      return;
    }
    var choice = readChoice();
    dialog = document.createElement("div");
    dialog.className = "analytics-choice";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-labelledby", "analytics-choice-title");
    dialog.setAttribute("aria-describedby", "analytics-choice-text");
    dialog.tabIndex = -1;
    var status = choice === "granted" ? "Currently allowed." : choice === "denied" ? "Currently off." : "";
    dialog.innerHTML =
      '<h2 id="analytics-choice-title">Optional analytics</h2>' +
      '<p id="analytics-choice-text">May we use Google Analytics to understand which pages are used? It loads only if you allow it. You can change your choice anytime. <a href="/privacy.html">Privacy</a></p>' +
      (status ? '<p class="analytics-status">' + status + '</p>' : '') +
      '<div class="analytics-choice-actions">' +
        '<button type="button" class="btn btn-primary" id="analytics-allow">Allow analytics</button>' +
        '<button type="button" class="btn btn-quiet" id="analytics-reject">Reject analytics</button>' +
      '</div>';
    var header = document.querySelector(".site-header");
    var anchor = document.querySelector(".compliance");
    if (header && header.parentNode) header.parentNode.insertBefore(dialog, header.nextSibling);
    else if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(dialog, anchor.nextSibling);
    else document.body.insertBefore(dialog, document.body.firstChild);
    dialog.querySelector("#analytics-allow").addEventListener("click", function () {
      writeChoice("granted");
      hideDialog();
      applyGranted();
    });
    dialog.querySelector("#analytics-reject").addEventListener("click", function () {
      writeChoice("denied");
      hideDialog();
      applyDenied();
    });
    dialog.focus();
  }

  function mountManageButton() {
    if (document.getElementById("analytics-manage")) return;
    var footer = document.querySelector(".site-footer .wrap") || document.querySelector(".site-footer") || document.body;
    var holder = document.createElement("p");
    holder.className = "analytics-manage";
    var button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-quiet";
    button.id = "analytics-manage";
    button.textContent = "Analytics choices";
    button.addEventListener("click", showDialog);
    holder.appendChild(button);
    footer.appendChild(holder);
  }

  if (isNative() || !measurementId()) return;

  window.addEventListener("storage", function (event) {
    if (event.key !== STORAGE_KEY) return;
    if (event.newValue === "granted") applyGranted();
    else applyDenied();
  });

  function start() {
    mountManageButton();
    var choice = readChoice();
    if (choice === "granted") applyGranted();
    else if (choice === "denied") applyDenied();
    else showDialog();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
