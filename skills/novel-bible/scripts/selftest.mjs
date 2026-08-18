#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdown, validateBible } from './novel-bible.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bible = JSON.parse(readFileSync(join(here, '../examples/渡口-bible.json'), 'utf8'));
const book = readFileSync(join(here, '../../novel-characters/examples/渡口.txt'), 'utf8');
const cast = JSON.parse(readFileSync(join(here, '../../novel-characters/examples/渡口-cast.json'), 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));

assert.deepEqual(validateBible(bible, book, cast), [], 'bundled bible fixture must validate');

{
  const broken = clone(bible);
  broken.timeline[0].evidence = ['這句原文裡沒有'];
  assert.ok(validateBible(broken, book, cast).some((problem) => problem.includes('不是原文逐字片段')));
}

{
  const broken = clone(bible);
  broken.relationships[0].from = '不存在的人';
  assert.ok(validateBible(broken, book, cast).some((problem) => problem.includes('不在 cast.json')));
}

{
  const markdown = renderMarkdown(bible);
  assert.match(markdown, /渡口 · 情節聖經/);
  assert.match(markdown, /陸行遠口袋裡的硬物/);
}

console.log('novel-bible selftest: PASS');
