import { createHash } from 'node:crypto';

export const LIVE_ACTION_VERSION = '1.0';
export const REQUIRED_SHOTS = Object.freeze([
  { id: 'identity-board', title: '角色身份固定參考圖表', aspectRatio: '16:10' },
  { id: 'neutral-portrait', title: '中性肖像', aspectRatio: '4:5' },
  { id: 'face-angles', title: '臉部角度組', aspectRatio: '16:10' },
  { id: 'full-body-turnaround', title: '真人全身三視圖', aspectRatio: '16:10' },
  { id: 'expression-grid', title: '表情九宮格', aspectRatio: '16:10' },
  { id: 'wardrobe-board', title: '主要服裝與材質板', aspectRatio: '16:10' },
  { id: 'cinematic-keyframe', title: '電影感關鍵畫面', aspectRatio: '16:9' },
]);

export const IMPORTANCE = new Set(['protagonist', 'major', 'supporting', 'minor']);
export const STATUS = new Set(['NOT_RUN', 'PASS', 'FAIL']);
export const SCOPE = new Set(['main', 'all', 'custom']);
export const ASPECT_RATIOS = new Set(['1:1', '3:2', '2:3', '4:5', '5:4', '16:9', '16:10', '9:16']);
export const IDENTITY_STRING_FIELDS = [
  'agePresentation', 'genderPresentation', 'ancestryAndRegion', 'faceGeometry', 'eyes', 'brows',
  'nose', 'mouth', 'skin', 'hair', 'body',
];
export const PERFORMANCE_STRING_FIELDS = ['defaultExpression', 'gaze', 'posture', 'movement'];
export const STYLE_STRING_FIELDS = ['visualWorld', 'realityLevel', 'globalNegativePrompt'];
export const CAPTURE_STRING_FIELDS = ['cameraSystem', 'lensLanguage', 'texture', 'lighting', 'colorScience'];
export const SHOT_STRING_FIELDS = [
  'id', 'title', 'resolutionHint', 'framing', 'camera', 'lighting', 'background',
  'prompt', 'promptZh', 'negativePrompt', 'output', 'status',
];

const CJK = /[㐀-鿿぀-ヿ가-힯]/;
const HAN = /[㐀-鿿]/;
const SIMPLIFIED_CHINESE = /[这们为发说国过还进关门间图视质体现实声语线并计设备转录应从对会无长经动样书车马风电头话亲该结构认读写听觉给仅让带难义远处级选删导侧页汇总标]/;

export const keyOf = (value) => String(value ?? '').trim().normalize('NFKC').toLocaleLowerCase();
const compact = (value) => keyOf(value).replace(/\s+/g, '');
export const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
export const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
export const asStringArray = (value) => (Array.isArray(value) ? value : []);
export const unique = (values) => [...new Set(values)];

export function slug(name) {
  const raw = String(name ?? '').trim().normalize('NFC');
  if (!raw) return 'character';
  let cleaned = raw
    .replace(/[\u0000-\u001F\u007F\s/\\:*?"<>|]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/[. ]+$/g, '');
  if (/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$/i.test(cleaned)) cleaned = `character-${cleaned}`;
  if (Array.from(cleaned).length > 80) cleaned = Array.from(cleaned).slice(0, 80).join('');
  const base = cleaned || 'character';
  if (base === raw) return base;
  const suffix = createHash('sha256').update(raw).digest('hex').slice(0, 8);
  return `${base}--${suffix}`;
}

export function looksEnglish(value) {
  return isNonEmptyString(value) && /[A-Za-z]/.test(value) && !CJK.test(value);
}

export function looksTraditionalChinese(value) {
  if (!isNonEmptyString(value) || !HAN.test(value)) return false;
  if (/[぀-ヿ가-힯]/.test(value)) return false;
  return !SIMPLIFIED_CHINESE.test(value);
}

export function containsName(value, name) {
  const source = String(value ?? '').normalize('NFKC');
  const candidate = String(name ?? '').trim().normalize('NFKC');
  if (!candidate) return false;
  if (/^[A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)*$/.test(candidate)) {
    const escaped = candidate
      .split(/\s+/)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\s+');
    return new RegExp(`(?:^|[^A-Za-z0-9])${escaped}(?=$|[^A-Za-z0-9])`, 'i').test(source);
  }
  if (Array.from(candidate).length < 2) return false;
  return compact(source).includes(compact(candidate));
}

export function requireStrings(object, fields, label, problems) {
  if (!isPlainObject(object)) {
    problems.push(`${label} 必須是物件`);
    return;
  }
  for (const field of fields) {
    if (!isNonEmptyString(object[field])) problems.push(`${label}.${field} 缺失或為空`);
  }
}

export function requireStringArray(value, label, problems, minimum = 1) {
  if (!Array.isArray(value)) {
    problems.push(`${label} 必須是陣列`);
    return;
  }
  if (value.length < minimum) problems.push(`${label} 至少需要 ${minimum} 個項目`);
  value.forEach((entry, index) => {
    if (!isNonEmptyString(entry)) problems.push(`${label}[${index}] 必須是非空字串`);
  });
}

export function checkEnglish(value, label, problems) {
  if (!looksEnglish(value)) problems.push(`${label} 必須是英文且不可包含中日韓文字`);
}

export function checkZhTw(value, label, problems) {
  if (!looksTraditionalChinese(value)) problems.push(`${label} 必須使用台灣繁體中文`);
}

export function checkPromptNames(value, label, names, problems) {
  for (const name of names) {
    if (containsName(value, name)) problems.push(`${label} 不得包含角色名或別名：${name}`);
  }
}

export function mapCast(cast) {
  const map = new Map();
  for (const character of cast?.characters ?? []) {
    if (!isNonEmptyString(character?.name)) continue;
    for (const name of [character.name, ...(character.aliases ?? [])]) map.set(keyOf(name), character);
  }
  return map;
}
