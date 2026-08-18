#!/usr/bin/env node
// Deterministic validator and Markdown renderer for novel-bible.
// Node.js 18+; no third-party dependencies.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isMainModule } from './main.mjs';

export const BIBLE_VERSION = '1.0';
export const CONTRADICTION_STATUS = new Set(['open', 'resolved', 'disputed']);
export const THREAD_STATUS = new Set(['open', 'resolved']);

const HAN = /[㐀-鿿]/;
const SIMPLIFIED = /[这们为发说国过还进关门间图视质体现实声语线并计设备转录应从对会无长经动样书车马风电头话亲该结构认读写听觉给仅让带难义远处级选删导侧页汇总标]/;

const looksZhTw = (value) => {
  const text = String(value ?? '');
  return HAN.test(text) && !SIMPLIFIED.test(text) && !/[぀-ヿ가-힯]/.test(text);
};
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const keyOf = (value) => String(value ?? '').trim().normalize('NFKC').toLocaleLowerCase();

function castNames(cast) {
  const names = new Set();
  for (const character of cast?.characters ?? []) {
    if (isNonEmptyString(character?.name)) names.add(keyOf(character.name));
    for (const alias of character?.aliases ?? []) {
      if (isNonEmptyString(alias)) names.add(keyOf(alias));
    }
  }
  return names;
}

function checkEvidence(evidence, label, source, problems) {
  if (!Array.isArray(evidence) || evidence.length < 1) {
    problems.push(`${label}.evidence 至少需要一條原文`);
    return;
  }
  evidence.forEach((quote, index) => {
    if (!isNonEmptyString(quote)) {
      problems.push(`${label}.evidence[${index}] 必須是非空字串`);
      return;
    }
    if (source && !source.includes(quote.replace(/\r\n?/g, '\n'))) {
      problems.push(`${label}.evidence[${index}] 不是原文逐字片段`);
    }
  });
}

export function validateBible(bible, sourceText = null, cast = null) {
  const problems = [];
  if (!bible || typeof bible !== 'object' || Array.isArray(bible)) return ['bible 必須是 JSON 物件'];
  if (bible.version !== BIBLE_VERSION) problems.push(`version 必須是 ${BIBLE_VERSION}`);
  if (!isNonEmptyString(bible.source)) problems.push('source 缺失或為空');
  if (cast && isNonEmptyString(cast.source) && bible.source !== cast.source) {
    problems.push('source 與 cast.json.source 不一致');
  }

  for (const field of ['timeline', 'relationships', 'contradictions', 'threads']) {
    if (!Array.isArray(bible[field])) problems.push(`${field} 必須是陣列`);
  }

  const source = sourceText == null ? null : String(sourceText).replace(/\r\n?/g, '\n');
  const names = cast ? castNames(cast) : null;
  const total = ['timeline', 'relationships', 'contradictions', 'threads']
    .reduce((sum, field) => sum + (Array.isArray(bible[field]) ? bible[field].length : 0), 0);
  if (total < 1) problems.push('timeline/relationships/contradictions/threads 合計至少一條');

  const known = (value, label) => {
    if (!names) return;
    if (!names.has(keyOf(value))) problems.push(`${label} 不在 cast.json 的角色名或別名中：${value}`);
  };

  for (const [index, event] of (bible.timeline ?? []).entries()) {
    const label = `timeline[${index}]`;
    if (!isNonEmptyString(event?.id)) problems.push(`${label}.id 缺失`);
    if (!Number.isInteger(event?.order) || event.order < 1) problems.push(`${label}.order 必須是正整數`);
    if (!looksZhTw(event?.when)) problems.push(`${label}.when 必須使用台灣繁體中文`);
    if (!looksZhTw(event?.what)) problems.push(`${label}.what 必須使用台灣繁體中文`);
    if (!Array.isArray(event?.who) || event.who.length < 1) problems.push(`${label}.who 至少需要一位角色`);
    else event.who.forEach((name, whoIndex) => {
      if (!isNonEmptyString(name)) problems.push(`${label}.who[${whoIndex}] 必須是非空字串`);
      else known(name, `${label}.who[${whoIndex}]`);
    });
    checkEvidence(event?.evidence, label, source, problems);
  }

  for (const [index, rel] of (bible.relationships ?? []).entries()) {
    const label = `relationships[${index}]`;
    if (!isNonEmptyString(rel?.from)) problems.push(`${label}.from 缺失`);
    else known(rel.from, `${label}.from`);
    if (!isNonEmptyString(rel?.to)) problems.push(`${label}.to 缺失`);
    else known(rel.to, `${label}.to`);
    if (!looksZhTw(rel?.relation)) problems.push(`${label}.relation 必須使用台灣繁體中文`);
    checkEvidence(rel?.evidence, label, source, problems);
  }

  for (const [index, item] of (bible.contradictions ?? []).entries()) {
    const label = `contradictions[${index}]`;
    if (!isNonEmptyString(item?.id)) problems.push(`${label}.id 缺失`);
    if (!looksZhTw(item?.summary)) problems.push(`${label}.summary 必須使用台灣繁體中文`);
    if (!CONTRADICTION_STATUS.has(item?.status)) problems.push(`${label}.status 必須是 open/resolved/disputed`);
    checkEvidence(item?.evidence, label, source, problems);
  }

  for (const [index, item] of (bible.threads ?? []).entries()) {
    const label = `threads[${index}]`;
    if (!isNonEmptyString(item?.id)) problems.push(`${label}.id 缺失`);
    if (!looksZhTw(item?.name)) problems.push(`${label}.name 必須使用台灣繁體中文`);
    if (!THREAD_STATUS.has(item?.status)) problems.push(`${label}.status 必須是 open/resolved`);
    checkEvidence(item?.evidence, label, source, problems);
  }

  return problems;
}

export function renderMarkdown(bible) {
  const lines = [`# ${bible.source} · 情節聖經`, ''];
  if ((bible.timeline ?? []).length) {
    lines.push('## 時間線', '');
    for (const event of [...bible.timeline].sort((a, b) => a.order - b.order)) {
      lines.push(`### ${event.order}. ${event.when}`);
      lines.push('');
      lines.push(event.what);
      lines.push('');
      lines.push(`- 人物：${(event.who ?? []).join('、')}`);
      for (const quote of event.evidence ?? []) lines.push(`- 引文：${quote}`);
      lines.push('');
    }
  }
  if ((bible.relationships ?? []).length) {
    lines.push('## 關係', '');
    for (const rel of bible.relationships) {
      lines.push(`- **${rel.from} → ${rel.to}**：${rel.relation}`);
      for (const quote of rel.evidence ?? []) lines.push(`  - ${quote}`);
    }
    lines.push('');
  }
  if ((bible.contradictions ?? []).length) {
    lines.push('## 矛盾', '');
    for (const item of bible.contradictions) {
      lines.push(`- **${item.id}**（${item.status}）：${item.summary}`);
      for (const quote of item.evidence ?? []) lines.push(`  - ${quote}`);
    }
    lines.push('');
  }
  if ((bible.threads ?? []).length) {
    lines.push('## 線索', '');
    for (const item of bible.threads) {
      lines.push(`- **${item.name}**（${item.status}）`);
      for (const quote of item.evidence ?? []) lines.push(`  - ${quote}`);
    }
    lines.push('');
  }
  return `${lines.join('\n').trim()}\n`;
}

const usage = () => `Usage:
  node novel-bible.mjs validate <bible.json> [book.txt] [cast.json]
  node novel-bible.mjs render <bible.json> --md`;

export function runCli(argv) {
  const [command, input, ...rest] = argv;
  if (!command || command === '-h' || command === '--help') return console.log(usage());
  if (!input) throw new Error(`${command} 需要輸入檔案`);
  const bible = JSON.parse(readFileSync(resolve(input), 'utf8'));
  if (command === 'validate') {
    const book = rest[0] ? readFileSync(resolve(rest[0]), 'utf8') : null;
    const cast = rest[1] ? JSON.parse(readFileSync(resolve(rest[1]), 'utf8')) : null;
    const problems = validateBible(bible, book, cast);
    if (problems.length) {
      for (const problem of problems) console.error(`- ${problem}`);
      process.exitCode = 1;
      return;
    }
    return console.log(`OK: ${bible.source} bible`);
  }
  if (command === 'render') {
    if (!rest.includes('--md')) throw new Error('render 目前只支援 --md');
    const problems = validateBible(bible);
    if (problems.length) throw new Error(`設定未通過驗證：\n${problems.map((item) => `- ${item}`).join('\n')}`);
    return process.stdout.write(renderMarkdown(bible));
  }
  throw new Error(`未知指令：${command}\n${usage()}`);
}

if (isMainModule(import.meta.url)) {
  try {
    runCli(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
