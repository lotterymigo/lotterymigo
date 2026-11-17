import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
function assert(cond, message) {
  if (!cond) throw new Error(message);
  results.push('ok ' + message);
}

const html = await readFile(path.join(root, 'index.html'), 'utf8');
const start = html.indexOf('id="heatmap-grid"');
const end = html.indexOf('id="frequencyChart"');
assert(start > 0 && end > start, 'the heatmap grid is on the homepage');
const grid = html.slice(start, end);
const cells = grid.match(/class="heat-cell heat-(?:high|mid|low)"/g) || [];
assert(cells.length === 69, 'the heatmap has one static cell for each Powerball white ball (' + cells.length + ')');
assert(grid.includes('Number 1 was drawn') && grid.includes('Number 69 was drawn'), 'static cells name the number and the count');
assert(!grid.includes('id="heatmap-grid" class="heatmap"></div>'), 'the heatmap grid is not left empty');
assert(html.includes('ca-pub-4173178569579798'), 'the AdSense publisher id stays on the homepage');
assert(html.includes('google-site-verification'), 'the Search Console meta stays on the homepage');
assert(html.includes('assets/analytics.js'), 'the analytics include stays on the homepage');

console.log(results.join('\n'));
