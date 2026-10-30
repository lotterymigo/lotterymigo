export const SITE = 'https://www.lotterymigo.com';
export const OG_IMAGE = `${SITE}/icons/og-image.png`;
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,640&family=Outfit:wght@400;500;600;700&display=swap';
const VERIFY = '<meta name="google-site-verification" content="mT-NZ9gT1zrEcQ4GcRFZ3N1Oo6bRwOL4S5UIhm1CUYk" />';
const ADSENSE =
  '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4173178569579798" crossorigin="anonymous"></script>';

const NAV = [
  { id: 'stats', href: '/#section-stats', label: 'Stats' },
  { id: 'powerball', href: '/powerball/results.html', label: 'Powerball results' },
  { id: 'megamillions', href: '/megamillions/results.html', label: 'Mega Millions results' },
  { id: 'guides', href: '/learn/index.html', label: 'Learn' },
  { id: 'faq', href: '/faq.html', label: 'FAQ' },
  { id: 'about', href: '/about.html', label: 'About' }
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

function absolute(pathname) {
  if (!pathname || pathname === '/') return `${SITE}/`;
  return SITE + pathname;
}

function crumbsHtml(crumbs) {
  if (!crumbs || !crumbs.length) return '';
  const items = crumbs.map((crumb, index) => {
    const last = index === crumbs.length - 1;
    if (last) return `<li aria-current="page">${esc(crumb.name)}</li>`;
    return `<li><a href="${esc(crumb.path)}">${esc(crumb.name)}</a></li>`;
  }).join('');
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items}</ol></nav>`;
}

function organizationGraph() {
  return [
    {
      '@type': 'Organization',
      '@id': `${SITE}/#organization`,
      name: 'LotteryMigo',
      url: `${SITE}/`,
      email: 'info@lotterymigo.com',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE}/icons/icon-512.png`,
        width: 512,
        height: 512
      }
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      url: `${SITE}/`,
      name: 'LotteryMigo',
      description: 'Powerball and Mega Millions statistics, results, and guides. Past draws do not predict future results.',
      publisher: { '@id': `${SITE}/#organization` }
    }
  ];
}

function jsonLdScript(crumbs, extra) {
  const graph = organizationGraph();
  if (crumbs && crumbs.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: absolute(crumb.path)
      }))
    });
  }
  for (const node of extra || []) graph.push(node);
  const payload = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${payload}</script>`;
}

export function renderPage({
  title,
  description,
  canonicalPath,
  kicker,
  h1,
  lede = '',
  bodyHtml,
  current = '',
  crumbs = null,
  jsonLd = null,
  ogType = 'website'
}) {
  const canonical = absolute(canonicalPath);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="description" content="${esc(description)}" />
  <meta name="theme-color" content="#0c1220" />
  ${VERIFY}
  <link rel="canonical" href="${esc(canonical)}" />
  <title>${esc(title)}</title>
  <meta property="og:type" content="${esc(ogType)}" />
  <meta property="og:site_name" content="LotteryMigo" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="LotteryMigo, Powerball and Mega Millions statistics" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />
  <link rel="icon" href="/icons/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" href="/icons/favicon-32.png" sizes="32x32" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" sizes="180x180" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preload" as="style" href="${FONT_HREF}" />
  <link href="${FONT_HREF}" rel="stylesheet" />
  <link rel="stylesheet" href="/assets/design.css" />
  <link rel="stylesheet" href="/assets/a11y.css" />
  <script defer src="/assets/a11y.js"></script>
  ${ADSENSE}
  ${jsonLdScript(crumbs, jsonLd)}
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
    ${crumbsHtml(crumbs)}
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
        <a href="/#section-stats">Stats</a>
        <a href="/powerball/results.html">Powerball results</a>
        <a href="/megamillions/results.html">Mega Millions results</a>
        <a href="/learn/index.html">Learn</a>
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
  <script defer src="/assets/site-config.js"></script>
  <script defer src="/assets/tip.js"></script>
  <script defer src="/assets/ads.js"></script>
</body>
</html>
`;
}
