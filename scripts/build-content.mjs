import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage } from './page-shell.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DATE = '2026-10-26';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const GUIDES = [
  {
    slug: 'how-powerball-works',
    title: 'How Powerball works: rules, odds, and Power Play | LotteryMigo',
    description: 'Powerball rules in plain language: the $2 play, 5/69 plus 1/26 matrix, nine prize tiers, Power Play, and how LotteryMigo counts drawings.',
    kicker: 'Guide',
    h1: 'How Powerball works',
    blurb: 'The matrix, the nine prize tiers, Power Play, Double Play, and which drawings this site treats as the current game.',
    file: 'how-powerball-works.html',
    related: [
      ['/learn/understanding-the-odds.html', 'Understanding the odds'],
      ['/powerball/numbers.html', 'Powerball number statistics'],
      ['/powerball/results.html', 'Recent Powerball results']
    ]
  },
  {
    slug: 'how-mega-millions-works',
    title: 'How Mega Millions works, including the 2025 rules | LotteryMigo',
    description: 'Mega Millions after April 8, 2025: a $5 play, Mega Ball 1–24, the built-in multiplier, prize tiers, and how the archive splits older matrices.',
    kicker: 'Guide',
    h1: 'How Mega Millions works',
    blurb: 'The $5 ticket, the 1–24 Mega Ball, the multiplier table, and why older drawings are counted separately.',
    file: 'how-mega-millions-works.html',
    related: [
      ['/learn/understanding-the-odds.html', 'Understanding the odds'],
      ['/megamillions/numbers.html', 'Mega Millions number statistics'],
      ['/megamillions/results.html', 'Recent Mega Millions results']
    ]
  },
  {
    slug: 'understanding-the-odds',
    title: 'Understanding Powerball and Mega Millions odds | LotteryMigo',
    description: 'Where the jackpot odds 1 in 292,201,338 and 1 in 290,472,336 come from, and why buying more tickets scales the chance in a straight line.',
    kicker: 'Guide',
    h1: 'Understanding the odds',
    blurb: 'A combination count for both games, the difference between any-prize odds and jackpot odds, and the limits of a jackpot expected-value shortcut.',
    file: 'understanding-the-odds.html',
    related: [
      ['/learn/hot-cold-overdue.html', 'Hot, cold, and overdue numbers'],
      ['/learn/how-powerball-works.html', 'How Powerball works'],
      ['/learn/how-mega-millions-works.html', 'How Mega Millions works']
    ]
  },
  {
    slug: 'hot-cold-overdue',
    title: 'What hot, cold, and overdue lottery numbers mean | LotteryMigo',
    description: 'Hot, cold, and overdue describe past drawings. A long gap does not change the chance a number is drawn next. Includes a live count from this archive.',
    kicker: 'Guide',
    h1: 'What hot, cold, and overdue numbers really mean',
    blurb: 'How this site defines frequency and gaps, why all-time charts mix retired matrices, and a count taken from the current archive.',
    file: 'hot-cold-overdue.html',
    live: true,
    related: [
      ['/learn/understanding-the-odds.html', 'Understanding the odds'],
      ['/powerball/numbers.html', 'Powerball number statistics'],
      ['/about.html', 'How the statistics are calculated']
    ]
  },
  {
    slug: 'lump-sum-annuity-taxes',
    title: 'Lottery lump sum, annuity, and taxes | LotteryMigo',
    description: 'General information on Powerball and Mega Millions jackpot options, IRS Topic 419, and 24 percent federal withholding. Not tax advice.',
    kicker: 'Guide',
    h1: 'Lump sum, annuity, and taxes',
    blurb: 'What the advertised annuity and cash figures mean, and what the IRS says about reporting and withholding lottery winnings.',
    file: 'lump-sum-annuity-taxes.html',
    related: [
      ['/learn/lottery-scams.html', 'Lottery scams to avoid'],
      ['/learn/how-powerball-works.html', 'How Powerball works'],
      ['/faq.html', 'FAQ']
    ]
  },
  {
    slug: 'lottery-scams',
    title: 'Lottery scams to avoid | LotteryMigo',
    description: 'A real lottery prize is claimed from the lottery that sold the ticket. Requests for a fee, a gift card, or bank details are a scam. How to report one.',
    kicker: 'Guide',
    h1: 'Lottery scams to avoid',
    blurb: 'How a real claim works, the fee-and-bank-details pattern the FTC describes, and what this site will never ask you to send.',
    file: 'lottery-scams.html',
    related: [
      ['/learn/lump-sum-annuity-taxes.html', 'Lump sum, annuity, and taxes'],
      ['/contact.html', 'Contact LotteryMigo'],
      ['/faq.html', 'FAQ']
    ]
  }
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

function prettyDate(iso) {
  const [year, month, day] = String(iso).slice(0, 10).split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function comma(value) {
  return Math.round(value).toLocaleString('en-US');
}

function oneDecimal(value) {
  return (Math.round(value * 10) / 10).toFixed(1);
}

function times(n) {
  return `${comma(n)} ${n === 1 ? 'time' : 'times'}`;
}

function joinAnd(items) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function ordinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function wordCount(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, ' and ')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z#0-9]+;/gi, ' ');
  const parts = text.replace(/[^A-Za-z0-9'+.%$-]+/g, ' ').trim().split(/\s+/);
  return parts.filter(Boolean).length;
}

function articleWords(pageHtml) {
  const match = pageHtml.match(/<article[\s\S]*<\/article>/);
  return wordCount(match ? match[0] : pageHtml);
}

async function writeOut(rel, html) {
  const dest = path.join(root, rel);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, html);
}

function sliceEra(draws, start, end) {
  return draws.filter((draw) => draw.date >= start && (!end || draw.date <= end));
}

function fullYears(start, end) {
  const startYear = Number(start.slice(0, 4));
  const endYear = Number(end.slice(0, 4));
  const years = [];
  for (let year = startYear; year <= endYear; year += 1) {
    if (year === startYear && start.slice(5) !== '01-01') continue;
    if (year === endYear && !end.endsWith('-12-31')) continue;
    years.push(year);
  }
  return years;
}

function rankMap(rows, valueOf) {
  const sorted = [...rows].sort((a, b) => valueOf(b) - valueOf(a) || a.num - b.num);
  const map = new Map();
  let rank = 1;
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && valueOf(sorted[i]) !== valueOf(sorted[i - 1])) rank = i + 1;
    const tied = sorted.filter((row) => valueOf(row) === valueOf(sorted[i])).length - 1;
    map.set(sorted[i].num, { rank, tied });
  }
  return map;
}

function analyzePool(eraNewest, numbers, readBalls) {
  const chrono = [...eraNewest].reverse();
  const drawCount = chrono.length;
  const hits = new Map(numbers.map((num) => [num, []]));
  const whiteCompanions = new Map(numbers.map((num) => [num, new Map()]));
  const specialCompanions = new Map(numbers.map((num) => [num, new Map()]));
  chrono.forEach((draw, index) => {
    const present = readBalls(draw).filter((num) => hits.has(num));
    for (const num of present) hits.get(num).push({ index, date: draw.date, draw });
    for (const num of present) {
      for (const other of draw.whites) {
        if (other === num) continue;
        const bag = whiteCompanions.get(num);
        bag.set(other, (bag.get(other) || 0) + 1);
      }
      const specialBag = specialCompanions.get(num);
      specialBag.set(draw.special, (specialBag.get(draw.special) || 0) + 1);
    }
  });

  const rows = numbers.map((num) => {
    const appearances = hits.get(num);
    const count = appearances.length;
    let currentGap = drawCount;
    let last = null;
    let previous = null;
    if (count > 0) {
      last = appearances[count - 1];
      previous = count > 1 ? appearances[count - 2] : null;
      currentGap = drawCount - 1 - last.index;
    }
    const misses = [];
    if (count === 0) {
      misses.push({ gap: drawCount, kind: 'never' });
    } else {
      if (appearances[0].index > 0) {
        misses.push({
          gap: appearances[0].index,
          kind: 'start',
          from: chrono[0].date,
          to: appearances[0].date
        });
      }
      for (let i = 0; i < appearances.length - 1; i += 1) {
        misses.push({
          gap: appearances[i + 1].index - appearances[i].index - 1,
          kind: 'between',
          after: appearances[i].date,
          returnDate: appearances[i + 1].date
        });
      }
      if (currentGap > 0) misses.push({ gap: currentGap, kind: 'current', after: last.date });
    }
    misses.sort((a, b) => b.gap - a.gap);
    let distanceSum = 0;
    for (let i = 0; i < appearances.length - 1; i += 1) {
      distanceSum += appearances[i + 1].index - appearances[i].index;
    }
    const yearCounts = new Map();
    for (const hit of appearances) {
      const year = Number(hit.date.slice(0, 4));
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    }
    const newestWindow = (size) => {
      const start = Math.max(0, drawCount - size);
      return appearances.filter((hit) => hit.index >= start).length;
    };
    return {
      num,
      count,
      currentGap,
      last,
      previous,
      longest: misses[0],
      avgDistance: count >= 2 ? distanceSum / (count - 1) : null,
      yearCounts,
      recent25: newestWindow(Math.min(25, drawCount)),
      recent100: newestWindow(Math.min(100, drawCount)),
      window25: Math.min(25, drawCount),
      window100: Math.min(100, drawCount),
      lines: [...appearances].reverse().slice(0, 8),
      whiteCompanions: [...whiteCompanions.get(num).entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 3),
      specialCompanions: [...specialCompanions.get(num).entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 3)
    };
  });

  const byCount = rankMap(rows, (row) => row.count);
  const byGap = rankMap(rows, (row) => row.currentGap);
  const counts = rows.map((row) => row.count).sort((a, b) => a - b);
  const median = counts.length === 0 ? 0 : counts.length % 2 === 1
    ? counts[(counts.length - 1) / 2]
    : (counts[counts.length / 2 - 1] + counts[counts.length / 2]) / 2;
  for (const row of rows) {
    row.rank = byCount.get(row.num);
    row.gapRank = byGap.get(row.num);
    row.median = median;
  }
  return { drawCount, chrono, rows: new Map(rows.map((row) => [row.num, row])), list: rows };
}

function topPhrase(pairs, hrefFor, noun) {
  if (!pairs.length || pairs[0][1] === 0) return '';
  const bits = pairs.filter((pair) => pair[1] > 0).map(([num, count]) => {
    const times = count === 1 ? 'once' : `${comma(count)} times`;
    return `<a href="${hrefFor(num)}">${esc(noun)} ${num}</a> (${times})`;
  });
  if (bits.length === 1) return bits[0];
  if (bits.length === 2) return `${bits[0]} and ${bits[1]}`;
  return `${bits.slice(0, -1).join(', ')}, and ${bits[bits.length - 1]}`;
}

function yearSentence(row, years) {
  if (!years.length) {
    const partial = [...row.yearCounts.entries()].sort((a, b) => a[0] - b[0]);
    if (!partial.length) return 'It has no appearances in this set, so there is no yearly count.';
    const bits = partial.map(([year, count]) => `${count} ${count === 1 ? 'appearance' : 'appearances'} in ${year}`);
    return `This set does not contain a complete calendar year, so a busiest-year label would overread a partial season. The raw yearly counts are ${bits.join(' and ')}.`;
  }
  const countFor = (year) => row.yearCounts.get(year) || 0;
  let busiest = years[0];
  let quietest = years[0];
  for (const year of years) {
    if (countFor(year) > countFor(busiest)) busiest = year;
    if (countFor(year) < countFor(quietest)) quietest = year;
  }
  const busiestTied = years.filter((year) => countFor(year) === countFor(busiest));
  const quietestTied = years.filter((year) => countFor(year) === countFor(quietest));
  const busiestLabel = busiestTied.length > 1 ? `${joinAnd(busiestTied.map(String))} each had` : `${busiest} had`;
  const quietestLabel = quietestTied.length > 1 ? `${joinAnd(quietestTied.map(String))} each had` : `${quietest} had`;
  return `Among complete calendar years in this set (${years[0]}–${years[years.length - 1]}), ${busiestLabel} the most appearances, ${comma(countFor(busiest))}. ${quietestLabel} the fewest, ${comma(countFor(quietest))}.`;
}

function longestSentence(longest, historical) {
  if (!longest || longest.kind === 'never') return 'It has not appeared in this set.';
  if (longest.kind === 'start') {
    return `The longest miss was at the beginning: ${comma(longest.gap)} drawings passed from ${prettyDate(longest.from)} until the first appearance on ${prettyDate(longest.to)}.`;
  }
  if (longest.kind === 'between') {
    return `The longest miss lasted ${comma(longest.gap)} drawings, after ${prettyDate(longest.after)} and before it returned on ${prettyDate(longest.returnDate)}.`;
  }
  const openLabel = historical ? 'That open stretch is inside the retired field only.' : 'That open stretch is the longest miss in the set.';
  return `The longest miss is the one still open at the end of this set: ${comma(longest.gap)} drawings since ${prettyDate(longest.after)}. ${openLabel}`;
}

function lineHtml(draw, game) {
  const whites = draw.whites.map((num) => `<a href="${game.whiteHref(num)}">${num}</a>`).join(', ');
  const special = `<a href="${game.specialHref(draw.special)}">${esc(game.specialName)} ${draw.special}</a>`;
  const multiplier = draw.multiplier == null ? '' : `, multiplier ${esc(draw.multiplier)}×`;
  return `${prettyDate(draw.date)}: white balls ${whites}, and ${special}${multiplier}`;
}

function numberStory(game, row, pool, fullCount, firstDate) {
  const historical = pool.historical;
  const name = `${pool.ballLabel} ${row.num}`;
  const expected = pool.perDraw * pool.analysis.drawCount;
  const diff = row.count - expected;
  const close = Math.abs(diff) / expected < 0.05;
  const direction = diff >= 0 ? 'above' : 'below';
  const spread = close
    ? `within 5 percent of the even-split count of ${oneDecimal(expected)}`
    : `${oneDecimal(Math.abs(diff))} appearances ${direction} the even-split count of ${oneDecimal(expected)}`;
  const tie = row.rank.tied ? `, tied with ${row.rank.tied} other ${row.rank.tied === 1 ? 'number' : 'numbers'}` : '';
  const gapTie = row.gapRank.tied ? `, tied with ${row.gapRank.tied} other ${row.gapRank.tied === 1 ? 'number' : 'numbers'}` : '';
  const paragraphs = [];

  if (historical) {
    paragraphs.push(`<p>${esc(name)} is not in the current Mega Millions drawing. Since the April 8, 2025 drawing, the gold Mega Ball has been taken from 1 through 24. This page counts 25 only in the previous field, ${prettyDate(pool.start)} through ${prettyDate(pool.end)}, when the Mega Ball ran from 1 through 25. A silence after April 4, 2025 is not a gap the game can close.</p>`);
  } else {
    paragraphs.push(`<p>${esc(name)} is tracked here on the current matrix: ${pool.fieldPhrase}, from ${prettyDate(pool.start)} through ${prettyDate(pool.endDate)}. Drawings outside that window are in the full NY Open Data file, and they are reported separately because they used a different field.</p>`);
  }

  const share = pool.kind === 'white'
    ? 'five white balls are drawn from the field each time'
    : 'one special ball is drawn each time';
  const rankSentence = pool.poolSize === 1
    ? ''
    : ` The median count in this pool of ${comma(pool.poolSize)} is ${oneDecimal(row.median)}. ${esc(name)} ranks ${ordinal(row.rank.rank)}${tie}.`;
  paragraphs.push(`<p>In these ${comma(pool.analysis.drawCount)} drawings it appeared ${times(row.count)}. That is ${spread}. An even split gives every ${pool.evenNoun} the same share of those drawings, because ${share}.${rankSentence}</p>`);

  if (row.count === 0) {
    paragraphs.push(`<p>There is no last-drawn date. The ball does not appear in this set.</p>`);
  } else if (historical) {
    const tail = row.currentGap === 0
      ? `It appeared in the last drawing of that field, on ${prettyDate(row.last.date)}.`
      : `Its last appearance inside the 1–25 field was ${prettyDate(row.last.date)}. ${comma(row.currentGap)} later drawings in that field did not include it.`;
    paragraphs.push(`<p>${tail} ${longestSentence(row.longest, true)}</p>`);
  } else if (row.currentGap === 0) {
    paragraphs.push(`<p>It is in the latest drawing of this set, ${prettyDate(row.last.date)}, so the current gap is zero. ${longestSentence(row.longest, false)}</p>`);
  } else {
    paragraphs.push(`<p>The last appearance was ${prettyDate(row.last.date)}, which is ${comma(row.currentGap)} drawings ago. That gap ranks ${ordinal(row.gapRank.rank)} longest in the pool${gapTie}. ${longestSentence(row.longest, false)}</p>`);
  }

  if (row.previous) {
    const distance = row.last.index - row.previous.index;
    paragraphs.push(`<p>The appearance before the latest one was ${prettyDate(row.previous.date)}, ${comma(distance)} drawings earlier. ${row.avgDistance == null ? '' : `Across every pair of successive hits, the average distance is ${oneDecimal(row.avgDistance)} drawings, and that average includes the drawing that brought the number back.`}</p>`);
  } else if (row.avgDistance != null) {
    paragraphs.push(`<p>Across successive hits, the average distance is ${oneDecimal(row.avgDistance)} drawings.</p>`);
  }

  paragraphs.push(`<p>${yearSentence(row, pool.years)} In the latest ${comma(row.window100)} drawings of this set it appeared ${times(row.recent100)}, and in the latest ${comma(row.window25)} it appeared ${times(row.recent25)}. Those windows are a recent stretch of drawings already held.</p>`);

  if (row.last) {
    paragraphs.push(`<p>The most recent line was ${lineHtml(row.last.draw, game)}.</p>`);
  }

  const whitePhrase = topPhrase(row.whiteCompanions, game.whiteHref, 'white ball');
  if (whitePhrase && pool.kind === 'white') {
    paragraphs.push(`<p>When ${esc(name)} was drawn, the other white balls beside it most often were ${whitePhrase}. A pair that leads this list is a pair that happened. The next drawing still takes five white balls from the full field.</p>`);
  }
  if (whitePhrase && pool.kind === 'special') {
    paragraphs.push(`<p>The white balls drawn most often in the same drawing as ${esc(name)} were ${whitePhrase}. Those are companions in the archive, not a combination the game prefers.</p>`);
  }
  const specialPhrase = topPhrase(row.specialCompanions, game.specialHref, game.specialName);
  if (specialPhrase && pool.kind === 'white') {
    paragraphs.push(`<p>The ${esc(game.specialName)} values in those same drawings were led by ${specialPhrase}.</p>`);
  }

  const neighbors = [row.num - 1, row.num + 1].filter((num) => pool.analysis.rows.has(num));
  if (neighbors.length) {
    const bits = neighbors.map((num) => `<a href="${pool.href(num)}">${pool.kind === 'white' ? 'white ball' : game.specialName} ${num}</a> (${comma(pool.analysis.rows.get(num).count)} appearances)`);
    paragraphs.push(`<p>The neighboring ${pool.kind === 'white' ? 'white balls' : 'special balls'} in this same set: ${bits.join(' and ')}. Neighbors are next to each other on the number line only. They are separate balls in the machine.</p>`);
  }

  if (firstDate) {
    const same = fullCount === row.count;
    paragraphs.push(`<p>The full file holds ${comma(pool.fullDraws)} drawings and records ${comma(fullCount)} appearances of ${esc(name)}. The earliest of them is ${prettyDate(firstDate)}. ${same ? 'That full-file count matches the matrix count above, which is what you would expect when the ball was not in the older rows.' : 'The full-file count mixes older matrices, so it is the wrong denominator for a current-game rate. Use the matrix count above for that comparison.'}</p>`);
  } else {
    paragraphs.push(`<p>The full file of ${comma(pool.fullDraws)} drawings does not contain ${esc(name)}.</p>`);
  }

  paragraphs.push(`<p>A gap of ${comma(row.currentGap)} drawings leaves the odds unchanged. ${pool.chanceSentence} The <a href="/learn/hot-cold-overdue.html">hot, cold, and overdue guide</a> and the <a href="/learn/understanding-the-odds.html">odds guide</a> explain that at more length. This page is a record of the archive fetched ${prettyDate(pool.fetched)}.</p>`);
  return paragraphs.join('\n');
}

function numberPage(game, pool, row, fullCount, firstDate) {
  const historical = pool.historical;
  const label = `${pool.ballLabel} ${row.num}`;
  const expected = pool.perDraw * pool.analysis.drawCount;
  const gapLabel = historical ? 'Drawings left in the old field' : 'Current gap';
  const lastText = row.last ? prettyDate(row.last.date) : 'No appearance';
  const description = historical
    ? `Mega Ball 25 appeared ${comma(row.count)} times from ${prettyDate(pool.start)} through ${prettyDate(pool.end)}. It is not in the current 1–24 Mega Ball field.`
    : `${label} appeared ${comma(row.count)} times in ${comma(pool.analysis.drawCount)} drawings since ${prettyDate(pool.start)}. Last drawn ${lastText}. The gap is history, not a forecast.`;
  const lines = row.lines.map((hit) => `<li>${lineHtml(hit.draw, game)}</li>`).join('');
  const prevNum = pool.analysis.rows.has(row.num - 1) ? row.num - 1 : null;
  const nextNum = pool.analysis.rows.has(row.num + 1) ? row.num + 1 : null;
  const pager = `<p class="pager-links">${prevNum ? `<a href="${pool.href(prevNum)}">Previous: ${esc(pool.ballLabel)} ${prevNum}</a>` : '<span></span>'}${nextNum ? `<a href="${pool.href(nextNum)}">Next: ${esc(pool.ballLabel)} ${nextNum}</a>` : '<span></span>'}</p>`;
  const body = `
    <div class="stat-grid">
      <div class="panel"><span>Appearances</span><span class="stat-value">${comma(row.count)}</span><p class="lm-help">Drawings in this set that included it.</p></div>
      <div class="panel"><span>Even split</span><span class="stat-value">${oneDecimal(expected)}</span><p class="lm-help">Count if every number in the pool shared the drawings equally.</p></div>
      <div class="panel"><span>Rank</span><span class="stat-value">${pool.poolSize === 1 ? '—' : ordinal(row.rank.rank)}</span><p class="lm-help">${pool.poolSize === 1 ? 'Only one ball is in this historical set.' : `By appearances in this pool${row.rank.tied ? `, tied with ${row.rank.tied} other ${row.rank.tied === 1 ? 'number' : 'numbers'}` : ''}.`}</p></div>
      <div class="panel"><span>Last drawn</span><span class="stat-value">${row.last ? esc(row.last.date) : '—'}</span><p class="lm-help">${esc(lastText)}.</p></div>
      <div class="panel"><span>${esc(gapLabel)}</span><span class="stat-value">${comma(row.currentGap)}</span><p class="lm-help">Drawings since the last appearance in this set.</p></div>
      <div class="panel"><span>Longest miss</span><span class="stat-value">${comma(row.longest?.gap || 0)}</span><p class="lm-help">Most consecutive drawings missed inside this set.</p></div>
    </div>
    <h2>What the archive shows</h2>
    ${numberStory(game, row, pool, fullCount, firstDate)}
    <h2>Recent drawings in this set</h2>
    ${lines ? `<ul>${lines}</ul>` : '<p>No drawings in this set include this number.</p>'}
    ${pager}
    <h2>Where to go next</h2>
    <ul>
      <li><a href="${game.hub}">All ${esc(game.name)} number statistics</a></li>
      <li><a href="${game.results}">Recent ${esc(game.name)} results</a></li>
      <li><a href="${game.guide}">${esc(game.guideLabel)}</a></li>
      <li><a href="/learn/hot-cold-overdue.html">What a hot or overdue label actually means</a></li>
    </ul>`;
  return renderPage({
    title: `${label}: frequency, last draw, and gap | LotteryMigo`,
    description,
    canonicalPath: pool.href(row.num),
    kicker: historical ? `${game.name} historical ball` : `${game.name} statistics`,
    h1: label,
    bodyHtml: body,
    current: game.nav
  });
}

function hubPage(game, whitePool, specialPool, extraPool) {
  const tableFor = (pool, caption) => {
    const rows = [...pool.analysis.list].sort((a, b) => b.count - a.count || a.num - b.num);
    const body = rows.map((row) => `<tr>
      <td><a href="${pool.href(row.num)}">${esc(pool.noun)} ${row.num}</a></td>
      <td class="num">${comma(row.count)}</td>
      <td class="num">${oneDecimal(pool.perDraw * pool.analysis.drawCount)}</td>
      <td class="num">${comma(row.currentGap)}</td>
      <td>${row.last ? esc(row.last.date) : '—'}</td>
    </tr>`).join('');
    return `<div class="table-scroll"><table>
      <caption>${esc(caption)}</caption>
      <thead><tr><th>Number</th><th>Appearances</th><th>Even split</th><th>Gap</th><th>Last drawn</th></tr></thead>
      <tbody>${body}</tbody>
    </table></div>`;
  };
  const longest = [...whitePool.analysis.list].sort((a, b) => b.currentGap - a.currentGap || a.num - b.num).slice(0, 5);
  const longestSentenceBits = longest.map((row) => `<a href="${whitePool.href(row.num)}">white ball ${row.num}</a> (${comma(row.currentGap)} drawings${row.last ? ` since ${prettyDate(row.last.date)}` : ''})`);
  const body = `
    <p>${esc(game.name)} number pages on LotteryMigo are counts from the NY Open Data archive, split so the current matrix is not averaged together with retired ones. The white-ball table below uses ${comma(whitePool.analysis.drawCount)} drawings from ${prettyDate(whitePool.start)} through ${prettyDate(whitePool.endDate)}. The even-split column is the count each number would have if those drawings had been shared perfectly evenly: ${comma(whitePool.analysis.drawCount)} drawings times 5, divided by ${whitePool.poolSize}.</p>
    <p>The gap column is how many drawings have passed since the number last appeared in that same set. A gap of zero means the number was in the latest drawing. A long gap is a fact about the list. It does not raise the chance that the number is drawn next. White balls are still 5 out of ${whitePool.poolSize} on the next drawing. Read the <a href="/learn/hot-cold-overdue.html">hot, cold, and overdue guide</a> before treating a rank as a tip, and the <a href="${game.guide}">rules guide</a> for the prize chart behind the odds.</p>
    <p>The five longest current white-ball gaps in this set are ${longestSentenceBits.join(', ')}. They are listed so you can open the draw dates, not so you can treat them as due.</p>
    <h2>White balls</h2>
    ${tableFor(whitePool, `${game.name} white balls, current matrix`)}
    <h2>${esc(game.specialName)}</h2>
    <p>The ${esc(game.specialName)} table uses ${comma(specialPool.analysis.drawCount)} drawings from ${prettyDate(specialPool.start)} through ${prettyDate(specialPool.endDate)}. ${game.specialNote}</p>
    ${tableFor(specialPool, `${game.name} ${game.specialName}, current field`)}
    ${extraPool ? `<h2>Historical ${esc(game.specialName)} 25</h2><p><a href="${extraPool.href(25)}">Mega Ball 25</a> was part of the field from ${prettyDate(extraPool.start)} through ${prettyDate(extraPool.end)}. It appeared ${comma(extraPool.analysis.rows.get(25).count)} times in that window. It is not drawn under the current rules.</p>` : ''}
    <p>Recent drawings, with a link on every ball, are on the <a href="${game.results}">${esc(game.name)} results page</a>. The home page chart still uses the full file, which is why its order can differ from the rank on these pages.</p>`;
  return renderPage({
    title: `${game.name} number statistics | LotteryMigo`,
    description: `Frequency, last drawn date, and current gap for every current ${game.name} number, counted from NY Open Data and split by matrix.`,
    canonicalPath: game.hub,
    kicker: `${game.name} statistics`,
    h1: `${game.name} number statistics`,
    bodyHtml: body,
    current: game.nav
  });
}

function resultsPage(game, recent, archiveDraws) {
  const oldest = archiveDraws[archiveDraws.length - 1].date;
  const newest = archiveDraws[0].date;
  const rows = recent.map((draw) => {
    const whites = draw.whites.map((num) => `<a href="${game.whiteHref(num)}">${num}</a>`).join(' ');
    const special = `<a href="${game.specialHref(draw.special)}">${draw.special}</a>`;
    const multiplier = draw.multiplier == null ? '—' : `${esc(draw.multiplier)}×`;
    return `<tr><td>${esc(draw.date)}</td><td class="num">${whites}</td><td class="num">${special}</td><td class="num">${multiplier}</td></tr>`;
  }).join('');
  const body = `
    <p>These are the ${comma(recent.length)} most recent ${esc(game.name)} drawings in the NY Open Data file LotteryMigo copies, from ${prettyDate(recent[recent.length - 1].date)} through ${prettyDate(recent[0].date)}. The full file currently holds ${comma(archiveDraws.length)} drawings, from ${prettyDate(oldest)} through ${prettyDate(newest)}. Every number links to its statistics page.</p>
    <p>${game.resultsNote}</p>
    <p>The list is rebuilt when the archive job runs, at 12:00 UTC on Tuesday, Thursday, and Sunday. A drawing can be missing here for a day after it happens. Check a ticket on the lottery that sold it, or on the official ${esc(game.name)} site. LotteryMigo does not validate tickets and does not guarantee a win.</p>
    <div class="table-scroll">
      <table>
        <caption>Recent ${esc(game.name)} drawings</caption>
        <thead><tr><th>Date</th><th>White balls</th><th>${esc(game.specialName)}</th><th>Multiplier</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p>Prize rules and odds are in <a href="${game.guide}">${esc(game.guideLabel)}</a>. Counts for a single number, including the current gap, are in the <a href="${game.hub}">number statistics</a>.</p>`;
  return renderPage({
    title: `${game.name} results and recent drawings | LotteryMigo`,
    description: `The latest ${recent.length} ${game.name} drawings from the NY Open Data archive, with each number linked to its frequency and gap.`,
    canonicalPath: game.results,
    kicker: `${game.name} results`,
    h1: `Recent ${game.name} results`,
    bodyHtml: body,
    current: game.nav
  });
}

function liveExample(game, pool) {
  const rows = pool.analysis.list;
  const maxCount = Math.max(...rows.map((row) => row.count));
  const minCount = Math.min(...rows.map((row) => row.count));
  const hottest = rows.filter((row) => row.count === maxCount).sort((a, b) => a.num - b.num);
  const coldest = rows.filter((row) => row.count === minCount).sort((a, b) => a.num - b.num);
  const maxGap = Math.max(...rows.map((row) => row.currentGap));
  const quiet = rows.filter((row) => row.currentGap === maxGap).sort((a, b) => a.num - b.num);
  const expected = pool.perDraw * pool.analysis.drawCount;
  const nameList = (list) => list.map((row) => `<a href="${pool.href(row.num)}">white ball ${row.num}</a>`).join(' and ');
  const hotVerb = hottest.length > 1 ? 'are tied for the most appearances' : 'has the most appearances';
  const coldVerb = coldest.length > 1 ? 'are tied for the fewest' : 'has the fewest';
  const quietLead = quiet[0];
  return `<p>Through ${prettyDate(pool.endDate)}, the current Powerball matrix in this archive has ${comma(pool.analysis.drawCount)} drawings. ${nameList(hottest)} ${hotVerb}, at ${comma(hottest[0].count)}. ${nameList(coldest)} ${coldVerb}, at ${comma(coldest[0].count)}. The even-split count for a white ball over those drawings is ${oneDecimal(expected)}. The longest current gap is ${comma(maxGap)} drawings, held by ${nameList(quiet)}, last drawn ${quietLead.last ? prettyDate(quietLead.last.date) : 'never in this set'}. Those are facts about this file. On the next drawing every white ball still has a 5-in-69 chance.</p>
    <p>The pages for ${nameList(hottest)}, ${nameList(coldest)}, and ${nameList(quiet)} list the drawings behind the totals, including the lines those balls actually landed in.</p>`;
}

function learnIndex(liveNote) {
  const items = GUIDES.map((guide) => `<li><h2><a href="/learn/${guide.slug}.html">${esc(guide.h1)}</a></h2><p>${esc(guide.blurb)}</p></li>`).join('');
  const body = `
    <p>These guides explain the current Powerball and Mega Millions games and the limits of a frequency chart. The facts about prices, matrices, prize tiers, and taxes are paraphrased from the official pages linked in each article. LotteryMigo is not those lotteries, and a guide is not a suggestion to buy a ticket.</p>
    <p>The number statistics are a separate set of pages, generated from the same draw file as the home page chart. Start with <a href="/powerball/numbers.html">Powerball numbers</a> or <a href="/megamillions/numbers.html">Mega Millions numbers</a>, or with the <a href="/powerball/results.html">latest Powerball results</a> and <a href="/megamillions/results.html">latest Mega Millions results</a>. ${liveNote}</p>
    <ol class="guide-list">${items}</ol>
    <p>Shorter answers are on the <a href="/faq.html">FAQ</a>. The counting method is on the <a href="/about.html">about page</a>.</p>`;
  return renderPage({
    title: 'Powerball and Mega Millions guides | LotteryMigo',
    description: 'Guides to Powerball and Mega Millions rules, odds, hot and cold numbers, jackpot payouts, taxes, and lottery scams.',
    canonicalPath: '/learn/index.html',
    kicker: 'Guides',
    h1: 'Learn the games, then read the counts',
    bodyHtml: body,
    current: 'guides'
  });
}

function relatedBlock(links) {
  return `<h2>Related pages</h2><ul>${links.map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`).join('')}</ul>`;
}

function fullCountOf(draws, num, kind) {
  let count = 0;
  let first = null;
  const chrono = [...draws].reverse();
  for (const draw of chrono) {
    const hit = kind === 'white' ? draw.whites.includes(num) : draw.special === num;
    if (hit) {
      count += 1;
      if (!first) first = draw.date;
    }
  }
  return { count, first };
}

const data = JSON.parse(await readFile(path.join(root, 'data/draws.json'), 'utf8'));
const fetched = String(data.fetchedAt).slice(0, 10);
const gamesRaw = {
  powerball: [...data.games.POWERBALL.draws].sort((a, b) => (a.date < b.date ? 1 : -1)),
  megamillions: [...data.games.MEGAMILLIONS.draws].sort((a, b) => (a.date < b.date ? 1 : -1))
};

const gameMeta = {
  powerball: {
    name: 'Powerball',
    nav: 'powerball',
    ballLabel: 'Powerball white ball',
    specialName: 'Powerball',
    hub: '/powerball/numbers.html',
    results: '/powerball/results.html',
    guide: '/learn/how-powerball-works.html',
    guideLabel: 'How Powerball works',
    whiteHref: (num) => `/powerball/number/${num}.html`,
    specialHref: (num) => `/powerball/powerball/${num}.html`,
    specialNote: 'Powerball has used 1 through 26 since the October 7, 2015 drawing. Earlier rows in the file use a larger red-ball field, so they are not in this table.',
    resultsNote: 'The multiplier column is the Power Play value stored in the NY Open Data row. Power Play multiplies non-jackpot prizes and is not itself a forecast. A dash means that row did not include a multiplier.',
    chanceWhite: 'Each Powerball white ball has a 5-in-69 chance on the next drawing.',
    chanceSpecial: 'The Powerball has a 1-in-26 chance on the next drawing.'
  },
  megamillions: {
    name: 'Mega Millions',
    nav: 'megamillions',
    ballLabel: 'Mega Millions white ball',
    specialName: 'Mega Ball',
    hub: '/megamillions/numbers.html',
    results: '/megamillions/results.html',
    guide: '/learn/how-mega-millions-works.html',
    guideLabel: 'How Mega Millions works',
    whiteHref: (num) => `/megamillions/number/${num}.html`,
    specialHref: (num) => `/megamillions/megaball/${num}.html`,
    specialNote: 'This table is only the current 1–24 Mega Ball, in use since April 8, 2025. The sample is shorter than the white-ball table because the field change is recent. Mega Ball 25 is listed under it as a historical ball.',
    resultsNote: 'From April 8, 2025 onward, this NY Open Data file does not include the built-in Mega Millions multiplier. A dash in those rows means the value is absent from the file, not that the ticket multiplier was 1. Older rows may show the retired Megaplier when the dataset recorded it. Prize amounts for each multiplier are in the Mega Millions guide.',
    chanceWhite: 'Each current Mega Millions white ball has a 5-in-70 chance on the next drawing.',
    chanceSpecial: 'Each current Mega Ball has a 1-in-24 chance on the next drawing.'
  }
};

function makePool({ game, kind, numbers, start, end, historical, noun, fieldPhrase, chanceSentence, perDraw }) {
  const source = gamesRaw[game.id];
  const era = sliceEra(source, start, end || '9999-12-31');
  const analysis = analyzePool(era, numbers, kind === 'white'
    ? (draw) => draw.whites
    : (draw) => [draw.special]);
  const endDate = era[0]?.date || end;
  return {
    game,
    kind,
    numbers,
    start,
    end: end || null,
    endDate,
    historical: Boolean(historical),
    noun,
    fieldPhrase,
    chanceSentence,
    perDraw,
    poolSize: numbers.length,
    analysis,
    years: fullYears(start, end || endDate),
    fullDraws: source.length,
    fetched,
    ballLabel: kind === 'white' ? `${game.name} white ball` : game.specialName,
    href: kind === 'white' ? game.whiteHref : game.specialHref,
    evenNoun: kind === 'white' ? 'white ball' : 'special ball'
  };
}

const pb = { id: 'powerball', ...gameMeta.powerball };
const mm = { id: 'megamillions', ...gameMeta.megamillions };
const pbWhite = makePool({
  game: pb,
  kind: 'white',
  numbers: Array.from({ length: 69 }, (_, i) => i + 1),
  start: '2015-10-07',
  noun: 'White ball',
  fieldPhrase: '5 white balls from 1 through 69 and a Powerball from 1 through 26',
  chanceSentence: pb.chanceWhite,
  perDraw: 5 / 69
});
const pbSpecial = makePool({
  game: pb,
  kind: 'special',
  numbers: Array.from({ length: 26 }, (_, i) => i + 1),
  start: '2015-10-07',
  noun: 'Powerball',
  fieldPhrase: 'the current Powerball field of 1 through 26',
  chanceSentence: pb.chanceSpecial,
  perDraw: 1 / 26
});
const mmWhite = makePool({
  game: mm,
  kind: 'white',
  numbers: Array.from({ length: 70 }, (_, i) => i + 1),
  start: '2017-10-31',
  noun: 'White ball',
  fieldPhrase: '5 white balls from 1 through 70',
  chanceSentence: mm.chanceWhite,
  perDraw: 5 / 70
});
const mmSpecial = makePool({
  game: mm,
  kind: 'special',
  numbers: Array.from({ length: 24 }, (_, i) => i + 1),
  start: '2025-04-08',
  noun: 'Mega Ball',
  fieldPhrase: 'the current Mega Ball field of 1 through 24',
  chanceSentence: mm.chanceSpecial,
  perDraw: 1 / 24
});
const mm25 = makePool({
  game: mm,
  kind: 'special',
  numbers: [25],
  start: '2017-10-31',
  end: '2025-04-04',
  historical: true,
  noun: 'Mega Ball',
  fieldPhrase: 'the retired Mega Ball field of 1 through 25',
  chanceSentence: 'Mega Ball 25 is not in the current drawing, so it does not have a current-game chance.',
  perDraw: 1 / 25
});

await rm(path.join(root, 'learn'), { recursive: true, force: true });
await rm(path.join(root, 'powerball'), { recursive: true, force: true });
await rm(path.join(root, 'megamillions'), { recursive: true, force: true });

const written = [];
async function emit(rel, html, lastmod) {
  await writeOut(rel, html);
  written.push({ rel, words: articleWords(html), lastmod, html });
}

const example = liveExample(pb, pbWhite);
for (const guide of GUIDES) {
  let body = await readFile(path.join(root, 'content/guides', guide.file), 'utf8');
  if (guide.live) {
    if (!body.includes('<!-- LIVE_EXAMPLE -->')) throw new Error('Hot and cold guide is missing the live example marker.');
    body = body.replace('<!-- LIVE_EXAMPLE -->', example);
  }
  body += relatedBlock(guide.related);
  const html = renderPage({
    title: guide.title,
    description: guide.description,
    canonicalPath: `/learn/${guide.slug}.html`,
    kicker: guide.kicker,
    h1: guide.h1,
    bodyHtml: body,
    current: 'guides'
  });
  await emit(`learn/${guide.slug}.html`, html, guide.live ? fetched : CONTENT_DATE);
}

const learnHtml = learnIndex(`The hot-and-cold guide includes a count through ${prettyDate(pbWhite.endDate)}.`);
await emit('learn/index.html', learnHtml, fetched);

const aboutBody = await readFile(path.join(root, 'content/about-body.html'), 'utf8');
await emit('about.html', renderPage({
  title: 'About LotteryMigo',
  description: 'Who runs LotteryMigo, where the Powerball and Mega Millions draws come from, how number statistics are calculated, and when the archive updates.',
  canonicalPath: '/about.html',
  kicker: 'About',
  h1: 'About LotteryMigo',
  bodyHtml: aboutBody,
  current: 'about'
}), CONTENT_DATE);

const faqBody = await readFile(path.join(root, 'content/faq-body.html'), 'utf8');
await emit('faq.html', renderPage({
  title: 'Powerball and Mega Millions FAQ | LotteryMigo',
  description: 'Answers about LotteryMigo’s draw archive, current Powerball and Mega Millions rules, odds, taxes, scams, and why gaps do not predict the next drawing.',
  canonicalPath: '/faq.html',
  kicker: 'FAQ',
  h1: 'Frequently asked questions',
  bodyHtml: faqBody,
  current: 'faq'
}), CONTENT_DATE);

async function emitPool(pool, meta) {
  for (const num of pool.numbers) {
    const row = pool.analysis.rows.get(num);
    const full = fullCountOf(gamesRaw[meta.id], num, pool.kind);
    const html = numberPage(meta, pool, row, full.count, full.first);
    await emit(pool.href(num).slice(1), html, fetched);
  }
}

await emitPool(pbWhite, pb);
await emitPool(pbSpecial, pb);
await emitPool(mmWhite, mm);
await emitPool(mmSpecial, mm);
await emitPool(mm25, mm);
await emit('powerball/numbers.html', hubPage(pb, pbWhite, pbSpecial, null), fetched);
await emit('megamillions/numbers.html', hubPage(mm, mmWhite, mmSpecial, mm25), fetched);
await emit('powerball/results.html', resultsPage(pb, gamesRaw.powerball.slice(0, 100), gamesRaw.powerball), fetched);
await emit('megamillions/results.html', resultsPage(mm, gamesRaw.megamillions.slice(0, 100), gamesRaw.megamillions), fetched);

const staticUrls = [
  ['/', CONTENT_DATE],
  ['/privacy.html', CONTENT_DATE],
  ['/terms.html', CONTENT_DATE],
  ['/contact.html', CONTENT_DATE]
];
const urls = [
  ...staticUrls,
  ...written.map((page) => [`/${page.rel}`.replace('/about.html', '/about.html'), page.lastmod])
];
const unique = [];
const seen = new Set();
for (const [loc, lastmod] of urls) {
  const href = loc === '/learn/index.html' ? '/learn/index.html' : loc;
  if (seen.has(href)) continue;
  seen.add(href);
  unique.push([href, lastmod]);
}
unique.sort((a, b) => a[0].localeCompare(b[0]));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${unique.map(([loc, lastmod]) => `  <url><loc>https://lotterymigo.com${loc === '/index.html' ? '/' : loc}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`;
await writeFile(path.join(root, 'sitemap.xml'), sitemap);

const linkTargets = new Set(written.map((page) => `/${page.rel}`));
linkTargets.add('/privacy.html');
linkTargets.add('/terms.html');
linkTargets.add('/contact.html');
linkTargets.add('/');
const missing = [];
for (const page of written) {
  const hrefs = page.html.match(/href="(\/[^"]+)"/g) || [];
  for (const raw of hrefs) {
    const href = raw.slice(6, -1);
    if (href.startsWith('/assets/') || href.startsWith('/icons/') || href === '/manifest.webmanifest') continue;
    if (!linkTargets.has(href)) missing.push(`${page.rel} -> ${href}`);
  }
}
if (missing.length) {
  console.error(missing.slice(0, 20).join('\n'));
  throw new Error(`${missing.length} internal links do not match a generated page.`);
}

const byRel = (prefix) => written.filter((page) => page.rel.startsWith(prefix));
function summarize(list) {
  const counts = list.map((page) => page.words).sort((a, b) => a - b);
  if (!counts.length) return null;
  return { pages: counts.length, min: counts[0], median: counts[Math.floor(counts.length / 2)], max: counts[counts.length - 1] };
}
const report = {
  fetched,
  sitemap: unique.length,
  guides: written.filter((page) => page.rel.startsWith('learn/') && page.rel !== 'learn/index.html').map((page) => ({ page: page.rel, words: page.words })),
  learnIndex: written.find((page) => page.rel === 'learn/index.html').words,
  about: written.find((page) => page.rel === 'about.html').words,
  faq: written.find((page) => page.rel === 'faq.html').words,
  powerballNumbers: summarize(byRel('powerball/number/')),
  powerballSpecials: summarize(byRel('powerball/powerball/')),
  megaWhite: summarize(byRel('megamillions/number/')),
  megaBall: summarize(byRel('megamillions/megaball/')),
  hubs: written.filter((page) => page.rel.endsWith('numbers.html') || page.rel.endsWith('results.html')).map((page) => ({ page: page.rel, words: page.words }))
};
console.log(JSON.stringify(report, null, 2));

const shortGuide = report.guides.find((guide) => guide.words < 800);
if (shortGuide) throw new Error(`${shortGuide.page} is under 800 words (${shortGuide.words}).`);
if (report.about < 500) throw new Error('About page is thinner than intended.');
if (report.faq < 700) throw new Error('FAQ is thinner than intended.');
