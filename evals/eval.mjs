#!/usr/bin/env node
// Deterministic evals for public-domain fixtures. No model calls.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chunkTextWithMeta, selectRoster, validateCast } from '../skills/novel-characters/scripts/novel-characters.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, 'fixtures');

const goldFiles = readdirSync(fixturesDir).filter((name) => name.endsWith('.gold.json')).sort();
assert.ok(goldFiles.length >= 2, '至少需要中文與英文各一份黃金檔');

let passed = 0;
const ok = (condition, label) => {
  assert.ok(condition, label);
  passed += 1;
};

for (const goldName of goldFiles) {
  const gold = JSON.parse(readFileSync(join(fixturesDir, goldName), 'utf8'));
  const textName = goldName.replace(/\.gold\.json$/, '.txt');
  const text = readFileSync(join(fixturesDir, textName), 'utf8');
  const normalised = text.replace(/\r\n?/g, '\n');
  const { truncated } = chunkTextWithMeta(text);
  eqTruncated(truncated, gold.truncated_expected, gold.id);

  ok(Array.isArray(gold.characters) && gold.characters.length > 0, `${gold.id} 有角色黃金標註`);
  for (const character of gold.characters) {
    ok(normalised.includes(character.name), `${gold.id} 原文含角色名「${character.name}」`);
    for (const alias of character.aliases ?? []) {
      ok(normalised.includes(alias), `${gold.id} 原文含別名「${alias}」`);
    }
    ok((character.quotes ?? []).length > 0, `${gold.id}/${character.name} 至少有一條逐字引文`);
    for (const quote of character.quotes ?? []) {
      ok(normalised.includes(quote.replace(/\r\n?/g, '\n')), `${gold.id} 引文是原文連續片段：${quote}`);
    }
  }

  const leakCast = [{
    name: gold.characters[0].name,
    aliases: gold.characters[0].aliases ?? [],
    importance: 'protagonist',
    oneLiner: '評測用角色卡，只檢查書名是否洩漏進圖像提示詞。',
    persona: {
      gender: '未標',
      ageRange: '未標',
      identity: '評測卡',
      appearance: '不進入圖像提示詞。',
      personality: ['安靜', '警覺', '克制'],
      temperament: '評測用描述。',
      motivation: '評測用描述。',
      arc: '評測用描述。',
      relationships: [{ name: '無', relation: '評測用' }],
      evidence: gold.characters[0].quotes,
    },
    image: {
      style: 'Flat vector cartoon',
      prompt: `Character sheet inspired by ${gold.source}`,
      promptZh: '角色設定圖，不含書名。',
      negativePrompt: 'photorealistic, blur',
      tags: ['flat vector', 'character sheet', 'clean lineup', 'ink wash'],
      turnaround: 'Orthographic turnaround of the same character on a white background.',
    },
    voice: {
      timbre: '平穩中音',
      pitch: '中',
      pace: '中等',
      accent: '無特殊口音',
      emotion: '平靜',
      prompt: 'A calm mid-range speaking voice with even pacing.',
      promptZh: '平穩中音，節奏平均。',
      referenceHint: '評測用音色描述',
    },
  }];
  ok(
    validateCast(leakCast, text, { source: gold.source, author: gold.author }).some((problem) => problem.includes('書名')),
    `${gold.id} 書名進入英文提示詞會被擋`,
  );
}

const ranked = [
  { name: '漁人', aliases: ['武陵人'] },
  { name: '劉子驥', aliases: [] },
  { name: '太守', aliases: [] },
];
assert.deepEqual(selectRoster(ranked, { top: 2 }).map((entry) => entry.name), ['漁人', '劉子驥']);
assert.deepEqual(selectRoster(ranked, { names: ['武陵人'] }).map((entry) => entry.name), ['漁人']);
passed += 2;

console.log(`✓ evals: ${passed} 項通過（${goldFiles.length} 份黃金檔）`);

function eqTruncated(actual, expected, id) {
  assert.equal(Boolean(actual), Boolean(expected), `${id} truncated 應為 ${expected}`);
  passed += 1;
}
