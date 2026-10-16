import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = path.join(ROOT, 'data', 'draws.json');

const DATASETS = {
  POWERBALL: {
    id: 'd6yy-54nr',
    name: 'Lottery Powerball Winning Numbers: Beginning 2010',
    page: 'https://data.ny.gov/d/d6yy-54nr',
    resource: 'https://data.ny.gov/resource/d6yy-54nr.json'
  },
  MEGAMILLIONS: {
    id: '5xaw-6ayf',
    name: 'Lottery Mega Millions Winning Numbers: Beginning 2002',
    page: 'https://data.ny.gov/d/5xaw-6ayf',
    resource: 'https://data.ny.gov/resource/5xaw-6ayf.json'
  }
};

async function fetchJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'lotterymigo-draw-fetch'
        },
        signal: AbortSignal.timeout(60000)
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
}

async function fetchDataset(resource) {
  const rows = [];
  const pageSize = 5000;
  for (let offset = 0; offset < 50000; offset += pageSize) {
    const url = new URL(resource);
    url.searchParams.set('$limit', String(pageSize));
    url.searchParams.set('$offset', String(offset));
    url.searchParams.set('$order', 'draw_date DESC');
    const batch = await fetchJson(url);
    if (!Array.isArray(batch)) throw new Error('Socrata response was not an array for ' + resource);
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

function parseDate(value) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function parseNumbers(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(token => Number.parseInt(token, 10));
}

function parseMultiplier(value) {
  if (value == null || value === '') return null;
  const number = Number.parseInt(String(value), 10);
  return Number.isFinite(number) ? number : null;
}

function parsePowerball(row) {
  const date = parseDate(row.draw_date);
  const numbers = parseNumbers(row.winning_numbers);
  if (!date || numbers.length !== 6 || numbers.some(number => !Number.isInteger(number) || number < 1)) return null;
  const special = numbers[5];
  const whites = numbers.slice(0, 5).sort((a, b) => a - b);
  return { date, whites, special, multiplier: parseMultiplier(row.multiplier) };
}

function parseMegaMillions(row) {
  const date = parseDate(row.draw_date);
  const whites = parseNumbers(row.winning_numbers).sort((a, b) => a - b);
  const special = Number.parseInt(String(row.mega_ball || ''), 10);
  if (!date || whites.length !== 5 || whites.some(number => !Number.isInteger(number) || number < 1)) return null;
  if (!Number.isInteger(special) || special < 1) return null;
  return { date, whites, special, multiplier: parseMultiplier(row.multiplier) };
}

function dedupeNewestFirst(draws) {
  const byDate = new Map();
  draws.forEach(draw => byDate.set(draw.date, draw));
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

async function readExisting() {
  try {
    return JSON.parse(await readFile(OUT_PATH, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function sameDraws(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function main() {
  const existing = await readExisting();
  const games = {};

  for (const [key, dataset] of Object.entries(DATASETS)) {
    const rows = await fetchDataset(dataset.resource);
    const parser = key === 'POWERBALL' ? parsePowerball : parseMegaMillions;
    const parsed = rows.map(parser).filter(Boolean);
    const draws = dedupeNewestFirst(parsed);
    if (draws.length < 500) {
      throw new Error(dataset.id + ' returned only ' + draws.length + ' usable draws');
    }
    const previousCount = existing && existing.games && existing.games[key] ? existing.games[key].draws.length : 0;
    if (previousCount && draws.length < previousCount) {
      throw new Error('Refusing to shrink ' + key + ' from ' + previousCount + ' to ' + draws.length + ' draws');
    }
    games[key] = {
      datasetId: dataset.id,
      name: dataset.name,
      sourceUrl: dataset.page,
      latestDrawDate: draws[0].date,
      drawCount: draws.length,
      draws
    };
    console.log(key + ' ' + dataset.id + ': ' + rows.length + ' rows, ' + draws.length + ' draws, latest ' + draws[0].date);
  }

  if (existing && existing.games && sameDraws(existing.games, games)) {
    console.log('Draw archive unchanged.');
    return;
  }

  const payload = {
    source: 'NY Open Data (data.ny.gov)',
    fetchedAt: new Date().toISOString(),
    games
  };
  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n');
  console.log('Wrote ' + path.relative(ROOT, OUT_PATH));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
