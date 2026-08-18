#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeSolidPng } from './lib/png.mjs';
import {
  auditManifest,
  renderMarkdown,
  validateManifest,
} from './live-action-image-set.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(here, '../examples/渡口-live-action.json');
const castPath = resolve(here, '../examples/渡口-cast.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const cast = JSON.parse(readFileSync(castPath, 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));

assert.deepEqual(validateManifest(fixture, cast), [], 'bundled live-action fixture must validate');

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
  broken.characters[0].shots = broken.characters[0].shots.filter((shot) => shot.id !== 'expression-grid');
  const problems = validateManifest(broken, cast);
  assert.ok(problems.some((problem) => problem.includes('缺少必要圖片：expression-grid')));
}

{
  const broken = clone(fixture);
  broken.characters[0].shots[1].output = broken.characters[0].shots[0].output;
  const problems = validateManifest(broken, cast);
  assert.ok(problems.some((problem) => problem.includes('output 與其他圖片重複')));
}

{
  const markdown = renderMarkdown(fixture);
  assert.match(markdown, /渡口 · 真人版圖片組設定/);
  assert.match(markdown, /角色身份固定參考圖表/);
  assert.match(markdown, /images\/live-action\/沈知微\/07-cinematic-keyframe\.png/);
}

{
  const root = mkdtempSync(join(tmpdir(), 'novel-live-action-'));
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
    writeFileSync(absolute, encodeSolidPng(32, 20, [40, 80, 40]));
    problems = auditManifest(audited, root, cast);
    assert.deepEqual(problems, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

console.log('live-action selftest: PASS');
