#!/usr/bin/env node
// 自測：覆蓋 novel-characters.mjs 裡所有確定性邏輯。
// 不呼叫任何模型，不花額度，跑一次 < 1 秒。
//   node scripts/selftest.mjs

import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { slug as sharedSlug } from './live-action/shared.mjs';
import { entitiesToRoster } from './adapters/booknlp-to-roster.mjs';
import { MIN_CJK_NAME_LENGTH } from './lib/names.mjs';
import { detectChapters, partitionText } from './lib/parts.mjs';
import { decodePngRgb, encodeSolidPng, readPngHeader } from './lib/png.mjs';
import { harvestQuotes } from './lib/quotes.mjs';
import { exportCastToTavernV2 } from './lib/tavern.mjs';
import { buildVoicePreview } from './lib/voice-preview.mjs';
import { CHUNK_SIZE, DEFAULT_TOP, MAX_CHUNKS, chunkText, chunkTextWithMeta, mergeRoster, renderHtml, renderMarkdown, selectRoster, slug, validateCast } from './novel-characters.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const skillRoot = join(here, '..');
const examples = join(skillRoot, 'examples');
const SOURCE = readFileSync(join(examples, '渡口.txt'), 'utf8');
const CAST = JSON.parse(readFileSync(join(examples, '渡口-cast.json'), 'utf8')).characters;

let passed = 0;
function ok(condition, label) {
  assert.ok(condition, label);
  passed += 1;
}
function eq(actual, expected, label) {
  assert.equal(actual, expected, `${label} — 期望 ${expected}，實際 ${actual}`);
  passed += 1;
}

/* ---------------- chunkText ---------------- */

eq(chunkText('').length, 0, '空文字不產生塊');
eq(chunkText('   \n  ').length, 0, '純空白不產生塊');
eq(chunkText(SOURCE).length, 1, '短故事只有一塊');

const long = SOURCE.repeat(40);
const chunks = chunkText(long);
ok(chunks.length > 1, '長文字會切成多塊');
ok(chunks.every((c) => c.length <= CHUNK_SIZE), `沒有塊超過 CHUNK_SIZE(${CHUNK_SIZE})`);
ok(long.includes(chunks[0].slice(0, 200)), '塊內容來自原文');
// 相鄰塊必須重疊，否則卡在切口上的角色會兩邊都漏
ok(chunks[1].includes(chunks[0].slice(-100).slice(0, 40)), '相鄰塊有重疊');
// 覆蓋率：把所有塊拼起來（去重疊後）應該蓋住絕大部分原文
const covered = chunks.reduce((sum, c) => sum + c.length, 0);
ok(covered >= long.length, '所有塊加起來覆蓋全文（含重疊）');

const huge = SOURCE.repeat(500);
ok(chunkText(huge).length <= MAX_CHUNKS, `超長文字被 MAX_CHUNKS(${MAX_CHUNKS}) 截斷而不是無限切`);
const exactCapacityTrap = '甲'.repeat(330_000);
const limited = chunkTextWithMeta(exactCapacityTrap);
eq(limited.chunks.length, MAX_CHUNKS, '容量邊界文字用滿所有分塊');
ok(limited.truncated, '重疊造成尾端未覆蓋時會明確標示 truncated');

const chaptered = detectChapters('第一章 渡河\n\n老周開船。\n\n第二章 霧\n\n沈知微上船。\n');
eq(chaptered?.length, 2, '偵測到兩個中文章回');
eq(chaptered[0].title.includes('一'), true, '第一章標題保留');
eq(partitionText(`${'甲'.repeat(40)}\n\n${'乙'.repeat(40)}`, 2).length, 2, '無章回時可按段落切成兩段');

const hierWork = mkdtempSync(join(tmpdir(), 'novel-characters-hier-'));
try {
  const bookPath = join(hierWork, 'book.txt');
  writeFileSync(bookPath, `第一章 甲\n\n${'甲'.repeat(20_000)}\n\n第二章 乙\n\n${'乙'.repeat(20_000)}`);
  const chunkCli = spawnSync(process.execPath, [join(here, 'novel-characters.mjs'), 'chunk', bookPath, join(hierWork, 'work'), '--chapters'], { encoding: 'utf8' });
  eq(chunkCli.status, 0, 'chunk --chapters CLI 成功');
  const payload = JSON.parse(chunkCli.stdout);
  eq(payload.mode, 'chapters', '章回模式寫入 parts');
  ok(payload.parts >= 2, '至少兩段');
  ok(readdirSync(join(hierWork, 'work')).includes('parts.json'), '寫出 parts.json');
  ok(readdirSync(join(hierWork, 'work', 'part-00')).some((file) => file.startsWith('chunk-')), '每段自己的 chunk-NN.txt');
} finally {
  rmSync(hierWork, { recursive: true, force: true });
}

const longPartsWork = mkdtempSync(join(tmpdir(), 'novel-characters-parts-'));
try {
  const bookPath = join(longPartsWork, 'book.txt');
  writeFileSync(bookPath, '甲'.repeat(400_000));
  const chunkCli = spawnSync(process.execPath, [join(here, 'novel-characters.mjs'), 'chunk', bookPath, join(longPartsWork, 'work'), '--parts', '2'], { encoding: 'utf8' });
  eq(chunkCli.status, 0, '超長文字可用 --parts 分段');
  const payload = JSON.parse(chunkCli.stdout);
  eq(payload.parts, 2, '--parts 2 寫出兩段');
  writeFileSync(join(longPartsWork, 'work', 'part-00', 'roster-00.json'), JSON.stringify({ characters: [{ name: '甲', aliases: [], note: 'a', quotes: [] }] }));
  writeFileSync(join(longPartsWork, 'work', 'part-01', 'roster-00.json'), JSON.stringify({ characters: [{ name: '甲', aliases: ['阿甲'], note: 'b', quotes: [] }] }));
  const mergeCli = spawnSync(process.execPath, [join(here, 'novel-characters.mjs'), 'merge', join(longPartsWork, 'work')], { encoding: 'utf8' });
  eq(mergeCli.status, 0, 'merge 會收 part-*/roster');
  const mergedParts = JSON.parse(mergeCli.stdout);
  eq(mergedParts.length, 1, '跨段同名合併');
  ok(mergedParts[0].aliases.includes('阿甲'), '跨段別名保留');
} finally {
  rmSync(longPartsWork, { recursive: true, force: true });
}

/* ---------------- harvestQuotes / export-card / BookNLP ---------------- */

const harvested = harvestQuotes(SOURCE, [{ name: '沈知微', aliases: ['姑娘'] }, { name: '陸行遠', aliases: ['陸'] }]);
ok(harvested.find((entry) => entry.name === '沈知微')?.quotes.some((quote) => quote.includes('沈知微')), 'harvest 抽出含本名的原文');
ok(harvested.every((entry) => entry.quotes.every((quote) => SOURCE.includes(quote))), 'harvest 引文都是原文連續片段');

const harvestCliDir = mkdtempSync(join(tmpdir(), 'novel-characters-harvest-'));
try {
  const rosterPath = join(harvestCliDir, 'roster.json');
  writeFileSync(rosterPath, JSON.stringify([{ name: '胡二爺', aliases: [] }]));
  const harvestCli = spawnSync(process.execPath, [join(here, 'novel-characters.mjs'), 'harvest-quotes', join(examples, '渡口.txt'), rosterPath], { encoding: 'utf8' });
  eq(harvestCli.status, 0, 'harvest-quotes CLI 成功');
  ok(JSON.parse(harvestCli.stdout).characters[0].quotes.some((quote) => quote.includes('胡二爺')), 'CLI 抽出胡二爺引文');
} finally {
  rmSync(harvestCliDir, { recursive: true, force: true });
}

const DOC = JSON.parse(readFileSync(join(examples, '渡口-cast.json'), 'utf8'));
const tavernCards = exportCastToTavernV2(DOC);
eq(tavernCards[0].spec, 'chara_card_v2', '匯出 V2 spec');
ok(tavernCards[0].data.name, 'RP 卡保留角色名');
ok(!JSON.stringify(tavernCards[0].data).includes(DOC.characters[0].image.prompt.slice(0, 40)), 'RP 卡不帶圖像提示詞');

const exportDir = mkdtempSync(join(tmpdir(), 'novel-characters-export-'));
try {
  const exportCli = spawnSync(process.execPath, [join(here, 'novel-characters.mjs'), 'export-card', join(examples, '渡口-cast.json'), '--format', 'tavern-v2', '--out', exportDir], { encoding: 'utf8' });
  eq(exportCli.status, 0, 'export-card CLI 成功');
  const exported = JSON.parse(exportCli.stdout);
  eq(exported.count, DOC.characters.length, '每位角色一張卡');
  ok(readdirSync(exportDir).includes(`${slug(DOC.characters[0].name)}.json`), '以安全檔名寫出');
} finally {
  rmSync(exportDir, { recursive: true, force: true });
}

const booknlpRoster = entitiesToRoster(
  ['1\t0\t1\tPROP\tPER\tAlice', '1\t2\t3\tPROP\tPER\tAlice', '1\t4\t5\tPROP\tPER\tAlice Liddel', '1\t8\t8\tPRON\tPER\tshe', '2\t10\t11\tPROP\tPER\tWhite Rabbit'].join('\n'),
  '0\t3\t4\t5\tshe\t1\tI shall be late!',
);
eq(booknlpRoster.characters.length, 2, 'BookNLP 轉接器依 coref 聚成角色');
ok(booknlpRoster.characters.some((entry) => entry.name === 'Alice' && entry.aliases.includes('Alice Liddel')), '專名聚類成 name/aliases');
ok(!booknlpRoster.characters.some((entry) => entry.aliases.includes('she') || entry.name === 'she'), '代詞不進名單');

const png = encodeSolidPng(16, 10, [12, 34, 56]);
ok(readPngHeader(png)?.width === 16 && readPngHeader(png)?.height === 10, '可寫出可讀的 PNG 檔頭');
ok(decodePngRgb(png)?.rgb[0] === 12, '可解出實心色 PNG');
const preview = buildVoicePreview(DOC);
ok(preview.characters.every((entry) => entry.status === 'NOT_RUN' && entry.durationHintSeconds === 5), '音色試聽預設 NOT_RUN 且 5 秒');
ok(preview.characters.some((entry) => entry.name === '沈知微'), '音色試聽包含主角');

/* ---------------- mergeRoster ---------------- */

// 跨塊用不同稱呼發現同一個人，必須收斂成一條
const merged = mergeRoster([
  [{ name: '陸行遠', aliases: ['陸'], note: '瘦，顴骨高。', quotes: ['他的臉很瘦，顴骨很高'] }],
  [{ name: '陸', aliases: [], note: '眉骨有疤。', quotes: ['右邊眉骨上有一道兩寸長的舊疤。', '他的臉很瘦，顴骨很高'] }],
  [{ name: '沈知微', aliases: ['姑娘'], note: '兩條辮子。', quotes: [] }],
]);
eq(merged.length, 2, '別名跨塊合併');
const lu = merged.find((c) => c.name === '陸行遠');
ok(lu, '保留出現次數最多的規範名');
eq(lu.notes.length, 2, 'notes 累加');
ok(lu.aliases.includes('陸'), '別名被記錄');
eq(lu.quotes.length, 2, 'quotes 合併且去重');

// 先看到別名、後看到本名，也要能合併
const reverse = mergeRoster([
  [{ name: '姑娘', aliases: [], note: 'a', quotes: [] }],
  [{ name: '沈知微', aliases: ['姑娘'], note: 'b', quotes: [] }],
]);
eq(reverse.length, 1, '別名先出現也能合併');
eq(reverse[0].notes.length, 2, '合併後兩條 note 都在');
eq(reverse[0].name, '沈知微', '同次數時優先保留較明確的完整名稱');

const bridged = mergeRoster([
  [{ name: '甲', aliases: ['阿甲'], note: 'a', quotes: [] }],
  [{ name: '乙', aliases: ['阿乙'], note: 'b', quotes: [] }],
  [{ name: '甲', aliases: ['乙'], note: 'bridge', quotes: [] }],
]);
eq(bridged.length, 1, '後續交叉別名會合併兩個既有群組');
ok(bridged[0].aliases.includes('乙'), '橋接合併保留另一群組的名稱');

const mergeWorkdir = mkdtempSync(join(tmpdir(), 'novel-characters-'));
try {
  writeFileSync(join(mergeWorkdir, 'roster-00.json'), JSON.stringify({ characters: [{ name: '甲', aliases: [], note: 'a', quotes: [] }] }));
  writeFileSync(join(mergeWorkdir, 'roster-merged.json'), '');
  const mergeCli = spawnSync(process.execPath, [join(here, 'novel-characters.mjs'), 'merge', mergeWorkdir], { encoding: 'utf8' });
  eq(mergeCli.status, 0, 'merge CLI 忽略 roster-merged.json');
  eq(JSON.parse(mergeCli.stdout).length, 1, 'merge CLI 只讀取編號 roster 檔案');
} finally {
  rmSync(mergeWorkdir, { recursive: true, force: true });
}

const staleWorkdir = mkdtempSync(join(tmpdir(), 'novel-characters-stale-'));
try {
  const bookPath = join(staleWorkdir, 'book.txt');
  const generatedDir = join(staleWorkdir, 'work');
  writeFileSync(bookPath, SOURCE);
  writeFileSync(join(staleWorkdir, 'placeholder'), '');
  const firstChunk = spawnSync(process.execPath, [join(here, 'novel-characters.mjs'), 'chunk', bookPath, generatedDir], { encoding: 'utf8' });
  eq(firstChunk.status, 0, '首次 chunk CLI 可寫入空工作目錄');
  const secondChunk = spawnSync(process.execPath, [join(here, 'novel-characters.mjs'), 'chunk', bookPath, generatedDir], { encoding: 'utf8' });
  ok(secondChunk.status !== 0, '重用含舊產物的工作目錄會被拒絕');
  ok(secondChunk.stderr.includes('前次產物'), '拒絕重用時提供明確原因');
} finally {
  rmSync(staleWorkdir, { recursive: true, force: true });
}

eq(
  mergeRoster([[{ name: 'Ishmael', aliases: [], note: 'a', quotes: [] }], [{ name: 'ishmael', aliases: [], note: 'b', quotes: [] }]]).length,
  1,
  '拉丁名大小寫不敏感',
);

// 出現的塊數越多排越前 —— 這是戲份權重的唯一依據
const ranked = mergeRoster([
  [{ name: '甲', aliases: [], note: '1', quotes: [] }, { name: '乙', aliases: [], note: '1', quotes: [] }],
  [{ name: '乙', aliases: [], note: '2', quotes: [] }],
  [{ name: '乙', aliases: [], note: '3', quotes: [] }],
]);
eq(ranked[0].name, '乙', '按出現塊數降序排列');

const rankedByChunks = mergeRoster([
  [
    { name: '甲', aliases: [], note: '同一塊第一筆', quotes: [] },
    { name: '甲', aliases: [], note: '同一塊第二筆', quotes: [] },
    { name: '乙', aliases: [], quotes: [] },
  ],
  [{ name: '乙', aliases: [], quotes: [] }],
]);
eq(rankedByChunks[0].name, '乙', '戲份排序依不同分塊數，不受 note 數量影響');

// 髒資料不能讓整個流程崩掉
eq(mergeRoster([[]]).length, 0, '空批次不報錯');
eq(mergeRoster([[{ name: '甲' }]]).length, 1, '缺 aliases/notes/quotes 欄位也能處理');
eq(mergeRoster([[{ note: '沒名字' }]]).length, 0, '沒有 name 的條目被丟棄');

/* ---------------- slug ---------------- */

eq(slug('胡二爺'), sharedSlug('胡二爺'), 'cast 與 visual-pack 共用同一套 slug');
eq(slug('胡二爺'), '胡二爺', '中文名原樣保留');
ok(/^a-b-c-d--[0-9a-f]{8}$/.test(slug('a/b:c*d')), '路徑危險字元被替換並附穩定雜湊');
eq(slug('  x  '), 'x', '兩端空白被去掉');
eq(slug(''), 'character', '空名有兜底');
ok(slug('A/B') !== slug('A:B'), '不同危險字元不會產生相同 slug');
ok(!slug('\0').includes('\0'), '控制字元不會進入 slug');
ok(!slug('foo.').endsWith('.'), 'slug 不會以句點結尾');
ok(!/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(slug('CON')), '避開 Windows 保留裝置名');
ok(Array.from(slug('角'.repeat(120))).length < 100, '過長名稱會截短並附穩定雜湊');

/* ---------------- validateCast ---------------- */

eq(validateCast(CAST, SOURCE).length, 0, '內附範例通過全部驗證');
ok(validateCast([], SOURCE).length > 0, '空 cast 報錯');

const clone = () => JSON.parse(JSON.stringify(CAST));
const hits = (cast, keyword) => validateCast(cast, SOURCE).filter((p) => p.includes(keyword)).length;

// 這四類是模型真實犯過的錯，每一類都必須抓住
let bad = clone();
bad[0].persona.evidence[0] = 'She was nineteen years old.';
ok(hits(bad, '逐字片段') > 0, '抓住意譯的引文');

bad = clone();
bad[0].image.prompt = `${bad[0].name}, ${bad[0].image.prompt}`;
ok(hits(bad, '角色名') > 0, '抓住出圖提示詞裡的人名');

bad = clone();
bad[0].image.promptZh = `${bad[0].aliases[0]}的設定圖`;
ok(hits(bad, '別名') > 0, '抓住中文出圖提示詞裡的別名');

bad = clone();
bad[0].voice.timbre = 'warm husky alto';
ok(hits(bad, '應為中文') > 0, '抓住該中文卻寫成英文的欄位');

bad = clone();
bad[0].voice.timbre = '温暖明亮的女声';
ok(hits(bad, '台灣繁體中文') > 0, '抓住分析欄位中的簡體中文');

bad = clone();
bad[0].voice.timbre = 'warm husky 女 alto';
ok(hits(bad, '應為中文') > 0, '抓住僅夾帶一個中文字的英文欄位');

bad = clone();
bad[0].voice.timbre = 'あたたかい';
ok(hits(bad, '應為中文') > 0, '日文假名不會被誤判為中文');

bad = clone();
bad[0].voice.timbre = '低い聲';
ok(hits(bad, '應為中文') > 0, '混有漢字的日文也不會被誤判為中文');

bad = clone();
bad[0].image.style = '扁平向量插畫';
ok(hits(bad, 'image.style 應為英文') > 0, '抓住中文 image.style');

bad = clone();
bad[0].voice.prompt = '溫暖女聲';
ok(hits(bad, 'voice.prompt 應為英文') > 0, '抓住中文 voice.prompt');

bad = clone();
bad[0].voice.promptZh = 'warm female voice';
ok(hits(bad, 'voice.promptZh 應包含中文內容') > 0, '抓住英文 voice.promptZh');

bad = clone();
bad[0].image.turnaround = '中文三視圖描述';
ok(hits(bad, '應為英文') > 0, '抓住該英文卻含中文的欄位');

bad = clone();
bad[0].importance = 'sidekick';
ok(hits(bad, 'importance') > 0, '抓住 importance 列舉越界');

bad = clone();
delete bad[0].image.turnaround;
ok(hits(bad, 'turnaround') > 0, '抓住缺失的三視圖提示詞');

bad = clone();
delete bad[0].persona;
ok(hits(bad, 'persona') > 0, '抓住缺失的 persona');

bad = clone();
bad[0].persona.relationships = [null];
ok(hits(bad, 'relationships[0] 必須是物件') > 0, '抓住無效關係項目');
assert.throws(() => renderHtml(bad, 'x'), /角色資料無法渲染/, '渲染器以明確錯誤拒絕無效關係資料');
passed += 1;

bad = clone();
bad.push(JSON.parse(JSON.stringify(bad[0])));
ok(hits(bad, '角色名稱重複') > 0, '抓住會造成 ID 與圖片路徑衝突的重複角色名');

bad = clone();
bad[0].persona.personality = ['安靜', null, '堅定'];
ok(hits(bad, 'personality[1] 必須是非空字串') > 0, '抓住非字串性格項目');

bad = clone();
bad[0].persona.evidence = [''];
ok(hits(bad, 'evidence[0] 必須是非空字串') > 0, '拒絕空白引文');

bad = clone();
bad[0].persona.evidence = ['甲乙'];
ok(validateCast(bad, '甲\n\n乙').some((p) => p.includes('逐字片段')), '拒絕跨段拼接引文');

bad = clone();
bad[0].name = 'Alice';
bad[0].aliases = [];
bad[0].image.negativePrompt = 'ALICE, blur';
ok(hits(bad, 'image.negativePrompt 裡出現了角色名') > 0, '反向提示詞也會以不分大小寫方式檢查人名洩漏');

bad = clone();
bad[0].name = 'Li';
bad[0].aliases = [];
bad[0].image.prompt = 'A slim figure with cinematic lighting in a clean lineup';
eq(hits(bad, '角色名'), 0, '短拉丁姓名不會誤判 slim、lighting 或 lineup');

bad = clone();
bad[0].aliases = ['周'];
bad[0].image.promptZh = '一位周正的中年船伕立於薄霧中';
eq(
  validateCast(bad, SOURCE).filter((p) => p.includes('別名「周」')).length,
  0,
  `少於 ${MIN_CJK_NAME_LENGTH} 字的中文別名不檢查，避免誤傷普通詞`,
);

bad = clone();
bad[0].image.promptZh = `${bad[0].image.promptZh} 出自渡口。`;
ok(
  validateCast(bad, SOURCE, { source: '渡口' }).some((p) => p.includes('書名「渡口」')),
  '抓住出圖提示詞裡的書名',
);

bad = clone();
bad[0].image.prompt = `${bad[0].image.prompt} by Tao Yuanming`;
ok(
  validateCast(bad, SOURCE, { author: 'Tao Yuanming' }).some((p) => p.includes('作者名「Tao Yuanming」')),
  '抓住出圖提示詞裡的作者名',
);

bad = clone();
bad[0].image.negativePrompt = `${bad[0].image.negativePrompt}, celebrity face`;
ok(
  validateCast(bad, SOURCE, { extraNames: ['celebrity face'] }).some((p) => p.includes('禁用詞「celebrity face」')),
  '抓住 denylist 禁用詞',
);

/* ---------------- selectRoster ---------------- */

const rankedRoster = [
  { name: '乙', aliases: ['阿乙'] },
  { name: '甲', aliases: [] },
  { name: '丙', aliases: [] },
];
eq(selectRoster(rankedRoster).length, 3, '少於預設上限時全收');
eq(selectRoster(rankedRoster, { top: 2 }).map((c) => c.name).join(','), '乙,甲', 'top N 依既有排序切片');
eq(selectRoster({ characters: rankedRoster }, { top: 1 })[0].name, '乙', '也接受 {characters} 包一層');
eq(selectRoster(rankedRoster, { names: ['阿乙', '丙'] }).map((c) => c.name).join(','), '乙,丙', 'names 可用別名且忽略 top');
eq(selectRoster([]).length, 0, '空名單回傳空陣列');
eq(DEFAULT_TOP, 10, '預設選角人數仍是 10');
assert.throws(() => selectRoster(rankedRoster, { top: 0 }), /正整數/, 'top 必須是正整數');
assert.throws(() => selectRoster(rankedRoster, { names: ['不存在'] }), /找不到指定角色/, '指定名單找不到就失敗');
passed += 2;

const selectWorkdir = mkdtempSync(join(tmpdir(), 'novel-characters-select-'));
try {
  const rosterPath = join(selectWorkdir, 'roster.json');
  writeFileSync(rosterPath, JSON.stringify(rankedRoster));
  const selectCli = spawnSync(process.execPath, [join(here, 'novel-characters.mjs'), 'select', rosterPath, '--top', '2'], { encoding: 'utf8' });
  eq(selectCli.status, 0, 'select CLI --top 成功');
  eq(JSON.parse(selectCli.stdout).map((c) => c.name).join(','), '乙,甲', 'select CLI 輸出前兩名');
  const namedCli = spawnSync(process.execPath, [join(here, 'novel-characters.mjs'), 'select', rosterPath, '--names', '丙,阿乙'], { encoding: 'utf8' });
  eq(namedCli.status, 0, 'select CLI --names 成功');
  eq(JSON.parse(namedCli.stdout).map((c) => c.name).join(','), '丙,乙', '--names 依指定順序');
} finally {
  rmSync(selectWorkdir, { recursive: true, force: true });
}

// 沒有原文時應該跳過逐字驗證而不是全判失敗
eq(validateCast(CAST, null).length, 0, '不給原文時跳過引文驗證');

/* ---------------- render ---------------- */

const md = renderMarkdown(CAST, '渡口');
ok(md.includes('# 渡口 — 角色表'), 'Markdown 有標題');
for (const c of CAST) ok(md.includes(`## ${c.name}`), `Markdown 包含 ${c.name}`);
ok(md.includes('三視圖 prompt'), 'Markdown 含三視圖提示詞');

const html = renderHtml(CAST, '渡口');
ok(html.startsWith('<!doctype html>'), 'HTML 是完整文件');
ok(html.includes('<html lang="zh-TW">'), 'HTML 宣告台灣繁體中文');
ok(html.includes('Microsoft JhengHei'), 'HTML 使用台灣繁體中文字型備援');
ok(!html.includes('zh-CN'), 'HTML 不再宣告中國簡體中文');
eq((html.match(/class="entry"/g) || []).length, CAST.length, `HTML 有 ${CAST.length} 個條目`);
// 每人 8 個複製按鈕：標籤 + 4 段出圖 + 2 段音色 + 整份 JSON
eq((html.match(/class="copy"/g) || []).length, CAST.length * 8, '每段提示詞都有複製按鈕');
ok(html.includes('<nav aria-label="角色索引"'), '有角色索引');
eq((html.match(/class="ix-name"/g) || []).length, CAST.length, '索引列出全部角色');
ok(html.includes('<blockquote>'), '原文依據用 blockquote');
// 四種寫法都要認：半形/全形 × 推斷/inferred
for (const marker of ['（推斷）', '(inferred)', '（inferred）', '(推斷)']) {
  const t = clone();
  t[0].persona.appearance = '這名角色的身形看起來十分單薄' + marker + '。';
  ok(renderHtml(t, 'x').includes('class="inf"'), `推斷標記 ${marker} 被高亮`);
}
ok(html.includes('prefers-reduced-motion'), '尊重減少動效');
ok(html.includes('@media print'), '可列印');
// 自包含：不能有任何外部請求
ok(!/<script\s+src=/.test(html), 'HTML 不引用外部指令碼');
ok(!/<link\s/.test(html), 'HTML 不引用外部樣式');
// 反向驗證：上面兩條正則本身要真的能抓到東西，否則是永遠為真的假測試
ok(/<script\s+src=/.test('<script src="x.js">'), '外部指令碼偵測正則有效');
ok(/<link\s/.test('<link rel="stylesheet">'), '外部樣式偵測正則有效');
ok(!/@import|url\(https?:/.test(html), 'CSS 不拉外部資源');

// 沒有三視圖時要有佔位而不是空白
ok(renderHtml(CAST, 'x').includes('plate-empty'), '缺圖時顯示佔位');
const withShot = clone();
withShot[0].turnaroundImage = 'images/x.png';
ok(renderHtml(withShot, 'x').includes('<img src="images/x.png"'), '有圖時嵌入');

const unsafeShot = clone();
unsafeShot[0].turnaroundImage = 'javascript:alert(1)';
const unsafeShotHtml = renderHtml(unsafeShot, 'x');
ok(!/\b(?:href|src)="javascript:/i.test(unsafeShotHtml), '拒絕 javascript: 三視圖路徑');
unsafeShot[0].turnaroundImage = 'https://example.com/x.png';
ok(!/\b(?:href|src)="https:\/\/example\.com/i.test(renderHtml(unsafeShot, 'x')), '拒絕遠端三視圖資源');

// XSS：角色資料是模型生成的，不能直接拼進 HTML
const evil = clone();
evil[0].name = '<img src=x onerror=alert(1)>';
const evilHtml = renderHtml(evil, 'x');
ok(!evilHtml.includes('<img src=x onerror'), '角色欄位裡的 HTML 被轉義');

const evilMarkdown = clone();
evilMarkdown[0].name = '<img src=x onerror=alert(1)>';
const evilMd = renderMarkdown(evilMarkdown, '<script>alert(1)</script>', '<img src=x onerror=alert(1)>摘要');
ok(!evilMd.includes('<script>'), 'Markdown 標題中的 HTML 被轉義');
ok(!evilMd.includes('<img src=x onerror'), 'Markdown 角色名與摘要中的 HTML 被轉義');

// 故事摘要
ok(DOC.summary && DOC.summary.trim(), '範例帶故事摘要');
ok(renderHtml(CAST, '渡口', DOC.summary).includes('class="synopsis"'), 'HTML 頂部渲染摘要');
ok(!renderHtml(CAST, '渡口', '').includes('class="synopsis"'), '沒有摘要時不留空殼');
ok(renderMarkdown(CAST, '渡口', DOC.summary).includes('## 故事摘要'), 'Markdown 也帶摘要');
ok(renderHtml(CAST, '渡口', '<b>x</b>').includes('&lt;b&gt;'), '摘要裡的 HTML 被轉義');

// 一排最多三個角色：靠 minmax 下限卡住，兩個值必須一起改
const css = renderHtml(CAST, 'x');
ok(css.includes('max-width:1800px'), '頁面上限 1800px');
ok(/\.cast\{[^}]*minmax\(460px/.test(css), '角色牆用 minmax(460px) 卡三列');
ok(/\.cast\{[^}]*minmax\(460px/.test('.cast{grid-template-columns:repeat(auto-fit,minmax(460px,1fr))}'), '上面這條正則本身有效');
// 1800 上限、40 內邊距、28 間距下，三列裝得下、四列裝不下
const inner = 1800 - 40 * 2;
ok(3 * 460 + 2 * 28 <= inner, '三列能排下');
ok(4 * 460 + 3 * 28 > inner, '四列排不下——這是「一排最多三個」的機制');
ok(css.includes('.groups{display:block}'), '卡內三組直向排列而不是再分欄');

/* ---------------- skill metadata ---------------- */

const skillText = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8');
const frontmatter = skillText.match(/^---\n([\s\S]*?)\n---/);
ok(frontmatter, 'SKILL.md 有 YAML frontmatter');
const frontmatterKeys = frontmatter[1]
  .split('\n')
  .filter((line) => /^[a-z][a-z0-9_-]*:/.test(line))
  .map((line) => line.slice(0, line.indexOf(':')))
  .sort();
eq(frontmatterKeys.join(','), 'description,name', 'frontmatter 只保留 name 與 description');
ok(skillText.includes('台灣繁體中文'), '技能明確要求台灣繁體中文');

const openaiYaml = readFileSync(join(skillRoot, 'agents', 'openai.yaml'), 'utf8');
ok(openaiYaml.includes('display_name: "小說角色設定集"'), 'openai.yaml 有繁中顯示名稱');
ok(openaiYaml.includes('$novel-characters'), 'openai.yaml 預設提示明確呼叫技能');

console.log(`✓ ${passed} 項自測全部通過`);
