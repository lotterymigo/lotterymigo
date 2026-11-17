import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
function assert(cond, message) {
  if (!cond) throw new Error(message);
  results.push('ok ' + message);
}

async function page(rel) {
  return readFile(path.join(root, rel), 'utf8');
}

function tableBodies(html, captionIncludes) {
  const tables = html.match(/<table>[\s\S]*?<\/table>/g) || [];
  return tables.filter((table) => table.includes(captionIncludes));
}

function rowCount(table) {
  return (table.match(/<tr>/g) || []).length - 1;
}

const white = await page('powerball/number/21.html');
const other = await page('powerball/number/43.html');
const special = await page('powerball/powerball/4.html');
const mega = await page('megamillions/megaball/1.html');
const retired = await page('megamillions/megaball/25.html');

for (const [html, name] of [[white, '21'], [other, '43'], [special, 'red 4'], [mega, 'mega 1'], [retired, 'mega 25']]) {
  assert(html.includes('<h2>Companion numbers</h2>'), `${name} has a companion section`);
  assert(html.includes('<h2>Appearances by year</h2>'), `${name} has a yearly table`);
  assert(html.includes('does not change the odds'), `${name} keeps the odds disclaimer`);
  assert(html.includes('"@type":"Dataset"'), `${name} has Dataset JSON-LD`);
}

const whiteTables = tableBodies(white, 'Other white balls drawn most often');
const specialTables = tableBodies(white, 'Powerball values drawn most often');
const yearTables = tableBodies(white, 'Year-by-year appearances');
assert(whiteTables.length === 1 && rowCount(whiteTables[0]) >= 8 && rowCount(whiteTables[0]) <= 10, 'white companion table lists 8 to 10 balls');
assert(specialTables.length === 1 && rowCount(specialTables[0]) >= 8 && rowCount(specialTables[0]) <= 10, 'special companion table lists 8 to 10 balls');
assert(yearTables.length === 1 && rowCount(yearTables[0]) >= 8, 'year table covers the matrix years');
assert(white.includes('href="/powerball/number/') && white.includes('href="/powerball/powerball/'), 'companion counts link to number pages');
assert(white.includes('"isBasedOn":"https://data.ny.gov/d/d6yy-54nr"'), 'Powerball dataset cites d6yy-54nr');
assert(mega.includes('"isBasedOn":"https://data.ny.gov/d/5xaw-6ayf"'), 'Mega Millions dataset cites 5xaw-6ayf');
assert(whiteTables[0] !== tableBodies(other, 'Other white balls drawn most often')[0], 'two white-ball pages do not share the same companion table');
assert(retired.includes('not in the current'), 'the retired Mega Ball page still says it is historical');
assert(special.includes('leaves the odds unchanged'), 'special-ball pages keep the gap disclaimer');

console.log(results.join('\n'));
