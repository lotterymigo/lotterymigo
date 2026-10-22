/* Header coffee button and the shorter footer note.
   The app build removes the host check so the package has no payment link. */
(function () {
  var NOTE = "Voluntary tip. It does not buy virtual points, lottery tickets, or a better chance of winning. LotteryMigo is not responsible for any win or loss.";

  function isNativeApp() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }

  function tipUrl() {
    var config = window.LOTTERYMIGO_CONFIG || {};
    var url = String(config.tipUrl || "").trim();
    if (!url || url.indexOf("YOUR_") !== -1) return "";
    /* tip-host-check */
    if (!/^https:\/\/(www\.)?buymeacoffee\.com\/[A-Za-z0-9._-]+$/i.test(url)) return "";
    return url;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function icon() {
    return '<svg class="tip-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4.5 9h11.2v5.2a4.2 4.2 0 0 1-4.2 4.2H8.7a4.2 4.2 0 0 1-4.2-4.2V9z"/>' +
      '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M15.7 10.2h2.1a2.4 2.4 0 0 1 0 4.8h-2.1"/>' +
      '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M8 4.2c.5.9.5 1.5 0 2.4M11 4.2c.5.9.5 1.5 0 2.4"/>' +
      "</svg>";
  }

  function hide(el) {
    if (!el) return;
    el.classList.add("hidden");
    el.setAttribute("hidden", "");
    el.removeAttribute("href");
    el.innerHTML = "";
  }

  function render() {
    var url = isNativeApp() ? "" : tipUrl();
    var header = document.querySelector("[data-tip='header']");
    var note = document.querySelector("[data-tip='note']");
    if (!url) {
      hide(header);
      hide(note);
      return;
    }
    if (header) {
      header.classList.remove("hidden");
      header.removeAttribute("hidden");
      header.href = url;
      header.target = "_blank";
      header.rel = "noopener noreferrer";
      header.setAttribute("aria-label", "Buy us a coffee");
      header.title = NOTE;
      header.innerHTML = icon() +
        '<span class="tip-label-full" aria-hidden="true">Buy us a coffee</span>' +
        '<span class="tip-label-short" aria-hidden="true">Coffee</span>';
    }
    if (note) {
      note.classList.remove("hidden");
      note.removeAttribute("hidden");
      note.innerHTML =
        '<a class="tip-footer-link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">Buy us a coffee</a>' +
        '<span id="tip-disclaimer">' + NOTE + "</span>";
      if (header) header.setAttribute("aria-describedby", "tip-disclaimer");
    }
  }

  render();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
})();
