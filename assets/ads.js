/* Website AdSense slots. The app build removes the AdSense script, so this file does nothing there. */
(function () {
  var CLIENT = "ca-pub-4173178569579798";
  var PLACEMENTS = {
    "below-header": "belowHeader",
    "between-stats": "betweenStats",
    footer: "footer"
  };

  function isNativeApp() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }

  function adsenseScriptPresent() {
    return !!document.querySelector('script[src*="pagead2.googlesyndication.com"]');
  }

  function slotId(name) {
    var config = window.LOTTERYMIGO_CONFIG || {};
    var slots = config.adSlots || {};
    var id = String(slots[name] || "").trim();
    if (!id || id.indexOf("YOUR_") !== -1 || !/^\d{8,}$/.test(id)) return "";
    return id;
  }

  function showConsentNote() {
    if (localStorage.getItem("lotterymigo_ads_notice") === "ok") return;
    var bar = document.createElement("div");
    bar.className = "ads-notice";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Advertising cookies");
    bar.innerHTML =
      "<p>Google AdSense may use cookies to show and measure ads on this website. <a href=\"privacy.html\">Privacy</a> · <a href=\"https://adssettings.google.com/\">Ad settings</a></p>" +
      "<button type=\"button\" class=\"btn btn-quiet\">OK</button>";
    bar.querySelector("button").addEventListener("click", function () {
      try { localStorage.setItem("lotterymigo_ads_notice", "ok"); } catch (err) {}
      bar.remove();
    });
    document.body.appendChild(bar);
  }

  function renderSlots() {
    var mounts = document.querySelectorAll("[data-ad-placement]");
    mounts.forEach(function (el) {
      var key = PLACEMENTS[el.getAttribute("data-ad-placement")] || "";
      var id = slotId(key);
      if (!id) {
        el.hidden = true;
        el.innerHTML = "";
        return;
      }
      el.hidden = false;
      el.innerHTML =
        '<p class="ad-label">Advertisement</p>' +
        '<ins class="adsbygoogle" style="display:block" data-ad-client="' + CLIENT + '" data-ad-slot="' + id + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.error("AdSense slot did not load.", err);
      }
    });
  }

  function start() {
    if (isNativeApp() || !adsenseScriptPresent()) return;
    showConsentNote();
    renderSlots();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
