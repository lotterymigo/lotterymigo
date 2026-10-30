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

  var displayWrap = null;
  var displayBtn = null;
  var displayPanel = null;
  var menuBtn = null;
  var siteNav = null;

  function resultLinks(nav) {
    var found = { pb: null, mm: null };
    var links = nav.querySelectorAll("a");
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      if (href.indexOf("powerball/results") !== -1) found.pb = links[i];
      if (href.indexOf("megamillions/results") !== -1) found.mm = links[i];
    }
    return found;
  }

  function unwrapResults(nav) {
    var details = nav.querySelector(".nav-results");
    if (!details) return;
    var links = resultLinks(nav);
    if (links.pb) nav.insertBefore(links.pb, details);
    if (links.mm) nav.insertBefore(links.mm, details);
    details.remove();
  }

  function groupResults(nav) {
    if (nav.querySelector(".nav-results")) return;
    var links = resultLinks(nav);
    if (!links.pb || !links.mm) return;
    var details = document.createElement("details");
    details.className = "nav-results";
    var summary = document.createElement("summary");
    summary.textContent = "Results";
    var panel = document.createElement("div");
    panel.className = "nav-results-panel";
    var first = links.pb.compareDocumentPosition(links.mm) & Node.DOCUMENT_POSITION_FOLLOWING ? links.pb : links.mm;
    nav.insertBefore(details, first);
    panel.appendChild(links.pb);
    panel.appendChild(links.mm);
    details.appendChild(summary);
    details.appendChild(panel);
  }

  function setMenuOpen(open) {
    if (!siteNav || !menuBtn) return;
    siteNav.classList.toggle("is-open", !!open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function setDisplayOpen(open) {
    if (!displayPanel || !displayBtn) return;
    displayPanel.hidden = !open;
    displayBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function navIsClipped(nav, bar) {
    var items = nav.querySelectorAll(":scope > a, :scope > .nav-results");
    var limit = nav.getBoundingClientRect().right;
    for (var i = 0; i < items.length; i++) {
      var box = items[i].getBoundingClientRect();
      if (box.width < 1) continue;
      if (box.right > limit + 1) return true;
    }
    if (nav.scrollWidth > nav.clientWidth + 2) return true;
    var actions = bar.querySelector(".header-actions") || bar.querySelector(".tip-chip");
    if (actions) {
      var navBox = nav.getBoundingClientRect();
      var actionBox = actions.getBoundingClientRect();
      if (navBox.right > actionBox.left + 1) return true;
    }
    return false;
  }

  function layoutNav() {
    var bar = document.querySelector("header .header-bar");
    if (!bar || !siteNav) return;
    setMenuOpen(false);
    var details = siteNav.querySelector(".nav-results");
    if (details) details.open = false;

    if (window.innerWidth < 1100) {
      unwrapResults(siteNav);
      bar.classList.add("nav-collapsed");
      bar.classList.remove("nav-fit");
      return;
    }

    groupResults(siteNav);
    bar.classList.remove("nav-collapsed");
    bar.classList.remove("nav-fit");
    if (navIsClipped(siteNav, bar)) {
      unwrapResults(siteNav);
      bar.classList.add("nav-collapsed");
      return;
    }
    bar.classList.add("nav-fit");
  }

  function enhanceHeader() {
    var header = document.querySelector("header");
    var top = document.querySelector("header .header-top");
    var nav = document.querySelector("header .header-bar > .nav");
    if (!header || !top || !nav || nav.dataset.enhanced) return;
    nav.dataset.enhanced = "1";
    if (!nav.id) nav.id = "site-nav";
    siteNav = nav;

    var actions = document.createElement("div");
    actions.className = "header-actions";
    var tip = top.querySelector(".tip-chip");
    if (tip) actions.appendChild(tip);

    displayWrap = document.createElement("div");
    displayWrap.className = "display-menu";
    displayBtn = document.createElement("button");
    displayBtn.type = "button";
    displayBtn.className = "display-toggle";
    displayBtn.id = "lm-display-toggle";
    displayBtn.setAttribute("aria-expanded", "false");
    displayBtn.setAttribute("aria-controls", "lm-a11y-bar");
    displayBtn.textContent = "Display";
    displayPanel = document.createElement("div");
    displayPanel.id = "lm-a11y-bar";
    displayPanel.className = "lm-a11y-bar";
    displayPanel.hidden = true;
    displayPanel.setAttribute("role", "region");
    displayPanel.setAttribute("aria-label", "Reading settings");
    displayPanel.innerHTML =
      '<div class="lm-a11y-controls">' +
      '<button type="button" id="lm-font-down" aria-label="Smaller text">A−</button>' +
      '<span id="lm-font-label">Text size 18</span>' +
      '<button type="button" id="lm-font-up" aria-label="Larger text">A+</button>' +
      '<button type="button" id="lm-contrast-toggle" aria-pressed="false">High contrast</button>' +
      '<button type="button" id="lm-motion-toggle" aria-pressed="true">Moving balls on</button>' +
      "</div>" +
      '<p class="lm-a11y-note">No sound plays by itself. This site has no confetti. Moving balls can be turned off.</p>';
    displayWrap.appendChild(displayBtn);
    displayWrap.appendChild(displayPanel);
    actions.insertBefore(displayWrap, actions.firstChild);

    menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "nav-menu-btn";
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-controls", nav.id);
    menuBtn.textContent = "Menu";
    actions.appendChild(menuBtn);
    top.appendChild(actions);

    displayBtn.addEventListener("click", function () {
      setDisplayOpen(displayBtn.getAttribute("aria-expanded") !== "true");
      setMenuOpen(false);
    });
    menuBtn.addEventListener("click", function () {
      setMenuOpen(menuBtn.getAttribute("aria-expanded") !== "true");
      setDisplayOpen(false);
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenuOpen(false);
    });
  }

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
      skip.textContent = "Skip to content";
      document.body.insertBefore(skip, document.body.firstChild);
    }

    enhanceHeader();
    if (!document.getElementById("lm-font-down")) {
      layoutNav();
      enhanceFaq();
      markNumberPage();
      buildToc();
      armMotion();
      return;
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
    layoutNav();
    enhanceFaq();
    markNumberPage();
    buildToc();
    armMotion();
  }

  document.addEventListener("click", function (event) {
    if (displayWrap && !displayWrap.contains(event.target)) setDisplayOpen(false);
    if (menuBtn && siteNav && !menuBtn.contains(event.target) && !siteNav.contains(event.target)) setMenuOpen(false);
    var openResults = document.querySelectorAll("header .nav-results[open]");
    for (var i = 0; i < openResults.length; i++) {
      if (!openResults[i].contains(event.target)) openResults[i].open = false;
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    setDisplayOpen(false);
    setMenuOpen(false);
    var openResults = document.querySelectorAll("header .nav-results[open]");
    for (var i = 0; i < openResults.length; i++) openResults[i].open = false;
  });

  var layoutFrame = 0;
  window.addEventListener("resize", function () {
    if (layoutFrame) cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(layoutNav);
  });
  window.addEventListener("load", function () {
    layoutNav();
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(layoutNav);
  }

  function enhanceFaq() {
    if (!/faq\.html$/.test(location.pathname)) return;
    var article = document.querySelector("article.prose");
    if (!article || article.querySelector(".faq-item")) return;
    var nodes = Array.prototype.slice.call(article.children);
    var current = null;
    nodes.forEach(function (node) {
      if (node.tagName === "H2") {
        current = document.createElement("details");
        current.className = "faq-item";
        var summary = document.createElement("summary");
        article.insertBefore(current, node);
        summary.appendChild(node);
        current.appendChild(summary);
        var body = document.createElement("div");
        body.className = "faq-body";
        current.appendChild(body);
      } else if (current) {
        current.querySelector(".faq-body").appendChild(node);
      }
    });
    var first = article.querySelector(".faq-item");
    if (first) first.open = true;
  }

  function markNumberPage() {
    var h1 = document.querySelector("main h1");
    if (!h1 || document.querySelector(".number-mark")) return;
    var path = location.pathname;
    var numbered = /\/number\/|\/powerball\/powerball\/|\/megaball\//.test(path);
    if (!numbered) return;
    var match = (h1.textContent || "").match(/(\d+)\s*$/);
    if (!match) return;
    var ball = document.createElement("span");
    ball.className = "ball number-mark";
    ball.setAttribute("aria-hidden", "true");
    ball.textContent = match[1];
    if (/\/powerball\/powerball\//.test(path)) ball.classList.add("ball-pb");
    if (/\/megaball\//.test(path)) ball.classList.add("ball-mm");
    h1.parentNode.insertBefore(ball, h1);
  }

  function armMotion() {
    if (!motionAllowed()) return;
    var nodes = document.querySelectorAll(".hero-inner > *, main .card, .stat-grid .panel, .guide-list > li, .faq-item");
    if (!nodes.length || !("IntersectionObserver" in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14 });
    Array.prototype.forEach.call(nodes, function (node, index) {
      node.classList.add("lm-reveal");
      node.style.animationDelay = Math.min(index, 8) * 0.05 + "s";
      var rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.94 && rect.bottom > 0) node.classList.add("is-in");
      else observer.observe(node);
    });
    document.querySelectorAll(".stat-value").forEach(function (el) {
      var text = (el.textContent || "").trim();
      if (!/^\d+(\.\d+)?$/.test(text)) return;
      var target = parseFloat(text);
      var decimals = (text.split(".")[1] || "").length;
      var start = 0;
      function tick(now) {
        if (!start) start = now;
        var t = Math.min(1, (now - start) / 800);
        var eased = 1 - Math.pow(1 - t, 3);
        var value = target * eased;
        el.textContent = decimals ? value.toFixed(decimals) : String(Math.round(value));
        if (t < 1 && motionAllowed()) requestAnimationFrame(tick);
        else el.textContent = text;
      }
      requestAnimationFrame(tick);
    });
  }

  function buildToc() {
    var article = document.querySelector("article.prose");
    if (!article || article.querySelector(".toc") || /faq\.html$/.test(location.pathname)) return;
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

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      var register = function () {
        navigator.serviceWorker.register("/sw.js").catch(function () {});
      };
      if ("requestIdleCallback" in window) requestIdleCallback(register, { timeout: 5000 });
      else setTimeout(register, 2000);
    });
  }
})();
