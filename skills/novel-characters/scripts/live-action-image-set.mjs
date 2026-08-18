#!/usr/bin/env node
// Deterministic validator, auditor, and Markdown renderer for visual image packs.
// Supports live-action and comic sidecars. Node.js 18+; no third-party dependencies.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { isMainModule } from './lib/main.mjs';
import { DEFAULT_MAX_DISTANCE } from './lib/identity-score.mjs';
import { composeSequence } from './lib/sequence.mjs';
import { auditManifest } from './live-action/audit.mjs';
import { renderMarkdown } from './live-action/renderer.mjs';
import {
  LIVE_ACTION_VERSION, REQUIRED_SHOTS, VISUAL_MODES, VISUAL_PACK_VERSION, getVisualMode, slug,
} from './live-action/shared.mjs';
import { validateManifest } from './live-action/validator.mjs';

export {
  auditManifest, composeSequence, LIVE_ACTION_VERSION, REQUIRED_SHOTS, VISUAL_MODES, VISUAL_PACK_VERSION,
  getVisualMode, renderMarkdown, slug, validateManifest,
};

const parseJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const usage = () => `Usage:
  node live-action-image-set.mjs validate <visual-pack.json> [cast.json]
  node live-action-image-set.mjs render <visual-pack.json> --md
  node live-action-image-set.mjs audit <visual-pack.json> [base-directory] [cast.json]
  node live-action-image-set.mjs compose-sequence <visual-pack.json> [--character <name>]
  node live-action-image-set.mjs slug <character-name>

audit 選項：
  --no-identity-score   只檢查 PNG 檔頭與比例，不比對 identity-board 雜湊
  --max-distance <n>    身份雜湊最大漢明距離（預設 ${DEFAULT_MAX_DISTANCE}）`;

export function runCli(argv) {
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

  if (command === 'compose-sequence') {
    const nameIndex = rest.indexOf('--character');
    const characterName = nameIndex >= 0 ? rest[nameIndex + 1] : null;
    const sequence = composeSequence(manifest, characterName);
    if (characterName && !sequence.length) throw new Error(`找不到角色：${characterName}`);
    return process.stdout.write(`${JSON.stringify({ source: manifest.source, mode: manifest.mode, characters: sequence }, null, 2)}\n`);
  }

  if (command === 'audit') {
    const positional = rest.filter((item, index, all) => !String(item).startsWith('-') && all[index - 1] !== '--max-distance');
    const baseDirectory = positional[0] && !positional[0].endsWith('.json') ? positional[0] : dirname(manifestPath);
    const castPath = positional.find((item) => item.endsWith('.json'));
    const cast = castPath ? parseJson(resolve(castPath)) : null;
    const maxIndex = rest.indexOf('--max-distance');
    const problems = auditManifest(manifest, baseDirectory, cast, {
      scoreIdentity: !rest.includes('--no-identity-score'),
      maxDistance: maxIndex >= 0 ? Number(rest[maxIndex + 1]) : DEFAULT_MAX_DISTANCE,
    });
    if (problems.length) {
      for (const problem of problems) console.error(`- ${problem}`);
      process.exitCode = 1;
      return;
    }
    return console.log('OK: 圖片狀態與實際檔案一致');
  }
  throw new Error(`未知指令：${command}\n${usage()}`);
}

if (isMainModule(import.meta.url)) {
  try {
    runCli(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
