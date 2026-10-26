/* Reading size, contrast, and motion. Choices stay in localStorage on this device. */
(function () {
  var FONT_STEPS = [18, 20, 22, 24, 28];
  var FONT_KEY = "lotterymigo_font_px";
  var CONTRAST_KEY = "lotterymigo_contrast";
  var MOTION_KEY = "lotterymigo_motion";

  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (err) {}
  }

  function readFont() {
    var n = parseInt(safeGet(FONT_KEY) || "18", 10);
    return FONT_STEPS.indexOf(n) === -1 ? 18 : n;
  }

  function systemReduce() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function motionAllowed() {
    var stored = safeGet(MOTION_KEY);
    if (stored === "on") return true;
    if (stored === "off") return false;
    return !systemReduce();
  }

  function applyFont(px) {
    document.documentElement.style.setProperty("--lm-font", px + "px");
    safeSet(FONT_KEY, String(px));
    var label = document.getElementById("lm-font-label");
    if (label) label.textContent = "Text size " + px;
    var down = document.getElementById("lm-font-down");
    var up = document.getElementById("lm-font-up");
    if (down) down.disabled = px <= FONT_STEPS[0];
    if (up) up.disabled = px >= FONT_STEPS[FONT_STEPS.length - 1];
  }

  function applyContrast(on) {
    document.documentElement.classList.toggle("lm-contrast", !!on);
    var btn = document.getElementById("lm-contrast-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? "High contrast on" : "High contrast";
    }
    if (typeof window.lmRefreshChart === "function") window.lmRefreshChart();
  }

  function applyMotion() {
    var allowed = motionAllowed();
    window.lmMotionAllowed = allowed;
    document.documentElement.classList.toggle("lm-motion-off", !allowed);
    document.documentElement.classList.toggle("lm-motion-on", allowed && systemReduce());
    var btn = document.getElementById("lm-motion-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", allowed ? "true" : "false");
      btn.textContent = allowed ? "Moving balls on" : "Moving balls off";
    }
    if (typeof window.lmSyncMotion === "function") window.lmSyncMotion();
  }

  applyFont(readFont());
  applyContrast(safeGet(CONTRAST_KEY) === "on");
  applyMotion();

  function mount() {
    var main = document.querySelector("main");
    if (main) {
      if (!main.id) main.id = "main";
      main.setAttribute("tabindex", "-1");
    }

    if (!document.querySelector(".skip-link")) {
      var skip = document.createElement("a");
      skip.className = "skip-link";
      skip.href = "#main";
      skip.textContent = "Skip to main content";
      document.body.insertBefore(skip, document.body.firstChild);
    }

    if (!document.getElementById("lm-a11y-bar")) {
      var bar = document.createElement("div");
      bar.id = "lm-a11y-bar";
      bar.className = "lm-a11y-bar";
      bar.setAttribute("role", "region");
      bar.setAttribute("aria-label", "Reading settings");
      bar.innerHTML =
        '<button type="button" id="lm-font-down" aria-label="Smaller text">A−</button>' +
        '<span id="lm-font-label">Text size 18</span>' +
        '<button type="button" id="lm-font-up" aria-label="Larger text">A+</button>' +
        '<button type="button" id="lm-contrast-toggle" aria-pressed="false">High contrast</button>' +
        '<button type="button" id="lm-motion-toggle" aria-pressed="true">Moving balls on</button>' +
        '<a href="#main">Skip to content</a>' +
        '<p class="lm-a11y-note">No sound plays by itself. This site has no confetti. Moving balls can be turned off.</p>';
      var header = document.querySelector("header");
      if (header) header.insertAdjacentElement("afterend", bar);
      else document.body.insertBefore(bar, document.body.children[1] || null);
    }

    document.getElementById("lm-font-down").addEventListener("click", function () {
      var current = readFont();
      var index = Math.max(0, FONT_STEPS.indexOf(current) - 1);
      applyFont(FONT_STEPS[index]);
      if (typeof window.lmRefreshChart === "function") window.lmRefreshChart();
    });
    document.getElementById("lm-font-up").addEventListener("click", function () {
      var current = readFont();
      var index = Math.min(FONT_STEPS.length - 1, FONT_STEPS.indexOf(current) + 1);
      applyFont(FONT_STEPS[index]);
      if (typeof window.lmRefreshChart === "function") window.lmRefreshChart();
    });
    document.getElementById("lm-contrast-toggle").addEventListener("click", function () {
      var on = safeGet(CONTRAST_KEY) !== "on";
      safeSet(CONTRAST_KEY, on ? "on" : "off");
      applyContrast(on);
    });
    document.getElementById("lm-motion-toggle").addEventListener("click", function () {
      safeSet(MOTION_KEY, motionAllowed() ? "off" : "on");
      applyMotion();
    });

    applyFont(readFont());
    applyContrast(safeGet(CONTRAST_KEY) === "on");
    applyMotion();
    buildToc();
  }

  function buildToc() {
    var article = document.querySelector("article.prose");
    if (!article || article.querySelector(".toc")) return;
    var heads = article.querySelectorAll("h2");
    if (heads.length < 3) return;
    var nav = document.createElement("nav");
    nav.className = "toc";
    nav.setAttribute("aria-label", "On this page");
    var label = document.createElement("strong");
    label.textContent = "On this page";
    var list = document.createElement("ol");
    Array.prototype.forEach.call(heads, function (heading, index) {
      if (!heading.id) {
        var slug = heading.textContent.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        heading.id = slug || "section-" + (index + 1);
      }
      if (document.getElementById(heading.id) !== heading) heading.id = heading.id + "-" + (index + 1);
      var item = document.createElement("li");
      var link = document.createElement("a");
      link.href = "#" + heading.id;
      link.textContent = heading.textContent;
      item.appendChild(link);
      list.appendChild(item);
    });
    nav.appendChild(label);
    nav.appendChild(list);
    article.insertBefore(nav, article.firstChild);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motionQuery.addEventListener) {
    motionQuery.addEventListener("change", function () {
      if (safeGet(MOTION_KEY) !== "on" && safeGet(MOTION_KEY) !== "off") applyMotion();
    });
  }
})();
