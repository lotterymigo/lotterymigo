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
      send_page_view: false,
      page_location: params.page_location,
      page_referrer: params.page_referrer,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    window.gtag("event", "page_view", params);
  }

  function sendPageView(id) {
    if (sent || cancelled || readChoice() !== "granted") return;
    if (scriptEl) {
      flushPageView(id);
      return;
    }
    scriptEl = document.createElement("script");
    scriptEl.async = true;
    scriptEl.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    scriptEl.setAttribute("data-lm-analytics", "gtag");
    scriptEl.addEventListener("load", function () {
      flushPageView(id);
    });
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
    disableCollection(id);
    clearQueue();
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
    dialog.className = "analytics-choice card";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-labelledby", "analytics-choice-title");
    dialog.setAttribute("aria-describedby", "analytics-choice-text");
    dialog.tabIndex = -1;
    var status = choice === "granted"
      ? " Analytics is currently allowed on this browser."
      : choice === "denied"
        ? " Analytics is currently off on this browser."
        : "";
    dialog.innerHTML =
      '<h2 id="analytics-choice-title">Optional analytics</h2>' +
      '<p id="analytics-choice-text">LotteryMigo can send anonymous page views to Google Analytics so we can see which public pages are used. This is separate from advertising. Allow loads that script and sends the page path and title, not the query string, your email, your sign-in, or saved picks. Reject leaves it unloaded. <a href="/privacy.html">Privacy</a></p>' +
      '<p class="analytics-status">' + status + '</p>' +
      '<div class="analytics-choice-actions">' +
        '<button type="button" class="btn btn-primary" id="analytics-allow">Allow analytics</button>' +
        '<button type="button" class="btn btn-quiet" id="analytics-reject">Reject analytics</button>' +
      '</div>';
    var anchor = document.querySelector(".compliance");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(dialog, anchor.nextSibling);
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
