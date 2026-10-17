import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const www = path.join(root, 'www');

const pages = ['index.html', 'about.html', 'privacy.html', 'terms.html', 'contact.html', 'robots.txt', 'sitemap.xml', 'manifest.webmanifest'];

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

for (const file of pages) {
  const source = path.join(root, file);
  if (file.endsWith('.html')) {
    const html = await readFile(source, 'utf8');
    const stripped = html.replace(adsenseScript, '');
    if (stripped.includes('adsbygoogle') || stripped.includes('pagead2.googlesyndication.com')) {
      throw new Error('AdSense script was still in ' + file + ' after the app build strip.');
    }
    await writeFile(path.join(www, file), stripped);
  } else {
    await cp(source, path.join(www, file));
  }
}
await cp(path.join(root, 'assets'), path.join(www, 'assets'), { recursive: true });
await cp(path.join(root, 'icons'), path.join(www, 'icons'), { recursive: true });
await mkdir(path.join(www, 'data'), { recursive: true });
await cp(path.join(root, 'data', 'draws.json'), path.join(www, 'data', 'draws.json'));

console.log('Copied web assets to www/, including data/draws.json for offline use.');
