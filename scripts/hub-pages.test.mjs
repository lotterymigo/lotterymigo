import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
function assert(cond, message) {
  if (!cond) throw new Error(message);
  results.push('ok ' + message);
}

function gapsInCaption(html, caption) {
  const tables = html.match(/<table>[\s\S]*?<\/table>/g) || [];
  const table = tables.find((item) => item.includes(caption));
  if (!table) throw new Error(`missing table: ${caption}`);
  return [...table.matchAll(/<td class="num">([^<]+)<\/td>\s*<td><a href="([^"]+)">/g)].map((match) => ({
    gap: Number(match[1].replace(/,/g, '')),
    href: match[2]
  }));
}

const pb = await readFile(path.join(root, 'powerball/numbers.html'), 'utf8');
const mm = await readFile(path.join(root, 'megamillions/numbers.html'), 'utf8');
const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');

assert(pb.includes('<title>Most Overdue Powerball Numbers and Frequency | LotteryMigo</title>'), 'Powerball hub title names overdue numbers');
assert(pb.includes('id="overdue"'), 'Powerball hub has an overdue anchor');
assert(pb.includes('>Most overdue Powerball numbers</h2>'), 'Powerball overdue heading is an h2');
assert(pb.includes('>Powerball number frequency</h2>'), 'Powerball frequency heading stays specific');
assert(mm.includes('<title>Mega Millions Number Frequency and Gaps | LotteryMigo</title>'), 'Mega Millions hub title names number frequency');
assert(mm.includes('>Mega Millions number frequency</h2>'), 'Mega Millions frequency heading is an h2');
assert(mm.includes('id="overdue"'), 'Mega Millions hub has an overdue anchor');
assert(pb.includes('does not change the odds') && mm.includes('does not change the odds'), 'hubs keep the gap disclaimer');

const pbWhite = gapsInCaption(pb, 'Powerball white balls sorted by current gap');
const pbSpecial = gapsInCaption(pb, 'Current Powerball gaps');
const mmWhite = gapsInCaption(mm, 'Mega Millions white balls sorted by current gap');
const mmSpecial = gapsInCaption(mm, 'Current Mega Ball gaps');
assert(pbWhite.length === 69 && pbSpecial.length === 26, 'Powerball overdue lists every current number');
assert(mmWhite.length === 70 && mmSpecial.length === 24, 'Mega Millions overdue lists every current number');
for (const rows of [pbWhite, pbSpecial, mmWhite, mmSpecial]) {
  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i].gap > rows[i - 1].gap) throw new Error('gap list is not sorted');
  }
}
assert(true, 'overdue tables are sorted by current gap');
assert(!sitemap.includes('/overdue'), 'no separate overdue URLs were added');
assert(sitemap.includes('https://www.lotterymigo.com/app.html'), 'app landing page is in the sitemap');
assert((sitemap.match(/<loc>/g) || []).length === 214, 'sitemap has the previous URLs plus /app.html');

const appPage = await readFile(path.join(root, 'app.html'), 'utf8');
assert((appPage.match(/<h1[\s>]/g) || []).length === 1, 'app landing page has one h1');
assert(appPage.includes('Nabin Pokhrel'), 'app landing page credits Nabin Pokhrel');
assert(/do not guarantee/i.test(appPage) && /not responsible/i.test(appPage), 'app landing page keeps the win disclaimer');
assert(!appPage.includes('apps.apple.com') && !appPage.includes('play.google.com'), 'app landing page has no store listing links');
assert((appPage.match(/ca-pub-4173178569579798/g) || []).length === 1, 'app landing page has one AdSense client id');
assert((appPage.match(/assets\/analytics\.js/g) || []).length === 1, 'app landing page loads analytics.js once');

console.log(results.join('\n'));
