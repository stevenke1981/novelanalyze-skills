import { createHash } from 'node:crypto';

/** Filesystem-safe stem for a character name, CJK preserved. */
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
