export const MIN_CJK_NAME_LENGTH = 2;

export const NAME_KIND_LABEL = Object.freeze({
  name: '角色名',
  alias: '別名',
  source: '書名',
  author: '作者名',
  denylist: '禁用詞',
});

const compact = (value) => String(value).normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, '');

export function containsName(value, candidate) {
  const source = String(value ?? '').normalize('NFKC');
  const name = String(candidate ?? '').trim().normalize('NFKC');
  if (!name) return false;
  if (/^[A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)*$/.test(name)) {
    const escaped = name.split(/\s+/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
    return new RegExp(`(?:^|[^A-Za-z0-9])${escaped}(?=$|[^A-Za-z0-9])`, 'i').test(source);
  }
  // Single-character CJK names/aliases are ignored: they collide with common nouns.
  if (Array.from(name).length < MIN_CJK_NAME_LENGTH) return false;
  return compact(source).includes(compact(name));
}

export function collectForbiddenNames({ name, aliases, source, author, extra } = {}) {
  const items = [];
  const push = (value, kind) => {
    if (typeof value === 'string' && value.trim()) items.push({ value: value.trim(), kind });
  };
  push(name, 'name');
  for (const alias of aliases ?? []) push(alias, 'alias');
  push(source, 'source');
  push(author, 'author');
  for (const item of extra ?? []) push(item, 'denylist');

  const seen = new Set();
  return items.filter((entry) => {
    const key = `${entry.kind}:${entry.value.normalize('NFKC').toLocaleLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function loadDenylist(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter(Boolean);
}

export function describeForbiddenHit(entry) {
  return NAME_KIND_LABEL[entry.kind] ?? '名稱';
}
