import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const www = path.join(root, 'www');

const pages = ['index.html', 'about.html', 'privacy.html', 'terms.html', 'contact.html', 'robots.txt', 'sitemap.xml'];

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

for (const file of pages) {
  await cp(path.join(root, file), path.join(www, file));
}
await cp(path.join(root, 'assets'), path.join(www, 'assets'), { recursive: true });
await mkdir(path.join(www, 'data'), { recursive: true });
await cp(path.join(root, 'data', 'draws.json'), path.join(www, 'data', 'draws.json'));

console.log('Copied web assets to www/, including data/draws.json for offline use.');
