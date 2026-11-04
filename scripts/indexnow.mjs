import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'www.lotterymigo.com';
const SITE = `https://${HOST}`;

function keyFile() {
  const match = readdirSync(root).find((name) => /^[a-f0-9]{32}\.txt$/.test(name));
  if (!match) throw new Error('IndexNow key file is missing from the site root.');
  const key = match.slice(0, -4);
  const body = readFileSync(path.join(root, match), 'utf8').trim();
  if (body !== key) throw new Error('IndexNow key file must contain only the key.');
  return { key, location: `${SITE}/${match}` };
}

function changedFiles(since) {
  const out = execSync(`git diff --name-only ${since} HEAD`, { cwd: root, encoding: 'utf8' });
  return out.split('\n').map((line) => line.trim()).filter(Boolean);
}

function toUrl(file) {
  if (file === 'index.html') return `${SITE}/`;
  if (!file.endsWith('.html')) return '';
  if (file.startsWith('content/')) return '';
  if (file === '404.html' || file === 'google99b55d6bc9bdc9f7.html' || file === 'offline.html') return '';
  return `${SITE}/${file}`;
}

const sinceFlag = process.argv.indexOf('--since');
const since = sinceFlag === -1 ? 'HEAD~1' : process.argv[sinceFlag + 1];
const urls = [...new Set(changedFiles(since).map(toUrl).filter(Boolean))];
if (!urls.length) {
  console.log('IndexNow: no public URLs changed.');
  process.exit(0);
}

const { key, location } = keyFile();
const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key,
    keyLocation: location,
    urlList: urls
  })
});
const text = await response.text();
console.log(`IndexNow ${response.status} for ${urls.length} URL${urls.length === 1 ? '' : 's'}. ${text}`.trim());
if (!response.ok) {
  console.warn('IndexNow did not accept the ping. The draw archive commit is kept.');
}
