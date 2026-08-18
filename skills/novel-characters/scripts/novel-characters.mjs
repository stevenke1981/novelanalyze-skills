#!/usr/bin/env node
// novel-characters — deterministic helpers for the novel-characters skill.
// Zero dependencies on purpose: the skill must work in any directory
// without an npm install. Node 18+ (stdlib only).

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { isMainModule } from './lib/main.mjs';
import { collectForbiddenNames, containsName, describeForbiddenHit, loadDenylist } from './lib/names.mjs';
import { effectiveChunkCapacity, planHierarchicalChunks } from './lib/parts.mjs';
import { harvestQuotes } from './lib/quotes.mjs';
import { slug } from './lib/slug.mjs';
import { exportCastToTavernV2 } from './lib/tavern.mjs';

export { harvestQuotes, planHierarchicalChunks, exportCastToTavernV2 };

/* ------------------------------------------------------------------ */
/* chunk                                                               */
/* ------------------------------------------------------------------ */

export const CHUNK_SIZE = 14_000;
export const CHUNK_OVERLAP = 600;
export const MAX_CHUNKS = 24;

/**
 * Split source text on paragraph boundaries into overlapping chunks.
 * Overlap keeps a character introduced at a chunk seam visible to both sides.
 */
export function chunkTextWithMeta(text) {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return { chunks: [], truncated: false };
  if (clean.length <= CHUNK_SIZE) return { chunks: [clean], truncated: false };

  const chunks = [];
  let cursor = 0;
  let lastEnd = 0;

  while (cursor < clean.length && chunks.length < MAX_CHUNKS) {
    let end = Math.min(cursor + CHUNK_SIZE, clean.length);

    if (end < clean.length) {
      // Prefer a paragraph break, then a sentence end, inside the last 20%.
      const windowStart = cursor + Math.floor(CHUNK_SIZE * 0.8);
      const window = clean.slice(windowStart, end);
      const para = window.lastIndexOf('\n\n');
      const sentence = Math.max(
        window.lastIndexOf('。'),
        window.lastIndexOf('！'),
        window.lastIndexOf('？'),
        window.lastIndexOf('. '),
      );
      const offset = para >= 0 ? para : sentence;
      if (offset >= 0) end = windowStart + offset + 1;
    }

    chunks.push(clean.slice(cursor, end).trim());
    lastEnd = end;
    if (end >= clean.length) break;
    cursor = Math.max(end - CHUNK_OVERLAP, cursor + 1);
  }

  return { chunks, truncated: lastEnd < clean.length };
}

export function chunkText(text) {
  return chunkTextWithMeta(text).chunks;
}

/* ------------------------------------------------------------------ */
/* merge                                                               */
/* ------------------------------------------------------------------ */

/**
 * Merge per-chunk rosters into one cast, keyed by name AND alias so that
 * 陸行遠 / 陸 / 姑娘 collapse onto the same person regardless of which
 * chunk saw which form first.
 */
export function mergeRoster(batches) {
  const byKey = new Map();
  const keyOf = (s) => String(s).trim().toLowerCase();
  const createTarget = (name) => {
    const target = { name: String(name).trim(), aliases: [], notes: [], quotes: [] };
    Object.defineProperties(target, {
      _nameCounts: { value: new Map(), enumerable: false },
      _chunkIds: { value: new Set(), enumerable: false },
    });
    return target;
  };

  for (const [batchIndex, batch] of (batches ?? []).entries()) {
    for (const entry of batch ?? []) {
      if (!entry?.name) continue;
      const aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
      const candidates = [entry.name, ...aliases].map(keyOf).filter(Boolean);
      const matched = [...new Set(candidates.map((candidate) => byKey.get(candidate)).filter(Boolean))];
      const target = matched[0] ?? createTarget(entry.name);

      // A later observation can bridge two groups that were previously separate.
      // Merge every matched group and redirect all of its index keys to one target.
      for (const other of matched.slice(1)) {
        for (const alias of [other.name, ...other.aliases]) {
          const trimmed = String(alias).trim();
          if (trimmed && trimmed !== target.name && !target.aliases.includes(trimmed)) target.aliases.push(trimmed);
        }
        for (const note of other.notes) if (!target.notes.includes(note)) target.notes.push(note);
        for (const quote of other.quotes) if (!target.quotes.includes(quote)) target.quotes.push(quote);
        for (const [observedName, count] of other._nameCounts.entries()) {
          target._nameCounts.set(observedName, (target._nameCounts.get(observedName) ?? 0) + count);
        }
        for (const chunkId of other._chunkIds) target._chunkIds.add(chunkId);
        for (const [key, value] of byKey.entries()) if (value === other) byKey.set(key, target);
      }

      const observedName = String(entry.name).trim();
      target._nameCounts.set(observedName, (target._nameCounts.get(observedName) ?? 0) + 1);
      target._chunkIds.add(batchIndex);

      for (const alias of [entry.name, ...aliases]) {
        const trimmed = String(alias).trim();
        if (trimmed && trimmed !== target.name && !target.aliases.includes(trimmed)) {
          target.aliases.push(trimmed);
        }
      }
      if (entry.note && String(entry.note).trim()) target.notes.push(String(entry.note).trim());
      for (const quote of entry.quotes ?? []) {
        const trimmed = String(quote).trim();
        if (trimmed && !target.quotes.includes(trimmed)) target.quotes.push(trimmed);
      }

      for (const c of candidates) byKey.set(c, target);
    }
  }

  // Collapse the alias-keyed index back to one entry per character.
  const unique = new Map();
  for (const value of byKey.values()) unique.set(keyOf(value.name), value);
  const result = [...new Set(unique.values())];
  for (const target of result) {
    const rankedNames = [...target._nameCounts.entries()].sort(
      (a, b) => b[1] - a[1] || Array.from(b[0]).length - Array.from(a[0]).length,
    );
    if (rankedNames.length) target.name = rankedNames[0][0];
    target.aliases = [...new Set([...target.aliases, ...rankedNames.map(([name]) => name)])].filter(
      (alias) => keyOf(alias) !== keyOf(target.name),
    );
  }
  // More distinct chunks mentioning a character == more screen time.
  return result.sort((a, b) => b._chunkIds.size - a._chunkIds.size);
}

export { slug };

export const DEFAULT_TOP = 10;

const rosterKey = (value) => String(value ?? '').trim().toLowerCase();

function rosterEntries(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.characters)) return value.characters;
  throw new Error('select 輸入必須是角色陣列或含 characters 陣列的 JSON');
}

/**
 * Keep the already-ranked merge output. Does not assign importance.
 * --names is an explicit allow-list and wins over --top.
 */
export function selectRoster(input, options = {}) {
  const entries = rosterEntries(input);
  if (!entries.length) return [];

  const named = Array.isArray(options.names)
    ? options.names.map((name) => String(name).trim()).filter(Boolean)
    : [];
  if (named.length) {
    const selected = [];
    const seen = new Set();
    for (const wanted of named) {
      const key = rosterKey(wanted);
      const match = entries.find((entry) => {
        const candidates = [entry?.name, ...(Array.isArray(entry?.aliases) ? entry.aliases : [])]
          .map(rosterKey)
          .filter(Boolean);
        return candidates.includes(key);
      });
      if (!match) throw new Error(`找不到指定角色：${wanted}`);
      const id = rosterKey(match.name);
      if (seen.has(id)) continue;
      seen.add(id);
      selected.push(match);
    }
    return selected;
  }

  const top = options.top === undefined ? DEFAULT_TOP : Number(options.top);
  if (!Number.isInteger(top) || top < 1) throw new Error('--top 必須是正整數');
  return entries.slice(0, top);
}

/* ------------------------------------------------------------------ */
/* validate                                                            */
/* ------------------------------------------------------------------ */

const IMPORTANCE = ['protagonist', 'major', 'supporting', 'minor'];
const HAN = /[㐀-鿿]/;
const CJK = /[㐀-鿿぀-ヿ가-힯]/;
// 僅列入不會與繁體中文混淆的常見簡體字，避免把原本合法的字誤判。
const SIMPLIFIED_CHINESE = /[这们为发说国过还进关门间图视质体现实声语线并计设备转录应从对会无长经动样书车马风电头话亲该结构认读写听觉给仅让带难义远处级选删导侧页汇总标]/;

const PERSONA_STRINGS = ['gender', 'ageRange', 'identity', 'appearance', 'temperament', 'motivation', 'arc'];
const IMAGE_STRINGS = ['style', 'prompt', 'promptZh', 'negativePrompt'];
const VOICE_STRINGS = ['timbre', 'pitch', 'pace', 'accent', 'emotion', 'prompt', 'promptZh', 'referenceHint'];
/** These must read as Chinese — the model drifts to English without a check. */
const VOICE_MUST_BE_ZH = ['timbre', 'pitch', 'pace', 'accent', 'emotion', 'referenceHint'];
/** These go to image models, which choke on CJK and bias on names. */
const IMAGE_MUST_BE_EN = ['style', 'prompt', 'negativePrompt', 'turnaround'];
const VOICE_MUST_BE_EN = ['prompt'];

const normaliseLineEndings = (s) => String(s).replace(/\r\n?/g, '\n');
const looksChinese = (s) => {
  const value = String(s);
  if (/[぀-ヿ가-힯]/.test(value)) return false;
  const hanCount = (value.match(/[㐀-鿿]/g) ?? []).length;
  const latinCount = (value.match(/[A-Za-z]/g) ?? []).length;
  return hanCount > 0 && latinCount <= Math.max(6, hanCount);
};
export function validateCast(characters, sourceText, options = {}) {
  const problems = [];
  const normalisedSource = sourceText === null ? null : normaliseLineEndings(sourceText);
  const at = (name, msg) => problems.push(`[${name}] ${msg}`);
  const seenNames = new Set();
  const seenSlugs = new Set();

  if (!Array.isArray(characters) || characters.length === 0) {
    return ['cast 為空或不是陣列'];
  }

  for (const c of characters) {
    const name = c?.name ?? '(無名)';

    // --- structure ---
    if (typeof c?.name !== 'string' || !c.name.trim()) {
      at(name, '缺少 name');
    } else {
      const nameKey = c.name.trim().normalize('NFKC').toLocaleLowerCase();
      if (seenNames.has(nameKey)) at(name, '角色名稱重複，請加入可區分的稱呼');
      seenNames.add(nameKey);
      const nameSlug = slug(c.name);
      if (seenSlugs.has(nameSlug)) at(name, `安全檔名衝突：${nameSlug}`);
      seenSlugs.add(nameSlug);
    }
    if (!Array.isArray(c?.aliases)) {
      at(name, 'aliases 必須是陣列');
    } else {
      c.aliases.forEach((alias, index) => {
        if (typeof alias !== 'string' || !alias.trim()) at(name, `aliases[${index}] 必須是非空字串`);
      });
    }
    if (!IMPORTANCE.includes(c?.importance)) {
      at(name, `importance 必須是 ${IMPORTANCE.join('/')}，實際是 ${JSON.stringify(c?.importance)}`);
    }
    if (typeof c?.oneLiner !== 'string' || !c.oneLiner.trim()) at(name, '缺少 oneLiner');

    const persona = c?.persona;
    if (!persona || typeof persona !== 'object') {
      at(name, '缺少 persona');
    } else {
      for (const f of PERSONA_STRINGS) {
        if (typeof persona[f] !== 'string' || !persona[f].trim()) at(name, `persona.${f} 缺失或為空`);
      }
      if (!Array.isArray(persona.personality)) {
        at(name, 'persona.personality 必須是陣列');
      } else {
        if (persona.personality.length < 3 || persona.personality.length > 5) {
          at(name, 'persona.personality 必須有 3–5 個項目');
        }
        persona.personality.forEach((value, index) => {
          if (typeof value !== 'string' || !value.trim()) {
            at(name, `persona.personality[${index}] 必須是非空字串`);
          }
        });
      }
      if (!Array.isArray(persona.relationships)) {
        at(name, 'persona.relationships 必須是陣列');
      } else {
        persona.relationships.forEach((relationship, index) => {
          if (!relationship || typeof relationship !== 'object' || Array.isArray(relationship)) {
            at(name, `persona.relationships[${index}] 必須是物件`);
            return;
          }
          if (typeof relationship.name !== 'string' || !relationship.name.trim()) {
            at(name, `persona.relationships[${index}].name 必須是非空字串`);
          }
          if (typeof relationship.relation !== 'string' || !relationship.relation.trim()) {
            at(name, `persona.relationships[${index}].relation 必須是非空字串`);
          }
        });
      }
      if (!Array.isArray(persona.evidence)) {
        at(name, 'persona.evidence 必須是陣列');
      } else {
        persona.evidence.forEach((quote, index) => {
          if (typeof quote !== 'string' || !quote.trim()) {
            at(name, `persona.evidence[${index}] 必須是非空字串`);
          }
        });
      }
    }

    const image = c?.image;
    if (!image || typeof image !== 'object') {
      at(name, '缺少 image');
    } else {
      for (const f of IMAGE_STRINGS) {
        if (typeof image[f] !== 'string' || !image[f].trim()) at(name, `image.${f} 缺失或為空`);
      }
      if (typeof image.turnaround !== 'string' || !image.turnaround.trim()) {
        at(name, 'image.turnaround 缺失或為空（三視圖提示詞）');
      }
      if (!Array.isArray(image.tags)) {
        at(name, 'image.tags 必須是陣列');
      } else {
        if (image.tags.length < 4 || image.tags.length > 8) at(name, 'image.tags 必須有 4–8 個項目');
        image.tags.forEach((tag, index) => {
          if (typeof tag !== 'string' || !tag.trim()) at(name, `image.tags[${index}] 必須是非空字串`);
        });
      }
    }

    const voice = c?.voice;
    if (!voice || typeof voice !== 'object') {
      at(name, '缺少 voice');
    } else {
      for (const f of VOICE_STRINGS) {
        if (typeof voice[f] !== 'string' || !voice[f].trim()) at(name, `voice.${f} 缺失或為空`);
      }
    }

    // --- evidence must be verbatim ---
    if (normalisedSource !== null && Array.isArray(persona?.evidence)) {
      for (const quote of persona.evidence) {
        if (typeof quote === 'string' && quote.trim() && !normalisedSource.includes(normaliseLineEndings(quote))) {
          at(name, `引文不是原文逐字片段：${quote}`);
        }
      }
    }

    // --- no name leakage into image prompts ---
    if (image) {
      const forbidden = collectForbiddenNames({
        name: c?.name,
        aliases: c?.aliases,
        source: options.source,
        author: options.author,
        extra: options.extraNames,
      });
      for (const field of ['prompt', 'promptZh', 'negativePrompt', 'turnaround']) {
        const value = image[field];
        if (typeof value !== 'string') continue;
        for (const entry of forbidden) {
          if (containsName(value, entry.value)) {
            at(name, `image.${field} 裡出現了${describeForbiddenHit(entry)}「${entry.value}」`);
          }
        }
      }
    }

    // --- language split ---
    if (voice) {
      for (const f of VOICE_MUST_BE_ZH) {
        const v = voice[f];
        if (typeof v === 'string' && v.trim() && !looksChinese(v)) {
          at(name, `voice.${f} 應為中文，實際是「${v}」`);
        }
      }
      for (const f of VOICE_MUST_BE_EN) {
        const v = voice[f];
        if (typeof v === 'string' && CJK.test(v)) at(name, `voice.${f} 應為英文，但含中日韓字元`);
      }
    }
    if (image) {
      for (const f of IMAGE_MUST_BE_EN) {
        const v = image[f];
        if (typeof v === 'string' && CJK.test(v)) {
          at(name, `image.${f} 應為英文，但含中日韓字元`);
        }
      }
      if (Array.isArray(image.tags)) {
        for (const t of image.tags) {
          if (typeof t === 'string' && CJK.test(t)) at(name, `image.tags 應為英文，但「${t}」含中日韓字元`);
        }
      }
    }

    // --- 台灣繁體中文；名稱、別名與逐字引文必須保留原文，因此不檢查 ---
    const traditionalFields = [
      ['oneLiner', c?.oneLiner],
      ...PERSONA_STRINGS.map((field) => [`persona.${field}`, persona?.[field]]),
      ...(Array.isArray(persona?.personality)
        ? persona.personality.map((value, index) => [`persona.personality[${index}]`, value])
        : []),
      ...(Array.isArray(persona?.relationships)
        ? persona.relationships.map((value, index) => [`persona.relationships[${index}].relation`, value?.relation])
        : []),
      ['image.promptZh', image?.promptZh],
      ...VOICE_MUST_BE_ZH.map((field) => [`voice.${field}`, voice?.[field]]),
      ['voice.promptZh', voice?.promptZh],
    ];
    for (const [field, value] of traditionalFields) {
      if (typeof value === 'string') {
        if (value.trim() && !looksChinese(value)) at(name, `${field} 應包含中文內容`);
        const match = value.match(SIMPLIFIED_CHINESE);
        if (match) at(name, `${field} 應使用台灣繁體中文，但含簡體字「${match[0]}」`);
      }
    }
  }

  return problems;
}

/* ------------------------------------------------------------------ */
/* render — markdown                                                   */
/* ------------------------------------------------------------------ */

const IMPORTANCE_LABEL = {
  protagonist: '主角',
  major: '主要角色',
  supporting: '配角',
  minor: '次要角色',
};

const safeRelativeDirectory = (value) => {
  if (typeof value !== 'string') return null;
  const normalised = value.replace(/\\/g, '/').replace(/\/+$/g, '');
  if (!normalised || normalised.startsWith('/') || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalised)) return null;
  const segments = normalised.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return null;
  if (!segments.every((segment) => /^[A-Za-z0-9㐀-鿿._-]+$/.test(segment))) return null;
  return normalised;
};

const safeLocalImagePath = (value) => {
  if (typeof value !== 'string') return null;
  const normalised = value.replace(/\\/g, '/');
  const slash = normalised.lastIndexOf('/');
  const directory = slash >= 0 ? normalised.slice(0, slash) : null;
  const filename = slash >= 0 ? normalised.slice(slash + 1) : normalised;
  if (directory !== null && !safeRelativeDirectory(directory)) return null;
  if (!/^[A-Za-z0-9㐀-鿿._-]+\.(?:png|jpe?g|webp)$/i.test(filename)) return null;
  return directory ? `${directory}/${filename}` : filename;
};

const assertRenderableCharacters = (characters) => {
  const problems = validateCast(characters, null);
  if (problems.length) throw new Error(`角色資料無法渲染：\n${problems.map((problem) => `- ${problem}`).join('\n')}`);
};

const markdownEscapeHtml = (value) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const markdownProse = (value) => markdownEscapeHtml(value).replace(/([\\`*_[\]{}()#+.!|>-])/g, '\\$1');
const markdownInline = (value) => markdownProse(value).replace(/[\r\n]+/g, ' ');
const markdownFence = (value) => {
  const text = String(value ?? '');
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return [fence + 'text', text, fence];
};
const markdownCodeSpan = (value) => {
  const text = String(value ?? '');
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = '`'.repeat(Math.max(1, longest + 1));
  return `${fence}${text}${fence}`;
};
const markdownBlockquote = (value) =>
  markdownProse(value).split(/\r?\n/).map((line) => `> ${line}`).join('\n');

export function renderMarkdown(characters, source, summary = '') {
  assertRenderableCharacters(characters);
  const out = [
    `# ${markdownInline(source)} — 角色表`,
    '',
    `共 ${characters.length} 位角色：${characters.map((c) => markdownInline(c.name)).join('、')}`,
    '',
  ];
  if (summary) out.push('## 故事摘要', '', markdownProse(summary), '');

  for (const c of characters) {
    const { persona, image, voice } = c;
    out.push('---', '');
    out.push(`## ${markdownInline(c.name)}${c.aliases.length ? `（${c.aliases.map(markdownInline).join('、')}）` : ''}`, '');
    out.push(`> ${markdownInline(IMPORTANCE_LABEL[c.importance] ?? c.importance)} · ${markdownInline(c.oneLiner)}`, '');

    const turnaroundImage = safeLocalImagePath(c.turnaroundImage);
    if (turnaroundImage) out.push(`![${markdownInline(c.name)} 三視圖](${turnaroundImage})`, '');

    out.push('### 人物分析', '');
    out.push(`- **性別**：${markdownInline(persona.gender)}`);
    out.push(`- **年齡**：${markdownInline(persona.ageRange)}`);
    out.push(`- **身分**：${markdownInline(persona.identity)}`);
    if (persona.personality.length) out.push(`- **性格**：${persona.personality.map(markdownInline).join(' / ')}`);
    out.push('');
    out.push(`**外貌**　${markdownProse(persona.appearance)}`, '');
    out.push(`**性情**　${markdownProse(persona.temperament)}`, '');
    out.push(`**動機**　${markdownProse(persona.motivation)}`, '');
    out.push(`**人物弧光**　${markdownProse(persona.arc)}`, '');

    if (persona.relationships.length) {
      out.push('**關係**', '');
      for (const r of persona.relationships) out.push(`- ${markdownInline(r.name)} — ${markdownProse(r.relation)}`);
      out.push('');
    }
    if (persona.evidence.length) {
      out.push('**原文依據**', '');
      for (const q of persona.evidence) out.push(markdownBlockquote(q), '');
    }

    out.push('### 卡通形象提示詞', '');
    out.push(`**風格**　${markdownInline(image.style)}`, '');
    if (image.tags.length) out.push(`**標籤**　${image.tags.map(markdownCodeSpan).join('、')}`, '');
    out.push(...markdownFence(image.prompt), '');
    out.push(`中文：${markdownProse(image.promptZh)}`, '');
    out.push('**Negative prompt**', '', ...markdownFence(image.negativePrompt), '');
    out.push('**三視圖 prompt**', '', ...markdownFence(image.turnaround), '');

    out.push('### 音色提示詞', '');
    out.push(`- **音色**：${markdownProse(voice.timbre)}`);
    out.push(`- **音高**：${markdownProse(voice.pitch)}`);
    out.push(`- **語速**：${markdownProse(voice.pace)}`);
    out.push(`- **口音**：${markdownProse(voice.accent)}`);
    out.push(`- **情緒**：${markdownProse(voice.emotion)}`);
    out.push(`- **類比**：${markdownProse(voice.referenceHint)}`, '');
    out.push(...markdownFence(voice.prompt), '');
    out.push(`中文：${markdownProse(voice.promptZh)}`, '');
  }

  return out.join('\n');
}

/* ------------------------------------------------------------------ */
/* render — html                                                       */
/* ------------------------------------------------------------------ */
/*
 * 設計約定見 references/report-style.md。三條不能破的：
 *   1. 雙字域：宋體=書本原文，黑體=模型分析，等寬=餵給機器的提示詞
 *   2. 不藏內容——沒有頁籤、沒有摺疊，整頁可以 Cmd+F
 *   3. 「（推斷）」自動高亮，讓讀者一眼分清有據和補全
 */

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * 把推斷標記包起來——這是本報告的簽名細節，不是裝飾。
 * 半形/全形括號 × 推斷/inferred 四種寫法都要認：提示詞雖然規定了寫法，
 * 但模型實際會四種都產出，渲染器不能挑食。
 */
const INFERRED = /（\s*(?:推斷|inferred)[^）]*）|\(\s*(?:推斷|inferred)[^)]*\)/gi;
const marked = (s) => esc(s).replace(INFERRED, (m) => `<span class="inf">${m}</span>`);

const IMPORTANCE_ORDER = ['protagonist', 'major', 'supporting', 'minor'];

/** 一段提示詞 + 它自己的複製按鈕。 */
const promptBlock = (label, value, cls = 'mono') =>
  !value
    ? ''
    : `<div class="pb">
<div class="pb-h"><span class="pb-l">${esc(label)}</span><button class="copy" data-copy="${esc(value)}">複製</button></div>
<p class="${cls}">${esc(value)}</p>
</div>`;

const row = (label, value) =>
  !value ? '' : `<div class="row"><dt>${esc(label)}</dt><dd>${marked(value)}</dd></div>`;

const para = (label, body) =>
  !body ? '' : `<div class="para"><h4>${esc(label)}</h4><p>${marked(body)}</p></div>`;

function renderEntry(c, index) {
  const { persona, image, voice } = c;
  const rank = String(index + 1).padStart(2, '0');
  const id = `p-${slug(c.name)}`;

  const turnaroundImage = safeLocalImagePath(c.turnaroundImage);
  const shot = turnaroundImage
    ? `<a class="plate" href="${esc(turnaroundImage)}" target="_blank" rel="noopener">
         <img src="${esc(turnaroundImage)}" alt="${esc(c.name)}的三視圖設定" loading="lazy">
         <span class="plate-c">正視 · 側視 · 背視</span>
       </a>`
    : `<div class="plate plate-empty"><span>尚未出圖<br><em>用下方三視圖提示詞生成</em></span></div>`;

  return `<article class="entry" id="${id}">
  <header class="entry-h">
    <span class="rank">${rank}</span>
    <h2 class="name">${esc(c.name)}</h2>
    <span class="tag tag-${esc(c.importance)}">${esc(IMPORTANCE_LABEL[c.importance] ?? c.importance)}</span>
    ${c.aliases.length ? `<span class="aka">又稱 ${esc(c.aliases.join(' · '))}</span>` : ''}
  </header>
  <p class="oneliner">${marked(c.oneLiner)}</p>

  ${shot}

  <div class="groups">
    <section class="group">
      <h3 class="group-h">人物分析</h3>
      <dl class="rows">
        ${row('性別', persona.gender)}${row('年齡', persona.ageRange)}${row('身分', persona.identity)}
      </dl>
      ${persona.personality.length ? `<ul class="traits">${persona.personality.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      ${para('外貌', persona.appearance)}
      ${para('性情', persona.temperament)}
      ${para('動機', persona.motivation)}
      ${para('人物弧光', persona.arc)}
      ${
        persona.relationships.length
          ? `<div class="para"><h4>關係</h4><dl class="rows">${persona.relationships
              .map((r) => `<div class="row"><dt>${esc(r.name)}</dt><dd>${marked(r.relation)}</dd></div>`)
              .join('')}</dl></div>`
          : ''
      }
      ${
        persona.evidence.length
          ? `<div class="source">
               <h4>原文依據</h4>
               ${persona.evidence.map((q) => `<blockquote>${esc(q)}</blockquote>`).join('')}
             </div>`
          : ''
      }
    </section>

    <section class="group">
      <h3 class="group-h">形象</h3>
      ${row('畫風', image.style)}
      ${
        image.tags.length
          ? `<div class="tagrow"><ul class="tags">${image.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul><button class="copy" data-copy="${esc(image.tags.join(', '))}">複製標籤</button></div>`
          : ''
      }
      ${promptBlock('出圖提示詞 EN', image.prompt)}
      ${promptBlock('出圖提示詞 中文', image.promptZh, 'zh')}
      ${promptBlock('反向提示詞', image.negativePrompt)}
      ${promptBlock('三視圖提示詞 EN', image.turnaround)}
    </section>

    <section class="group">
      <h3 class="group-h">聲音</h3>
      <dl class="rows">
        ${row('音色', voice.timbre)}${row('音高', voice.pitch)}${row('語速', voice.pace)}
        ${row('口音', voice.accent)}${row('情緒', voice.emotion)}${row('類比', voice.referenceHint)}
      </dl>
      ${promptBlock('音色提示詞 EN', voice.prompt)}
      ${promptBlock('音色提示詞 中文', voice.promptZh, 'zh')}
      <div class="entry-f">
        <button class="copy" data-copy="${esc(JSON.stringify(c, null, 2))}">複製整份角色 JSON</button>
      </div>
    </section>
  </div>
</article>`;
}

export function renderHtml(characters, source, summary = '') {
  assertRenderableCharacters(characters);
  const shot = characters.filter((c) => safeLocalImagePath(c.turnaroundImage)).length;
  const ordered = [...characters].sort(
    (a, b) => IMPORTANCE_ORDER.indexOf(a.importance) - IMPORTANCE_ORDER.indexOf(b.importance),
  );

  const index = ordered
    .map(
      (c, i) => `<li style="--i:${i}">
        <a href="#p-${slug(c.name)}">
          <span class="ix-n">${String(i + 1).padStart(2, '0')}</span>
          <span class="ix-name">${esc(c.name)}</span>
          <span class="ix-rule"></span>
          <span class="ix-tag">${esc(IMPORTANCE_LABEL[c.importance] ?? c.importance)}</span>
        </a></li>`,
    )
    .join('');

  return `<!doctype html>
<html lang="zh-TW"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(source)} · 角色設定集</title>
<style>
/* 冷灰印張 + 鐵鏽紅印記。紅色只用在與原文有關的地方。 */
:root{
  --paper:#e9eae5; --panel:#e1e3dd; --ink:#191d21; --ink-2:#5b636a; --ink-3:#8c9298;
  --rule:#cdd0c9; --seal:#8a3324; --seal-soft:#8a332412;
  --serif:"Songti TC","Noto Serif CJK TC","Source Han Serif TC","PMingLiU","MingLiU",Georgia,serif;
  --sans:"PingFang TC","Noto Sans CJK TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
}
@media(prefers-color-scheme:dark){
  :root{
    --paper:#14171a; --panel:#1c2024; --ink:#e6e8e4; --ink-2:#9aa1a7; --ink-3:#6d757c;
    --rule:#2c3237; --seal:#c96a4f; --seal-soft:#c96a4f16;
  }
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.75 var(--sans);
  -webkit-font-smoothing:antialiased}
.wrap{max-width:1800px;margin:0 auto;padding:clamp(32px,5vw,64px) clamp(20px,3vw,40px) 96px}

/* ---- 頭 ---- */
.masthead{border-bottom:2px solid var(--ink);padding-bottom:20px;margin-bottom:8px}
.eyebrow{font:500 11px/1 var(--sans);letter-spacing:.28em;text-transform:uppercase;color:var(--ink-3);margin:0 0 14px}
.title{font:400 clamp(34px,6vw,58px)/1.1 var(--serif);margin:0;letter-spacing:.02em}
.title em{font-style:normal;color:var(--ink-3)}
.meta{margin:14px 0 0;font-size:13px;color:var(--ink-2)}
.meta b{font-weight:500;color:var(--ink)}

/* ---- 目錄：戲份排序，序號是排名不是裝飾 ---- */
.index{margin:0;padding:0;list-style:none}
.index li{border-bottom:1px solid var(--rule);animation:rise .5s both;animation-delay:calc(var(--i)*45ms)}
.index a{display:flex;align-items:baseline;gap:14px;padding:11px 2px;text-decoration:none;color:inherit}
.index a:hover .ix-name{color:var(--seal)}
.ix-n{font:500 11px/1 var(--mono);color:var(--ink-3);width:20px;flex:none}
.ix-name{font:400 21px/1.2 var(--serif);letter-spacing:.03em;transition:color .15s}
.ix-rule{flex:1;border-bottom:1px dotted var(--rule);transform:translateY(-4px)}
.ix-tag{font-size:12px;color:var(--ink-2);flex:none}
@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* ---- 摘要 + 目錄並排，把 1800px 的寬度用起來 ---- */
.brief{display:grid;gap:40px;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);
  align-items:start;margin-top:28px}
@media(max-width:1100px){.brief{grid-template-columns:1fr;gap:24px}}

/* 摘要說的是故事本身，用敘事字域 */
.synopsis{padding:22px 26px;background:var(--panel);border:1px solid var(--rule);
  border-radius:2px;border-left:2px solid var(--ink)}
.synopsis h2{font:500 11px/1 var(--sans);letter-spacing:.28em;color:var(--ink-3);margin:0 0 10px}
.synopsis p{margin:0;font:400 clamp(15px,1.1vw,16.5px)/1.95 var(--serif)}

/* ---- 角色牆：一排最多三個 ----
   minmax 下限 460px 配 1800px 上限，天然卡在三列：
   3×460+2×28=1436 裝得下，4×460+3×28=1924 裝不下。 */
.cast{display:grid;gap:28px;grid-template-columns:repeat(auto-fit,minmax(460px,1fr));
  align-items:start;margin-top:40px}

/* ---- 條目 ---- */
.entry{border:1px solid var(--rule);border-radius:2px;background:var(--panel);
  padding:24px;scroll-margin-top:24px}
.entry-h{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.rank{font:500 12px/1 var(--mono);color:var(--ink-3)}
.name{font:400 clamp(28px,4vw,38px)/1.15 var(--serif);margin:0;letter-spacing:.04em}
.tag{font-size:12px;padding:2px 9px;border:1px solid var(--rule);border-radius:2px;color:var(--ink-2)}
.tag-protagonist{border-color:var(--seal);color:var(--seal)}
.aka{font-size:13px;color:var(--ink-3)}
.oneliner{font:400 clamp(16px,2vw,18px)/1.7 var(--serif);color:var(--ink-2);margin:12px 0 28px;max-width:62ch}

/* ---- 三視圖 ---- */
/* 三視圖是白底的印張，深色模式下也保持白底——它是一張紙，不是 UI 面板 */
.plate{display:block;position:relative;background:#fff;border:1px solid var(--rule);
  border-radius:2px;overflow:hidden;margin-bottom:36px}
.plate-empty{background:var(--panel)}
.plate img{display:block;width:100%;height:auto}
.plate-c{position:absolute;left:0;bottom:0;background:var(--paper);border-top:1px solid var(--rule);
  border-right:1px solid var(--rule);padding:5px 12px;font:500 11px/1 var(--sans);
  letter-spacing:.18em;color:var(--ink-2)}
.plate-empty{display:grid;place-items:center;min-height:180px;text-align:center;color:var(--ink-3);font-size:13px}
.plate-empty em{font-style:normal;font-size:12px;color:var(--ink-3);opacity:.75}

/* ---- 卡內三組直向排列：人物 → 形象 → 聲音 ---- */
.groups{display:block}
.group{margin-top:30px}
.group:first-child{margin-top:0}
.group-h{font:500 11px/1 var(--sans);letter-spacing:.28em;text-transform:uppercase;color:var(--ink-3);
  margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid var(--rule)}
.rows{margin:0 0 16px}
.row{display:flex;gap:14px;padding:3px 0;font-size:14px}
.row dt{color:var(--ink-3);flex:none;min-width:46px}
.row dd{margin:0}
.traits{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 18px;padding:0;list-style:none}
.traits li{border:1px solid var(--rule);border-radius:2px;padding:2px 9px;font-size:13px}
.para{margin-bottom:18px}
.para h4,.source h4{font:500 11px/1 var(--sans);letter-spacing:.2em;color:var(--ink-3);margin:0 0 6px}
.para p{margin:0;font-size:14px;line-height:1.8}

/* ---- 簽名：推斷標記 ---- */
.inf{color:var(--ink-3);font-size:.88em;background:var(--seal-soft);padding:0 3px;border-radius:2px}

/* ---- 原文：宋體，鐵鏽紅邊欄。這裡是書自己在說話 ---- */
.source{border-left:2px solid var(--seal);padding-left:16px;margin-top:22px}
.source blockquote{margin:0 0 10px;font:400 15px/1.85 var(--serif);color:var(--ink)}
.source blockquote:last-child{margin-bottom:0}
.source blockquote::before{content:"「";color:var(--seal)}
.source blockquote::after{content:"」";color:var(--seal)}

/* ---- 提示詞：等寬，機器的輸入 ---- */
.tagrow{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:18px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}
.tags li{font:400 12px/1.5 var(--mono);color:var(--ink-2);border:1px solid var(--rule);
  border-radius:2px;padding:1px 7px}
.pb{border:1px solid var(--rule);border-radius:2px;background:var(--paper);margin-bottom:14px}
.pb-h{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 11px;
  border-bottom:1px solid var(--rule)}
.pb-l{font:500 10px/1 var(--sans);letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)}
.pb p{margin:0;padding:11px;white-space:pre-wrap;word-break:break-word}
.pb .mono{font:400 12.5px/1.7 var(--mono)}
.pb .zh{font:400 14px/1.8 var(--sans)}

.copy{flex:none;font:500 11px/1 var(--sans);color:var(--ink-2);background:transparent;
  border:1px solid var(--rule);border-radius:2px;padding:4px 10px;cursor:pointer;transition:.15s}
.copy:hover{border-color:var(--seal);color:var(--seal)}
.copy:focus-visible{outline:2px solid var(--seal);outline-offset:2px}
.copy[data-done]{border-color:var(--seal);color:var(--seal)}
.entry-f{margin-top:20px;padding-top:16px;border-top:1px solid var(--rule)}
.entry-f .copy{width:100%;padding:9px}

.colophon{margin-top:72px;padding-top:20px;border-top:2px solid var(--ink);
  font-size:12px;color:var(--ink-3);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}

@media(max-width:640px){
  .cast{gap:20px;grid-template-columns:1fr}
  .entry{padding:18px}
  .index a{gap:10px}
  .ix-name{font-size:18px}
}
@media(prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important}
  html{scroll-behavior:auto}
}
@media print{
  .copy,.index{display:none}
  .entry{page-break-inside:avoid;border-top:1px solid #000}
  body{background:#fff}
}
</style></head><body>
<div class="wrap">

<header class="masthead">
  <p class="eyebrow">角色設定集</p>
  <h1 class="title">${esc(source)}<em> · 角色</em></h1>
  <p class="meta"><b>${characters.length}</b> 位角色${shot ? ` · <b>${shot}</b> 張三視圖` : ''} · 按戲份排序</p>
</header>

<div class="brief">
${summary ? `<section class="synopsis"><h2>故事摘要</h2><p>${marked(summary)}</p></section>` : ''}
<nav aria-label="角色索引"><ol class="index">${index}</ol></nav>
</div>

<div class="cast">
${ordered.map(renderEntry).join('\n')}
</div>

<footer class="colophon">
  <span>人物分析與提示詞由模型依據原文生成，<span class="inf">（推斷）</span>標記處為原文未明說、為可用性補全的內容。</span>
  <span>novel-characters</span>
</footer>

</div>
<script>
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.copy');
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    const label = btn.textContent;
    btn.textContent = '已複製';
    btn.dataset.done = '1';
    setTimeout(() => { btn.textContent = label; delete btn.dataset.done; }, 1600);
  } catch {
    btn.textContent = '複製失敗';
    setTimeout(() => { btn.textContent = '複製'; }, 1600);
  }
});
</script>
</body></html>`;
}

/* ------------------------------------------------------------------ */
/* CLI                                                                 */
/* ------------------------------------------------------------------ */

const USAGE = `novel-characters.mjs — novel-characters skill 的確定性工具

  chunk <book.txt> <workdir>       段落感知重疊切塊，寫 chunk-NN.txt，列印塊數
  merge <workdir>                  合併 roster-*.json（含 part-*/），列印已排序角色 JSON
  select <roster.json>             從 merge 結果選角，預設前 ${DEFAULT_TOP} 名
  harvest-quotes <book.txt> <roster.json>
                                   依名稱／別名從原文抽出逐字引文候選
  export-card <cast.json>          匯出角色卡；目前支援 --format tavern-v2
  validate <cast.json> <book.txt>  驗證；有違規逐條列印並 exit 1
  render <cast.json> [--html|--md] 渲染報告到 stdout（預設 --md）
  slug <name>                      角色名轉安全檔名

chunk 選項：
  --chapters        依章回標題切段；找不到標題則改按容量分段
  --parts <n>       依段落邊界切成 n 段，每段各自最多 ${MAX_CHUNKS} 塊

select 選項：
  --top <n>         取前 n 名（預設 ${DEFAULT_TOP}）。假設輸入已依戲份排序
  --names a,b       依名稱或別名顯式選角；若出現則忽略 --top

harvest-quotes 選項：
  --max <n>         每位角色最多保留 n 條引文（預設 8）

export-card 選項：
  --format tavern-v2
  --out <dir>       每位角色寫一個 JSON；RP 卡可用人名，圖像提示詞不匯出

validate 選項：
  --denylist <file> 額外禁用詞，一行一詞，# 開頭為註解

render 選項：
  --source <name>   報告標題用的書名（預設取 cast.json 的 source 或檔名）
  --images <dir>    圖片目錄名，預設 images；會去找 <dir>/<slug>-turnaround.png`;

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), 'utf8'));
}

/** cast.json 可以是 {source, summary, characters}，也可以是裸陣列（舊格式）。 */
function loadCast(path) {
  const raw = readJson(path);
  const characters = Array.isArray(raw) ? raw : raw.characters;
  if (!Array.isArray(characters)) throw new Error(`${path} 裡沒有 characters 陣列`);
  return {
    characters,
    source: Array.isArray(raw) ? null : raw.source,
    author: Array.isArray(raw) ? null : raw.author,
    summary: Array.isArray(raw) ? '' : (raw.summary ?? ''),
  };
}

function takeFlag(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  return args[index + 1] ?? null;
}

function parseNameList(value) {
  if (value == null || value === '') return [];
  return String(value)
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function positionalArgs(args, flagsWithValue = []) {
  return args.filter((item, index, all) => {
    if (String(item).startsWith('-')) return false;
    return !flagsWithValue.includes(all[index - 1]);
  });
}

function listStaleArtifacts(dir) {
  return readdirSync(dir).filter((file) =>
    /^(?:chunk-\d+\.txt|roster-\d+\.json|roster-merged\.json|card-.*\.json|parts\.json)$/.test(file)
    || /^part-\d+$/.test(file),
  );
}

function loadRosterBatches(dir) {
  const partDirs = readdirSync(dir).filter((file) => /^part-\d+$/.test(file)).sort();
  if (partDirs.length) {
    const batches = [];
    for (const partDir of partDirs) {
      const files = readdirSync(join(dir, partDir)).filter((file) => /^roster-\d+\.json$/.test(file)).sort();
      for (const file of files) {
        const raw = readJson(join(dir, partDir, file));
        batches.push(Array.isArray(raw) ? raw : (raw.characters ?? []));
      }
    }
    return batches;
  }
  const files = readdirSync(dir).filter((file) => /^roster-\d+\.json$/.test(file)).sort();
  return files.map((file) => {
    const raw = readJson(join(dir, file));
    return Array.isArray(raw) ? raw : (raw.characters ?? []);
  });
}

function writeChunkPlan(workdir, plan) {
  if (plan.mode === 'flat' && plan.parts.length <= 1) {
    const chunks = plan.parts[0]?.chunks ?? [];
    chunks.forEach((chunk, index) => {
      writeFileSync(join(workdir, `chunk-${String(index).padStart(2, '0')}.txt`), chunk, 'utf8');
    });
    return { chunks: chunks.length, parts: 1 };
  }

  const summary = [];
  for (const [index, part] of plan.parts.entries()) {
    const partDirName = `part-${String(index).padStart(2, '0')}`;
    const partDir = join(workdir, partDirName);
    mkdirSync(partDir, { recursive: true });
    part.chunks.forEach((chunk, chunkIndex) => {
      writeFileSync(join(partDir, `chunk-${String(chunkIndex).padStart(2, '0')}.txt`), chunk, 'utf8');
    });
    summary.push({
      id: part.id,
      title: part.title,
      dir: partDirName,
      chunks: part.chunks.length,
      chars: part.chars,
      truncated: part.truncated,
    });
  }
  writeFileSync(join(workdir, 'parts.json'), `${JSON.stringify({
    mode: plan.mode,
    truncated: plan.truncated,
    fallback: plan.fallback,
    parts: summary,
  }, null, 2)}\n`, 'utf8');
  return { chunks: summary.reduce((sum, part) => sum + part.chunks, 0), parts: summary.length };
}

function main(argv) {
  const [cmd, ...rest] = argv;

  if (!cmd || cmd === '-h' || cmd === '--help') {
    console.log(USAGE);
    process.exit(cmd ? 0 : 1);
  }

  if (cmd === 'chunk') {
    const [book, workdir] = positionalArgs(rest, ['--parts']);
    if (!book || !workdir) throw new Error('用法：chunk <book.txt> <workdir> [--chapters] [--parts n]');
    const text = readFileSync(resolve(book), 'utf8');
    const partsFlag = takeFlag(rest, '--parts');
    const plan = planHierarchicalChunks(text, {
      chapters: rest.includes('--chapters'),
      parts: partsFlag == null ? null : Number(partsFlag),
      chunkWithMeta: chunkTextWithMeta,
      capacity: effectiveChunkCapacity(CHUNK_SIZE, CHUNK_OVERLAP, MAX_CHUNKS),
    });
    const resolvedWorkdir = resolve(workdir);
    mkdirSync(resolvedWorkdir, { recursive: true });
    const staleArtifacts = listStaleArtifacts(resolvedWorkdir);
    if (staleArtifacts.length) {
      throw new Error(`工作目錄含有前次產物，請改用空目錄：${staleArtifacts.join(', ')}`);
    }
    const written = writeChunkPlan(resolvedWorkdir, plan);
    const payload = {
      mode: plan.mode,
      chunks: written.chunks,
      parts: written.parts,
      chars: text.length,
      workdir: resolvedWorkdir,
      truncated: plan.truncated,
      fallback: plan.fallback,
      partTruncated: plan.parts
        .filter((part) => part.truncated)
        .map((part) => ({ id: part.id, title: part.title, chunks: part.chunks.length })),
    };
    console.log(JSON.stringify(payload, null, 2));
    if (plan.truncated) {
      const labels = payload.partTruncated.map((part) => part.id).join(', ') || 'flat';
      console.error(`⚠️ 以下分段超過 ${MAX_CHUNKS} 塊上限，尾部未掃描：${labels}`);
    }
    return;
  }

  if (cmd === 'merge' || cmd === 'merge-parts') {
    const [workdir] = rest;
    if (!workdir) throw new Error('用法：merge <workdir>');
    const dir = resolve(workdir);
    const batches = loadRosterBatches(dir);
    if (!batches.length) throw new Error(`${dir} 裡沒有 roster-*.json 或 part-*/roster-*.json`);
    console.log(JSON.stringify(mergeRoster(batches), null, 2));
    return;
  }

  if (cmd === 'select') {
    const [rosterPath] = rest;
    if (!rosterPath || rosterPath.startsWith('-')) throw new Error('用法：select <roster.json> [--top n] [--names a,b]');
    const names = parseNameList(takeFlag(rest, '--names'));
    const topFlag = takeFlag(rest, '--top');
    const selected = selectRoster(readJson(rosterPath), {
      names,
      top: topFlag == null ? DEFAULT_TOP : Number(topFlag),
    });
    console.log(JSON.stringify(selected, null, 2));
    return;
  }

  if (cmd === 'harvest-quotes') {
    const [bookPath, rosterPath] = positionalArgs(rest, ['--max']);
    if (!bookPath || !rosterPath) throw new Error('用法：harvest-quotes <book.txt> <roster.json> [--max n]');
    const maxFlag = takeFlag(rest, '--max');
    const harvested = harvestQuotes(readFileSync(resolve(bookPath), 'utf8'), readJson(rosterPath), {
      max: maxFlag == null ? undefined : Number(maxFlag),
    });
    console.log(JSON.stringify({ characters: harvested }, null, 2));
    return;
  }

  if (cmd === 'export-card') {
    const [castPath] = positionalArgs(rest, ['--format', '--out']);
    if (!castPath) throw new Error('用法：export-card <cast.json> --format tavern-v2 --out <dir>');
    const format = takeFlag(rest, '--format') ?? 'tavern-v2';
    if (format !== 'tavern-v2') throw new Error(`不支援的匯出格式：${format}`);
    const outDir = takeFlag(rest, '--out');
    if (!outDir) throw new Error('export-card 需要 --out <dir>');
    const raw = readJson(castPath);
    const cards = exportCastToTavernV2(raw);
    const resolvedOut = resolve(outDir);
    mkdirSync(resolvedOut, { recursive: true });
    const written = cards.map((card) => {
      const fileName = `${slug(card.data.name)}.json`;
      writeFileSync(join(resolvedOut, fileName), `${JSON.stringify(card, null, 2)}\n`, 'utf8');
      return fileName;
    });
    console.log(JSON.stringify({ format, count: written.length, out: resolvedOut, files: written }, null, 2));
    return;
  }

  if (cmd === 'validate') {
    const [castPath, bookPath] = rest.filter((item) => !item.startsWith('-') && rest[rest.indexOf(item) - 1] !== '--denylist');
    if (!castPath) throw new Error('用法：validate <cast.json> <book.txt> [--denylist file]');
    const { characters, source: workTitle, author, summary } = loadCast(castPath);
    const source = bookPath ? readFileSync(resolve(bookPath), 'utf8') : null;
    if (!bookPath) console.error('⚠️ 沒給原文，跳過逐字引文驗證');
    const denylistPath = takeFlag(rest, '--denylist');
    const extraNames = denylistPath ? loadDenylist(readFileSync(resolve(denylistPath), 'utf8')) : [];
    const problems = validateCast(characters, source, { source: workTitle, author, extraNames });
    // 頂層的故事摘要——報告要用，缺了就無法在頂部交代背景
    if (typeof summary !== 'string' || !summary.trim()) {
      problems.unshift('頂層缺少 summary（故事摘要），報告頂部會空著');
    } else {
      if (!looksChinese(summary)) problems.unshift('summary 應包含中文內容');
      const match = summary.match(SIMPLIFIED_CHINESE);
      if (match) problems.unshift(`summary 應使用台灣繁體中文，但含簡體字「${match[0]}」`);
    }
    if (problems.length) {
      console.error(`✗ ${problems.length} 處違規：\n`);
      for (const p of problems) console.error('  ' + p);
      process.exit(1);
    }
    console.log(`✓ ${characters.length} 個角色全部通過驗證`);
    return;
  }

  if (cmd === 'render') {
    const [castPath] = rest;
    if (!castPath) throw new Error('用法：render <cast.json> [--html|--md]');
    const html = rest.includes('--html');
    const imagesDirArg = rest.includes('--images') ? rest[rest.indexOf('--images') + 1] : 'images';
    const imagesDir = safeRelativeDirectory(imagesDirArg);
    if (!imagesDir) throw new Error('--images 必須是輸出目錄內的安全相對路徑');
    const sourceFlag = rest.includes('--source') ? rest[rest.indexOf('--source') + 1] : null;

    const { characters, source, summary } = loadCast(castPath);
    const title = sourceFlag ?? source ?? basename(castPath).replace(/\.[^.]+$/, '');

    // Attach turnaround images when the files actually exist next to the report.
    const outDir = resolve(castPath, '..');
    for (const c of characters) {
      delete c.turnaroundImage;
      const rel = `${imagesDir}/${slug(c.name)}-turnaround.png`;
      if (existsSync(join(outDir, rel))) c.turnaroundImage = rel;
    }

    process.stdout.write(
      (html ? renderHtml(characters, title, summary) : renderMarkdown(characters, title, summary)) +
        '\n',
    );
    return;
  }

  if (cmd === 'slug') {
    if (!rest[0]) throw new Error('用法：slug <name>');
    console.log(slug(rest[0]));
    return;
  }

  throw new Error(`未知命令 ${cmd}\n\n${USAGE}`);
}

// 只有直接執行才跑 CLI —— selftest.mjs 需要 import 這些函式。
if (isMainModule(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
