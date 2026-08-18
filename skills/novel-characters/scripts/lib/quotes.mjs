import { MIN_CJK_NAME_LENGTH } from './names.mjs';

const DEFAULT_MAX_QUOTES = 8;

function splitSpans(text) {
  const paragraphs = text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const spans = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= 400) {
      spans.push(paragraph);
      continue;
    }
    const pieces = paragraph.split(/(?<=[。！？])|(?<=\. )/).map((item) => item.trim()).filter(Boolean);
    spans.push(...(pieces.length ? pieces : [paragraph]));
  }
  return spans;
}

function usableNeedles(entry) {
  return [entry?.name, ...(Array.isArray(entry?.aliases) ? entry.aliases : [])]
    .map((value) => String(value ?? '').trim())
    .filter((value) => value && Array.from(value).length >= MIN_CJK_NAME_LENGTH);
}

export function harvestQuotes(sourceText, roster, options = {}) {
  const normalised = String(sourceText ?? '').replace(/\r\n?/g, '\n');
  const entries = Array.isArray(roster) ? roster : roster?.characters;
  if (!normalised.trim() || !Array.isArray(entries)) return [];
  const maxQuotes = options.max == null ? DEFAULT_MAX_QUOTES : Number(options.max);
  if (!Number.isInteger(maxQuotes) || maxQuotes < 1) throw new Error('--max 必須是正整數');

  const spans = splitSpans(normalised);
  return entries.filter((entry) => entry?.name).map((entry) => {
    const needles = usableNeedles(entry);
    const quotes = [];
    const seen = new Set();
    for (const span of spans) {
      if (quotes.length >= maxQuotes) break;
      if (!needles.some((needle) => span.includes(needle))) continue;
      if (!normalised.includes(span) || seen.has(span)) continue;
      seen.add(span);
      quotes.push(span);
    }
    return {
      name: String(entry.name).trim(),
      aliases: Array.isArray(entry.aliases) ? entry.aliases : [],
      quotes,
    };
  });
}
