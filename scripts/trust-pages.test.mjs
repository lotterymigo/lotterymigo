import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
function assert(cond, message) {
  if (!cond) throw new Error(message);
  results.push('ok ' + message);
}

const read = (rel) => readFile(path.join(root, rel), 'utf8');
const [about, faq, learn, guide, readme, llms, workflow, privacy] = await Promise.all([
  read('about.html'),
  read('faq.html'),
  read('learn/index.html'),
  read('learn/how-powerball-works.html'),
  read('README.md'),
  read('llms.txt'),
  read('.github/workflows/update-draws.yml'),
  read('privacy.html')
]);

assert(workflow.includes("cron: '0 10 * * *'"), 'the workflow cron is daily at 10:00 UTC');
assert(!workflow.includes('12:00'), 'the workflow does not schedule 12:00 UTC');
assert(readme.includes('daily at 10:00 UTC'), 'README states the daily 10:00 UTC run');
assert(!readme.includes('Tuesday, Thursday, and Sunday'), 'README no longer lists Tue/Thu/Sun');
assert(about.includes('id="methodology"'), 'About has a methodology anchor');
assert(about.includes('Methodology and data sources'), 'About names the methodology section');
assert(about.includes('id="author"'), 'About has an author block');
assert(about.includes('Nabin Pokhrel, creator of LotteryMigo'), 'About names Nabin Pokhrel');
assert(about.includes('systems administrator with a background in cloud computing'), 'About includes the short bio');
assert(about.includes('daily at 10:00 UTC'), 'About states the daily update');
assert(!about.includes('Tuesday, Thursday, and Sunday'), 'About no longer lists Tue/Thu/Sun');
assert(about.includes('d6yy-54nr') && about.includes('5xaw-6ayf'), 'About still cites both NY Open Data datasets');
assert(faq.includes('daily at 10:00 UTC'), 'FAQ states the daily update');
assert(!faq.includes('12:00 UTC'), 'FAQ no longer says 12:00 UTC');
assert(faq.includes('href="/about.html#methodology"'), 'FAQ links to the methodology anchor');
assert(learn.includes('href="/about.html#methodology"'), 'the guides index links to the methodology anchor');
assert(learn.includes('>Methodology</a>'), 'the guides footer links to methodology');
assert(guide.includes('Nabin Pokhrel, creator of LotteryMigo'), 'guide articles carry the byline');
assert(guide.includes('"author":{"@id":"https://www.lotterymigo.com/#person"}'), 'Article author is the Person');
assert(guide.includes('"publisher":{"@id":"https://www.lotterymigo.com/#organization"}'), 'Article publisher stays the Organization');
assert(guide.includes('"@type":"Person"') && guide.includes('"name":"Nabin Pokhrel"'), 'Person schema is present');
assert(llms.includes('https://www.lotterymigo.com/about.html#methodology'), 'llms.txt links to methodology');
assert(llms.includes('Nabin Pokhrel, creator of LotteryMigo'), 'llms.txt names the author');
assert(privacy.includes('about.html#methodology'), 'static footer links to methodology');

console.log(results.join('\n'));
