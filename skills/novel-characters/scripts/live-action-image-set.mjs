#!/usr/bin/env node
// Deterministic validator, auditor, and Markdown renderer for live-action image sets.
// Node.js 18+; no third-party dependencies.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditManifest } from './live-action/audit.mjs';
import { renderMarkdown } from './live-action/renderer.mjs';
import { LIVE_ACTION_VERSION, REQUIRED_SHOTS, slug } from './live-action/shared.mjs';
import { validateManifest } from './live-action/validator.mjs';

export { auditManifest, LIVE_ACTION_VERSION, renderMarkdown, REQUIRED_SHOTS, slug, validateManifest };

const parseJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const usage = () => `Usage:
  node live-action-image-set.mjs validate <live-action.json> [cast.json]
  node live-action-image-set.mjs render <live-action.json> --md
  node live-action-image-set.mjs audit <live-action.json> [base-directory] [cast.json]
  node live-action-image-set.mjs slug <character-name>`;

function runCli(argv) {
  const [command, input, ...rest] = argv;
  if (!command || command === '-h' || command === '--help') return console.log(usage());
  if (command === 'slug') {
    if (!input) throw new Error('slug 需要角色名稱');
    return console.log(slug(input));
  }
  if (!input) throw new Error(`${command} 需要輸入檔案`);
  const manifestPath = resolve(input);
  const manifest = parseJson(manifestPath);

  if (command === 'validate') {
    const cast = rest[0] ? parseJson(resolve(rest[0])) : null;
    const problems = validateManifest(manifest, cast);
    if (problems.length) {
      for (const problem of problems) console.error(`- ${problem}`);
      process.exitCode = 1;
      return;
    }
    return console.log(`OK: ${manifest.characters.length} 位角色、${manifest.characters.reduce((n, c) => n + c.shots.length, 0)} 張圖片設定`);
  }

  if (command === 'render') {
    if (!rest.includes('--md')) throw new Error('render 目前只支援 --md');
    const problems = validateManifest(manifest);
    if (problems.length) throw new Error(`設定未通過驗證：\n${problems.map((p) => `- ${p}`).join('\n')}`);
    return process.stdout.write(renderMarkdown(manifest));
  }

  if (command === 'audit') {
    const baseDirectory = rest[0] && !rest[0].endsWith('.json') ? rest[0] : dirname(manifestPath);
    const castPath = rest.find((item) => item.endsWith('.json'));
    const cast = castPath ? parseJson(resolve(castPath)) : null;
    const problems = auditManifest(manifest, baseDirectory, cast);
    if (problems.length) {
      for (const problem of problems) console.error(`- ${problem}`);
      process.exitCode = 1;
      return;
    }
    return console.log('OK: 圖片狀態與實際檔案一致');
  }
  throw new Error(`未知指令：${command}\n${usage()}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    runCli(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
