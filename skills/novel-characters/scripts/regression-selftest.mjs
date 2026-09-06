#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectChapters, planHierarchicalChunks } from './lib/parts.mjs';
import { composeShotPrompt } from './lib/sequence.mjs';
import { runCli, validateManifest } from './live-action-image-set.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(here, '../examples/渡口-live-action.json');
const castPath = resolve(here, '../examples/渡口-cast.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const cast = JSON.parse(readFileSync(castPath, 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));

{
  const chapters = detectChapters([
    '序言',
    '',
    '這段內容位於第一章之前，不得遺失。',
    '',
    '第一章 啟程',
    '',
    '甲出發。',
    '',
    '第二章 抵達',
    '',
    '乙抵達。',
  ].join('\n'));
  assert.equal(chapters?.length, 3);
  assert.equal(chapters[0].id, 'front-matter');
  assert.match(chapters[0].text, /不得遺失/);
  assert.equal(chapters[1].id, 'chapter-00');
}

{
  const boundedChunker = (value) => {
    const text = String(value ?? '');
    return {
      chunks: text ? [text.slice(0, 100)] : [],
      truncated: text.length > 100,
    };
  };
  const source = `第一章 過長章節\n\n${'甲'.repeat(450)}\n\n第二章 短章\n\n乙抵達。`;
  const plan = planHierarchicalChunks(source, {
    chapters: true,
    chunkWithMeta: boundedChunker,
    capacity: 100,
  });
  assert.equal(plan.mode, 'chapters');
  assert.equal(plan.truncated, false);
  assert.ok(plan.parts.length > 2);
  assert.ok(plan.parts.every((part) => part.truncated === false));
  assert.ok(plan.parts.some((part) => part.id.startsWith('chapter-00-part-')));
  assert.ok(plan.parts.some((part) => part.text.includes('第二章 短章')));
}

{
  const composed = composeShotPrompt(
    {
      styleBible: {
        realityLevel: 'Photorealistic live action.',
        capture: { cameraSystem: 'Full-frame cinema camera.' },
        globalNegativePrompt: '',
      },
    },
    { basePrompt: 'A fictional adult character.', characterNegativePrompt: '' },
    { id: 'portrait', aspectRatio: '4:5', prompt: 'Neutral portrait.', negativePrompt: '' },
  );
  assert.match(composed.prompt, /approved identity-board/);
  assert.equal(composed.negativePrompt, '');
}

{
  const broken = clone(fixture);
  broken.characters[0].states = [];
  for (const shot of broken.characters[0].shots) delete shot.state;
  broken.characters[0].shots[0].state = 'missing-state';
  const problems = validateManifest(broken, cast);
  assert.ok(problems.some((problem) => problem.includes('state 找不到：missing-state')));
}

assert.throws(
  () => runCli(['compose-sequence', fixturePath, '--character']),
  /--character 需要值/,
);
assert.throws(
  () => runCli(['audit', fixturePath, '--max-distance', '65']),
  /--max-distance 必須是 0–64 的整數/,
);
assert.throws(
  () => runCli(['audit', fixturePath, '--unknown']),
  /未知選項：--unknown/,
);

console.log('regression selftest: PASS');
