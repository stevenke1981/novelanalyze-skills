#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeCheckerPng, encodeSolidPng } from './lib/png.mjs';
import {
  auditManifest,
  composeSequence,
  renderMarkdown,
  validateManifest,
} from './comic-image-set.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(here, '../examples/渡口-comic.json');
const liveActionPath = resolve(here, '../examples/渡口-live-action.json');
const castPath = resolve(here, '../examples/渡口-cast.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const liveAction = JSON.parse(readFileSync(liveActionPath, 'utf8'));
const cast = JSON.parse(readFileSync(castPath, 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));

assert.deepEqual(validateManifest(fixture, cast), [], 'bundled comic fixture must validate');
assert.deepEqual(validateManifest(liveAction, cast), [], 'live-action fixture must still validate through the shared engine');

{
  const broken = clone(fixture);
  broken.mode = 'live-action';
  const problems = validateManifest(broken, cast);
  assert.ok(problems.some((problem) => problem.includes('images/live-action/')));
}

{
  const broken = clone(fixture);
  broken.characters[0].shots[0].promptZh += ' 沈知微。';
  const problems = validateManifest(broken, cast);
  assert.ok(problems.some((problem) => problem.includes('不得包含角色名：沈知微')));
}

{
  const broken = clone(fixture);
  broken.characters[0].shots[0].promptZh += ' 渡口。';
  const problems = validateManifest(broken, cast);
  assert.ok(problems.some((problem) => problem.includes('不得包含書名：渡口')));
}

{
  const broken = clone(fixture);
  broken.characters[0].shots = broken.characters[0].shots.filter((shot) => shot.id !== 'wardrobe-board');
  const problems = validateManifest(broken, cast);
  assert.ok(problems.some((problem) => problem.includes('缺少必要圖片：wardrobe-board')));
}

{
  const markdown = renderMarkdown(fixture);
  assert.match(markdown, /渡口 · 漫畫版圖片組設定/);
  assert.match(markdown, /漫畫角色身份固定參考圖表/);
  assert.match(markdown, /images\/comic\/沈知微\/07-cinematic-keyframe\.png/);
  assert.match(markdown, /畫風層級/);
}

{
  const markdown = renderMarkdown(liveAction);
  assert.match(markdown, /渡口 · 真人版圖片組設定/);
  assert.match(markdown, /寫實層級/);
}

{
  const root = mkdtempSync(join(tmpdir(), 'novel-comic-'));
  try {
    const audited = clone(fixture);
    const shot = audited.characters[0].shots[0];
    shot.status = 'PASS';
    let problems = auditManifest(audited, root, cast);
    assert.ok(problems.some((problem) => problem.includes('status=PASS 但檔案不存在')));

    const absolute = resolve(root, shot.output);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, 'not-empty');
    problems = auditManifest(audited, root, cast);
    assert.ok(problems.some((problem) => problem.includes('不是有效 PNG')));

    writeFileSync(absolute, encodeSolidPng(32, 20, [180, 40, 40]));
    problems = auditManifest(audited, root, cast);
    assert.deepEqual(problems, []);

    writeFileSync(absolute, encodeSolidPng(20, 32, [180, 40, 40]));
    problems = auditManifest(audited, root, cast);
    assert.ok(problems.some((problem) => problem.includes('比例不符')));

    const face = audited.characters[0].shots.find((item) => item.id === 'face-angles');
    face.status = 'PASS';
    const facePath = resolve(root, face.output);
    mkdirSync(dirname(facePath), { recursive: true });
    writeFileSync(absolute, encodeCheckerPng(32, 20, [220, 40, 40], [40, 40, 40]));
    writeFileSync(facePath, encodeCheckerPng(32, 20, [40, 40, 220], [220, 220, 40]));
    problems = auditManifest(audited, root, cast);
    assert.ok(problems.some((problem) => problem.includes('身份分數過低')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

{
  const broken = clone(fixture);
  broken.characters[0].states[1].parent = 'missing';
  assert.ok(validateManifest(broken, cast).some((problem) => problem.includes('parent 找不到')));
}

{
  const sequence = composeSequence(fixture, '沈知微');
  assert.equal(sequence.length, 1);
  assert.equal(sequence[0].shots.length, 7);
  assert.match(sequence[0].shots[0].prompt, /approved identity-board/);
}

console.log('comic selftest: PASS');
