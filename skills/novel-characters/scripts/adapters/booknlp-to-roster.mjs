#!/usr/bin/env node
// Optional adapter: convert BookNLP English outputs into roster-NN.json.
// Does not install or run BookNLP. Node.js 18+; stdlib only.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { isMainModule } from '../lib/main.mjs';

const usage = () => `booknlp-to-roster.mjs — 把 BookNLP 英文輸出轉成 roster JSON

  node booknlp-to-roster.mjs <book.entities> [--quotes book.quotes] [--out roster-00.json]

不依賴 Python。中文小說請不要使用此轉接器。`;

function parseTable(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\t+/));
}

export function entitiesToRoster(entitiesText, quotesText = '') {
  const groups = new Map();
  for (const columns of parseTable(entitiesText)) {
    if (columns.length < 6) continue;
    const [coref, , , mentionType, category, ...rest] = columns;
    const text = rest.join(' ').trim();
    if (!text || String(category).toUpperCase() !== 'PER') continue;
    const kind = String(mentionType).toUpperCase();
    if (kind === 'PRON') continue;
    const group = groups.get(coref) ?? { names: new Map(), quotes: [] };
    group.names.set(text, (group.names.get(text) ?? 0) + 1);
    groups.set(coref, group);
  }

  for (const columns of parseTable(quotesText)) {
    if (columns.length < 7) continue;
    const coref = columns[5];
    const quote = columns.slice(6).join(' ').trim();
    const group = groups.get(coref);
    if (!group || !quote || group.quotes.includes(quote)) continue;
    group.quotes.push(quote);
  }

  const characters = [...groups.values()].map((group) => {
    const ranked = [...group.names.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
    const name = ranked[0]?.[0];
    return {
      name,
      aliases: ranked.slice(1).map(([alias]) => alias),
      note: 'Imported from BookNLP entities. Inspect before profile pass.',
      quotes: group.quotes,
    };
  }).filter((entry) => entry.name);

  return { characters };
}

function main(argv) {
  const [entitiesPath, ...rest] = argv;
  if (!entitiesPath || entitiesPath === '-h' || entitiesPath === '--help') {
    console.log(usage());
    process.exit(entitiesPath ? 0 : 1);
  }
  const quotesIndex = rest.indexOf('--quotes');
  const outIndex = rest.indexOf('--out');
  const quotesPath = quotesIndex >= 0 ? rest[quotesIndex + 1] : null;
  const outPath = outIndex >= 0 ? rest[outIndex + 1] : null;
  const roster = entitiesToRoster(
    readFileSync(resolve(entitiesPath), 'utf8'),
    quotesPath ? readFileSync(resolve(quotesPath), 'utf8') : '',
  );
  const json = `${JSON.stringify(roster, null, 2)}\n`;
  if (outPath) {
    const resolved = resolve(outPath);
    mkdirSync(join(resolved, '..'), { recursive: true });
    writeFileSync(resolved, json, 'utf8');
    console.log(JSON.stringify({ characters: roster.characters.length, out: resolved, source: basename(entitiesPath) }, null, 2));
    return;
  }
  process.stdout.write(json);
}

if (isMainModule(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
