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
  --max-distance <n>    身份雜湊最大漢明距離，0–64 的整數（預設 ${DEFAULT_MAX_DISTANCE}）`;

function parseArguments(args, { booleans = [], values = [] } = {}) {
  const booleanOptions = new Set(booleans);
  const valueOptions = new Set(values);
  const options = new Map();
  const positionals = [];

  for (let index = 0; index < args.length; index += 1) {
    const raw = args[index];
    const item = String(raw);
    if (!item.startsWith('--')) {
      positionals.push(raw);
      continue;
    }
    if (options.has(item)) throw new Error(`選項重複：${item}`);
    if (booleanOptions.has(item)) {
      options.set(item, true);
      continue;
    }
    if (valueOptions.has(item)) {
      const value = args[index + 1];
      if (value == null || String(value).startsWith('--')) throw new Error(`${item} 需要值`);
      options.set(item, value);
      index += 1;
      continue;
    }
    throw new Error(`未知選項：${item}`);
  }

  return {
    positionals,
    has: (name) => options.has(name),
    get: (name) => options.get(name) ?? null,
  };
}

function parseMaxDistance(value) {
  if (value == null) return DEFAULT_MAX_DISTANCE;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 64) {
    throw new Error('--max-distance 必須是 0–64 的整數');
  }
  return parsed;
}

export function runCli(argv) {
  const [command, input, ...rest] = argv;
  if (!command || command === '-h' || command === '--help') return console.log(usage());
  if (command === 'slug') {
    if (!input) throw new Error('slug 需要角色名稱');
    if (rest.length) throw new Error(`slug 收到多餘參數：${rest.join(' ')}`);
    return console.log(slug(input));
  }
  if (!input) throw new Error(`${command} 需要輸入檔案`);
  const manifestPath = resolve(input);
  const manifest = parseJson(manifestPath);

  if (command === 'validate') {
    const parsed = parseArguments(rest);
    if (parsed.positionals.length > 1) throw new Error('validate 最多接受一個 cast.json');
    const cast = parsed.positionals[0] ? parseJson(resolve(parsed.positionals[0])) : null;
    const problems = validateManifest(manifest, cast);
    if (problems.length) {
      for (const problem of problems) console.error(`- ${problem}`);
      process.exitCode = 1;
      return;
    }
    return console.log(`OK: ${manifest.characters.length} 位角色、${manifest.characters.reduce((n, c) => n + c.shots.length, 0)} 張圖片設定`);
  }

  if (command === 'render') {
    const parsed = parseArguments(rest, { booleans: ['--md'] });
    if (parsed.positionals.length) throw new Error(`render 收到多餘參數：${parsed.positionals.join(' ')}`);
    if (!parsed.has('--md')) throw new Error('render 目前只支援 --md');
    const problems = validateManifest(manifest);
    if (problems.length) throw new Error(`設定未通過驗證：\n${problems.map((p) => `- ${p}`).join('\n')}`);
    return process.stdout.write(renderMarkdown(manifest));
  }

  if (command === 'compose-sequence') {
    const parsed = parseArguments(rest, { values: ['--character'] });
    if (parsed.positionals.length) throw new Error(`compose-sequence 收到多餘參數：${parsed.positionals.join(' ')}`);
    const characterName = parsed.get('--character');
    const sequence = composeSequence(manifest, characterName);
    if (characterName && !sequence.length) throw new Error(`找不到角色：${characterName}`);
    return process.stdout.write(`${JSON.stringify({ source: manifest.source, mode: manifest.mode, characters: sequence }, null, 2)}\n`);
  }

  if (command === 'audit') {
    const parsed = parseArguments(rest, {
      booleans: ['--no-identity-score'],
      values: ['--max-distance'],
    });
    if (parsed.positionals.length > 2) throw new Error('audit 最多接受 base-directory 與 cast.json 兩個位置參數');

    let baseDirectory = dirname(manifestPath);
    let castPath = null;
    if (parsed.positionals.length === 1) {
      const [only] = parsed.positionals;
      if (String(only).toLowerCase().endsWith('.json')) castPath = only;
      else baseDirectory = only;
    } else if (parsed.positionals.length === 2) {
      [baseDirectory, castPath] = parsed.positionals;
    }

    const cast = castPath ? parseJson(resolve(castPath)) : null;
    const problems = auditManifest(manifest, baseDirectory, cast, {
      scoreIdentity: !parsed.has('--no-identity-score'),
      maxDistance: parseMaxDistance(parsed.get('--max-distance')),
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
