import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const www = path.join(root, 'www');

const pages = ['index.html', 'about.html', 'privacy.html', 'terms.html', 'contact.html', 'faq.html', 'robots.txt', 'sitemap.xml', 'manifest.webmanifest'];
const pageDirs = ['learn', 'powerball', 'megamillions'];

await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/native-shell.js'],
  outfile: 'assets/native-shell.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  legalComments: 'none'
});

await rm(www, { recursive: true, force: true });
await mkdir(www, { recursive: true });

// The website loads Google AdSense. The Android and iOS app uses AdMob instead,
// so the app copy of each page must not include the AdSense script. ads.txt stays
// on the website only and is not copied into www/.
const adsenseScript = /<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-4173178569579798" crossorigin="anonymous"><\/script>\r?\n?/g;

async function copyHtmlFile(rel) {
  const html = await readFile(path.join(root, rel), 'utf8');
  const stripped = html.replace(adsenseScript, '');
  if (stripped.includes('adsbygoogle') || stripped.includes('pagead2.googlesyndication.com')) {
    throw new Error('AdSense script was still in ' + rel + ' after the app build strip.');
  }
  const dest = path.join(www, rel);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, stripped);
}

async function copyHtmlTree(relDir) {
  const entries = await readdir(path.join(root, relDir), { withFileTypes: true });
  for (const entry of entries) {
    const rel = path.join(relDir, entry.name);
    if (entry.isDirectory()) await copyHtmlTree(rel);
    else if (entry.name.endsWith('.html')) await copyHtmlFile(rel);
  }
}

for (const file of pages) {
  if (file.endsWith('.html')) await copyHtmlFile(file);
  else await cp(path.join(root, file), path.join(www, file));
}
for (const dir of pageDirs) await copyHtmlTree(dir);
await cp(path.join(root, 'assets'), path.join(www, 'assets'), { recursive: true });

// Google Play does not allow an outside payment link for a non-charity tip.
// The website keeps tipUrl. The app copy must not.
const configPath = path.join(www, 'assets', 'site-config.js');
let appConfig = await readFile(configPath, 'utf8');
if (!/tipUrl:\s*"/.test(appConfig)) {
  throw new Error('www/assets/site-config.js has no tipUrl to clear.');
}
appConfig = appConfig.replace(/tipUrl:\s*"[^"]*"/, 'tipUrl: ""');
await writeFile(configPath, appConfig);

const tipPath = path.join(www, 'assets', 'tip.js');
let tipSource = await readFile(tipPath, 'utf8');
const tipMarker = '/* tip-host-check */';
const markerAt = tipSource.indexOf(tipMarker);
const markerLineEnd = markerAt === -1 ? -1 : tipSource.indexOf('\n', markerAt);
const checkLineEnd = markerLineEnd === -1 ? -1 : tipSource.indexOf('\n', markerLineEnd + 1);
if (markerAt === -1 || checkLineEnd === -1) {
  throw new Error('www/assets/tip.js is missing the tip host check to remove.');
}
tipSource = tipSource.slice(0, markerAt) + 'return "";' + tipSource.slice(checkLineEnd);
await writeFile(tipPath, tipSource);

await cp(path.join(root, 'icons'), path.join(www, 'icons'), { recursive: true });
await mkdir(path.join(www, 'data'), { recursive: true });
await cp(path.join(root, 'data', 'draws.json'), path.join(www, 'data', 'draws.json'));
await assertNoPaymentLink(www);

console.log('Copied web assets to www/, including data/draws.json for offline use.');

async function assertNoPaymentLink(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await assertNoPaymentLink(full);
      continue;
    }
    if (!/\.(html|js|css|json|txt|xml|webmanifest|md)$/i.test(entry.name)) continue;
    const text = await readFile(full, 'utf8');
    if (/buymeacoffee\.com|paypal\.me/i.test(text)) {
      throw new Error('App build still contains a tip payment link in ' + path.relative(www, full));
    }
  }
}
