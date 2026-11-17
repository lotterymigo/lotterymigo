import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { illustratePayout, formatMoney } from '../assets/payout-illustration.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
function assert(cond, message) {
  if (!cond) throw new Error(message);
  results.push('ok ' + message);
}

const example = illustratePayout({ annuity: 100000000, cash: 45000000, applyFederal: true, statePercent: 5 });
assert(example.ok, 'the worked example calculates');
assert(example.annuity.federal === 24000000 && example.cash.federal === 10800000, 'federal 24 percent is a prepayment on the full amount');
assert(example.annuity.state === 5000000 && example.cash.state === 2250000, 'the state rate applies to the full amount');
assert(example.annuity.remainder === 71000000 && example.cash.remainder === 31950000, 'the remainder subtracts both illustrations');
assert(example.cashShare === 0.45, 'cash share is cash divided by the advertised annuity');
assert(formatMoney(example.cash.federal) === '$10,800,000.00', 'money formatting uses dollars');

const skipped = illustratePayout({ annuity: 100000000, cash: 45000000, applyFederal: false, statePercent: null });
assert(skipped.ok && skipped.cash.federal === 0 && skipped.cash.state === 0 && skipped.cash.remainder === 45000000, 'federal and state can both be left off');

const bad = illustratePayout({ annuity: 10, cash: 5, applyFederal: true, statePercent: 120 });
assert(!bad.ok && bad.errors.length === 1, 'a state rate above 100 is rejected');

const page = await readFile(path.join(root, 'learn/lump-sum-annuity-taxes.html'), 'utf8');
assert(page.includes('Illustration only, not tax advice, not your actual tax bill.'), 'the page states the illustration limit');
assert(page.includes('$31,950,000'), 'the static worked example is in the HTML');
assert(page.includes('class="payout-column"') && page.includes('>Cash option</h4>'), 'the worked example stacks annuity and cash as cards');
assert(page.includes('id="payout-form"'), 'the calculator form is on the page');
assert(page.includes('/assets/payout-illustration.js'), 'the page loads the illustration script');
assert(!page.includes('This site will not estimate a refund or a bill.'), 'the old refusal to illustrate is updated');
assert(!page.includes('does not compare the annuity and the cash option for the current jackpot'), 'the old comparison sentence matches the illustration');

console.log(results.join('\n'));
