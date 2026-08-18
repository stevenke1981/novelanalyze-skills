import { readFileSync } from 'node:fs';
import { aspectMatches, averageHash, decodePngRgb, hammingDistance, readPngHeader } from './png.mjs';

export const DEFAULT_MAX_DISTANCE = 20;

export function inspectPngFile(filePath, expectedRatio = null) {
  let buffer;
  try {
    buffer = readFileSync(filePath);
  } catch {
    return { ok: false, reason: '無法讀取檔案' };
  }
  const header = readPngHeader(buffer);
  if (!header) return { ok: false, reason: '不是有效 PNG' };
  if (expectedRatio && !aspectMatches(header.width, header.height, expectedRatio)) {
    return {
      ok: false,
      header,
      reason: `比例不符 ${expectedRatio}（實際 ${header.width}×${header.height}）`,
    };
  }
  const decoded = decodePngRgb(buffer);
  return {
    ok: true,
    header,
    hash: decoded ? averageHash(decoded.rgb, decoded.width, decoded.height) : null,
  };
}

export function compareIdentity(identityInspect, shotInspect, maxDistance = DEFAULT_MAX_DISTANCE) {
  if (!identityInspect?.hash || !shotInspect?.hash) return { compared: false, distance: null, pass: true };
  const distance = hammingDistance(identityInspect.hash, shotInspect.hash);
  return { compared: true, distance, pass: distance <= maxDistance };
}
