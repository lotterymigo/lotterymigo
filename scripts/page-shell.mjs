const ADSENSE =
  '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4173178569579798" crossorigin="anonymous"></script>';

const NAV = [
  { id: 'home', href: '/', label: 'Home' },
  { id: 'guides', href: '/learn/index.html', label: 'Guides' },
  { id: 'powerball', href: '/powerball/results.html', label: 'Powerball' },
  { id: 'megamillions', href: '/megamillions/results.html', label: 'Mega Millions' },
  { id: 'faq', href: '/faq.html', label: 'FAQ' },
  { id: 'about', href: '/about.html', label: 'About' },
  { id: 'contact', href: '/contact.html', label: 'Contact' }
];

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function navHtml(current) {
  return NAV.map((item) => {
    const here = item.id === current ? ' aria-current="page"' : '';
    return `<a href="${item.href}"${here}>${item.label}</a>`;
  }).join('\n        ');
}

export function renderPage({
  title,
  description,
  canonicalPath,
  kicker,
  h1,
  lede = '',
  bodyHtml,
  current = ''
}) {
  const canonical = 'https://lotterymigo.com' + canonicalPath;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${esc(description)}" />
  <meta name="theme-color" content="#067A38" />
  <link rel="canonical" href="${esc(canonical)}" />
  <title>${esc(title)}</title>
  <link rel="icon" href="/icons/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" href="/icons/favicon-32.png" sizes="32x32" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" sizes="180x180" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/assets/design.css" />
  <link rel="stylesheet" href="/assets/a11y.css" />
  <script src="/assets/a11y.js"></script>
  ${ADSENSE}
</head>
<body class="page page-narrow">
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="compliance">
    <span class="pill">18+ / 21+</span>
    <span>Entertainment only. No real-money gambling. Problem gambling help: <a href="tel:18004262537">1-800-GAMBLER</a></span>
  </div>
  <header class="site-header">
    <div class="wrap header-bar">
      <div class="header-top">
        <a class="brand" href="/">
          <img src="/icons/logo.svg" width="44" height="44" alt="" />
          <span class="brand-name">LotteryMigo</span>
        </a>
        <a class="tip-chip hidden" data-tip="header" hidden></a>
      </div>
      <nav class="nav" aria-label="Site pages">
        ${navHtml(current)}
      </nav>
    </div>
  </header>
  <div class="wrap"><div class="ad-slot" data-ad-placement="below-header" hidden></div></div>
  <main id="main" class="wrap stack" tabindex="-1">
    <div class="stack">
      <p class="kicker">${esc(kicker)}</p>
      <h1>${esc(h1)}</h1>
      ${lede ? `<p>${lede}</p>` : ''}
    </div>
    <article class="card prose">
      ${bodyHtml}
    </article>
  </main>
  <footer class="site-footer">
    <div class="wrap stack">
      <div class="ad-slot" data-ad-placement="footer" hidden></div>
      <nav class="nav" aria-label="More pages">
        <a href="/learn/index.html">Guides</a>
        <a href="/powerball/numbers.html">Powerball numbers</a>
        <a href="/megamillions/numbers.html">Mega Millions numbers</a>
        <a href="/faq.html">FAQ</a>
        <a href="/about.html">About</a>
        <a href="/privacy.html">Privacy</a>
        <a href="/terms.html">Terms</a>
        <a href="/contact.html">Contact</a>
        <a href="mailto:info@lotterymigo.com">info@lotterymigo.com</a>
      </nav>
      <p id="tip-note" class="tip-note hidden" data-tip="note" hidden></p>
      <p>Entertainment only. Not gambling advice. No win is guaranteed. LotteryMigo is not affiliated with MUSL, the Mega Millions Consortium, or any state lottery. © 2026 LotteryMigo.com</p>
    </div>
  </footer>
  <script src="/assets/site-config.js"></script>
  <script src="/assets/tip.js"></script>
  <script src="/assets/ads.js"></script>
</body>
</html>
`;
}
